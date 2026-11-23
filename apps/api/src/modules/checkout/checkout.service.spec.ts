import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

const NOW = new Date('2026-11-22T10:00:00Z');
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const address = {
  id: 'addr-1', userId: 'user-1', recipientName: 'Priya', recipientPhone: '9876543210',
  line1: '1 Main Rd', line2: null, landmark: 'Temple', city: 'Sambalpur',
  district: 'Sambalpur', state: 'Odisha', pinCode: '768001',
};

interface ItemOptions {
  id?: string; price?: number; qty?: number; title?: string;
  onHand?: number; reserved?: number; unavailable?: number;
  active?: boolean; published?: boolean; noInventory?: boolean;
}

function item(o: ItemOptions = {}) {
  const id = o.id ?? 'v1';
  return {
    variantId: id,
    quantity: o.qty ?? 1,
    variant: {
      id, sku: `SKU-${id}`, name: `Name ${id}`, color: 'Maroon',
      pricePaise: o.price ?? 350000, active: o.active ?? true,
      product: { title: o.title ?? `Saree ${id}`, slug: `saree-${id}`, publishStatus: o.published === false ? 'draft' : 'published' },
      inventory: o.noInventory ? null : { onHand: o.onHand ?? 10, reserved: o.reserved ?? 0, unavailable: o.unavailable ?? 0 },
    },
  };
}

function setup(cart: unknown[], opts: { address?: unknown; existingOrder?: unknown; nextNumber?: number } = {}) {
  let created: Record<string, unknown> = {};
  let createdItems: Record<string, unknown>[] = [];

  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ nextval: BigInt(opts.nextNumber ?? 42) }]),
    order: {
      findUnique: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(where.idempotencyKey ? (opts.existingOrder ?? null) : { ...created, items: createdItems }),
      ),
      create: jest.fn().mockImplementation(({ data }) => {
        created = { id: 'order-1', createdAt: NOW, ...data };
        return Promise.resolve(created);
      }),
    },
    cartItem: { findMany: jest.fn().mockResolvedValue(cart), deleteMany: jest.fn().mockResolvedValue({}) },
    orderItem: {
      createMany: jest.fn().mockImplementation(({ data }) => {
        createdItems = data.map((d: Record<string, unknown>, i: number) => ({ id: `oi-${i}`, ...d }));
        return Promise.resolve({});
      }),
    },
    inventoryReservation: { updateMany: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    address: { findFirst: jest.fn().mockResolvedValue('address' in opts ? opts.address : address) },
    cartItem: { findMany: jest.fn().mockResolvedValue(cart) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown, _options?: unknown) => fn(tx)),
  };
  const inventory = {
    reserve: jest.fn().mockImplementation(async (_tx: unknown, variantId: string) => ({ id: `res-${variantId}` })),
  };
  return { tx, prisma, inventory, service: new CheckoutService(prisma as any, inventory as any) };
}

const quoteDto = { addressId: 'addr-1', paymentMode: 'cod' } as any;
const placeDto = (over: Record<string, unknown> = {}) =>
  ({ addressId: 'addr-1', paymentMode: 'cod', idempotencyKey: 'key-1', notes: 'Ring the bell', ...over }) as any;

describe('CheckoutService', () => {
  beforeEach(() => {
    jest.useFakeTimers({
      now: NOW,
      doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'],
    });
  });
  afterEach(() => jest.useRealTimers());

  describe('getQuote', () => {
    it('only accepts an address that belongs to the customer', async () => {
      const { service, prisma } = setup([item()], { address: null });
      await expect(service.getQuote('user-1', quoteDto)).rejects.toThrow(NotFoundException);
      expect(prisma.address.findFirst).toHaveBeenCalledWith({ where: { id: 'addr-1', userId: 'user-1' } });
    });

    it('refuses an empty cart', async () => {
      const { service } = setup([]);
      await expect(service.getQuote('user-1', quoteDto)).rejects.toThrow('CART_EMPTY');
    });

    it('adds shipping below the free-shipping threshold', async () => {
      const { service } = setup([item({ price: 350000 })]);
      const quote = await service.getQuote('user-1', quoteDto);
      expect(quote).toMatchObject({ subtotalPaise: 350000, shippingPaise: 9900, taxPaise: 0, discountPaise: 0, totalPaise: 359900 });
    });

    it('multiplies price by quantity and adds up several items', async () => {
      const { service } = setup([item({ id: 'a', price: 150000, qty: 2 }), item({ id: 'b', price: 100000, qty: 1 })]);
      const quote = await service.getQuote('user-1', quoteDto);
      expect(quote.items.map((i) => i.lineTotalPaise)).toEqual([300000, 100000]);
      expect(quote.subtotalPaise).toBe(400000);
      expect(quote.totalPaise).toBe(409900);
    });

    it.each([
      [499999, 9900],
      [500000, 0],
      [500001, 0],
    ])('a subtotal of %i paise has shipping of %i paise', async (subtotal, shipping) => {
      const { service } = setup([item({ price: subtotal })]);
      const quote = await service.getQuote('user-1', quoteDto);
      expect(quote.shippingPaise).toBe(shipping);
      expect(quote.totalPaise).toBe(subtotal + shipping);
    });

    it('echoes the payment mode and reports cash on delivery as available', async () => {
      const { service } = setup([item()]);
      await expect(service.getQuote('user-1', { ...quoteDto, paymentMode: 'upi' })).resolves.toMatchObject({
        paymentMode: 'upi', codAvailable: true,
      });
    });

    it('does not reserve any stock', async () => {
      const { service, inventory, prisma } = setup([item()]);
      await service.getQuote('user-1', quoteDto);
      expect(inventory.reserve).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    describe('warnings', () => {
      it('has none when everything is in stock', async () => {
        const { service } = setup([item({ qty: 2, onHand: 5 })]);
        expect((await service.getQuote('user-1', quoteDto)).warnings).toEqual([]);
      });

      it('says how many are left when the cart asks for more than available', async () => {
        const { service } = setup([item({ title: 'Ikat Saree', qty: 3, onHand: 5, reserved: 2, unavailable: 1 })]);
        const quote = await service.getQuote('user-1', quoteDto);
        expect(quote.items[0].available).toBe(2);
        expect(quote.warnings).toEqual(['Ikat Saree has only 2 left (you have 3 in cart)']);
      });

      it('treats a missing stock row as nothing left', async () => {
        const { service } = setup([item({ title: 'Ikat Saree', noInventory: true })]);
        expect((await service.getQuote('user-1', quoteDto)).warnings).toEqual(['Ikat Saree has only 0 left (you have 1 in cart)']);
      });

      it.each([
        ['an inactive variant', { active: false }],
        ['an unpublished product', { published: false }],
      ])('warns that %s is no longer available, without also warning about stock', async (_label, flags) => {
        const { service } = setup([item({ title: 'Ikat Saree', onHand: 0, ...flags })]);
        expect((await service.getQuote('user-1', quoteDto)).warnings).toEqual(['Ikat Saree is no longer available']);
      });
    });
  });

  describe('placeOrder', () => {
    it('only accepts an address that belongs to the customer, before starting a transaction', async () => {
      const { service, prisma } = setup([item()], { address: null });
      await expect(service.placeOrder('user-1', placeDto())).rejects.toThrow(NotFoundException);
      expect(prisma.address.findFirst).toHaveBeenCalledWith({ where: { id: 'addr-1', userId: 'user-1' } });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('runs inside a transaction with a 10 second limit', async () => {
      const { service, prisma } = setup([item()]);
      await service.placeOrder('user-1', placeDto());
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 10000 });
    });

    describe('retries (idempotency)', () => {
      it('returns the existing order and does nothing else when the key was already used', async () => {
        const existing = { id: 'order-0', publicNumber: 'X-0001', status: 'placed', totalPaise: 359900, items: [] };
        const { service, tx, inventory } = setup([item()], { existingOrder: existing });

        const result = await service.placeOrder('user-1', placeDto());

        expect(result).toMatchObject({ id: 'order-0', publicNumber: 'X-0001' });
        expect(tx.order.findUnique).toHaveBeenCalledWith({ where: { idempotencyKey: 'key-1' }, include: { items: true } });
        expect(inventory.reserve).not.toHaveBeenCalled();
        expect(tx.order.create).not.toHaveBeenCalled();
        expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
        expect(tx.$queryRaw).not.toHaveBeenCalled();
      });
    });

    describe('logging', () => {
      let log: jest.SpyInstance;
      beforeEach(() => { log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined); });
      afterEach(() => log.mockRestore());

      it('logs the order that was placed: number, total, item count, payment mode and customer', async () => {
        const { service } = setup([item({ price: 250000 }), item({ id: 'v2', price: 150000 })]);
        const order = await service.placeOrder('user-1', placeDto());
        const messages = log.mock.calls.map((c) => String(c[0]));
        expect(messages).toContain(
          `order placed ${order.publicNumber} total=₹4,099 items=2 payment=cod user=user-1`,
        );
      });

      it('says so when the same order is asked for again', async () => {
        const existing = { id: 'order-0', publicNumber: 'X-0001', status: 'placed', paymentMode: 'cod', totalPaise: 359900, items: [] };
        const { service } = setup([item()], { existingOrder: existing });
        await service.placeOrder('user-1', placeDto());
        const messages = log.mock.calls.map((c) => String(c[0]));
        expect(messages).toEqual(['order X-0001 returned again for the same idempotency key user=user-1']);
      });

      it('logs nothing about an order when checkout fails', async () => {
        const { service } = setup([]);
        await expect(service.placeOrder('user-1', placeDto())).rejects.toThrow();
        expect(log).not.toHaveBeenCalled();
      });

      it('never logs the delivery address, phone number or notes', async () => {
        const { service } = setup([item()]);
        await service.placeOrder('user-1', placeDto());
        const text = log.mock.calls.map((c) => String(c[0])).join(' ');
        for (const secret of ['9876543210', 'Priya', 'Main Rd', 'Ring the bell']) expect(text).not.toContain(secret);
      });
    });

    describe('checks before ordering', () => {
      it('refuses an empty cart', async () => {
        const { service, tx } = setup([]);
        await expect(service.placeOrder('user-1', placeDto())).rejects.toThrow('CART_EMPTY');
        expect(tx.order.create).not.toHaveBeenCalled();
      });

      it.each([
        ['an inactive variant', { active: false }],
        ['an unpublished product', { published: false }],
      ])('refuses a cart containing %s and names the SKU', async (_label, flags) => {
        const { service, inventory, tx } = setup([item(flags)]);
        await expect(service.placeOrder('user-1', placeDto())).rejects.toThrow('VARIANT_UNAVAILABLE: SKU-v1');
        expect(inventory.reserve).not.toHaveBeenCalled();
        expect(tx.order.create).not.toHaveBeenCalled();
      });

      it('creates no order and keeps the cart when stock runs out partway through', async () => {
        const { service, inventory, tx } = setup([item({ id: 'a' }), item({ id: 'b' })]);
        inventory.reserve
          .mockResolvedValueOnce({ id: 'res-a' })
          .mockRejectedValueOnce(new ConflictException('INSUFFICIENT_STOCK'));

        await expect(service.placeOrder('user-1', placeDto())).rejects.toThrow('INSUFFICIENT_STOCK');

        expect(tx.order.create).not.toHaveBeenCalled();
        expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
      });
    });

    describe('stock reservation', () => {
      it('reserves each cart line for its own quantity', async () => {
        const { service, inventory, tx } = setup([item({ id: 'a', qty: 2 }), item({ id: 'b', qty: 1 })]);
        await service.placeOrder('user-1', placeDto());

        expect(inventory.reserve).toHaveBeenCalledTimes(2);
        expect(inventory.reserve).toHaveBeenCalledWith(tx, 'a', 2, expect.any(Date));
        expect(inventory.reserve).toHaveBeenCalledWith(tx, 'b', 1, expect.any(Date));
      });

      it('holds stock for 24 hours for cash on delivery', async () => {
        const { service, inventory } = setup([item()]);
        await service.placeOrder('user-1', placeDto({ paymentMode: 'cod' }));
        const expiresAt: Date = inventory.reserve.mock.calls[0][3];
        expect(expiresAt.getTime() - NOW.getTime()).toBe(24 * HOUR);
      });

      it('holds stock for 30 minutes for UPI', async () => {
        const { service, inventory } = setup([item()]);
        await service.placeOrder('user-1', placeDto({ paymentMode: 'upi' }));
        const expiresAt: Date = inventory.reserve.mock.calls[0][3];
        expect(expiresAt.getTime() - NOW.getTime()).toBe(30 * MINUTE);
      });

      it('links the reservations to the new order', async () => {
        const { service, tx } = setup([item({ id: 'a' }), item({ id: 'b' })]);
        await service.placeOrder('user-1', placeDto());
        expect(tx.inventoryReservation.updateMany).toHaveBeenCalledWith({
          where: { id: { in: ['res-a', 'res-b'] } },
          data: { orderId: 'order-1' },
        });
      });
    });

    describe('the order that gets saved', () => {
      const created = (tx: ReturnType<typeof setup>['tx']) => tx.order.create.mock.calls[0][0].data;

      it('calculates money on the server from current prices', async () => {
        const { service, tx } = setup([item({ id: 'a', price: 150000, qty: 2 }), item({ id: 'b', price: 100000 })]);
        await service.placeOrder('user-1', placeDto());
        expect(created(tx)).toMatchObject({ subtotalPaise: 400000, shippingPaise: 9900, taxPaise: 0, totalPaise: 409900 });
      });

      it('gives free shipping at the threshold', async () => {
        const { service, tx } = setup([item({ price: 500000 })]);
        await service.placeOrder('user-1', placeDto());
        expect(created(tx)).toMatchObject({ shippingPaise: 0, totalPaise: 500000 });
      });

      it('starts as placed with the right payment status', async () => {
        const cod = setup([item()]);
        await cod.service.placeOrder('user-1', placeDto({ paymentMode: 'cod' }));
        expect(created(cod.tx)).toMatchObject({ status: 'placed', paymentMode: 'cod', paymentStatus: 'cod_pending' });

        const upi = setup([item()]);
        await upi.service.placeOrder('user-1', placeDto({ paymentMode: 'upi' }));
        expect(created(upi.tx)).toMatchObject({ status: 'placed', paymentMode: 'upi', paymentStatus: 'pending' });
      });

      it('stores the idempotency key, notes and a frozen copy of the address', async () => {
        const { service, tx } = setup([item()]);
        await service.placeOrder('user-1', placeDto());
        expect(created(tx)).toMatchObject({
          userId: 'user-1',
          idempotencyKey: 'key-1',
          notes: 'Ring the bell',
          addressSnapshot: {
            recipientName: 'Priya', recipientPhone: '9876543210', line1: '1 Main Rd', line2: null,
            landmark: 'Temple', city: 'Sambalpur', district: 'Sambalpur', state: 'Odisha', pinCode: '768001',
          },
        });
      });

      it('numbers the order JUH-<today>-<next number from the order_number_seq sequence>', async () => {
        const { service, tx } = setup([item()], { nextNumber: 43 });
        await service.placeOrder('user-1', placeDto());

        const sql = (tx.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
        expect(sql).toContain('nextval');
        expect(sql).toContain('order_number_seq');
        expect(created(tx).publicNumber).toBe('JUH-20261122-0043');
      });

      it('takes exactly one number per order', async () => {
        const { service, tx } = setup([item({ id: 'a' }), item({ id: 'b' })]);
        await service.placeOrder('user-1', placeDto());
        expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      });

      it('freezes title, SKU, quantity and price on each order line', async () => {
        const { service, tx } = setup([item({ id: 'a', price: 150000, qty: 2, title: 'Ikat Saree' })]);
        await service.placeOrder('user-1', placeDto());
        expect(tx.orderItem.createMany).toHaveBeenCalledWith({
          data: [{
            orderId: 'order-1', variantId: 'a', productTitle: 'Ikat Saree', variantName: 'Name a', sku: 'SKU-a',
            qty: 2, unitPricePaise: 150000, taxPaise: 0, totalPaise: 300000,
          }],
        });
      });

      it('empties the customer\'s cart', async () => {
        const { service, tx } = setup([item()]);
        await service.placeOrder('user-1', placeDto());
        expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      });

      it('returns the placed order with its lines', async () => {
        const { service } = setup([item({ id: 'a', price: 150000, qty: 2 })]);
        const order = await service.placeOrder('user-1', placeDto());
        expect(order).toMatchObject({
          id: 'order-1', status: 'placed', paymentMode: 'cod', totalPaise: 309900, estimatedDelivery: '5–7 business days',
          items: [{ productTitle: 'Saree a', sku: 'SKU-a', qty: 2, unitPricePaise: 150000, totalPaise: 300000 }],
        });
      });
    });
  });

  describe('quote and order agree', () => {
    it.each([100000, 499999, 500000, 880000])('for a cart of %i paise the quoted total is the charged total', async (price) => {
      const quoted = await setup([item({ price })]).service.getQuote('user-1', quoteDto);
      const placed = await setup([item({ price })]).service.placeOrder('user-1', placeDto());
      expect(placed.totalPaise).toBe(quoted.totalPaise);
      expect(placed.shippingPaise).toBe(quoted.shippingPaise);
    });
  });

  describe('not built yet', () => {
    it.todo('reads the shipping rate and free-shipping threshold from one shared place');
    it.todo('checks PIN code serviceability and cash-on-delivery eligibility');
  });
});
