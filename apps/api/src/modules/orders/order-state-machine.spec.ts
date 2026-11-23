import { canTransitionOrder, ORDER_TRANSITIONS, OrderStatus } from '@juhar/shared';

const S = OrderStatus;

// The business rules written out on purpose: changing a rule in packages/shared must change this table too.
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  [S.PLACED]: [S.CONFIRMED, S.CANCELLED],
  [S.CONFIRMED]: [S.PACKED, S.CANCELLED],
  [S.PACKED]: [S.SHIPPED],
  [S.SHIPPED]: [S.DELIVERED],
  [S.DELIVERED]: [S.RETURN_REQUESTED],
  [S.CANCELLED]: [],
  [S.RETURN_REQUESTED]: [S.RETURN_APPROVED, S.RETURN_REJECTED],
  [S.RETURN_APPROVED]: [S.RETURNED],
  [S.RETURN_REJECTED]: [],
  [S.RETURNED]: [S.REFUND_PENDING],
  [S.REFUND_PENDING]: [S.REFUNDED],
  [S.REFUNDED]: [],
};

const ALL_STATUSES = Object.values(S);

describe('order state machine', () => {
  describe('every status pair', () => {
    const pairs = ALL_STATUSES.flatMap((from) =>
      ALL_STATUSES.map((to) => [from, to, ALLOWED[from].includes(to)] as const),
    );

    it.each(pairs)('%s -> %s is %s', (from, to, allowed) => {
      expect(canTransitionOrder(from, to)).toBe(allowed);
    });
  });

  describe('named rules', () => {
    it('lets an order move forward one step at a time to delivery', () => {
      const path = [S.PLACED, S.CONFIRMED, S.PACKED, S.SHIPPED, S.DELIVERED];
      for (let i = 0; i < path.length - 1; i++) {
        expect(canTransitionOrder(path[i], path[i + 1])).toBe(true);
      }
    });

    it('cannot skip a step', () => {
      expect(canTransitionOrder(S.PLACED, S.SHIPPED)).toBe(false);
      expect(canTransitionOrder(S.CONFIRMED, S.DELIVERED)).toBe(false);
    });

    it('cannot move backwards', () => {
      expect(canTransitionOrder(S.CONFIRMED, S.PLACED)).toBe(false);
      expect(canTransitionOrder(S.DELIVERED, S.SHIPPED)).toBe(false);
    });

    it('can be cancelled only while placed or confirmed', () => {
      const cancellableFrom = ALL_STATUSES.filter((s) => canTransitionOrder(s, S.CANCELLED));
      expect(cancellableFrom).toEqual([S.PLACED, S.CONFIRMED]);
    });

    it('cannot be cancelled once packed, shipped or delivered', () => {
      for (const s of [S.PACKED, S.SHIPPED, S.DELIVERED]) {
        expect(canTransitionOrder(s, S.CANCELLED)).toBe(false);
      }
    });

    it('has no way out of the final states', () => {
      for (const s of [S.CANCELLED, S.RETURN_REJECTED, S.REFUNDED]) {
        expect(ORDER_TRANSITIONS[s]).toEqual([]);
      }
    });

    it('only allows a return after delivery', () => {
      const returnableFrom = ALL_STATUSES.filter((s) => canTransitionOrder(s, S.RETURN_REQUESTED));
      expect(returnableFrom).toEqual([S.DELIVERED]);
    });

    it('never allows a status to move to itself', () => {
      for (const s of ALL_STATUSES) {
        expect(canTransitionOrder(s, s)).toBe(false);
      }
    });

    it('rejects a status that does not exist', () => {
      expect(canTransitionOrder('teleported' as OrderStatus, S.CONFIRMED)).toBe(false);
    });
  });

  describe('transition table', () => {
    it('has an entry for every status', () => {
      expect(Object.keys(ORDER_TRANSITIONS).sort()).toEqual([...ALL_STATUSES].sort());
    });

    it('only points at statuses that exist', () => {
      for (const targets of Object.values(ORDER_TRANSITIONS)) {
        for (const t of targets) expect(ALL_STATUSES).toContain(t);
      }
    });
  });
});
