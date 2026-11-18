import { IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMode } from '@juhar/shared';

export class CheckoutQuoteDto {
  @ApiProperty()
  @IsUUID()
  addressId!: string;

  @ApiProperty({ enum: PaymentMode })
  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;
}
