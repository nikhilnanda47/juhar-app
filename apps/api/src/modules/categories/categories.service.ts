import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { generateSlug } from '@juhar/shared';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  /**
   * List active categories sorted by sortOrder (public).
   */
  async findAllActive() {
    const categories = await this.prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    // each category's picture for the home page: its own imageUrl when one is set, else the first photo of its newest
    // published saree that has one (so real photos appear without anyone choosing a cover); null when there is none
    return Promise.all(categories.map(async (category) => ({ ...category, coverImage: await this.coverImage(category) })));
  }

  private async coverImage(category: { id: string; name: string; imageUrl: string | null }) {
    if (category.imageUrl) return { url: category.imageUrl, alt: category.name };
    const photo = await this.prisma.productMedia.findFirst({
      where: { type: 'image', product: { categoryId: category.id, publishStatus: 'published' } },
      orderBy: [{ product: { createdAt: 'desc' } }, { sortOrder: 'asc' }],
      select: { objectKey: true, thumbnailKey: true, altText: true },
    });
    const card = this.media.card(photo);
    return card && { url: card.url, alt: category.name }; // the tile already says the name, so that is its description too
  }

  /**
   * List all categories including inactive (admin).
   */
  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get category by ID.
   */
  async findById(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException({ code: 'CAT_001', message: 'Category not found' });
    }
    return category;
  }

  /**
   * Create a new category (admin).
   */
  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || generateSlug(dto.name);

    // Check slug uniqueness
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException({ code: 'CAT_002', message: `Category slug "${slug}" already exists` });
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /**
   * Update a category (admin).
   */
  async update(id: string, dto: UpdateCategoryDto) {
    await this.findById(id); // Throws 404 if not found

    // Check slug uniqueness if changing
    if (dto.slug) {
      const existing = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
      if (existing && existing.id !== id) {
        throw new ConflictException({ code: 'CAT_002', message: `Category slug "${dto.slug}" already exists` });
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }
}
