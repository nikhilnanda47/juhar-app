import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { ProductsService } from './products.service';
import { ProductsController, ProductsAdminController } from './products.controller';

@Module({
  imports: [MediaModule],
  controllers: [ProductsController, ProductsAdminController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
