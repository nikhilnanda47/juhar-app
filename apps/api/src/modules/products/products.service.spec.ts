import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

// updateVariant: the compare-at price must stay above the price (the database enforces it too).
function setup(stored: { pricePaise: number; compareAtPaise: number | null } | null) {
  const update = jest.fn(async ({ data }: any) => ({ id: 'v1', ...data }));
  const prisma = {
    productVariant: {
      findFirst: jest.fn(async () => (stored ? { id: 'v1', productId: 'p1', ...stored } : null)),
      update,
    },
  };
  return { service: new ProductsService(prisma as any), update };
}

describe('ProductsService.updateVariant', () => {
  it('saves a price change that keeps the compare-at price above it', async () => {
    const { service, update } = setup({ pricePaise: 100000, compareAtPaise: 150000 });
    await service.updateVariant('p1', 'v1', { pricePaise: 120000 } as any);
    expect(update).toHaveBeenCalled();
  });

  it('refuses a price that reaches the stored compare-at price', async () => {
    const { service, update } = setup({ pricePaise: 100000, compareAtPaise: 150000 });
    await expect(service.updateVariant('p1', 'v1', { pricePaise: 150000 } as any)).rejects.toThrow(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a compare-at price at or below the stored price', async () => {
    const { service, update } = setup({ pricePaise: 100000, compareAtPaise: null });
    await expect(service.updateVariant('p1', 'v1', { compareAtPaise: 100000 } as any)).rejects.toMatchObject({
      response: { code: 'PROD_005' },
    });
    await expect(service.updateVariant('p1', 'v1', { compareAtPaise: 90000 } as any)).rejects.toThrow(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('checks both new values together', async () => {
    const { service } = setup({ pricePaise: 100000, compareAtPaise: 150000 });
    await expect(
      service.updateVariant('p1', 'v1', { pricePaise: 200000, compareAtPaise: 180000 } as any),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateVariant('p1', 'v1', { pricePaise: 200000, compareAtPaise: 250000 } as any),
    ).resolves.toBeDefined();
  });

  it('lets the admin remove the compare-at price', async () => {
    const { service, update } = setup({ pricePaise: 100000, compareAtPaise: 150000 });
    await service.updateVariant('p1', 'v1', { compareAtPaise: null } as any);
    expect(update).toHaveBeenCalled();
  });

  it('does not touch the compare-at price when only the name changes', async () => {
    const { service, update } = setup({ pricePaise: 100000, compareAtPaise: 150000 });
    await service.updateVariant('p1', 'v1', { name: 'New name' } as any);
    expect(update).toHaveBeenCalled();
  });

  it('reports a missing variant', async () => {
    const { service } = setup(null);
    await expect(service.updateVariant('p1', 'v1', { pricePaise: 5 } as any)).rejects.toThrow(NotFoundException);
  });
});
