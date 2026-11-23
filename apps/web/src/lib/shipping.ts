import { useEffect, useState } from 'react';
import { getShippingRule, type ShippingRule } from './api';

// What the cart and checkout screens show about shipping. The rule itself is NOT written here: it
// comes from the API (GET /api/v1/config/shipping), which also uses it to charge.
// Do not type the amounts into a screen.

/** The shipping charge for a subtotal (paise), by the rule the API published. */
export function shippingFor(subtotalPaise: number, rule: ShippingRule): number {
  return subtotalPaise >= rule.freeAbovePaise ? 0 : rule.flatPaise;
}

/** How much more (paise) the cart needs for free delivery; 0 once it has it. */
export function remainingForFreeShipping(subtotalPaise: number, rule: ShippingRule): number {
  return Math.max(0, rule.freeAbovePaise - subtotalPaise);
}

/** Progress towards free delivery, 0 to 100, for the progress bar. */
export function shippingProgressPercent(subtotalPaise: number, rule: ShippingRule): number {
  if (rule.freeAbovePaise <= 0) return 100;
  return Math.min(100, Math.max(0, (subtotalPaise / rule.freeAbovePaise) * 100));
}

// The rule is fetched once and reused; a failed fetch is not remembered, so the next screen tries again.
let pending: Promise<ShippingRule> | null = null;

export function loadShippingRule(): Promise<ShippingRule> {
  if (!pending) {
    pending = getShippingRule().catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

/**
 * The shipping rule for a screen. `loaded` turns true when the answer is in (or the request failed,
 * in which case `rule` stays null and the screen shows "calculated at checkout" instead of guessing).
 */
export function useShippingRule(): { rule: ShippingRule | null; loaded: boolean } {
  const [state, setState] = useState<{ rule: ShippingRule | null; loaded: boolean }>({ rule: null, loaded: false });
  useEffect(() => {
    let cancelled = false;
    loadShippingRule()
      .then((rule) => { if (!cancelled) setState({ rule, loaded: true }); })
      .catch(() => { if (!cancelled) setState({ rule: null, loaded: true }); });
    return () => { cancelled = true; };
  }, []);
  return state;
}
