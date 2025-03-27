import { Requester } from 'src/share';
import {
  GroupCondDTO,
  GroupCreateDTO,
  GroupLeaderCreateDTO,
  GroupLeaderUpdateDTO,
  GroupUpdateDTO,
  PaginationDTO,
} from './group.dto';
import { Group, GroupLeader } from './group.model';

// Interface cho repository
export interface IGroupRepository {
  getGroup(id: string): Promise<Group | null>;
  findGroupByCode(code: string): Promise<Group | null>;
  findGroupByCond(cond: GroupCondDTO): Promise<Group | null>;
  listGroups(
    conditions: GroupCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: Group[];
    total: number;
  }>;
  insertGroup(group: Group): Promise<void>;
  updateGroup(id: string, dto: Partial<Group>): Promise<void>;
  deleteGroup(id: string): Promise<void>;
  
  // GroupLeader methods
  getGroupLeaders(groupId: string): Promise<GroupLeader[]>;
  addGroupLeader(groupLeader: GroupLeader): Promise<void>;
  updateGroupLeader(groupId: string, userId: string, dto: Partial<GroupLeader>): Promise<void>;
  removeGroupLeader(groupId: string, userId: string): Promise<void>;
  
  // Check if Group has any dependencies
  hasUsers(groupId: string): Promise<boolean>;
  hasProductionRates(groupId: string): Promise<boolean>;
  
  // Group with statistics
  getGroupWithPerformanceStats(groupId: string): Promise<any>;
  listGroupsWithPerformanceStats(
    conditions: GroupCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: any[];
    total: number;
  }>;
}

// Interface cho service
export interface IGroupService {
  createGroup(requester: Requester, dto: GroupCreateDTO): Promise<string>;
  updateGroup(
    requester: Requester,
    id: string,
    dto: GroupUpdateDTO,
  ): Promise<void>;
  deleteGroup(requester: Requester, id: string): Promise<void>;
  getGroup(id: string): Promise<Group>;
  listGroups(
    conditions: GroupCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: Group[];
    total: number;
    page: number;
    limit: number;
  }>;
  
  // GroupLeader methods
  assignGroupLeader(
    requester: Requester,
    dto: GroupLeaderCreateDTO,
  ): Promise<void>;
  updateGroupLeader(
    requester: Requester,
    groupId: string,
    userId: string,
    dto: GroupLeaderUpdateDTO,
  ): Promise<void>;
  removeGroupLeader(
    requester: Requester,
    groupId: string,
    userId: string,
  ): Promise<void>;
  getGroupLeaders(groupId: string): Promise<GroupLeader[]>;
  
  // Group performance
  getGroupPerformance(id: string): Promise<any>;
  listGroupsWithPerformance(
    conditions: GroupCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }>;
}