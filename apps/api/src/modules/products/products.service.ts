import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, ProductMedia } from '@prisma/client';
import { asJson, jsonOrNull } from '../../common/audit/json';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { ProductQueryDto, AdminProductQueryDto, CreateProductDto, UpdateProductDto, UpdateVariantDto } from './dto';
import { CreateVariantDto } from './dto/create-product.dto';
import { generateSlug, ProductSortBy, PublishStatus, PAGINATION, INVENTORY } from '@juhar/shared';

/** What a product card needs (the shop list); the same for every sort order. */
const CARD_INCLUDE = {
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
} as const satisfies Prisma.ProductInclude;
type CardRow = Prisma.ProductGetPayload<{ include: typeof CARD_INCLUDE }>;

/** What the admin's product list shows for each product. */
const ADMIN_LIST_INCLUDE = {
  category: true,
  variants: { include: { inventory: true } },
  media: { orderBy: { sortOrder: 'asc' } },
  _count: { select: { variants: true } },
} as const satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  /** A product from the admin side with its photos as addresses (the database holds keys) and the cover for lists */
  private withPhotos<T extends { media?: ProductMedia[] }>(product: T) {
    const photos = (product.media ?? []).filter((m) => m.type === 'image');
    return { ...product, media: photos.map((m) => this.media.present(m)), primaryImage: this.media.card(photos[0]) };
  }

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


    let items: CardRow[];
    let hasMore: boolean;
    let nextCursor: string | null;
    let total: number; // every product that matches the filters, over all pages ("58 sarees")

    if (query.sortBy === ProductSortBy.PRICE_ASC || query.sortBy === ProductSortBy.PRICE_DESC) {
      ({ items, hasMore, nextCursor, total } = await this.findPageByPrice(
        where,
        limit,
        query.cursor,
        query.sortBy === ProductSortBy.PRICE_DESC,
      ));
    } else {
      // Newest first (also used when no sort is given)
      const findArgs = {
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // id breaks ties, so paging never skips or repeats
        take: limit + 1,
        include: CARD_INCLUDE,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      } satisfies Prisma.ProductFindManyArgs;

      const [products, count] = await Promise.all([
        this.prisma.product.findMany(findArgs),
        this.prisma.product.count({ where }),
      ]);
      total = count;
      hasMore = products.length > limit;
      items = hasMore ? products.slice(0, limit) : products;
      nextCursor = hasMore ? items[items.length - 1].id : null;
    }

    // Transform to ProductCard shape
    const cards = items.map((product) => {
      const lowestVariant = product.variants[0];
      const totalAvailable = product.variants.reduce((sum, v) => {
        const inv = v.inventory;
        return sum + (inv ? inv.onHand - inv.reserved - inv.unavailable : 0);
      }, 0);

      return {
        id: product.id,
        slug: product.slug,
        title: product.title,
        shortDescription: product.shortDescription,
        categorySlug: product.category.slug,
        primaryImage: this.media.card(product.media[0]),
        startingPricePaise: lowestVariant?.pricePaise ?? 0,
        compareAtPaise: lowestVariant?.compareAtPaise ?? null,
        isAvailable: totalAvailable > 0,
        fabric: product.fabric,
        weaveMethod: product.weaveMethod,
        firstVariantId: lowestVariant?.id ?? null,
      };
    });

    return { items: cards, cursor: nextCursor, hasMore, total };
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
    limit: number,
    cursor: string | undefined,
    descending: boolean,
  ): Promise<{ items: CardRow[]; hasMore: boolean; nextCursor: string | null; total: number }> {
    const matching = await this.prisma.product.findMany({ where, select: { id: true } });
    const ids = matching.map((p) => p.id);
    if (ids.length === 0) return { items: [], hasMore: false, nextCursor: null, total: 0 };

    const direction = descending ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const ordered = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT v.product_id AS id
      FROM product_variants v
      WHERE v.active = true AND v.product_id = ANY(${ids}::uuid[])
      GROUP BY v.product_id
      ORDER BY MIN(v.price_paise) ${direction}, v.product_id ASC
    `;
    const orderedIds = ordered.map((row) => row.id);
    const total = orderedIds.length;

    let start = 0;
    if (cursor) {
      const position = orderedIds.indexOf(cursor);
      // A cursor that is not in the list (product removed or unpublished): nothing more to show
      if (position === -1) return { items: [], hasMore: false, nextCursor: null, total };
      start = position + 1;
    }

    const pageIds = orderedIds.slice(start, start + limit + 1);
    const hasMore = pageIds.length > limit;
    const idsOnPage = hasMore ? pageIds.slice(0, limit) : pageIds;
    if (idsOnPage.length === 0) return { items: [], hasMore: false, nextCursor: null, total };

    const products = await this.prisma.product.findMany({
      where: { id: { in: idsOnPage } },
      include: CARD_INCLUDE,
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    const items = idsOnPage.map((id) => byId.get(id)).filter((product): product is CardRow => !!product);

    return { items, hasMore, nextCursor: hasMore ? idsOnPage[idsOnPage.length - 1] : null, total };
  }

  /**
   * What the shop's filters can be chosen from: the fabrics, weaves and colours that the visible
   * catalog really has, and its price range. Read from the data, so the filter lists never offer
   * a value that matches nothing and never miss a new one. "Visible" is the same as in the list:
   * published products, active variants only.
   */
  async findFilterOptions() {
    const visibleProduct: Prisma.ProductWhereInput = {
      publishStatus: 'published',
      variants: { some: { active: true } },
    };
    const visibleVariant: Prisma.ProductVariantWhereInput = { active: true, product: { publishStatus: 'published' } };

    const [fabrics, weaves, colors, prices] = await Promise.all([
      this.prisma.product.groupBy({ by: ['fabric'], where: { ...visibleProduct, fabric: { not: null } } }),
      this.prisma.product.groupBy({ by: ['weaveMethod'], where: { ...visibleProduct, weaveMethod: { not: null } } }),
      this.prisma.productVariant.groupBy({ by: ['color'], where: { ...visibleVariant, color: { not: null } } }),
      this.prisma.productVariant.aggregate({ where: visibleVariant, _min: { pricePaise: true }, _max: { pricePaise: true } }),
    ]);

    return {
      fabrics: distinctSorted(fabrics.map((row) => row.fabric)),
      weaveMethods: distinctSorted(weaves.map((row) => row.weaveMethod)),
      colors: distinctSorted(colors.map((row) => row.color)),
      minPricePaise: prices._min.pricePaise ?? null,
      maxPricePaise: prices._max.pricePaise ?? null,
    };
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
      media: product.media.filter((m) => m.type === 'image').map((m) => this.media.present(m)),
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

    const findArgs = {
      where,
      // id breaks ties, so products created in the same instant keep one fixed order across pages
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: ADMIN_LIST_INCLUDE,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    } satisfies Prisma.ProductFindManyArgs;

    // The counts cover the whole catalog (not just this page or filter), for the page headings,
    // the filter buttons and the dashboard's Low Stock tile.
    const [products, byStatus, variants, lowStock] = await Promise.all([
      this.prisma.product.findMany(findArgs),
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
      items: items.map((item) => this.withPhotos(item)),
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
            attributes: jsonOrNull(variantDto.attributes),
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
      const created = await tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          variants: { include: { inventory: true } },
          media: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return created ? this.withPhotos(created) : created;
    });
  }

  /**
   * One product for the admin edit page: every field, the category, and ALL its colours (also the ones
   * hidden from the shop) with their stock.
   */
  async findOneAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: { include: { inventory: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException({ code: 'PROD_001', message: 'Product not found' });
    return this.withPhotos(product);
  }

  /**
   * Update product (admin). Only the fields that are sent AND really differ are written; if nothing
   * differs, nothing is written. The change is recorded in the audit trail (what it was, what it is now).
   *
   * The shop address (slug) follows the title only while the product is still a draft. Once a product has
   * been published its address stays the same, so links people have already shared keep working.
   */
  async update(id: string, dto: UpdateProductDto, adminId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({ code: 'PROD_001', message: 'Product not found' });
    }

    let slug: string | undefined;
    if (dto.title && dto.title !== product.title && product.publishStatus === PublishStatus.DRAFT) {
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

    const wanted: Record<string, unknown> = {
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
    };
    const { before, after } = changedFields(product, wanted);
    const include = {
      category: true,
      variants: { include: { inventory: true } },
      media: { orderBy: { sortOrder: 'asc' as const } },
    };
    if (Object.keys(after).length === 0) {
      return this.withPhotos(await this.prisma.product.findUniqueOrThrow({ where: { id }, include }));
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: after as Prisma.ProductUpdateInput, include });
      await tx.auditEvent.create({
        data: {
          action: 'product.updated',
          entityType: 'product',
          entityId: id,
          actorType: 'admin',
          actorId: adminId,
          beforeState: asJson(before),
          afterState: asJson(after),
        },
      });
      return this.withPhotos(updated);
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
          attributes: jsonOrNull(dto.attributes),
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
   * Update variant (admin). Only fields that really differ are written, and the change (a new price,
   * a colour hidden from the shop) is recorded in the audit trail.
   */
  async updateVariant(productId: string, variantId: string, dto: UpdateVariantDto, adminId?: string) {
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

    const wanted: Record<string, unknown> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.color !== undefined && { color: dto.color }),
      ...(dto.attributes !== undefined && { attributes: jsonOrNull(dto.attributes) }),
      ...(dto.pricePaise !== undefined && { pricePaise: dto.pricePaise }),
      ...(dto.compareAtPaise !== undefined && { compareAtPaise: dto.compareAtPaise }),
      ...(dto.active !== undefined && { active: dto.active }),
    };
    const { before, after } = changedFields(variant, wanted);
    if (Object.keys(after).length === 0) {
      return this.prisma.productVariant.findUniqueOrThrow({ where: { id: variantId }, include: { inventory: true } });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({ where: { id: variantId }, data: after as Prisma.ProductVariantUpdateInput, include: { inventory: true } });
      await tx.auditEvent.create({
        data: {
          action: 'variant.updated',
          entityType: 'product_variant',
          entityId: variantId,
          actorType: 'admin',
          actorId: adminId,
          beforeState: asJson(before),
          afterState: asJson(after),
          metadata: asJson({ productId, sku: variant.sku }),
        },
      });
      return updated;
    });
  }
}

/**
 * Distinct, trimmed, non-empty values in alphabetical order. The list filters compare without
 * regard to capital letters ("Maroon" and "maroon" are the same filter), so the first spelling wins.
 */
function distinctSorted(values: (string | null)[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) seen.set(trimmed.toLowerCase(), trimmed);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
}

/**
 * Of the fields that were asked for, the ones whose value really differs from the stored row, as the
 * old values and the new values. Compared as JSON so arrays and JSON fields compare by content.
 */
function changedFields(stored: Record<string, unknown>, wanted: Record<string, unknown>) {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(wanted)) {
    if (JSON.stringify(stored[key] ?? null) !== JSON.stringify(value ?? null)) {
      before[key] = stored[key] ?? null;
      after[key] = value;
    }
  }
  return { before, after };
}
