import { Inject, Injectable } from '@nestjs/common';
import { v7 } from 'uuid';
import { PromiseReturnDataType } from 'src/interface/common.interface';
import { AppError } from 'src/share';
import { ILineRepository, ILineService } from './line.port';
import { LINE_REPOSITORY } from './line.di-token';
import { LineDTO, LineDTOSchema } from './line.dto';
import { ErrorLineExists, Line } from './line.model';
import { FACTORY_REPOSITORY } from '../factory/factory.di-token';
import { IFactoryRepository } from '../factory/factory.port';
import { ErrorFactoryNotFound } from '../factory/factory.model';

@Injectable()
export class LineService implements ILineService {
  constructor(
    @Inject(LINE_REPOSITORY)
    private readonly lineRepository: ILineRepository,
    @Inject(FACTORY_REPOSITORY)
    private readonly factoryRepository: IFactoryRepository,
  ) {}

  async create(dto: LineDTO): PromiseReturnDataType<string> {
    const data = LineDTOSchema.parse(dto);

    const existedLine = await this.lineRepository.findByName({
      name: data.name,
      lineCode: data.lineCode,
    });
    if (existedLine) {
      throw AppError.from(ErrorLineExists, 400);
    }

    const factory = await this.factoryRepository.findById(data.factoryId);

    if (!factory) {
      throw AppError.from(ErrorFactoryNotFound, 404);
    }

    const newId = v7();
    const line: Line = {
      ...data,
      id: newId,
      description: data.description,
      lineCode: data.lineCode,
      name: data.name,
      factoryId: factory.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.lineRepository.insert(line);
    return {
      data: newId,
      message: 'Create line successfully',
      success: true,
    };
  }
}
