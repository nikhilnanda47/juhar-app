import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductQueryDto, AdminProductQueryDto, CreateProductDto, UpdateProductDto, UpdateVariantDto } from './dto';
import { CreateVariantDto } from './dto/create-product.dto';
import { generateSlug, ProductSortBy, PublishStatus, PAGINATION, INVENTORY } from '@juhar/shared';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────
  // PUBLIC ENDPOINTS
  // ─────────────────────────────────────

  /**
   * Paginated product catalog with search, filters, and sorting.
   * Only returns published products with active variants.
   */
  async findAll(query: ProductQueryDto) {
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;

    // Build WHERE clause
    const where: Prisma.ProductWhereInput = {
      publishStatus: 'published',
      variants: { some: { active: true } },
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { tags: { hasSome: [query.search.toLowerCase()] } },
      ];
    }

    if (query.fabric) {
      where.fabric = { equals: query.fabric, mode: 'insensitive' };
    }

    if (query.weaveMethod) {
      where.weaveMethod = { equals: query.weaveMethod, mode: 'insensitive' };
    }

    // Price and color filters applied via variant relation
    if (query.minPrice || query.maxPrice || query.color) {
      const variantFilter: Prisma.ProductVariantWhereInput = { active: true };
      if (query.minPrice) variantFilter.pricePaise = { ...variantFilter.pricePaise as object, gte: query.minPrice };
      if (query.maxPrice) variantFilter.pricePaise = { ...variantFilter.pricePaise as object, lte: query.maxPrice };
      if (query.color) variantFilter.color = { equals: query.color, mode: 'insensitive' };
      where.variants = { some: variantFilter };
    }

    // What a product card needs; the same for every sort order.
    const include = {
      category: { select: { slug: true, name: true } },
      variants: {
        where: { active: true },
        orderBy: { pricePaise: 'asc' },
        include: {
          inventory: { select: { onHand: true, reserved: true, unavailable: true } },
        },
      },
      media: {
        where: { type: 'image' },
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
    } as const;

    let items: any[];
    let hasMore: boolean;
    let nextCursor: string | null;

    if (query.sortBy === ProductSortBy.PRICE_ASC || query.sortBy === ProductSortBy.PRICE_DESC) {
      ({ items, hasMore, nextCursor } = await this.findPageByPrice(
        where,
        include,
        limit,
        query.cursor,
        query.sortBy === ProductSortBy.PRICE_DESC,
      ));
    } else {
      // Newest first (also used when no sort is given)
      const findArgs: Prisma.ProductFindManyArgs = {
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // id breaks ties, so paging never skips or repeats
        take: limit + 1,
        include,
      };

      if (query.cursor) {
        findArgs.cursor = { id: query.cursor };
        findArgs.skip = 1;
      }

      const products = await this.prisma.product.findMany(findArgs as any);
      hasMore = products.length > limit;
      items = hasMore ? products.slice(0, limit) : products;
      nextCursor = hasMore ? items[items.length - 1].id : null;
    }

    // Transform to ProductCard shape
    const cards = items.map((product: any) => {
      const lowestVariant = product.variants[0];
      const totalAvailable = product.variants.reduce((sum: number, v: any) => {
        const inv = v.inventory;
        return sum + (inv ? inv.onHand - inv.reserved - inv.unavailable : 0);
      }, 0);

      return {
        id: product.id,
        slug: product.slug,
        title: product.title,
        shortDescription: product.shortDescription,
        categorySlug: product.category.slug,
        primaryImage: product.media[0]
          ? { url: product.media[0].thumbnailKey || product.media[0].objectKey, alt: product.media[0].altText }
          : null,
        startingPricePaise: lowestVariant?.pricePaise ?? 0,
        compareAtPaise: lowestVariant?.compareAtPaise ?? null,
        isAvailable: totalAvailable > 0,
        fabric: product.fabric,
        weaveMethod: product.weaveMethod,
      };
    });

    return { items: cards, cursor: nextCursor, hasMore };
  }

  /**
   * One page of the catalog sorted by price, for the same filters as the newest-first list.
   *
   * The price of a product is its cheapest active variant, which is the price its card shows.
   * The ordering is done by the database over the products that match the filters (ties
   * are broken by id so the order is stable), and the cursor is the id of the last product
   * on the page, so "load more" continues from exactly that place in the price order.
   * The ids of all matching products are read on each request, which is fine for a catalog
   * of up to a few thousand products.
   */
  private async findPageByPrice(
    where: Prisma.ProductWhereInput,
    include: Prisma.ProductInclude,
    limit: number,
    cursor: string | undefined,
    descending: boolean,
  ): Promise<{ items: any[]; hasMore: boolean; nextCursor: string | null }> {
    const matching = await this.prisma.product.findMany({ where, select: { id: true } });
    const ids = matching.map((p) => p.id);
    if (ids.length === 0) return { items: [], hasMore: false, nextCursor: null };

    const direction = descending ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const ordered = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT v.product_id AS id
      FROM product_variants v
      WHERE v.active = true AND v.product_id = ANY(${ids}::uuid[])
      GROUP BY v.product_id
      ORDER BY MIN(v.price_paise) ${direction}, v.product_id ASC
    `;
    const orderedIds = ordered.map((row) => row.id);

    let start = 0;
    if (cursor) {
      const position = orderedIds.indexOf(cursor);
      // A cursor that is not in the list (product removed or unpublished): nothing more to show
      if (position === -1) return { items: [], hasMore: false, nextCursor: null };
      start = position + 1;
    }

    const pageIds = orderedIds.slice(start, start + limit + 1);
    const hasMore = pageIds.length > limit;
    const idsOnPage = hasMore ? pageIds.slice(0, limit) : pageIds;
    if (idsOnPage.length === 0) return { items: [], hasMore: false, nextCursor: null };

    const products = await this.prisma.product.findMany({
      where: { id: { in: idsOnPage } },
      include,
    } as any);
    const byId = new Map<string, any>(products.map((product: any) => [product.id, product]));
    const items = idsOnPage.map((id) => byId.get(id)).filter(Boolean);

    return { items, hasMore, nextCursor: hasMore ? idsOnPage[idsOnPage.length - 1] : null };
  }

  /**
   * Full product detail by slug (public).
   */
  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            inventory: { select: { onHand: true, reserved: true, unavailable: true } },
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product || product.publishStatus !== 'published') {
      throw new NotFoundException({ code: 'PROD_001', message: 'Product not found' });
    }

    // Transform variants with availability
    const variants = product.variants.map((v) => {
      const inv = v.inventory;
      const available = inv ? inv.onHand - inv.reserved - inv.unavailable : 0;
      return {
        id: v.id,
        sku: v.sku,
        name: v.name,
        color: v.color,
        attributes: v.attributes,
        pricePaise: v.pricePaise,
        compareAtPaise: v.compareAtPaise,
        available,
        isAvailable: available > 0,
        active: v.active,
      };
    });

    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      shortDescription: product.shortDescription,
      category: product.category,
      publishStatus: product.publishStatus,
      fabric: product.fabric,
      weaveMethod: product.weaveMethod,
      origin: product.origin,
      careInstructions: product.careInstructions,
      blousePiece: product.blousePiece,
      length: product.length,
      width: product.width,
      weight: product.weight,
      occasion: product.occasion,
      tags: product.tags,
      media: product.media.map((m) => ({
        id: m.id,
        url: m.thumbnailKey || m.objectKey,
        thumbnailUrl: m.thumbnailKey,
        type: m.type,
        altText: m.altText,
        sortOrder: m.sortOrder,
      })),
      variants,
      createdAt: product.createdAt,
    };
  }

  // ─────────────────────────────────────
  // ADMIN ENDPOINTS
  // ─────────────────────────────────────

  /**
   * Admin product list (includes drafts and archived).
   */
  async findAllAdmin(query: AdminProductQueryDto) {
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;

    const where: Prisma.ProductWhereInput = {};
    if (query.publishStatus) where.publishStatus = query.publishStatus;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const findArgs: Prisma.ProductFindManyArgs = {
      where,
      // id breaks ties, so products created in the same instant keep one fixed order across pages
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        category: true,
        variants: {
          include: { inventory: true },
        },
        media: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { variants: true } },
      },
    };

    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    // The counts cover the whole catalog (not just this page or filter), for the page headings,
    // the filter buttons and the dashboard's Low Stock tile.
    const [products, byStatus, variants, lowStock] = await Promise.all([
      this.prisma.product.findMany(findArgs as any),
      this.prisma.product.groupBy({ by: ['publishStatus'], _count: { _all: true } }),
      this.prisma.productVariant.count(),
      this.countLowStockVariants(),
    ]);

    const hasMore = products.length > limit;
    const items = hasMore ? products.slice(0, limit) : products;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const statusCount = (status: string) =>
      byStatus.find((row) => row.publishStatus === status)?._count._all ?? 0;

    return {
      items,
      cursor: nextCursor,
      hasMore,
      counts: {
        products: byStatus.reduce((sum, row) => sum + row._count._all, 0),
        published: statusCount('published'),
        draft: statusCount('draft'),
        archived: statusCount('archived'),
        variants,
        lowStock,
        lowStockThreshold: INVENTORY.LOW_STOCK_THRESHOLD, // what "low" means, for the pages to show
      },
    };
  }

  /**
   * Active variants with 1 to LOW_STOCK_THRESHOLD pieces available (on hand - reserved - unavailable).
   * A variant with none left is out of stock, not low stock. The comparison is between two columns,
   * which Prisma cannot express, so it is plain SQL.
   */
  private async countLowStockVariants(): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count
      FROM inventory i
      JOIN product_variants v ON v.id = i.variant_id
      WHERE v.active
        AND i.on_hand - i.reserved - i.unavailable BETWEEN 1 AND ${INVENTORY.LOW_STOCK_THRESHOLD}`;
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * Create product with variants and initial inventory (admin).
   * All created in a single transaction.
   */
  async create(dto: CreateProductDto) {
    const slug = generateSlug(dto.title);

    // Check slug uniqueness
    const existingSlug = await this.prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException({ code: 'PROD_002', message: `Product slug "${slug}" already exists` });
    }

    // Check SKU uniqueness for all variants
    const skus = dto.variants.map((v) => v.sku);
    const existingSkus = await this.prisma.productVariant.findMany({
      where: { sku: { in: skus } },
      select: { sku: true },
    });
    if (existingSkus.length > 0) {
      throw new ConflictException({
        code: 'PROD_003',
        message: `SKU(s) already exist: ${existingSkus.map((s) => s.sku).join(', ')}`,
      });
    }

    // Validate category exists
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new BadRequestException({ code: 'PROD_004', message: 'Category not found' });
    }

    // Validate compare_at > price for each variant
    for (const v of dto.variants) {
      if (v.compareAtPaise && v.compareAtPaise <= v.pricePaise) {
        throw new BadRequestException({
          code: 'PROD_005',
          message: `Compare-at price must be greater than price for SKU ${v.sku}`,
        });
      }
    }

    // Create everything in a transaction
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          slug,
          title: dto.title,
          description: dto.description,
          shortDescription: dto.shortDescription,
          categoryId: dto.categoryId,
          publishStatus: dto.publishStatus || PublishStatus.DRAFT,
          fabric: dto.fabric,
          weaveMethod: dto.weaveMethod,
          origin: dto.origin,
          careInstructions: dto.careInstructions,
          blousePiece: dto.blousePiece,
          length: dto.length,
          width: dto.width,
          weight: dto.weight,
          occasion: dto.occasion || [],
          tags: dto.tags || [],
        },
      });

      // Create variants + inventory
      for (const [index, variantDto] of dto.variants.entries()) {
        const variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: variantDto.sku,
            name: variantDto.name,
            color: variantDto.color,
            attributes: (variantDto.attributes as any) ?? Prisma.JsonNull,
            pricePaise: variantDto.pricePaise,
            compareAtPaise: variantDto.compareAtPaise,
            sortOrder: index,
          },
        });

        await tx.inventory.create({
          data: {
            variantId: variant.id,
            onHand: variantDto.initialStock,
          },
        });
      }

      // Return full product with relations
      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          variants: { include: { inventory: true } },
          media: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });
  }

  /**
   * Update product (admin).
   */
  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({ code: 'PROD_001', message: 'Product not found' });
    }

    // If title changes, update slug
    let slug: string | undefined;
    if (dto.title && dto.title !== product.title) {
      slug = generateSlug(dto.title);
      const existing = await this.prisma.product.findUnique({ where: { slug } });
      if (existing && existing.id !== id) {
        throw new ConflictException({ code: 'PROD_002', message: `Slug "${slug}" already exists` });
      }
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) {
        throw new BadRequestException({ code: 'PROD_004', message: 'Category not found' });
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(slug && { slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.publishStatus && { publishStatus: dto.publishStatus }),
        ...(dto.fabric !== undefined && { fabric: dto.fabric }),
        ...(dto.weaveMethod !== undefined && { weaveMethod: dto.weaveMethod }),
        ...(dto.origin !== undefined && { origin: dto.origin }),
        ...(dto.careInstructions !== undefined && { careInstructions: dto.careInstructions }),
        ...(dto.blousePiece !== undefined && { blousePiece: dto.blousePiece }),
        ...(dto.length !== undefined && { length: dto.length }),
        ...(dto.width !== undefined && { width: dto.width }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.occasion && { occasion: dto.occasion }),
        ...(dto.tags && { tags: dto.tags }),
      },
      include: {
        category: true,
        variants: { include: { inventory: true } },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  /**
   * Add variant to existing product (admin).
   */
  async addVariant(productId: string, dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException({ code: 'PROD_001', message: 'Product not found' });
    }

    const existing = await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } });
    if (existing) {
      throw new ConflictException({ code: 'PROD_003', message: `SKU "${dto.sku}" already exists` });
    }

    if (dto.compareAtPaise && dto.compareAtPaise <= dto.pricePaise) {
      throw new BadRequestException({ code: 'PROD_005', message: 'Compare-at price must be greater than price' });
    }

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({
        data: {
          productId,
          sku: dto.sku,
          name: dto.name,
          color: dto.color,
          attributes: (dto.attributes as any) ?? Prisma.JsonNull,
          pricePaise: dto.pricePaise,
          compareAtPaise: dto.compareAtPaise,
        },
      });

      await tx.inventory.create({
        data: {
          variantId: variant.id,
          onHand: dto.initialStock,
        },
      });

      return tx.productVariant.findUnique({
        where: { id: variant.id },
        include: { inventory: true },
      });
    });
  }

  /**
   * Update variant (admin).
   */
  async updateVariant(productId: string, variantId: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) {
      throw new NotFoundException({ code: 'PROD_001', message: 'Variant not found' });
    }

    // The database refuses a compare-at price that is not above the price, so check the
    // values the variant will have after this update (the other one may be the stored value).
    const newPrice = dto.pricePaise ?? variant.pricePaise;
    const newCompareAt = dto.compareAtPaise !== undefined ? dto.compareAtPaise : variant.compareAtPaise;
    if (newCompareAt != null && newCompareAt <= newPrice) {
      throw new BadRequestException({
        code: 'PROD_005',
        message: 'Compare-at price must be greater than price. Raise the compare-at price or remove it.',
      });
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.attributes !== undefined && { attributes: (dto.attributes as any) ?? Prisma.JsonNull }),
        ...(dto.pricePaise !== undefined && { pricePaise: dto.pricePaise }),
        ...(dto.compareAtPaise !== undefined && { compareAtPaise: dto.compareAtPaise }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: { inventory: true },
    });
  }
}
