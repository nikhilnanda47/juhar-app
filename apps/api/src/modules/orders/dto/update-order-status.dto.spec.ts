import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateOrderStatusDto } from './update-order-status.dto';

// The same options main.ts uses, so this checks what a real request would hit.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
const validate = (body: Record<string, unknown>) =>
  pipe.transform(body, { type: 'body', metatype: UpdateOrderStatusDto }) as Promise<UpdateOrderStatusDto>;

describe('UpdateOrderStatusDto', () => {
  describe('cancelling', () => {
    it('needs a reason', async () => {
      await expect(validate({ status: 'cancelled' })).rejects.toThrow(BadRequestException);
      await expect(validate({ status: 'cancelled' })).rejects.toMatchObject({
        response: { message: expect.arrayContaining(['A cancellation reason is required']) },
      });
    });

    it.each(['', '   '])('rejects a blank reason %p', async (reason) => {
      await expect(validate({ status: 'cancelled', reason })).rejects.toThrow(BadRequestException);
    });

    it('accepts a reason and trims it', async () => {
      const dto = await validate({ status: 'cancelled', reason: '  Customer unreachable  ' });
      expect(dto.reason).toBe('Customer unreachable');
    });

    it('accepts a reason of exactly 255 characters but not 256', async () => {
      await expect(validate({ status: 'cancelled', reason: 'a'.repeat(255) })).resolves.toBeDefined();
      await expect(validate({ status: 'cancelled', reason: 'a'.repeat(256) })).rejects.toThrow(BadRequestException);
    });
  });

  describe('other changes', () => {
    it.each(['confirmed', 'packed', 'shipped', 'delivered'])('do not need a reason (%s)', async (status) => {
      await expect(validate({ status })).resolves.toBeDefined();
    });

    it('still validate the status itself', async () => {
      await expect(validate({ status: 'teleported' })).rejects.toThrow(BadRequestException);
    });

    it('still refuse unknown fields', async () => {
      await expect(validate({ status: 'confirmed', surprise: 1 })).rejects.toThrow(BadRequestException);
    });
  });
});
