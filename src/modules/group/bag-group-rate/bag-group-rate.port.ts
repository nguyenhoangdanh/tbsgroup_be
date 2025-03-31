import { Requester } from 'src/share';
import {
  BagGroupRateCondDTO,
  BagGroupRateCreateDTO,
  BagGroupRateUpdateDTO,
  BatchCreateBagGroupRateDTO,
  PaginationDTO,
} from './bag-group-rate.dto';
import { BagGroupRate, BagGroupRateWithName } from './bag-group-rate.model';

// Interface cho repository
export interface IBagGroupRateRepository {
  getBagGroupRate(id: string): Promise<BagGroupRate | null>;
  findBagGroupRate(
    handBagId: string,
    groupId: string,
  ): Promise<BagGroupRate | null>;
  listBagGroupRates(
    conditions: BagGroupRateCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagGroupRateWithName[];
    total: number;
  }>;
  insertBagGroupRate(bagGroupRate: BagGroupRate): Promise<void>;
  updateBagGroupRate(id: string, dto: Partial<BagGroupRate>): Promise<void>;
  deleteBagGroupRate(id: string): Promise<void>;
  getBagGroupRatesForHandBag(handBagId: string): Promise<BagGroupRate[]>;
  getBagGroupRatesForGroup(groupId: string): Promise<BagGroupRate[]>;
}

// Interface cho service
export interface IBagGroupRateService {
  createBagGroupRate(
    requester: Requester,
    dto: BagGroupRateCreateDTO,
  ): Promise<string>;
  batchCreateBagGroupRates(
    requester: Requester,
    dto: BatchCreateBagGroupRateDTO,
  ): Promise<string[]>;
  updateBagGroupRate(
    requester: Requester,
    id: string,
    dto: BagGroupRateUpdateDTO,
  ): Promise<void>;
  deleteBagGroupRate(requester: Requester, id: string): Promise<void>;
  getBagGroupRate(id: string): Promise<BagGroupRate>;
  listBagGroupRates(
    conditions: BagGroupRateCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagGroupRateWithName[];
    total: number;
    page: number;
    limit: number;
  }>;
  getBagGroupRatesForHandBag(handBagId: string): Promise<BagGroupRate[]>;
  getBagGroupRatesForGroup(groupId: string): Promise<BagGroupRate[]>;

  // Hàm tiện ích
  getProductivityAnalysis(handBagId: string): Promise<{
    handBag: any;
    groups: any[];
    averageOutputRate: number;
    highestOutputRate: number;
    lowestOutputRate: number;
  }>;

  // In bag-group-rate.port.ts, add this to IBagGroupRateService interface:
  groupBagGroupRatesByHandBag(): Promise<{
    handBags: {
      id: string;
      code: string;
      name: string;
      imageUrl?: string | null;
      totalGroups: number;
      averageOutputRate: number;
      lowestOutputRate: number;
      highestOutputRate: number;
    }[];
  }>;

  // Thêm vào IBagGroupRateService trong bag-group-rate.port.ts
  getHandBagGroupRatesDetails(handBagId: string): Promise<{
    handBag: {
      id: string;
      code: string;
      name: string;
      imageUrl?: string;
      description?: string;
      material?: string;
      dimensions?: string;
    };
    groups: any[];
    statistics: {
      totalGroups: number;
      averageOutputRate: number;
      highestOutputRate: number;
      lowestOutputRate: number;
    };
  }>;
}
