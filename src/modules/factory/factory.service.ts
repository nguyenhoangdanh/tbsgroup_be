import { Inject, Injectable } from '@nestjs/common';
import { IFactoryRepository, IFactoryService } from './factory.port';
import { FACTORY_REPOSITORY } from './factory.di-token';
import { FactoryDTO, FactoryDTOSchema } from './factory.dto';
import { v7 } from 'uuid';
import { PromiseReturnDataType } from 'src/interface/common.interface';
import { ErrorFactoryExist, Factory } from './factory.model';
import { AppError } from 'src/share';

@Injectable()
export class FactoryService implements IFactoryService {
  constructor(
    @Inject(FACTORY_REPOSITORY)
    private readonly factoryRepository: IFactoryRepository,
  ) {}

  async create(dto: FactoryDTO): PromiseReturnDataType<string> {
    const data = FactoryDTOSchema.parse(dto);

    const existedFactory = await this.factoryRepository.findByName({
      name: data.name,
      factoryCode: data.factoryCode,
    });
    if (existedFactory) {
      throw AppError.from(ErrorFactoryExist, 400);
    }

    const newId = v7();
    const factory: Factory = {
      ...data,
      id: newId,
      factoryCode: data.factoryCode,
      description: data.description,
      name: data.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.factoryRepository.insert(factory);
    return {
      data: newId,
      message: 'Factory created successfully',
      success: true,
    };
  }
}
