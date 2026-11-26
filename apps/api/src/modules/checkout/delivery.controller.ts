import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { checkDelivery } from '@juhar/shared';
import { DeliveryCheckQueryDto } from './dto/delivery-check-query.dto';

/**
 * Can we deliver to a PIN code? Public: the product page asks it before the customer has an address, and a guest has
 * no account. The rule itself lives in packages/shared (`checkDelivery`), the same one checkout and the address
 * forms use, so the product page can never promise what checkout then refuses.
 */
@ApiTags('Checkout')
@Controller('api/v1/delivery')
export class DeliveryController {
  @Get('check')
  @ApiOperation({ summary: 'Can we deliver to this PIN code? Days and cash-on-delivery (public)' })
  check(@Query() query: DeliveryCheckQueryDto) {
    return checkDelivery(query.pin);
  }
}
