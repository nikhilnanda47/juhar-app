import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeliveryCheckQueryDto {
  @ApiProperty({ example: '768001', description: 'A 6 digit PIN code' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN code must be 6 digits' })
  pin!: string;
}
