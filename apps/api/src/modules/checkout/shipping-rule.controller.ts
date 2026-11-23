import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SHIPPING } from '@juhar/shared';

/**
 * The shipping rule, public. The web and mobile apps show shipping costs and the free-delivery
 * progress in the cart, including for guests who have no address and so cannot ask for a quote;
 * they read the rule here instead of keeping their own copy of the numbers.
 * The amount actually charged is always worked out by the API when the order is placed.
 */
@ApiTags('Checkout')
@Controller('api/v1/config')
export class ShippingRuleController {
  @Get('shipping')
  @ApiOperation({ summary: 'Shipping rule: flat charge and the subtotal above which delivery is free (public)' })
  getShippingRule() {
    return { flatPaise: SHIPPING.FLAT_PAISE, freeAbovePaise: SHIPPING.FREE_ABOVE_PAISE };
  }
}
