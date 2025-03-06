import { Inject, Injectable } from '@nestjs/common';
import { AppError, ITokenProvider } from 'src/share';
import { v7 } from 'uuid';
import { TOKEN_PROVIDER, WORK_INFO_REPOSITORY } from './work-info.di-token';
import { IWorkInfoRepository, IWorkInfoService } from './work-info.port';
import {
  WorkInfoRegistrationDTO,
  workInfoRegistrationDTOSchema,
} from './work-info.dto';
import { ErrorWorkInfoExist, WorkInfo } from './work-info.model';

@Injectable()
export class WorkInfoService implements IWorkInfoService {
  constructor(
    @Inject(WORK_INFO_REPOSITORY)
    private readonly workInfoRepo: IWorkInfoRepository,
    @Inject(TOKEN_PROVIDER) private readonly tokenProvider: ITokenProvider,
  ) {}

  async create(dto: WorkInfoRegistrationDTO): Promise<string> {
    try {
      const data = workInfoRegistrationDTOSchema.parse(dto);
      const workInfo = await this.workInfoRepo.findByCond({
        department: data.department,
        position: data.position,
        line: data.line,
        factory: data.factory,
      });

      if (workInfo) {
        throw AppError.from(ErrorWorkInfoExist, 400);
      }

      const newId = v7();
      const newWorkInfo: WorkInfo = {
        ...data,
        id: newId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.workInfoRepo.insert(newWorkInfo);
      return newId;
    } catch (error) {
      throw AppError.from(new Error(JSON.stringify(error)), 400);
    }
  }
}
