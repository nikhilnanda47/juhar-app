import { DELIVERY } from '../constants';

/**
 * Can we deliver to this PIN code, and how? The first two digits of an Indian PIN code name the postal zone, and
 * only some of the hundred combinations exist (there is no 10xxxx, 35xxxx, 54xxxx, 55xxxx, 65xxxx, 66xxxx, 86xxxx,
 * 87xxxx, 88xxxx or 89xxxx, and nothing starts with 0). That alone catches many typos (000000, 100000, 350000, 543210); a made-up number inside a real zone, such as 123456, still passes.
 * Whether a particular street exists is not known here; a courier's own service check can add that later.
 */
const ZONES: ReadonlyArray<readonly [number, number]> = [
  [11, 19], // Delhi, Haryana, Punjab, Chandigarh, Himachal Pradesh, Jammu and Kashmir, Ladakh
  [20, 28], // Uttar Pradesh, Uttarakhand
  [30, 34], // Rajasthan
  [36, 39], // Gujarat
  [40, 49], // Maharashtra, Goa, Madhya Pradesh, Chhattisgarh
  [50, 53], // Telangana, Andhra Pradesh
  [56, 59], // Karnataka
  [60, 64], // Tamil Nadu, Puducherry
  [67, 69], // Kerala, Lakshadweep
  [70, 79], // West Bengal, Odisha, Assam and the north-east, Sikkim, Andaman and Nicobar
  [80, 85], // Bihar, Jharkhand
];

/** 90xxxx to 99xxxx are army and field post offices: real PIN codes, but not a place a courier delivers to. */
const ARMY_POST = [90, 99] as const;

export type DeliveryReason = 'ok' | 'invalid' | 'not_served';

export interface DeliveryCheck {
  pin: string;
  /** we can deliver there */
  serviceable: boolean;
  codAvailable: boolean;
  days: { min: number; max: number } | null;
  reason: DeliveryReason;
  /** a sentence a customer can read */
  message: string;
}

const inRange = (n: number, [from, to]: readonly [number, number]) => n >= from && n <= to;

export function checkDelivery(rawPin: unknown): DeliveryCheck {
  const pin = typeof rawPin === 'string' ? rawPin.trim() : '';

  if (!/^[1-9]\d{5}$/.test(pin) || !(ZONES.some((z) => inRange(Number(pin.slice(0, 2)), z)) || inRange(Number(pin.slice(0, 2)), ARMY_POST))) {
    return {
      pin, serviceable: false, codAvailable: false, days: null, reason: 'invalid',
      message: 'That does not look like a valid PIN code. Please check the 6 digits.',
    };
  }
  if (inRange(Number(pin.slice(0, 2)), ARMY_POST)) {
    return {
      pin, serviceable: false, codAvailable: false, days: null, reason: 'not_served',
      message: `We cannot deliver to ${pin} (army and field post offices).`,
    };
  }

  const days = { min: DELIVERY.DAYS_MIN, max: DELIVERY.DAYS_MAX };
  const cod = DELIVERY.COD_AVAILABLE;
  return {
    pin, serviceable: true, codAvailable: cod, days, reason: 'ok',
    message: `We deliver to ${pin} in ${days.min}\u2013${days.max} days.${cod ? ' Cash on delivery is available.' : ''}`,
  };
}
