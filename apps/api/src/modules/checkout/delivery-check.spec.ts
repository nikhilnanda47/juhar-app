import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { checkDelivery } from '@juhar/shared';
import { DeliveryController } from './delivery.controller';
import { DeliveryCheckQueryDto } from './dto/delivery-check-query.dto';

// "Can we deliver to this PIN code?" for the product page, checkout and the address forms.
describe('checkDelivery', () => {
  it.each([
    ['110001', 'Delhi'], ['122001', 'Gurugram'], ['160017', 'Chandigarh'], ['180001', 'Jammu'], ['194101', 'Leh'],
    ['226001', 'Lucknow'], ['302001', 'Jaipur'], ['380001', 'Ahmedabad'], ['400001', 'Mumbai'], ['452001', 'Indore'],
    ['492001', 'Raipur'], ['500001', 'Hyderabad'], ['530001', 'Visakhapatnam'], ['560001', 'Bengaluru'], ['600001', 'Chennai'],
    ['682001', 'Kochi'], ['695001', 'Thiruvananthapuram'], ['700001', 'Kolkata'], ['737101', 'Gangtok'], ['744101', 'Port Blair'],
    ['751001', 'Bhubaneswar'], ['768001', 'Sambalpur'], ['781001', 'Guwahati'], ['796001', 'Aizawl'], ['799001', 'Agartala'],
    ['800001', 'Patna'], ['834001', 'Ranchi'],
  ])('delivers to %s (%s)', (pin) => {
    expect(checkDelivery(pin)).toMatchObject({ serviceable: true, reason: 'ok', codAvailable: true, days: { min: 5, max: 7 } });
  });

  it('says the days and the cash on delivery in one readable sentence', () => {
    expect(checkDelivery('768001').message).toBe('We deliver to 768001 in 5–7 days. Cash on delivery is available.');
  });

  it.each([['000000'], ['012345'], ['100001'], ['350001'], ['540001'], ['550001'], ['650001'], ['660001'], ['860001'], ['870001'], ['880001'], ['890001'], ['290001'], ['350000']])(
    'a PIN code in a postal zone that does not exist (%s) is invalid',
    (pin) => {
      expect(checkDelivery(pin)).toMatchObject({ serviceable: false, reason: 'invalid', days: null, codAvailable: false });
    },
  );

  it.each([[''], ['12345'], ['1234567'], ['abcdef'], ['76 8001'], [undefined], [null], [768001], [{}]])('refuses what is not six digits (%p)', (pin) => {
    expect(checkDelivery(pin)).toMatchObject({ serviceable: false, reason: 'invalid' });
  });

  it('ignores spaces around the PIN code', () => {
    expect(checkDelivery('  768001 ')).toMatchObject({ serviceable: true, pin: '768001' });
  });

  it.each([['900001'], ['999999'], ['930001']])('army and field post offices (%s) are real but not served', (pin) => {
    expect(checkDelivery(pin)).toMatchObject({ serviceable: false, reason: 'not_served' });
    expect(checkDelivery(pin).message).toContain('army and field post offices');
  });

  it('a message is always there for a customer to read', () => {
    for (const pin of ['768001', '000000', '900001', 'x']) expect(checkDelivery(pin).message.length).toBeGreaterThan(10);
  });
});

describe('GET /delivery/check', () => {
  const controller = new DeliveryController();
  const dto = (pin: unknown) => plainToInstance(DeliveryCheckQueryDto, { pin });

  it('answers with the same rule', () => {
    expect(controller.check(dto('768001'))).toEqual(checkDelivery('768001'));
  });

  it.each([[undefined], [''], ['12345'], ['1234567'], ['76800a'], [' 768001']])('the request is refused unless it is exactly six digits (%p)', async (pin) => {
    const errors = await validate(dto(pin));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('six digits pass the request check (the rule then decides)', async () => {
    expect(await validate(dto('000000'))).toHaveLength(0);
    expect(controller.check(dto('000000')).reason).toBe('invalid');
  });
});
