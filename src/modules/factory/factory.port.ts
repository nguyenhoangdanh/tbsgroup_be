import { PromiseReturnDataType } from 'src/interface/common.interface';
import { FactoryDTO } from './factory.dto';
import { Factory } from './factory.model';

export interface IFactoryService {
  create(dto: FactoryDTO): PromiseReturnDataType<string>;
}

export interface IFactoryRepository {
  // Query
  get(id: string): Promise<Factory | null>;
  findById(id: string): Promise<Factory | null>;
  findByName(cond: FactoryDTO): Promise<Factory | null>;
  listByIds(ids: string[]): Promise<Factory[]>;
  // Command
  insert(info: Factory): Promise<void>;
  update(id: string, dto: FactoryDTO): Promise<void>;
  delete(id: string, isHard: boolean): Promise<void>;
}
