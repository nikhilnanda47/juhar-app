// The photo endpoints through a real Nest app: multipart upload, the route order, validation and how a refusal reads.
// The service behind them is a stand-in (media.service.spec.ts covers what it does).
import { PayloadTooLargeException, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { MEDIA } from '@juhar/shared';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { AdminAuthGuard, JwtAuthGuard, RolesGuard } from '../auth/guards';
import { ProductsAdminController } from '../products/products.controller';
import { ProductsService } from '../products/products.service';
import { MediaService } from './media.service';

const PRODUCT = '11111111-1111-4111-8111-111111111111';
const PHOTO = '22222222-2222-4222-8222-222222222222';
const COLOUR = '33333333-3333-4333-8333-333333333333';

const allow = { canActivate: (ctx: any) => { ctx.switchToHttp().getRequest().user = { id: 'admin-1' }; return true; } };

describe('product photo endpoints', () => {
  let app: NestExpressApplication;
  let base: string;
  const media = { add: jest.fn(), update: jest.fn(), reorder: jest.fn(), remove: jest.fn(), list: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsAdminController],
      providers: [{ provide: ProductsService, useValue: {} }, { provide: MediaService, useValue: media }],
    })
      .overrideGuard(JwtAuthGuard).useValue(allow)
      .overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useLogger(false);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', 'localhost');
  });
  afterAll(() => app.close());
  beforeEach(() => { Object.values(media).forEach((fn) => fn.mockReset().mockResolvedValue([])); });

  const upload = (fields: Record<string, string>, file?: { field?: string; bytes: Buffer }) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    if (file) form.append(file.field ?? 'file', new Blob([file.bytes], { type: 'image/jpeg' }), 'saree.jpg');
    return fetch(`${base}/api/v1/admin/products/${PRODUCT}/media`, { method: 'POST', body: form });
  };
  const json = (method: string, path: string, body?: unknown) =>
    fetch(`${base}/api/v1/admin/products/${PRODUCT}/media${path}`, {
      method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    });

  it('hands the uploaded file, its details and the signed-in admin to the service', async () => {
    const res = await upload({ altText: 'Sapphire, laid flat', variantId: COLOUR }, { bytes: Buffer.from('photo-bytes') });
    expect(res.status).toBe(201);
    const [productId, file, dto, adminId] = media.add.mock.calls[0];
    expect(productId).toBe(PRODUCT);
    expect(Buffer.from(file.buffer).toString()).toBe('photo-bytes');
    expect(dto).toEqual({ altText: 'Sapphire, laid flat', variantId: COLOUR });
    expect(adminId).toBe('admin-1');
  });

  it('works with no details at all', async () => {
    expect((await upload({}, { bytes: Buffer.from('x') })).status).toBe(201);
    expect(media.add.mock.calls[0][2]).toEqual({});
  });

  it('passes a request with no file to the service, which refuses it with its own message', async () => {
    await upload({ altText: 'no file' });
    expect(media.add.mock.calls[0][1]).toBeUndefined();
  });

  it('refuses fields it does not know, a colour that is not an id, and a too-long description', async () => {
    expect((await upload({ colour: 'blue' }, { bytes: Buffer.from('x') })).status).toBe(400);
    expect((await upload({ variantId: 'blue' }, { bytes: Buffer.from('x') })).status).toBe(400);
    expect((await upload({ altText: 'a'.repeat(256) }, { bytes: Buffer.from('x') })).status).toBe(400);
    expect(media.add).not.toHaveBeenCalled();
  });

  it('refuses a file sent under the wrong field name', async () => {
    const res = await upload({}, { field: 'photo', bytes: Buffer.from('x') });
    expect(res.status).toBe(400);
    expect(media.add).not.toHaveBeenCalled();
  });

  it('stops an absurdly large upload early (the service gives the friendly size message for ordinary ones)', async () => {
    const res = await upload({}, { bytes: Buffer.alloc(MEDIA.MAX_FILE_BYTES * 2 + 1024) });
    expect(res.status).toBe(413);
    expect(media.add).not.toHaveBeenCalled();
  });

  it('shows the service\'s refusals as a sentence a person can read, with the code', async () => {
    media.add.mockRejectedValue(new PayloadTooLargeException('PHOTO_TOO_LARGE'));
    const res = await upload({}, { bytes: Buffer.from('x') });
    expect(res.status).toBe(413);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('PHOTO_TOO_LARGE');
    expect(body.error.message).toMatch(/too big/i);
    expect(body.error.message).not.toContain('PHOTO_TOO_LARGE');
  });

  it('"order" is the reorder route, not a photo called "order"', async () => {
    const res = await json('PATCH', '/order', { ids: [PHOTO, COLOUR] });
    expect(res.status).toBe(200);
    expect(media.reorder).toHaveBeenCalledWith(PRODUCT, [PHOTO, COLOUR], 'admin-1');
    expect(media.update).not.toHaveBeenCalled();
  });

  it('refuses a reorder with no photos, a photo that is not an id, or more than the limit', async () => {
    expect((await json('PATCH', '/order', { ids: [] })).status).toBe(400);
    expect((await json('PATCH', '/order', { ids: ['one'] })).status).toBe(400);
    expect((await json('PATCH', '/order', { ids: Array(MEDIA.MAX_PER_PRODUCT + 1).fill(PHOTO) })).status).toBe(400);
    expect(media.reorder).not.toHaveBeenCalled();
  });

  it('changes a photo\'s description and colour, and lets a colour be cleared with null', async () => {
    expect((await json('PATCH', `/${PHOTO}`, { altText: 'Detail of the border', variantId: COLOUR })).status).toBe(200);
    expect(media.update).toHaveBeenLastCalledWith(PRODUCT, PHOTO, { altText: 'Detail of the border', variantId: COLOUR }, 'admin-1');
    expect((await json('PATCH', `/${PHOTO}`, { variantId: null, altText: null })).status).toBe(200);
    expect(media.update).toHaveBeenLastCalledWith(PRODUCT, PHOTO, { variantId: null, altText: null }, 'admin-1');
  });

  it('refuses a change with a bad colour id, unknown fields or a photo id that is not an id', async () => {
    expect((await json('PATCH', `/${PHOTO}`, { variantId: 'blue' })).status).toBe(400);
    expect((await json('PATCH', `/${PHOTO}`, { sortOrder: 3 })).status).toBe(400);
    expect((await json('PATCH', '/not-an-id', { altText: 'x' })).status).toBe(400);
    expect(media.update).not.toHaveBeenCalled();
  });

  it('removes a photo, and lists them', async () => {
    expect((await json('DELETE', `/${PHOTO}`)).status).toBe(200);
    expect(media.remove).toHaveBeenCalledWith(PRODUCT, PHOTO, 'admin-1');
    expect((await json('GET', '')).status).toBe(200);
    expect(media.list).toHaveBeenCalledWith(PRODUCT);
  });

  it('is only for owners and catalog editors (reading the list is open to every admin)', () => {
    const roles = (name: keyof ProductsAdminController) => Reflect.getMetadata('roles', ProductsAdminController.prototype[name]);
    for (const name of ['uploadMedia', 'reorderMedia', 'updateMedia', 'removeMedia'] as const) {
      expect(roles(name)).toEqual(['owner', 'catalog_editor']);
    }
    expect(roles('listMedia')).toBeUndefined();
  });
});
