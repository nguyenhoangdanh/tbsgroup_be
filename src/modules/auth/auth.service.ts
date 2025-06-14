import { Inject, Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AppError, ErrNotFound, TokenPayload, UserRole } from 'src/share';
import { v4 } from 'uuid';
import { USER_REPOSITORY } from '../user/user.di-token';
import {
  ChangePasswordDTO,
  LoginDTO,
  RegistrationDTO,
  RequestPasswordResetDTO,
  ResetPasswordDTO,
} from './auth.dto';
import {
  ErrExistsPassword,
  ErrInvalidResetToken,
  ErrInvalidToken,
  ErrInvalidUsernameAndPassword,
  ErrMissingResetCredentials,
  ErrUserInactivated,
  UserStatus,
} from './auth.model';
import { IAuthService, ITokenService } from './auth.port';
import { IUserRepository } from '../user/user.port';
import { ROLE_SERVICE } from '../role/role.di-token';
import { IRoleService } from '../role/role.port';
import { User } from '../user/user.model';
import { TOKEN_SERVICE } from './auth.di-token';
import {
  ErrCardIdExisted,
  ErrEmployeeIdExisted,
} from 'src/share/models/user.shared-model';

@Injectable()
export class AuthService implements IAuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(ROLE_SERVICE) private readonly roleService: IRoleService,
  ) {}

  async register(dto: RegistrationDTO): Promise<string> {
    try {
      // Check if username already exists
      // const existingUser = await this.userRepo.findByUsername(dto.username);
      // if (existingUser) {
      //   throw AppError.from(ErrUsernameExisted, 400);
      // }

      const existingCardUser = await this.userRepo.findByCardId(dto.cardId);
      if (existingCardUser) {
        throw AppError.from(ErrCardIdExisted, 400);
      }
      const existingEmployeeUser = await this.userRepo.findByEmployeeId(
        dto.employeeId,
      );
      if (existingEmployeeUser) {
        throw AppError.from(ErrEmployeeIdExisted, 400);
      }

      // Generate salt and hash password
      const salt = bcrypt.genSaltSync(10);
      const hashPassword = await bcrypt.hash(`${dto.password}.${salt}`, 12);

      // Generate new user ID
      const newId = v4();

      let defaultRoleId: string;
      if (dto.roleId) {
        const roleEntity = await this.roleService.getRole(dto.roleId);
        defaultRoleId = roleEntity.id;
      } else {
        // If no roleId provided, use WORKER role as default
        const defaultRole = await this.roleService.getRoleByCode(
          UserRole.WORKER,
        );
        defaultRoleId = defaultRole.id;
      }

      // Create new user object
      const newUser: User = {
        ...dto,
        password: hashPassword,
        username: dto.username,
        id: newId,
        status: dto.status || UserStatus.PENDING_ACTIVATION,
        salt: salt,
        roleId: defaultRoleId,
        createdAt: new Date(),
        updatedAt: new Date(),
        fullName: dto.fullName,
        employeeId: dto.employeeId,
        cardId: dto.cardId,
        factoryId: dto.factoryId || null,
        lineId: dto.lineId || null,
        teamId: dto.teamId || null,
        groupId: dto.groupId || null,
        positionId: dto.positionId || null,
      };

      // Insert new user to repository
      await this.userRepo.insert(newUser);

      // Log successful user creation
      this.logger.log(`New user registered: ${dto.username} (${newId})`);

      return newId;
    } catch (error) {
      // Log error details
      this.logger.error(
        `Error during user registration: ${error.message}`,
        error.stack,
      );

      // Rethrow error for controller to handle
      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi đăng ký người dùng: ${error.message}`),
        400,
      );
    }
  }

  async login(dto: LoginDTO): Promise<{
    token: string;
    expiresIn: number;
    requiredResetPassword: boolean;
    data: Omit<User, 'password' | 'salt'>;
  }> {
    try {
      // Find user by username
      const user = await this.userRepo.findByUsername(dto.username);
      if (!user) {
        throw AppError.from(ErrInvalidUsernameAndPassword, 400);
      }

      // Check if user account is active
      if (
        user.status !== UserStatus.ACTIVE &&
        user.status !== UserStatus.PENDING_ACTIVATION
      ) {
        throw AppError.from(ErrUserInactivated, 400);
      }

      // Verify password
      const isMatch = await bcrypt.compare(
        `${dto.password}.${user.salt}`,
        user.password,
      );
      if (!isMatch) {
        throw AppError.from(ErrInvalidUsernameAndPassword, 400);
      }

      // Determine token expiration based on "remember me" option
      const expiresIn = dto.rememberMe ? '7d' : '1d'; // 7 days or 1 day

      const role = await this.roleService.getRole(user.roleId);
      if (!role) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Create token payload
      const tokenPayload: TokenPayload = {
        sub: user.id,
        roleId: user.roleId,
        role: role.code,
        factoryId: user.factoryId || undefined,
        lineId: user.lineId || undefined,
        teamId: user.teamId || undefined,
        groupId: user.groupId || undefined,
      };

      // Generate JWT token
      const token = await this.tokenService.generateToken(
        tokenPayload,
        expiresIn,
      );

      // Calculate token expiration time in seconds
      const expirationTime = this.tokenService.getExpirationTime(token);

      // Update user's last login timestamp
      await this.userRepo.update(user.id, {
        lastLogin: new Date(),
        // If user is in PENDING_ACTIVATION, auto-activate on first login
      });

      // Log successful login
      this.logger.log(`User logged in: ${user.username} (${user.id})`);

      return {
        data: {
          id: user.id,
          username: user.username,
          roleId: user.roleId,
          fullName: user.fullName,
          employeeId: user.employeeId,
          cardId: user.cardId,
          factoryId: user.factoryId || null,
          lineId: user.lineId || null,
          teamId: user.teamId || null,
          groupId: user.groupId || null,
          positionId: user.positionId || null,
          role: role.code,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
        expiresIn: expirationTime,
        requiredResetPassword: user.status === UserStatus.PENDING_ACTIVATION,
      };
    } catch (error) {
      // Log error details
      this.logger.error(`Login error: ${error.message}`, error.stack);

      // Rethrow error for controller to handle
      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi đăng nhập: ${error.message}`),
        400,
      );
    }
  }

  async logout(token: string): Promise<void> {
    if (!token) {
      this.logger.warn('Attempted logout with empty token');
      return;
    }

    try {
      // Decode token payload first to get user info for logging
      const payload = this.tokenService.decodeToken(token);
      const userId = payload?.sub || 'unknown';

      // Check if token is already blacklisted to avoid unnecessary operations
      const isAlreadyBlacklisted =
        await this.tokenService.isTokenBlacklisted(token);
      if (isAlreadyBlacklisted) {
        this.logger.debug(`Token for user ${userId} is already blacklisted`);
        return;
      }

      // Get token expiration time
      const expiresIn = this.tokenService.getExpirationTime(token);
      if (expiresIn <= 0) {
        this.logger.debug(
          `Token for user ${userId} is already expired, no need to blacklist`,
        );
        return;
      }

      // Blacklist the token
      await this.tokenService.blacklistToken(token, expiresIn);
      this.logger.log(`User ${userId} successfully logged out`);
    } catch (error) {
      this.logger.error(`Error during logout: ${error.message}`, error.stack);
      throw AppError.from(
        new Error(`Có lỗi xảy ra trong quá trình đăng xuất: ${error.message}`),
        500,
      );
    }
  }

  async introspectToken(token: string): Promise<TokenPayload> {
    // Verify token
    const payload = await this.tokenService.verifyToken(token);
    if (!payload) {
      throw AppError.from(ErrInvalidToken, 401);
    }

    // Get user to validate current status
    const user = await this.userRepo.get(payload.sub);
    if (!user) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw AppError.from(ErrUserInactivated, 403);
    }

    const role = await this.roleService.getRole(user.roleId);
    if (!role) {
      throw AppError.from(ErrNotFound, 404);
    }

    return {
      sub: user.id,
      roleId: user.roleId,
      role: role.code,
      factoryId: user.factoryId || undefined,
      lineId: user.lineId || undefined,
      teamId: user.teamId || undefined,
      groupId: user.groupId || undefined,
    };
  }

  async refreshToken(
    token: string,
  ): Promise<{ token: string; expiresIn: number }> {
    try {
      // Decode the existing token (without verifying it)
      const payload = this.tokenService.decodeToken(token);
      if (!payload) {
        throw AppError.from(ErrInvalidToken, 401);
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.tokenService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw AppError.from(ErrInvalidToken, 401);
      }

      // Get user to ensure they still exist and are active
      const user = await this.userRepo.get(payload.sub);
      if (!user) {
        throw AppError.from(ErrNotFound, 404);
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw AppError.from(ErrUserInactivated, 403);
      }

      const role = await this.roleService.getRole(user.roleId);
      if (!role) {
        throw AppError.from(ErrNotFound, 404);
      }

      // Create a new token with the same payload but new expiration
      const tokenPayload: TokenPayload = {
        sub: user.id,
        roleId: user.roleId,
        role: role.code,
        factoryId: user.factoryId || undefined,
        lineId: user.lineId || undefined,
        teamId: user.teamId || undefined,
        groupId: user.groupId || undefined,
      };

      const newToken = await this.tokenService.generateToken(tokenPayload);

      // Calculate expiration time
      const expiresIn = this.tokenService.getExpirationTime(newToken);

      // Blacklist the old token
      const oldTokenExpiresIn = this.tokenService.getExpirationTime(token);
      if (oldTokenExpiresIn > 0) {
        await this.tokenService.blacklistToken(token, oldTokenExpiresIn);
      }

      this.logger.log(`Token refreshed for user: ${user.id}`);
      return { token: newToken, expiresIn };
    } catch (error) {
      this.logger.error(
        `Error refreshing token: ${error.message}`,
        error.stack,
      );

      // Re-throw AppErrors directly, wrap other errors
      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.from(
        new Error(`Lỗi khi làm mới token: ${error.message}`),
        500,
      );
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDTO): Promise<void> {
    // Get user
    const user = await this.userRepo.get(userId);
    if (!user) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Verify old password
    const isMatch = await bcrypt.compare(
      `${dto.oldPassword}.${user.salt}`,
      user.password,
    );
    if (!isMatch) {
      throw AppError.from(ErrInvalidUsernameAndPassword, 400);
    }

    // Check if new password is the same as old password
    const isSamePassword = await bcrypt.compare(
      `${dto.newPassword}.${user.salt}`,
      user.password,
    );
    if (isSamePassword) {
      throw AppError.from(ErrExistsPassword, 400);
    }

    // Generate new salt and hash for the new password
    const salt = bcrypt.genSaltSync(10);
    const hashPassword = await bcrypt.hash(`${dto.newPassword}.${salt}`, 12);

    // Update user with new password
    await this.userRepo.update(userId, {
      password: hashPassword,
      salt,
      updatedAt: new Date(),
    });

    this.logger.log(`Password changed for user: ${userId}`);
  }

  async requestPasswordReset(
    dto: RequestPasswordResetDTO,
  ): Promise<{ resetToken: string; expiryDate: Date; username: string }> {
    let user: User | null = null;

    // Find user based on provided credentials
    if (dto.username) {
      user = await this.userRepo.findByUsername(dto.username);
    } else if (dto.cardId && dto.employeeId) {
      user = await this.userRepo.findByCardId(dto.cardId, dto.employeeId);
    } else {
      throw AppError.from(ErrMissingResetCredentials, 400);
    }

    if (!user) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Generate password reset token
    const resetToken = await this.tokenService.generateResetToken();

    // Set expiry to 1 hour from now
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1);

    // Save reset token to user
    await this.userRepo.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpiry: expiryDate,
      updatedAt: new Date(),
    });

    this.logger.log(`Password reset requested for user: ${user.id}`);

    return { resetToken, expiryDate, username: user.username };
  }

  async resetPassword(dto: ResetPasswordDTO): Promise<void> {
    let user: User | null = null;

    // Find user based on provided credentials
    if (dto.resetToken) {
      // If reset token is provided, use it to find the user
      user = await this.userRepo.findByResetToken(dto.resetToken);

      // Verify token is valid and not expired
      if (
        !user ||
        !user.passwordResetExpiry ||
        user.passwordResetExpiry < new Date()
      ) {
        throw AppError.from(ErrInvalidResetToken, 400);
      }
    } else if (dto.username) {
      // If username is provided, find by username
      user = await this.userRepo.findByUsername(dto.username);
    } else if (dto.cardId && dto.employeeId) {
      // If cardId and employeeId are provided, find by those
      user = await this.userRepo.findByCardId(dto.cardId, dto.employeeId);
    } else {
      throw AppError.from(ErrMissingResetCredentials, 400);
    }

    if (!user) {
      throw AppError.from(ErrNotFound, 404);
    }

    // Check if new password is the same as old password
    const isSamePassword = await bcrypt.compare(
      `${dto.password}.${user.salt}`,
      user.password,
    );
    if (isSamePassword) {
      throw AppError.from(ErrExistsPassword, 400);
    }

    // Generate new salt and hash for the new password
    const salt = bcrypt.genSaltSync(10);
    const hashPassword = await bcrypt.hash(`${dto.password}.${salt}`, 12);

    // Update user with new password and clear reset token
    await this.userRepo.update(user.id, {
      password: hashPassword,
      salt,
      passwordResetToken: null,
      passwordResetExpiry: null,
      updatedAt: new Date(),
      status:
        user.status === UserStatus.PENDING_ACTIVATION
          ? UserStatus.ACTIVE
          : user.status,
    });

    this.logger.log(`Password reset completed for user: ${user.id}`);
  }
}
