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
import { ProductionIssueType } from '@prisma/client';

export class CreateIssueDto {
  @IsEnum(ProductionIssueType)
  @IsNotEmpty()
  type: ProductionIssueType;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  hour: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  impact?: number;

  @IsString()
  @IsOptional()
  description?: string;
}
