import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@juhar/shared';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({ description: 'Tracking ID (required when shipping)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingId?: string;

  @ApiPropertyOptional({ description: 'Courier name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  courierName?: string;

  @ApiPropertyOptional({ description: 'Why the order is cancelled (required when status is "cancelled")', maxLength: 255 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((o) => o.status === OrderStatus.CANCELLED)
  @IsString()
  @IsNotEmpty({ message: 'A cancellation reason is required' })
  @MaxLength(255)
  reason?: string;
}

export class CancelOrderDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  reason!: string;
}
