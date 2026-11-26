import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { ShippingRuleController } from './shipping-rule.controller';
import { DeliveryController } from './delivery.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [CheckoutController, ShippingRuleController, DeliveryController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
