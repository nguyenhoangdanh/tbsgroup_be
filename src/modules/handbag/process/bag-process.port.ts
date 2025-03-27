import { Requester } from 'src/share';
import {
  BagProcessCondDTO,
  BagProcessCreateDTO,
  BagProcessUpdateDTO,
  PaginationDTO,
} from './bag-process.dto';
import { BagProcess } from './bag-process.model';

// Interface cho bagProcess repository
export interface IBagProcessRepository {
  // Truy vấn
  getBagProcess(id: string): Promise<BagProcess | null>;
  findBagProcessByCode(code: string): Promise<BagProcess | null>;
  findBagProcessByCond(cond: BagProcessCondDTO): Promise<BagProcess | null>;
  listBagProcesses(
    conditions: BagProcessCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagProcess[];
    total: number;
  }>;

  // Thao tác dữ liệu
  insertBagProcess(bagProcess: BagProcess): Promise<void>;
  updateBagProcess(id: string, dto: Partial<BagProcess>): Promise<void>;
  deleteBagProcess(id: string): Promise<void>;

  // Kiểm tra ràng buộc
  hasProductionRecords(bagProcessId: string): Promise<boolean>;
  hasPositionLinks(bagProcessId: string): Promise<boolean>;
  hasColorProcessLinks(bagProcessId: string): Promise<boolean>;
}

// Interface cho bagProcess service
export interface IBagProcessService {
  // Các phương thức của service
  createBagProcess(
    requester: Requester,
    dto: BagProcessCreateDTO,
  ): Promise<string>;
  updateBagProcess(
    requester: Requester,
    id: string,
    dto: BagProcessUpdateDTO,
  ): Promise<void>;
  deleteBagProcess(requester: Requester, id: string): Promise<void>;
  getBagProcess(id: string): Promise<BagProcess>;
  listBagProcesses(
    conditions: BagProcessCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagProcess[];
    total: number;
    page: number;
    limit: number;
  }>;
}