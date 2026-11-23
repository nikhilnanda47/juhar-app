import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { OrderStatus } from '@juhar/shared';

export class OrderQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

export class AdminOrderQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Search by order number or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Only cash-on-delivery orders still "placed" for more than 24 hours (their stock is still held). ' +
      'Send true to filter; false or missing means no filter.',
  })
  @IsOptional()
  // The global pipe converts "false" to true on its own, so read the raw value
  @Transform(({ obj }) => obj.overdue === true || obj.overdue === 'true')
  @IsBoolean()
  overdue?: boolean;
}
