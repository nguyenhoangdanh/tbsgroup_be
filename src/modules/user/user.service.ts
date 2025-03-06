import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import {
  AppError,
  ErrForbidden,
  ErrNotFound,
  ITokenProvider,
  Requester,
  TokenPayload,
  UserRole,
} from 'src/share';
import { v7 } from 'uuid';
import { TOKEN_PROVIDER, USER_REPOSITORY } from './user.di-token';
import {
  UserLoginDTO,
  UserRegistrationDTO,
  userRegistrationDTOSchema,
  UserResetPasswordDTO,
  userResetPasswordDTOSchema,
  UserUpdateDTO,
  userUpdateDTOSchema,
} from './user.dto';
import {
  ErrExistsPassword,
  ErrInvalidCardIdAndEmployeeId,
  ErrInvalidToken,
  ErrInvalidUsernameAndPassword,
  ErrUserInactivated,
  ErrUsernameExisted,
  Status,
  User,
} from './user.model';
import { IUserRepository, IUserService } from './user.port';
import { WORK_INFO_REPOSITORY } from '../workInfo/work-info.di-token';
import { IWorkInfoRepository } from '../workInfo/work-info.port';
import { WorkInfo } from '../workInfo/work-info.model';

@Injectable()
export class UserService implements IUserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(WORK_INFO_REPOSITORY)
    private readonly workInfoRepo: IWorkInfoRepository,
    @Inject(TOKEN_PROVIDER) private readonly tokenProvider: ITokenProvider,
  ) {}

  async register(dto: UserRegistrationDTO): Promise<string> {
    try {
      const data = userRegistrationDTOSchema.parse(dto);

      const user = await this.userRepo.findByCond({
        username: data.user.username,
      });
      if (user) {
        throw AppError.from(ErrUsernameExisted, 400);
      }

      const salt = bcrypt.genSaltSync(8);
      const hashPassword = await bcrypt.hash(
        `${data.user.password}.${salt}`,
        10,
      );

      const newId = v7();

      const newIdWorkInfo = v7();
      const newWorkInfo: WorkInfo = {
        id: newIdWorkInfo,
        department: data.workInfo.department,
        position: data.workInfo.position,
        line: data.workInfo.line,
        factory: data.workInfo.factory,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.workInfoRepo.insert(newWorkInfo);

      const newUser: User = {
        ...data.user,
        password: hashPassword,
        username: data.user.username,
        id: newId,
        status: Status.FIRST_LOGIN,
        salt: salt,
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        followerCount: 0,
        postCount: 0,
        fullName: data.user.fullName,
        employeeId: data.user.employeeId,
        cardId: data.user.cardId,
        workInfoId: newIdWorkInfo,
      };

      await this.userRepo.insert(newUser);
      return newId;
    } catch (error) {
      throw AppError.from(new Error(JSON.stringify(error)), 400);
    }
  }

  async login(dto: UserLoginDTO): Promise<string> {
    // const data = userLoginDTOSchema.parse(dto);

    // 1. Find user with username from DTO
    const user = await this.userRepo.findByCond({ username: dto.username });
    if (!user) {
      throw AppError.from(ErrInvalidUsernameAndPassword, 400).withLog(
        'Username not found',
      );
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(
      `${dto.password}.${user.salt}`,
      user.password,
    );
    if (!isMatch) {
      throw AppError.from(ErrInvalidUsernameAndPassword, 400).withLog(
        'Password is incorrect',
      );
    }

    if (user.status === Status.DELETED || user.status === Status.INACTIVE) {
      throw AppError.from(ErrUserInactivated, 400);
    }

    // 3. Return token
    const role = user.role;
    const token = await this.tokenProvider.generateToken({
      sub: user.id,
      role,
    });
    return token;
  }

  async introspectToken(token: string): Promise<TokenPayload> {
    const payload = await this.tokenProvider.verifyToken(token);

    if (!payload) {
      throw AppError.from(ErrInvalidToken, 400);
    }

    const user = await this.userRepo.get(payload.sub);
    if (!user) {
      throw AppError.from(ErrNotFound, 400);
    }

    if (
      user.status === Status.DELETED ||
      user.status === Status.INACTIVE ||
      user.status === Status.BANNED
    ) {
      throw AppError.from(ErrUserInactivated, 400);
    }

    return {
      sub: user.id,
      role: user.role,
    };
  }

  async profile(userId: string): Promise<Omit<User, 'password' | 'salt'>> {
    const user = await this.userRepo.get(userId);

    if (!user) {
      throw AppError.from(ErrNotFound, 400);
    }

    // const { password, salt, ...rest } = user;
    const { ...rest } = user;
    return rest;
  }

  async update(
    requester: Requester,
    userId: string,
    dto: UserUpdateDTO,
  ): Promise<void> {
    if (requester.role !== UserRole.ADMIN && requester.sub !== userId) {
      throw AppError.from(ErrForbidden, 400);
    }

    const data = userUpdateDTOSchema.parse(dto);

    const user = await this.userRepo.get(userId);
    if (!user) {
      throw AppError.from(ErrNotFound, 400);
    }

    await this.userRepo.update(userId, data);
  }

  async delete(requester: Requester, userId: string): Promise<void> {
    if (requester.role !== UserRole.ADMIN && requester.sub !== userId) {
      throw AppError.from(ErrForbidden, 400);
    }

    // soft delete
    await this.userRepo.delete(userId, false);
  }

  async verifyData(dto: UserResetPasswordDTO): Promise<User> {
    const data = userResetPasswordDTOSchema.parse(dto);

    const user = await this.userRepo.findByCardId({
      employeeId: data.employeeId,
      cardId: data.cardId,
    });

    if (!user) {
      throw AppError.from(ErrInvalidCardIdAndEmployeeId, 400);
    }

    return user;
  }

  async resetPassword(dto: UserResetPasswordDTO): Promise<void> {
    const data = userResetPasswordDTOSchema.parse(dto);
    if (!data.password) {
      throw new Error('Mật khẩu không được để trống');
    }
    if (data.cardId && data.employeeId) {
      const user = await this.verifyData(data);

      // 2. Check password
      const isMatch = await bcrypt.compare(
        `${dto.password}.${user.salt}`,
        user.password,
      );
      if (isMatch) {
        throw AppError.from(ErrExistsPassword, 400);
      }

      const salt = bcrypt.genSaltSync(8);
      const hashPassword = await bcrypt.hash(`${data.password}.${salt}`, 10);

      await this.userRepo.update(user.id, { password: hashPassword, salt });
    } else {
      const user = await this.userRepo.findByCond({ username: data.username });

      if (!user) {
        throw AppError.from(ErrInvalidUsernameAndPassword, 400);
      }

      // 2. Check password
      const isMatch = await bcrypt.compare(
        `${dto.password}.${user.salt}`,
        user.password,
      );
      if (isMatch) {
        throw AppError.from(ErrExistsPassword, 400);
      }
      const salt = bcrypt.genSaltSync(8);
      const hashPassword = await bcrypt.hash(`${data.password}.${salt}`, 10);

      await this.userRepo.update(user.id, { password: hashPassword, salt });
    }
  }
}
