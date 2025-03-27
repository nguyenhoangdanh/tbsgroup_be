import { Requester } from 'src/share';
import {
  BagGroupRateCondDTO,
  BagGroupRateCreateDTO,
  BagGroupRateUpdateDTO,
  PaginationDTO,
} from './bag-group-rate.dto';
import { BagGroupRate } from './bag-group-rate.model';

// Interface cho repository
export interface IBagGroupRateRepository {
  getBagGroupRate(id: string): Promise<BagGroupRate | null>;
  findBagGroupRate(handBagId: string, groupId: string): Promise<BagGroupRate | null>;
  listBagGroupRates(
    conditions: BagGroupRateCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: BagGroupRate[];
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
  createBagGroupRate(requester: Requester, dto: BagGroupRateCreateDTO): Promise<string>;
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
    data: BagGroupRate[];
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
}