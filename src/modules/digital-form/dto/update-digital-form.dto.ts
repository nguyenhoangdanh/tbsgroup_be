import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ShiftType } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';
import { CreateDigitalFormDto } from './create-digital-form.dto';

export class UpdateDigitalFormDto extends PartialType(CreateDigitalFormDto) {
  @IsString()
  @IsOptional()
  formName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsEnum(ShiftType)
  @IsOptional()
  shiftType?: ShiftType;

  @IsUUID()
  @IsOptional()
  factoryId?: string;

  @IsUUID()
  @IsOptional()
  lineId?: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  groupId?: string;
}
