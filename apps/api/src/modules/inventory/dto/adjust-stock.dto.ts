import { IsUUID, IsInt, IsEnum, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdjustmentReason } from '@juhar/shared';

export const MAX_ADJUSTMENT = 10_000; // pieces in one change: a typo (an extra zero) is stopped, not stored
export const MAX_STOCK = 100_000;

/**
 * Change the on-hand stock of one colour. Give exactly ONE of:
 *  - `adjustment`: how many to add (positive) or remove (negative), or
 *  - `setTo`: the new on-hand count, for when someone has counted the shelf.
 * `setTo` is worked out against the stock at the moment the change is made (under a lock), so a
 * count of "7" always ends at 7 even if a parcel was shipped while the admin was typing.
 */
export class AdjustStockDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiPropertyOptional({ example: 5, description: 'Positive = add, negative = remove' })
  @IsOptional()
  @IsInt()
  @Min(-MAX_ADJUSTMENT)
  @Max(MAX_ADJUSTMENT)
  adjustment?: number;

  @ApiPropertyOptional({ example: 7, description: 'The new on-hand count (instead of `adjustment`)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_STOCK)
  setTo?: number;

  @ApiProperty({ enum: AdjustmentReason })
  @IsEnum(AdjustmentReason)
  reason!: AdjustmentReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
