import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { CategoriesService } from './categories.service';
import { CategoriesController, CategoriesAdminController } from './categories.controller';

@Module({
  imports: [MediaModule],
  controllers: [CategoriesController, CategoriesAdminController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
