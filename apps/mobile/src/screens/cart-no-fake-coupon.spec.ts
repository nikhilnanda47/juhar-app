// The bag must not show a coupon box until the API can really price a coupon.
// A coupon box that only changed the number on this screen showed a total the order did not use.
// If coupons are built for real (API validates the code and the discount is in the order total),
// delete this test together with the note in docs/design/ui-specification.md (13.12).
import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, 'CartScreen.tsx'), 'utf8');

describe('the bag screen', () => {
  it('has no coupon box or coupon price line', () => {
    expect(source).not.toMatch(/coupon/i);
  });

  it('works out the total from the subtotal and shipping only', () => {
    expect(source).toMatch(/const totalPaise = cart\.subtotalPaise \+ \(shippingPaise \?\? 0\);/);
  });
});
