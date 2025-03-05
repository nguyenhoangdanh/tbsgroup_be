import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AppError, ErrNotFound, ReqWithRequester, UserRole } from 'src/share';
import { RemoteAuthGuard, Roles, RolesGuard } from 'src/share/guard';
import { USER_REPOSITORY, USER_SERVICE } from './user.di-token';
import {
  UserLoginDTO,
  UserRegistrationDTO,
  UserResetPasswordDTO,
  UserUpdateDTO,
  UserUpdateProfileDTO,
} from './user.dto';
import { ErrInvalidToken, User } from './user.model';
import { IUserRepository, IUserService } from './user.port';

@Controller()
export class UserHttpController {
  constructor(
    @Inject(USER_SERVICE) private readonly userService: IUserService,
  ) {}

  @Post('auth/register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: UserRegistrationDTO) {
    const data = await this.userService.register(dto);
    return { data };
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async authenticate(@Res() res: ExpressResponse, @Body() dto: UserLoginDTO) {
    const data = await this.userService.login(dto);
    res.cookie('accessToken', data, {
      httpOnly: true, // Ngăn chặn XSS
      // secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS nếu production
      // sameSite: 'strict', // Chống CSRF
      // secure: false, // ❌ Không dùng true trên localhost
      // sameSite: 'lax', // 🛠 "strict" có thể chặn request từ frontend
      secure: process.env.NODE_ENV === 'production', // Chỉ bật nếu chạy HTTPS
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Cần 'none' nếu frontend và backend khác domain
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    res.setHeader('Authorization', `Bearer ${data}`);
    return res.json({ data });
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async profile(@Request() req: ExpressRequest) {
    //   // Ưu tiên lấy token từ cookie trước
    // if (req.cookies?.accessToken) {
    //   return req.cookies.accessToken;
    // }

    // // Nếu không có trong cookie, lấy từ Authorization header
    // if (req.headers.authorization) {
    //   const [type, token] = req.headers.authorization.split(' ');
    //   if (type === 'Bearer') {
    //     return token;
    //   }
    // }

    const token = req.cookies?.accessToken;
    if (!token) {
      throw AppError.from(ErrInvalidToken, 401);
    }
    const requester = await this.userService.introspectToken(token);
    const data = await this.userService.profile(requester.sub);
    return { data };
  }

  @Patch('profile')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: ReqWithRequester,
    @Body() dto: UserUpdateProfileDTO,
  ) {
    const requester = req.requester;
    await this.userService.update(requester, requester.sub, dto);
    return { data: true };
  }

  @Patch('users/:id')
  @UseGuards(RemoteAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Request() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() dto: UserUpdateDTO,
  ) {
    // 200Lab TODO: can be omitted, because we already check in guards
    const requester = req.requester;
    await this.userService.update(requester, id, dto);
    return { data: true };
  }

  @Delete('users/:id')
  @UseGuards(RemoteAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Request() req: ReqWithRequester, @Param('id') id: string) {
    // 200Lab TODO: can be omitted, because we already check in guards
    const requester = req.requester;
    await this.userService.delete(requester, id);
    return { data: true };
  }

  @Post('/auth/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res() res: ExpressResponse) {
      res.clearCookie('accessToken', {
          httpOnly: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 0,
      });
      res.status(200).json({ data: true }); // Gửi response JSON và kết thúc request
  }
  

  @Post('auth/verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: UserResetPasswordDTO) {
    const userId = await this.userService.verifyData(dto);
    return { data: userId };
  }

  @Patch('auth/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Request() req: ExpressRequest,
    @Body() dto: UserResetPasswordDTO,
  ) {
    const token = req.cookies?.accessToken;
    if (!token) {
      throw AppError.from(ErrInvalidToken, 401);
    }
    const requester = await this.userService.introspectToken(token);
    if (requester.sub) {
      await this.userService.resetPassword(dto);
    }
    return { data: true };
  }
}

@Controller('rpc')
export class UserRpcHttpController {
  constructor(
    @Inject(USER_SERVICE) private readonly userService: IUserService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  @Post('introspect')
  @HttpCode(HttpStatus.OK)
  async introspect(@Body() dto: { token: string }) {
    const result = await this.userService.introspectToken(dto.token);
    return { data: result };
  }

  @Get('users/:id')
  @HttpCode(HttpStatus.OK)
  async getUser(@Param('id') id: string) {
    const user = await this.userRepository.get(id);

    if (!user) {
      throw AppError.from(ErrNotFound, 400);
    }

    return { data: this._toResponseModel(user) };
  }

  @Post('users/list-by-ids')
  @HttpCode(HttpStatus.OK)
  async listUsersByIds(@Body('ids') ids: string[]) {
    const data = await this.userRepository.listByIds(ids);
    return { data: data.map(this._toResponseModel) };
  }

  private _toResponseModel(data: User): Omit<User, 'password' | 'salt'> {
    // const { password, salt, ...rest } = data;
    const { ...rest } = data;
    return rest;
  }
}
