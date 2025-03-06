import { Module, Provider } from '@nestjs/common';
import { config } from 'src/share';
import { JwtTokenService } from 'src/share/components/jwt';
import { ShareModule } from 'src/share/module';
import {
  TOKEN_PROVIDER,
  WORK_INFO_REPOSITORY,
  WORK_INFO_SERVICE,
} from './work-info.di-token';
import { WorkInfoPrismaRepository } from './work-info-prisma.repo';
import { WorkInfoService } from './work-info.service';
import { WorkInfoHttpController } from './work-info-http.controller';

const repositories: Provider[] = [
  { provide: WORK_INFO_REPOSITORY, useClass: WorkInfoPrismaRepository },
];

const services: Provider[] = [
  { provide: WORK_INFO_SERVICE, useClass: WorkInfoService },
];

const tokenJWTProvider = new JwtTokenService(config.rpc.jwtSecret, '7d');
const tokenProvider: Provider = {
  provide: TOKEN_PROVIDER,
  useValue: tokenJWTProvider,
};

@Module({
  imports: [ShareModule],
  controllers: [WorkInfoHttpController],
  providers: [...repositories, ...services, tokenProvider],
})
export class WorkInfoModule {}
