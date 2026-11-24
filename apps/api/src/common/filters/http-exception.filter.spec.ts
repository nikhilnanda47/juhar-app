import { BadRequestException, ConflictException, Controller, Get, INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpExceptionFilter } from './http-exception.filter';

// What a customer's app receives when the API throws: a sentence for the message, the code kept separate.
@Controller('t')
class ThrowingController {
  @Get('stock') stock() { throw new ConflictException('INSUFFICIENT_STOCK'); }
  @Get('unavailable') unavailable() { throw new BadRequestException('VARIANT_UNAVAILABLE: JUH-IKT-MRN-001'); }
  @Get('empty') empty() { throw new BadRequestException('CART_EMPTY'); }
  @Get('mismatch') mismatch() { throw new ConflictException('STOCK_MISMATCH: JUH-X has 3 on hand but the order needs 4. Correct the stock count first.'); }
  @Get('sentence') sentence() { throw new NotFoundException('Order not found'); }
  @Get('coded') coded() { throw new NotFoundException({ code: 'PROD_001', message: 'Product not found' }); }
  @Get('unknown') unknown() { throw new BadRequestException('SOME_UNKNOWN_CODE'); }
  @Get('crash') crash() { throw new Error('database exploded'); }
}

describe('HttpExceptionFilter wording', () => {
  let app: INestApplication;
  let base: string;
  const logged: { code?: string; message?: string }[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ThrowingController] }).compile();
    app = moduleRef.createNestApplication();
    // record what the access log would print for each reply
    app.use((_req: any, res: any, next: () => void) => {
      res.on('finish', () => logged.push({ code: res.locals.errorCode, message: res.locals.errorMessage }));
      next();
    });
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, '127.0.0.1');
    base = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}`;
  });
  afterAll(() => app.close());

  const get = async (path: string) => {
    const res = await fetch(`${base}/t/${path}`);
    return { status: res.status, json: (await res.json()) as any };
  };

  it('sends the code as the code and a sentence as the message', async () => {
    const { status, json } = await get('stock');
    expect(status).toBe(409);
    expect(json.error.code).toBe('INSUFFICIENT_STOCK');
    expect(json.error.message).toMatch(/not in stock in the quantity you asked for/);
    expect(json.success).toBe(false);
  });

  it('keeps the HTTP status of each error', async () => {
    expect((await get('empty')).status).toBe(400);
    expect((await get('unavailable')).status).toBe(400);
  });

  it('does not show a SKU to the customer', async () => {
    const { json } = await get('unavailable');
    expect(json.error.code).toBe('VARIANT_UNAVAILABLE');
    expect(json.error.message).toBe('Sorry, this saree is no longer available.');
    expect(JSON.stringify(json)).not.toContain('JUH-IKT');
  });

  it('passes the admin stock mismatch sentence through without the code in front', async () => {
    const { json } = await get('mismatch');
    expect(json.error.code).toBe('STOCK_MISMATCH');
    expect(json.error.message).toBe('JUH-X has 3 on hand but the order needs 4. Correct the stock count first.');
  });

  it('leaves errors that are already sentences, already coded or unknown exactly as they were', async () => {
    expect((await get('sentence')).json.error).toEqual({ code: 'HTTP_404', message: 'Order not found' });
    expect((await get('coded')).json.error).toEqual({ code: 'PROD_001', message: 'Product not found' });
    expect((await get('unknown')).json.error).toEqual({ code: 'HTTP_400', message: 'SOME_UNKNOWN_CODE' });
  });

  it('still hides the details of a crash', async () => {
    const { status, json } = await get('crash');
    expect(status).toBe(500);
    expect(json.error).toEqual({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  });

  it('the log keeps the exact text that was thrown (the SKU stays findable there)', async () => {
    logged.length = 0;
    await get('unavailable'); await get('stock'); await get('sentence');
    await new Promise((r) => setTimeout(r, 50));
    expect(logged[0]).toEqual({ code: 'VARIANT_UNAVAILABLE', message: 'VARIANT_UNAVAILABLE: JUH-IKT-MRN-001' });
    expect(logged[1]).toEqual({ code: 'INSUFFICIENT_STOCK', message: undefined }); // the code says it all
    expect(logged[2]).toEqual({ code: 'HTTP_404', message: 'Order not found' });
  });
});
