import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShiftType } from '@prisma/client';

class ProcessEntryDto {
  @IsUUID()
  @IsNotEmpty()
  handBagId: string;

  @IsUUID()
  @IsNotEmpty()
  bagColorId: string;

  @IsUUID()
  @IsNotEmpty()
  processId: string;

  @IsOptional()
  plannedOutput?: number;
}

class WorkerEntryDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessEntryDto)
  processes: ProcessEntryDto[];
}

export class CreateDigitalFormDto {
  @IsString()
  @IsNotEmpty()
  formName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsEnum(ShiftType)
  @IsNotEmpty()
  shiftType: ShiftType;

  @IsUUID()
  @IsNotEmpty()
  factoryId: string;

  @IsUUID()
  @IsNotEmpty()
  lineId: string;

  @IsUUID()
  @IsNotEmpty()
  teamId: string;

  @IsUUID()
  @IsNotEmpty()
  groupId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkerEntryDto)
  @IsOptional()
  workers?: WorkerEntryDto[];
}
