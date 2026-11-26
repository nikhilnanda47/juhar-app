// Extra demo data for testing long lists, paging, sorting and the admin counts.
// Not part of the normal seed: run it only on a local or test database.
//
//   cd apps/api
//   npx ts-node prisma/seed-demo.ts                       # 60 sarees (default)
//   npx ts-node prisma/seed-demo.ts --products 120        # a different number of sarees
//   npx ts-node prisma/seed-demo.ts --orders 55           # also a demo customer with 55 orders
//   npx ts-node prisma/seed-demo.ts --clean               # remove everything this script added
//
// Safe to run again: it skips what already exists, and it only ever touches rows whose slug,
// SKU or order number starts with "demo-" / "DEMO-". The normal seed (prisma/seed.ts) is not
// changed or required; this script creates the categories it needs if they are missing.
import { PrismaClient } from '@prisma/client';
import { calculateShippingPaise } from '@juhar/shared';
import { seedRefusal } from '../src/common/local-database-guard';

const prisma = new PrismaClient();

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);
const numberArg = (name: string, fallback: number) => {
  const raw = arg(name);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 2000) {
    console.error(`--${name} must be a whole number from 0 to 2000`);
    process.exit(1);
  }
  return n;
};

const DEMO_PHONE = '+919000000099'; // the demo customer (log in with any OTP flow: the mock code is 123456)
const HOUR = 3600_000;

// ── Catalogue building blocks ──────────────────────────────────────────────
const CATEGORIES = [
  { slug: 'everyday', name: 'Everyday', description: 'Tussar & Cotton weaves for daily elegance', sortOrder: 0 },
  { slug: 'signature', name: 'Signature', description: 'Pure Ikat silks — our finest handloom masterpieces', sortOrder: 1 },
  { slug: 'heritage', name: 'Heritage', description: 'Bomkai & Pasapalli traditions preserved in silk', sortOrder: 2 },
  { slug: 'celebrations', name: 'Celebrations', description: 'Bridal Zari Pallu sarees for special occasions', sortOrder: 3 },
];

const WEAVES = [
  { name: 'Sambalpuri Ikat', fabric: 'Pure Mulberry Silk', origin: 'Bargarh, Odisha', category: 'signature', price: [420000, 980000] },
  { name: 'Bomkai', fabric: 'Pure Mulberry Silk', origin: 'Sonepur, Subarnapur District, Odisha', category: 'heritage', price: [520000, 1200000] },
  { name: 'Pasapalli', fabric: 'Pure Silk', origin: 'Sonepur, Odisha', category: 'heritage', price: [350000, 760000] },
  { name: 'Khandua', fabric: 'Pure Tussar Silk', origin: 'Nuapatna, Cuttack, Odisha', category: 'celebrations', price: [650000, 1500000] },
  { name: 'Tussar', fabric: 'Tussar Silk', origin: 'Bargarh, Odisha', category: 'everyday', price: [240000, 520000] },
  { name: 'Cotton Ikat', fabric: 'Handloom Cotton', origin: 'Barpali, Bargarh, Odisha', category: 'everyday', price: [120000, 260000] },
  { name: 'Bridal Zari', fabric: 'Pure Silk with Zari', origin: 'Bargarh, Odisha', category: 'celebrations', price: [780000, 1800000] },
  { name: 'Silk-Cotton Blend', fabric: 'Silk-Cotton Blend', origin: 'Barpali, Odisha', category: 'everyday', price: [180000, 380000] },
];

const COLORS = [
  'Maroon', 'Navy', 'Forest Green', 'Mustard', 'Ivory', 'Indigo', 'Rust', 'Teal', 'Magenta', 'Olive',
  'Peacock Blue', 'Saffron', 'Charcoal', 'Pink', 'Wine', 'Turmeric', 'Sky Blue', 'Emerald',
];

// Stock levels cycle through every case the admin pages and the shop show: none, low (1 to 3), ordinary, plenty
const STOCK = [10, 4, 25, 1, 8, 0, 3, 15, 2, 6, 50, 5];

// Small deterministic helper, so the same run always gives the same catalogue
const pick = <T>(list: T[], n: number): T => list[n % list.length];

function buildProduct(n: number) {
  const weave = pick(WEAVES, n);
  const color1 = pick(COLORS, n * 3 + 1);
  const color2 = pick(COLORS, n * 5 + 7);
  const [lo, hi] = weave.price;
  // price steps of ₹100 between the weave's lowest and highest price
  const base = Math.round((lo + ((hi - lo) * ((n * 37) % 100)) / 100) / 10000) * 10000;
  const variantCount = n % 7 === 0 ? 3 : n % 3 === 0 ? 2 : 1;
  const colors = [color1, color2, pick(COLORS, n * 11 + 3)].slice(0, variantCount);

  const variants = colors.map((color, i) => {
    const price = base + i * 25000;
    return {
      sku: `DEMO-${String(n).padStart(3, '0')}-${i + 1}`,
      name: `${color} & ${i % 2 === 0 ? 'Gold' : 'Silver'}`,
      color,
      pricePaise: price,
      // an "MRP" above the price on about half the variants (the database requires it to be higher)
      compareAtPaise: (n + i) % 2 === 0 ? Math.round((price * 1.25) / 10000) * 10000 + 10000 : null,
      stock: STOCK[(n + i * 5) % STOCK.length],
      active: !(n % 17 === 0 && i === variantCount - 1 && variantCount > 1), // a few retired variants
    };
  });

  // About 1 in 6 is a draft and 1 in 20 is archived, so the admin filters have something to show
  const publishStatus = n % 20 === 0 ? 'archived' : n % 6 === 0 ? 'draft' : 'published';

  return {
    slug: `demo-${String(n).padStart(3, '0')}-${weave.name.toLowerCase().replace(/[^a-z]+/g, '-')}-${color1.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    title: `${weave.name} Saree – ${color1} ${String(n).padStart(3, '0')}`,
    shortDescription: `Handwoven ${weave.name} saree in ${color1.toLowerCase()}, made by master weavers`,
    description: `A handloom ${weave.name} saree in ${color1.toLowerCase()} with a ${color2.toLowerCase()} border, woven by hand in ${weave.origin.split(',')[0]}. Demo product ${n}.`,
    category: weave.category,
    fabric: weave.fabric,
    weaveMethod: weave.name,
    origin: weave.origin,
    occasion: [pick(['Festive', 'Wedding', 'Office', 'Temple', 'Party', 'Everyday'], n)],
    tags: ['demo', weave.name.toLowerCase().replace(/[^a-z]+/g, '-'), color1.toLowerCase()],
    publishStatus,
    // one hour apart, newest has the highest number, so "newest first" is easy to check by eye
    createdAt: new Date(Date.now() - (1000 - n) * HOUR),
    variants,
  };
}

async function seedProducts(count: number) {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const cats = Object.fromEntries((await prisma.category.findMany()).map((c) => [c.slug, c.id]));

  let created = 0;
  let skipped = 0;
  for (let n = 1; n <= count; n++) {
    const p = buildProduct(n);
    if (await prisma.product.findUnique({ where: { slug: p.slug } })) {
      skipped++;
      continue;
    }
    const product = await prisma.product.create({
      data: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        shortDescription: p.shortDescription,
        categoryId: cats[p.category],
        publishStatus: p.publishStatus,
        fabric: p.fabric,
        weaveMethod: p.weaveMethod,
        origin: p.origin,
        careInstructions: 'Dry clean only. Store in muslin cloth away from direct sunlight.',
        blousePiece: 'Included – 0.8m unstitched',
        length: '5.5 meters',
        width: '46 inches',
        weight: '450 grams',
        occasion: p.occasion,
        tags: p.tags,
        createdAt: p.createdAt,
      },
    });
    for (const [i, v] of p.variants.entries()) {
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          name: v.name,
          color: v.color,
          pricePaise: v.pricePaise,
          compareAtPaise: v.compareAtPaise,
          active: v.active,
          sortOrder: i,
        },
      });
      await prisma.inventory.create({ data: { variantId: variant.id, onHand: v.stock } });
    }
    created++;
  }
  console.log(`  ✓ products: ${created} added, ${skipped} already there`);
}

// ── Demo customer and orders ───────────────────────────────────────────────
const ORDER_STATUSES = [
  'placed', 'placed', 'confirmed', 'packed', 'shipped', 'delivered', 'delivered', 'delivered', 'cancelled', 'delivered',
];

async function seedOrders(count: number) {
  // Orders are built from the published demo variants that are in stock, so the order pages show real items
  const variants = await prisma.productVariant.findMany({
    where: { sku: { startsWith: 'DEMO-' }, active: true, product: { publishStatus: 'published' } },
    include: { product: { select: { title: true } } },
    orderBy: { sku: 'asc' },
  });
  if (variants.length === 0) {
    console.log('  ⚠ no demo products yet, so no orders were made. Run without --orders first (or together).');
    return;
  }
  const user = await prisma.user.upsert({
    where: { phone: DEMO_PHONE },
    update: {},
    create: { phone: DEMO_PHONE, name: 'Demo Customer' },
  });

  let created = 0;
  let skipped = 0;
  for (let n = 1; n <= count; n++) {
    const publicNumber = `DEMO-${String(n).padStart(5, '0')}`;
    if (await prisma.order.findUnique({ where: { publicNumber } })) {
      skipped++;
      continue;
    }
    const status = pick(ORDER_STATUSES, n * 3);
    const lines = Array.from({ length: (n % 4 === 0 ? 3 : n % 3 === 0 ? 2 : 1) }, (_, i) => {
      const v = pick(variants, n * 7 + i * 13);
      return { v, qty: 1 + ((n + i) % 2) };
    });
    const subtotalPaise = lines.reduce((sum, l) => sum + l.v.pricePaise * l.qty, 0);
    const shippingPaise = calculateShippingPaise(subtotalPaise);
    // Order 1 is newest. The first few are from today and a few "placed" ones are older than a day,
    // so the dashboard's Today's Orders and the Overdue flag both have something to show.
    const createdAt = new Date(Date.now() - (n - 1) * 5 * HOUR - n * 60_000);
    const stamp = (hours: number) => new Date(createdAt.getTime() + hours * HOUR);

    await prisma.order.create({
      data: {
        publicNumber,
        userId: user.id,
        status,
        paymentMode: 'cod',
        paymentStatus: 'cod_pending',
        subtotalPaise,
        shippingPaise,
        taxPaise: 0,
        totalPaise: subtotalPaise + shippingPaise,
        addressSnapshot: {
          recipientName: 'Demo Customer',
          recipientPhone: DEMO_PHONE,
          line1: '12 Station Road',
          city: 'Sambalpur',
          district: 'Sambalpur',
          state: 'Odisha',
          pinCode: '768001',
        },
        idempotencyKey: `demo-order-${n}`,
        confirmedAt: status !== 'placed' && status !== 'cancelled' ? stamp(2) : null,
        packedAt: ['packed', 'shipped', 'delivered'].includes(status) ? stamp(6) : null,
        shippedAt: ['shipped', 'delivered'].includes(status) ? stamp(12) : null,
        deliveredAt: status === 'delivered' ? stamp(60) : null,
        cancelledAt: status === 'cancelled' ? stamp(3) : null,
        cancellationReason: status === 'cancelled' ? 'Demo order: customer unreachable' : null,
        createdAt,
        items: {
          create: lines.map((l) => ({
            variantId: l.v.id,
            productTitle: l.v.product.title,
            variantName: l.v.name,
            sku: l.v.sku,
            qty: l.qty,
            unitPricePaise: l.v.pricePaise,
            totalPaise: l.v.pricePaise * l.qty,
          })),
        },
      },
    });
    created++;
  }
  console.log(`  ✓ orders for ${DEMO_PHONE}: ${created} added, ${skipped} already there`);
  console.log('    (they are plain records: stock is not deducted, and no reservation exists for them)');
}

// ── Remove what this script added ──────────────────────────────────────────
async function clean() {
  const orders = await prisma.order.deleteMany({ where: { publicNumber: { startsWith: 'DEMO-' } } });
  const user = await prisma.user.findUnique({ where: { phone: DEMO_PHONE } });
  if (user) {
    const left = await prisma.order.count({ where: { userId: user.id } });
    if (left === 0) await prisma.user.delete({ where: { id: user.id } });
    else console.log(`  ⚠ kept ${DEMO_PHONE}: it has ${left} order(s) that are not demo orders`);
  }
  const products = await prisma.product.findMany({ where: { slug: { startsWith: 'demo-' } }, select: { id: true, slug: true } });
  let removed = 0;
  for (const p of products) {
    try {
      await prisma.$transaction([
        prisma.inventory.deleteMany({ where: { variant: { productId: p.id } } }),
        prisma.cartItem.deleteMany({ where: { variant: { productId: p.id } } }),
        prisma.product.delete({ where: { id: p.id } }),
      ]);
      removed++;
    } catch {
      console.log(`  ⚠ kept ${p.slug}: something that is not demo data still refers to it`);
    }
  }
  console.log(`  ✓ removed ${orders.count} demo orders and ${removed} demo products`);
}

async function main() {
  const refusal = seedRefusal(process.env, 'the demo seed');
  if (refusal) {
    console.error(refusal);
    process.exit(1);
  }
  const host = (process.env.DATABASE_URL || '').replace(/^.*@/, '').replace(/\?.*$/, '');
  console.log(`🌱 Demo data on ${host || 'the configured database'}`);

  if (flag('clean')) {
    await clean();
    return;
  }
  const products = numberArg('products', 60);
  const orders = numberArg('orders', 0);
  await seedProducts(products);
  if (orders > 0) await seedOrders(orders);

  const [p, d, v] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { publishStatus: 'draft' } }),
    prisma.productVariant.count(),
  ]);
  console.log(`✅ Done. The database now has ${p} products (${d} drafts) and ${v} variants.`);
  console.log('   No photos yet? `npm run db:seed:photos` adds clearly labelled sample pictures (development only).');
}

main()
  .catch((e) => {
    console.error('❌ Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
