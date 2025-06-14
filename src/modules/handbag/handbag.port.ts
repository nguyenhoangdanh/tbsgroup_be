import { Requester } from 'src/share';
import {
  BagColorCondDTO,
  BagColorCreateDTO,
  BagColorProcessCondDTO,
  BagColorProcessCreateDTO,
  BagColorProcessUpdateDTO,
  BagColorUpdateDTO,
  HandBagCondDTO,
  HandBagCreateDTO,
  HandBagUpdateDTO,
  PaginationDTO,
} from './handbag.dto';
import { BagColor, BagColorProcess, HandBag } from './handbag.model';

// Interface cho handbag repository
export interface IHandBagRepository {
  // HandBag methods
  getHandBag(id: string): Promise<HandBag | null>;
  findHandBagByCode(code: string): Promise<HandBag | null>;
  findHandBagByCond(cond: HandBagCondDTO): Promise<HandBag | null>;
  listHandBags(
    conditions: HandBagCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: HandBag[];
    total: number;
  }>;
  insertHandBag(handBag: HandBag): Promise<void>;
  updateHandBag(id: string, dto: Partial<HandBag>): Promise<void>;
  deleteHandBag(id: string): Promise<void>;
  hasProductionRecords(handBagId: string): Promise<boolean>;

  // BagColor methods
  getBagColor(id: string): Promise<BagColor | null>;
  findBagColorByCode(
    handBagId: string,
    colorCode: string,
  ): Promise<BagColor | null>;
  listBagColors(
    conditions: BagColorCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagColor[];
    total: number;
  }>;
  insertBagColor(bagColor: BagColor): Promise<void>;
  updateBagColor(id: string, dto: Partial<BagColor>): Promise<void>;
  deleteBagColor(id: string): Promise<void>;
  hasProductionRecordsForColor(bagColorId: string): Promise<boolean>;

  // BagColorProcess methods
  getBagColorProcess(id: string): Promise<BagColorProcess | null>;
  findBagColorProcess(
    bagColorId: string,
    bagProcessId: string,
  ): Promise<BagColorProcess | null>;
  listBagColorProcesses(
    conditions: BagColorProcessCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagColorProcess[];
    total: number;
  }>;
  insertBagColorProcess(bagColorProcess: BagColorProcess): Promise<void>;
  updateBagColorProcess(
    id: string,
    dto: Partial<BagColorProcess>,
  ): Promise<void>;
  deleteBagColorProcess(id: string): Promise<void>;
}

// Interface cho handbag service
export interface IHandBagService {
  // HandBag methods
  createHandBag(requester: Requester, dto: HandBagCreateDTO): Promise<string>;
  updateHandBag(
    requester: Requester,
    id: string,
    dto: HandBagUpdateDTO,
  ): Promise<void>;
  deleteHandBag(requester: Requester, id: string): Promise<void>;
  getHandBag(id: string): Promise<HandBag>;
  listHandBags(
    conditions: HandBagCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: HandBag[];
    total: number;
    page: number;
    limit: number;
  }>;

  // BagColor methods
  createBagColor(requester: Requester, dto: BagColorCreateDTO): Promise<string>;
  updateBagColor(
    requester: Requester,
    id: string,
    dto: BagColorUpdateDTO,
  ): Promise<void>;
  deleteBagColor(requester: Requester, id: string): Promise<void>;
  getBagColor(id: string): Promise<BagColor>;
  listBagColors(
    conditions: BagColorCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagColor[];
    total: number;
    page: number;
    limit: number;
  }>;

  // BagColorProcess methods
  createBagColorProcess(
    requester: Requester,
    dto: BagColorProcessCreateDTO,
  ): Promise<string>;
  updateBagColorProcess(
    requester: Requester,
    id: string,
    dto: BagColorProcessUpdateDTO,
  ): Promise<void>;
  deleteBagColorProcess(requester: Requester, id: string): Promise<void>;
  getBagColorProcess(id: string): Promise<BagColorProcess>;
  listBagColorProcesses(
    conditions: BagColorProcessCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagColorProcess[];
    total: number;
    page: number;
    limit: number;
  }>;
}
