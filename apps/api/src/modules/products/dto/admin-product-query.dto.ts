import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PublishStatus } from '@juhar/shared';
import { ProductQueryDto } from './product-query.dto';

/**
 * Admin product list query. It must be a class (not an inline type) so the global
 * ValidationPipe checks and converts it: without that, `?limit=20` arrives as the text "20"
 * and the list fails.
 */
export class AdminProductQueryDto extends ProductQueryDto {
  @ApiPropertyOptional({ enum: PublishStatus, description: 'Only products with this publish status' })
  @IsOptional()
  @IsEnum(PublishStatus)
  publishStatus?: PublishStatus;
}
