import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { calculateShippingPaise, SHIPPING } from '@juhar/shared';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { ShippingRuleController } from './shipping-rule.controller';

describe('shipping rule', () => {
  describe('calculateShippingPaise', () => {
    it('charges the flat rate below the free-delivery amount', () => {
      expect(calculateShippingPaise(0)).toBe(SHIPPING.FLAT_PAISE);
      expect(calculateShippingPaise(100)).toBe(SHIPPING.FLAT_PAISE);
      expect(calculateShippingPaise(SHIPPING.FREE_ABOVE_PAISE - 1)).toBe(SHIPPING.FLAT_PAISE);
    });

    it('is free from the free-delivery amount upwards (exactly that amount is free)', () => {
      expect(calculateShippingPaise(SHIPPING.FREE_ABOVE_PAISE)).toBe(0);
      expect(calculateShippingPaise(SHIPPING.FREE_ABOVE_PAISE + 1)).toBe(0);
      expect(calculateShippingPaise(10_000_000)).toBe(0);
    });

    it('is the pilot rule: ₹99, free from ₹5,000', () => {
      expect(SHIPPING.FLAT_PAISE).toBe(9900);
      expect(SHIPPING.FREE_ABOVE_PAISE).toBe(500000);
    });
  });

  describe('GET /api/v1/config/shipping', () => {
    let app: INestApplication;
    let base: string;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({ controllers: [ShippingRuleController] }).compile();
      app = moduleRef.createNestApplication();
      app.useGlobalInterceptors(new TransformInterceptor());
      await app.listen(0, '127.0.0.1');
      base = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}`;
    });
    afterAll(() => app.close());

    it('is public (no login needed) and returns the rule', async () => {
      const res = await fetch(`${base}/api/v1/config/shipping`);
      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual({ flatPaise: SHIPPING.FLAT_PAISE, freeAbovePaise: SHIPPING.FREE_ABOVE_PAISE });
    });

    it('agrees with what the API really charges, at both sides of the free-delivery line', async () => {
      const { data } = (await (await fetch(`${base}/api/v1/config/shipping`)).json()) as any;
      expect(calculateShippingPaise(data.freeAbovePaise - 1)).toBe(data.flatPaise);
      expect(calculateShippingPaise(data.freeAbovePaise)).toBe(0);
    });
  });

  it('is registered in the checkout module so the real API serves it', () => {
    const controllers: unknown[] = Reflect.getMetadata('controllers', require('./checkout.module').CheckoutModule);
    expect(controllers).toContain(ShippingRuleController);
  });

  // The rule lives in packages/shared only. A copy typed into API code would drift from it.
  it('no API source file types the shipping numbers in again', () => {
    const root = join(__dirname, '../..');
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith('.ts') && !name.endsWith('.spec.ts') && /\b(9900|500000)\b/.test(readFileSync(path, 'utf8'))) {
          found.push(path.replace(root, 'src'));
        }
      }
    };
    walk(root);
    expect(found).toEqual([]);
  });
});
