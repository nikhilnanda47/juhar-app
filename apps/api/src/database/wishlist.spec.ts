// The wishlist against a REAL Postgres (WishlistService): two taps at once, products that stop being
// sold, and isolation between customers. Skipped unless DB_TESTS=1 (CI runs it):
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- wishlist)
// The test creates its own users, category and products and deletes them afterwards.
import { ConflictException, NotFoundException } from '@nestjs/common';
import { testMedia } from '../modules/media/test-media';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { WishlistService } from '../modules/wishlist/wishlist.service';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;

describeDb('wishlist (real Postgres)', () => {
  const prisma = new PrismaClient();
  const service = new WishlistService(prisma as any, testMedia());
  const tag = randomUUID().replace(/-/g, '').slice(0, 8);
  let userA = '';
  let userB = '';
  let categoryId = '';
  const productIds: string[] = [];
  const v: Record<string, string> = {};
  const unknownVariant = '11111111-1111-4111-8111-111111111111';

  async function product(key: string, status: string, variants: { key: string; color: string; active?: boolean }[]) {
    const p = await prisma.product.create({
      data: { slug: `wl-${tag}-${key}`, title: `Wishlist ${key} ${tag}`, categoryId, publishStatus: status },
    });
    productIds.push(p.id);
    for (const [i, x] of variants.entries()) {
      const variant = await prisma.productVariant.create({
        data: { productId: p.id, sku: `WL-${tag}-${x.key}`, color: x.color, pricePaise: 100000 + i, active: x.active ?? true },
      });
      await prisma.inventory.create({ data: { variantId: variant.id, onHand: 5 } });
      v[x.key] = variant.id;
    }
    return p.id;
  }

  beforeAll(async () => {
    userA = (await prisma.user.create({ data: { phone: `+9${tag}` } })).id;
    userB = (await prisma.user.create({ data: { phone: `+8${tag}` } })).id;
    categoryId = (await prisma.category.create({ data: { slug: `wl-${tag}`, name: 'Wishlist test' } })).id;
    await product('live', 'published', [{ key: 'red', color: 'Red' }, { key: 'blue', color: 'Blue' }, { key: 'retired', color: 'Grey', active: false }]);
    await product('draft', 'draft', [{ key: 'draft', color: 'Gold' }]);
    await product('later', 'published', [{ key: 'later', color: 'Teal' }]); // unpublished during a test
  });

  afterAll(async () => {
    await prisma.wishlistItem.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.inventory.deleteMany({ where: { variant: { productId: { in: productIds } } } });
    await prisma.productVariant.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    await prisma.$disconnect();
  });

  const saved = async (user: string) => (await service.getWishlist(user)).items.map((i) => i.variant.id);
  const outcomes = async (promises: Promise<unknown>[]) =>
    (await Promise.allSettled(promises)).map((r) => (r.status === 'fulfilled' ? 'ok' : (r.reason as Error).constructor.name));

  describe('two taps at once (this used to answer 500)', () => {
    it('8 toggles of one variant at the same moment: none fails', async () => {
      const results = await outcomes(Array.from({ length: 8 }, () => service.toggleItem(userA, v.red)));
      expect(results).toEqual(Array(8).fill('ok'));
      const rows = await prisma.wishlistItem.count({ where: { userId: userA, variantId: v.red } });
      expect(rows).toBeLessThanOrEqual(1);
      await prisma.wishlistItem.deleteMany({ where: { userId: userA } });
    });

    it('8 adds of one variant at the same moment: exactly one saves it, the others get a clean 409', async () => {
      const results = await outcomes(Array.from({ length: 8 }, () => service.addItem(userA, { variantId: v.blue })));
      expect(results.filter((r) => r === 'ok')).toHaveLength(1);
      expect(results.filter((r) => r === ConflictException.name)).toHaveLength(7);
      expect(await prisma.wishlistItem.count({ where: { userId: userA, variantId: v.blue } })).toBe(1);
      await prisma.wishlistItem.deleteMany({ where: { userId: userA } });
    });

    it('8 removes of one saved variant at the same moment: one removes it, the others get a clean 404', async () => {
      await service.addItem(userA, { variantId: v.red });
      const results = await outcomes(Array.from({ length: 8 }, () => service.removeItem(userA, v.red)));
      expect(results.filter((r) => r === 'ok')).toHaveLength(1);
      expect(results.filter((r) => r === NotFoundException.name)).toHaveLength(7);
    });
  });

  describe('toggle', () => {
    it('saves, then removes, then saves again', async () => {
      expect(await service.toggleItem(userA, v.red)).toEqual({ wishlisted: true, variantId: v.red });
      expect(await saved(userA)).toEqual([v.red]);
      expect(await service.toggleItem(userA, v.red)).toEqual({ wishlisted: false, variantId: v.red });
      expect(await saved(userA)).toEqual([]);
      expect(await service.toggleItem(userA, v.red)).toEqual({ wishlisted: true, variantId: v.red });
      await prisma.wishlistItem.deleteMany({ where: { userId: userA } });
    });

    it('lists the newest saved item first', async () => {
      await service.toggleItem(userA, v.red);
      await new Promise((r) => setTimeout(r, 20));
      await service.toggleItem(userA, v.blue);
      expect(await saved(userA)).toEqual([v.blue, v.red]);
      await prisma.wishlistItem.deleteMany({ where: { userId: userA } });
    });
  });

  describe('what can be saved', () => {
    it.each([['an unknown variant', () => unknownVariant], ['a retired variant', () => v.retired], ['a variant of a draft product', () => v.draft]])(
      'refuses %s with a 404 and saves nothing (toggle and add)', async (_name, id) => {
        await expect(service.toggleItem(userA, id())).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.addItem(userA, { variantId: id() })).rejects.toBeInstanceOf(NotFoundException);
        expect(await prisma.wishlistItem.count({ where: { userId: userA } })).toBe(0);
      });
  });

  describe('a saved product stops being sold', () => {
    it('stays in the list, marked "not listed", and can still be removed', async () => {
      await service.toggleItem(userA, v.later);
      expect((await service.getWishlist(userA)).items[0].variant).toMatchObject({ isListed: true, isAvailable: true });

      await prisma.product.update({ where: { id: productIds[2] }, data: { publishStatus: 'draft' } });
      const item = (await service.getWishlist(userA)).items[0];
      expect(item.variant).toMatchObject({ id: v.later, isListed: false, isAvailable: false, available: 5 });
      expect(item.variant.product).not.toHaveProperty('publishStatus');

      expect(await service.toggleItem(userA, v.later)).toEqual({ wishlisted: false, variantId: v.later });
      expect(await saved(userA)).toEqual([]);
      await prisma.product.update({ where: { id: productIds[2] }, data: { publishStatus: 'published' } });
    });

    it('a retired variant is marked "not listed" too', async () => {
      await service.toggleItem(userA, v.blue);
      await prisma.productVariant.update({ where: { id: v.blue }, data: { active: false } });
      expect((await service.getWishlist(userA)).items[0].variant).toMatchObject({ isListed: false, isAvailable: false });
      await prisma.productVariant.update({ where: { id: v.blue }, data: { active: true } });
      await prisma.wishlistItem.deleteMany({ where: { userId: userA } });
    });
  });

  describe('customers are kept apart', () => {
    it('one customer\'s list and taps never show up for another', async () => {
      await service.toggleItem(userA, v.red);
      expect(await saved(userB)).toEqual([]);
      expect((await service.checkItem(userB, v.red)).wishlisted).toBe(false);
      await expect(service.removeItem(userB, v.red)).rejects.toBeInstanceOf(NotFoundException);
      await service.toggleItem(userB, v.red); // B saves the same variant: its own row, A's is untouched
      expect(await saved(userA)).toEqual([v.red]);
      expect(await saved(userB)).toEqual([v.red]);
      await service.toggleItem(userB, v.red);
      expect(await saved(userA)).toEqual([v.red]);
      await prisma.wishlistItem.deleteMany({ where: { userId: userA } });
    });
  });

  it('deleting a variant removes it from every list (no dangling rows)', async () => {
    const extra = await prisma.productVariant.create({ data: { productId: productIds[0], sku: `WL-${tag}-extra`, pricePaise: 5, color: 'Extra' } });
    await prisma.inventory.create({ data: { variantId: extra.id, onHand: 1 } });
    await service.toggleItem(userA, extra.id);
    await prisma.inventory.delete({ where: { variantId: extra.id } });
    await prisma.productVariant.delete({ where: { id: extra.id } });
    expect(await saved(userA)).toEqual([]);
  });
});
