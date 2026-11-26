// Manual stock changes against a REAL Postgres (InventoryService.adjustStock): two changes at the same
// moment must both count (no lost update), a count is exact, stock cannot drop below what is reserved,
// and every change leaves an audit entry that the history shows. Skipped unless DB_TESTS=1 (CI runs it):
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- stock-adjust)
import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { InventoryService } from '../modules/inventory/inventory.service';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;

describeDb('stock adjustment (real Postgres)', () => {
  const prisma = new PrismaClient();
  const service = new InventoryService(prisma as any);
  const tag = randomUUID().replace(/-/g, '').slice(0, 8);
  let categoryId = '';
  let productId = '';
  let adminUserId = '';
  const variantIds: string[] = [];

  async function variant(key: string, onHand: number, reserved = 0) {
    const v = await prisma.productVariant.create({
      data: { productId, sku: `SA-${tag}-${key}`, color: key, pricePaise: 100000 },
    });
    await prisma.inventory.create({ data: { variantId: v.id, onHand, reserved } });
    variantIds.push(v.id);
    return v.id;
  }
  const onHand = async (id: string) => (await prisma.inventory.findUniqueOrThrow({ where: { variantId: id } })).onHand;

  beforeAll(async () => {
    categoryId = (await prisma.category.create({ data: { slug: `sa-${tag}`, name: 'Stock test' } })).id;
    productId = (await prisma.product.create({ data: { slug: `sa-${tag}`, title: `Stock ${tag}`, categoryId, publishStatus: 'published' } })).id;
    adminUserId = (await prisma.user.create({ data: { phone: `+7${tag}`, name: 'Stock Tester' } })).id;
    await prisma.adminUser.create({ data: { userId: adminUserId, phone: `+7${tag}`, name: 'Stock Admin', role: 'owner' } });
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { entityId: { in: variantIds } } });
    await prisma.inventory.deleteMany({ where: { variantId: { in: variantIds } } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.adminUser.deleteMany({ where: { phone: `+7${tag}` } });
    await prisma.user.deleteMany({ where: { id: adminUserId } });
    await prisma.$disconnect();
  });

  it('ten changes of +1 at the same moment end at +10 (none is lost)', async () => {
    const id = await variant('race', 10);
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => service.adjustStock({ variantId: id, adjustment: 1, reason: 'received' } as any, adminUserId)),
    );
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(await onHand(id)).toBe(20);
    const audits = await prisma.auditEvent.count({ where: { entityId: id, action: 'inventory.adjusted' } });
    expect(audits).toBe(10);
  });

  it('a counted number is exact, and the recorded change is the difference', async () => {
    const id = await variant('count', 12);
    const result = await service.adjustStock({ variantId: id, setTo: 7, reason: 'correction' } as any, adminUserId);
    expect(result.onHand).toBe(7);
    const [h] = await service.getAdjustmentHistory(id);
    expect(h).toMatchObject({ adjustment: -5, onHandBefore: 12, onHandAfter: 7, reason: 'correction' });
  });

  it('cannot go below what is reserved for orders, and nothing is written when refused', async () => {
    const id = await variant('reserved', 10, 4);
    await expect(service.adjustStock({ variantId: id, adjustment: -7, reason: 'damaged' } as any, adminUserId)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.adjustStock({ variantId: id, setTo: 3, reason: 'correction' } as any, adminUserId)).rejects.toThrow('STOCK_WOULD_GO_NEGATIVE');
    expect(await onHand(id)).toBe(10);
    expect(await prisma.auditEvent.count({ where: { entityId: id } })).toBe(0);
    // exactly down to the reserved amount is fine
    await service.adjustStock({ variantId: id, adjustment: -6, reason: 'damaged' } as any, adminUserId);
    expect(await onHand(id)).toBe(4);
  });

  it('removals at the same moment cannot take the stock below the reserved amount', async () => {
    const id = await variant('removals', 10, 2); // 8 can go; five removals of 2 would need 10
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => service.adjustStock({ variantId: id, adjustment: -2, reason: 'damaged' } as any, adminUserId)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(4);
    expect(await onHand(id)).toBe(2);
  });

  it('the history lists the changes newest first and names the admin through the login', async () => {
    const id = await variant('history', 5);
    await service.adjustStock({ variantId: id, adjustment: 3, reason: 'received', notes: 'first batch' } as any, adminUserId);
    await new Promise((r) => setTimeout(r, 15));
    await service.adjustStock({ variantId: id, adjustment: -1, reason: 'damaged' } as any, adminUserId);
    const h = await service.getAdjustmentHistory(id);
    expect(h.map((e) => e.adjustment)).toEqual([-1, 3]);
    expect(h[1]).toMatchObject({ notes: 'first batch', by: { name: 'Stock Admin', role: 'owner' } });
  });

  it('refuses a change that changes nothing', async () => {
    const id = await variant('nochange', 5);
    await expect(service.adjustStock({ variantId: id, setTo: 5, reason: 'correction' } as any, adminUserId)).rejects.toThrow('STOCK_NO_CHANGE');
  });
});
