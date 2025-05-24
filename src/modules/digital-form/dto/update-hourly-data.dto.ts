import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class UpdateHourlyDataDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  hour: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  output: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  qualityIssues?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(AttendanceStatus)
  @IsOptional()
  attendanceStatus?: AttendanceStatus;
}
