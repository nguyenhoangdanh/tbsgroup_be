import { PromiseReturnDataType } from 'src/interface/common.interface';
import { LineDTO } from './line.dto';
import { Line } from './line.model';

export interface ILineService {
  create(dto: LineDTO): PromiseReturnDataType<string>;
}

export interface ILineRepository {
  // Query
  get(id: string): Promise<Line | null>;
  findById(id: string): Promise<Line | null>;
  findByName(cond: Omit<LineDTO, 'factoryId'>): Promise<Line | null>;

  // Command
  insert(info: Line): Promise<void>;
  update(id: string, dto: LineDTO): Promise<void>;
  delete(id: string, isHard: boolean): Promise<void>;
}
