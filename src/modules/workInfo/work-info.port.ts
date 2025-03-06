import {
  WorkInfoCondDTO,
  WorkInfoRegistrationDTO,
  WorkInfoUpdateDTO,
} from './work-info.dto';
import { WorkInfo } from './work-info.model';

export interface IWorkInfoService {
  create(dto: WorkInfoRegistrationDTO): Promise<string>;
  // profile(userId: string): Promise<Omit<WorkInfo, 'password' | 'salt'>>;
  // update(
  //   requester: Requester,
  //   userId: string,
  //   dto: WorkInfoUpdateDTO,
  // ): Promise<void>;
  // delete(requester: Requester, userId: string): Promise<void>;
  // // introspect token rpc
  // introspectToken(token: string): Promise<TokenPayload>;
}

export interface IWorkInfoRepository {
  // Query
  get(id: string): Promise<WorkInfo | null>;
  findByCond(cond: WorkInfoCondDTO): Promise<WorkInfo | null>;
  listByIds(ids: string[]): Promise<WorkInfo[]>;
  // Command
  insert(info: WorkInfo): Promise<void>;
  update(id: string, dto: WorkInfoUpdateDTO): Promise<void>;
  delete(id: string, isHard: boolean): Promise<void>;
}
