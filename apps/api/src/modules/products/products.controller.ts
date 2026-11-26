import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MEDIA } from '@juhar/shared';
import { MediaService } from '../media/media.service';
import { UploadMediaDto, UpdateMediaDto, ReorderMediaDto } from '../media/dto/media.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductQueryDto, AdminProductQueryDto, CreateProductDto, UpdateProductDto, UpdateVariantDto } from './dto';
import { CreateVariantDto } from './dto/create-product.dto';
import { JwtAuthGuard, AdminAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

// ── Public Endpoints ──
@ApiTags('Products')
@Controller('api/v1/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Search and filter products' })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  // Must stay above ':slug', or "filters" would be read as a product slug
  @Get('filters')
  @ApiOperation({ summary: 'The values the shop filters can be chosen from (fabrics, weaves, colours, price range)' })
  async findFilterOptions() {
    return this.productsService.findFilterOptions();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product detail by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }
}

// ── Admin Endpoints ──
@ApiTags('Admin: Catalog')
@Controller('api/v1/admin/products')
@UseGuards(JwtAuthGuard, AdminAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductsAdminController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly mediaService: MediaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all products (including drafts)' })
  async findAll(@Query() query: AdminProductQueryDto) {
    return this.productsService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One product in full, with all its colours and their stock (admin edit page)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOneAdmin(id);
  }

  @Post()
  @Roles('owner', 'catalog_editor')
  @ApiOperation({ summary: 'Create product with variants' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @Roles('owner', 'catalog_editor')
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(id, dto, user.id);
  }

  @Post(':id/variants')
  @Roles('owner', 'catalog_editor')
  @ApiOperation({ summary: 'Add variant to product' })
  async addVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.addVariant(id, dto);
  }

  @Patch(':id/variants/:variantId')
  @Roles('owner', 'catalog_editor')
  @ApiOperation({ summary: 'Update variant' })
  async updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.updateVariant(id, variantId, dto, user.id);
  }

  // ── Photos ──
  // Every photo call answers with the product's whole photo list, in order, so the page can simply show it.

  @Get(':id/media')
  @ApiOperation({ summary: "A product's photos, in order (the first is the cover)" })
  async listMedia(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.list(id);
  }

  @Post(':id/media')
  @Roles('owner', 'catalog_editor')
  @ApiOperation({ summary: 'Upload a photo (multipart, the file in the part named "file"). It is shrunk and kept as WebP.' })
  // The size is checked by the service with a friendly message; this limit only stops absurd uploads early
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MEDIA.MAX_FILE_BYTES * 2, files: 1 } }))
  async uploadMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.add(id, file, dto, user.id);
  }

  // Must stay above ':mediaId', or "order" would be read as a photo id
  @Patch(':id/media/order')
  @Roles('owner', 'catalog_editor')
  @ApiOperation({ summary: 'Put the photos in a new order (every photo id, the first becomes the cover)' })
  async reorderMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.reorder(id, dto.ids, user.id);
  }

  @Patch(':id/media/:mediaId')
  @Roles('owner', 'catalog_editor')
  @ApiOperation({ summary: "Change a photo's description or the colour it shows" })
  async updateMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @Body() dto: UpdateMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.update(id, mediaId, dto, user.id);
  }

  @Delete(':id/media/:mediaId')
  @Roles('owner', 'catalog_editor')
  @ApiOperation({ summary: 'Remove a photo and its files' })
  async removeMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.remove(id, mediaId, user.id);
  }
}
