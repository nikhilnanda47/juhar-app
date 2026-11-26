# Juhar — UI Design Specification

**Version:** 2.1  
**Date:** 17 November 2026  
**Status:** Finalized (13 screens implemented, 9 deferred)

---

## 1. Design Philosophy

**Clean, simple, functional — not decorative.**

Every element earns its place. If removing something doesn't hurt the user experience, remove it.

### Core Principles

1. **Clarity over decoration** — no ornamental borders, no gradient overloads, no unnecessary illustrations
2. **Whitespace is a feature** — let content breathe, don't fill every pixel
3. **Content-first** — product photos are the hero, not the UI
4. **Obvious navigation** — user should never wonder "where do I tap?"
5. **Subtle luxury** — premium feeling through spacing, typography, and restraint, not through textures or busy patterns
6. **One action per screen** — clear primary CTA, no decision overload
7. **Purposeful animations** — smooth micro-interactions that serve function, not decoration

### Anti-Patterns (DO NOT)

- No busy backgrounds or patterns
- No decorative icons that don't serve a function
- No marketing language in UI (avoid "MASTERPIECES", "ARTISANAL LOOM HERITAGE")
- No oversized hero sections that push content below the fold
- No trust badges cluttering every screen — one subtle mention is enough
- No gradient overlays on everything
- No uppercase text everywhere — use sparingly (badges/buttons only)
- No emoji as icons — use a proper icon set
- No parallax, bouncing badges, or decorative animations

### Reference Apps (for feel, not to copy)

- **Muji** — minimal, lots of whitespace
- **Uniqlo** — clean grid, simple product cards
- **Apple Store** — generous spacing, clear hierarchy
- **Zara** — photography-first, almost no UI decoration

---

## 2. Brand Identity

| Attribute | Value |
|-----------|-------|
| **Name** | Juhar (ଜୁହାର୍) |
| **Meaning** | "Greetings" — a traditional tribal salutation |
| **Tagline** | A Tradition Worth Wearing |
| **Legal Name** | JUHAR TEXTILES |
| **Positioning** | Clean, modern handloom — not traditional/ornate |
| **Feeling** | Calm confidence. Like walking into a well-curated boutique. |
| **Target** | Women 25-55, semi-urban India, buying ₹1,500–₹12,000 sarees |
| **Tone** | Warm, trustworthy, understated, never loud |

---

## 3. Color Palette

Tight palette — 3 brand colors + neutrals. No rainbow.

### Brand Colors

| Token | Hex | Swatch | Usage |
|-------|-----|--------|-------|
| Primary | `#8B3A4A` | 🟤 Soft Burgundy | CTAs, active states — **max 2 elements per screen** |
| Primary Dark | `#6B1D2A` | 🟤 Deep Burgundy | Pressed/hover states |
| Accent | `#B5956B` | 🟡 Warm Bronze | Prices, highlights, subtle badges |

### Neutrals

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#FAFAF7` | App background — warm off-white |
| Surface | `#FFFFFF` | Cards, inputs, modals |
| Text Primary | `#1A1A1A` | Headings, product names |
| Text Secondary | `#6B6B6B` | Descriptions, metadata |
| Text Tertiary | `#999999` | Timestamps, hints, placeholders |
| Border | `#EEEEEE` | Hairline dividers, card borders |

### Functional Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Success | `#3D8B63` | Muted green — in stock, delivered, confirmed |
| Warning | `#D4923A` | Muted amber — low stock, pending |
| Error | `#C44A4A` | Muted red — out of stock, errors, cancelled |

### Color Rules

- Primary burgundy appears on **maximum 2 elements per screen** (typically: CTA button + one highlight)
- Everything else is neutral (greys, whites)
- Background is always `#FAFAF7` in the light theme, never pure white `#FFFFFF`
- Cards are `#FFFFFF` in the light theme to create subtle contrast against the warm background
- No color used purely for decoration
- The values in this section are the **light theme**. Every neutral and status token also has a dark value; see section 3a

---

## 3a. Theming & Dark Mode

> **Implementation status (2026-11-22):** Implemented in the mobile app, the customer website and the admin panel (which has its own switch, see below). The default is always light; the OS appearance setting is not followed yet.

Every colour is a **semantic token** with a light value and a dark value. Screens ask for the token (`surface`, `text-primary`, `border`, ...) and never for a literal colour, so a theme switch changes every screen at once. The brand colours and the functional colours (success, warning, error) are identical in both themes.

### Token values

| Token | Light | Dark | Notes |
|-------|-------|------|-------|
| Background | `#FAFAF7` | `#121212` | App/page background |
| Surface | `#FFFFFF` | `#1E1E1E` | Cards, inputs, modals, tab bar, header |
| Surface alt | `#F4F4F1` | `#1A1A1A` | Item previews, summary banners. Web: `surface-container-low` |
| Surface muted | `#E8E8E5` | `#2C2C2C` | Dividers, placeholder pills, toggle track. Web: `surface-container-high` |
| Text primary | `#1A1A1A` | `#EAEAEA` | Headings, product names |
| Text secondary | `#6B6B6B` | `#A0A0A0` | Descriptions, metadata |
| Text tertiary | `#999999` | `#666666` | Timestamps, hints, placeholders |
| Border | `#EEEEEE` | `#2C2C2C` | Hairlines, card borders |
| Primary / Primary Dark / Accent | `#8B3A4A` / `#6B1D2A` / `#B5956B` | same | Brand: unchanged |
| Success / Warning / Error | `#3D8B63` / `#D4923A` / `#C44A4A` | same | Functional: unchanged |
| Accent text on tint (`accentDark`) | `#795E38` | `#C4A060` | Delivered/COD badge text |
| Toast background | `#1A1A2E` | `#2A2A3E` | |

Status pills use paired background/text tokens in both themes:

| Status token | Light (bg / text) | Dark (bg / text) |
|--------------|-------------------|------------------|
| Confirmed | `#FFF8E1` / `#F57F17` | `#2D2A1A` / `#FFD54F` |
| Packed, Shipped | `#FFF3E0` / `#E65100` | `#2D2316` / `#FFB74D` |
| Delivered | `#E8F5E9` / `#2E7D32` | `#1A2D1E` / `#66BB6A` |
| Cancelled | `#FCE4EC` / `#C62828` | `#2D1A1E` / `#EF5350` |

Source of truth: mobile `apps/mobile/src/theme/colors.ts` (`lightColors`, `darkColors`); web `apps/web/src/app/globals.css` (`:root` and `.dark`).

### Mechanism

| | Mobile | Web |
|---|--------|-----|
| Tokens | `lightColors` / `darkColors` objects | CSS variables holding RGB channels (e.g. `--color-primary: 139 58 74`) |
| Usage | `const { colors } = useTheme()` and `createStyles(colors)` | Tailwind classes (`bg-surface`, `text-text-primary`, `border-border`), mapped to `rgb(var(--color-...) / <alpha-value>)` so opacity modifiers like `bg-surface/80` work |
| Switching | `ThemeProvider` state | `dark` class on `<html>` (`darkMode: 'class'`) |
| Persistence | `AsyncStorage` key `juhar_theme` | `localStorage` key `juhar_theme` |
| First paint | Starts light, then applies the saved choice (a brief light flash is possible) | Inline script in `<head>` adds the `dark` class before first paint (no flash) |
| Browser chrome | Status bar style follows the theme | `theme-color` meta follows the toggle (`#FAFAF7` / `#121212`) |

### Where the toggle lives

| Surface | Placement |
|---------|-----------|
| Mobile, logged in | Profile screen menu card: "Dark Mode" / "Light Mode" row with a switch |
| Mobile, logged out | Sun/moon icon button at the right of the Account header, so guests can switch too |
| Web, any width | Sun/moon icon button in the Header (on a phone it is the only button there, so logged-out visitors can switch) |
| Admin panel | Sun/moon icon button in the top bar, right of the page actions; the login page follows the saved choice but has no button |
| Web, logged in | Toggle row in the Account page menu |

### Rules for building screens

1. **Use tokens, never literals, for surfaces and text.** No `bg-white`, `#fff` or hard-coded hex on a surface or text colour; both themes must stay readable.
2. **Overlays on product photos** (wishlist/share buttons, origin and "GI CERTIFIED LOOM" badges) use the surface token with opacity (`bg-surface/80` to `bg-surface/90`; mobile `surfaceOverlay`), so their text stays readable in both themes. A fixed white overlay with token text becomes unreadable in dark mode.
3. **Status colours** always come from the paired status tokens above.
4. **Allowed fixed colours:** white text or icons on the burgundy primary, the white switch thumb, the WhatsApp green, and product colour swatches (they depict the real product colour). A swatch has a thin outline so a black one does not vanish on the dark page (nor a white one on the light), and the selected tick sits on a dark disc so it shows on any colour.
5. **Check both themes** before shipping a screen, including empty, error and loading states.

### Known gaps

- No "follow system appearance" default.
- The Welcome slides define their own light/dark background pairs, and the product screen maps colour names to swatch hex values (both checked in dark mode: fine).

---

## 4. Typography

**Two fonts only:** Noto Serif (headlines) + DM Sans (everything else).

Both are from the same design family — they pair perfectly.

### Type Scale

| Style | Font | Size | Weight | Line Height | Usage |
|-------|------|------|--------|-------------|-------|
| Page Title | Noto Serif | 24px | 400 | 32px | Screen titles, hero text |
| Section Title | Noto Serif | 18px | 400 | 26px | Section headings |
| Product Title | DM Sans | 16px | 500 (Medium) | 22px | Product names, card titles |
| Body | DM Sans | 14px | 400 (Regular) | 22px | Descriptions, general text |
| Caption | DM Sans | 12px | 400 (Regular) | 18px | Metadata, timestamps, hints |
| Price | DM Sans | 18px | 700 (Bold) | 24px | Current price |
| Price Strike | DM Sans | 14px | 400 (Regular) | 20px | Original/MRP price, strikethrough |
| Button | DM Sans | 14px | 600 (Semibold) | 20px | Button labels |
| Badge | DM Sans | 11px | 600 (Semibold) | 14px | Status pills, small tags |
| Tab Label | DM Sans | 10px | 500 (Medium) | 14px | Bottom tab bar labels |

### Typography Rules

- **Noto Serif** — headlines only. Never for body, buttons, labels, or badges.
- **Uppercase** — ONLY for badge text and button labels. Nowhere else.
- **Letter spacing** — normal everywhere. No wide tracking.
- **Max 3 font sizes** visible on any single screen.
- **Text alignment** — left-aligned always. Center only for empty states and success screens.

---

## 5. Spacing

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps — badge internal padding, inline icon spacing |
| sm | 8px | Small gaps — icon + text, label above input |
| md | 16px | Standard — screen margins, gap between elements |
| lg | 24px | Section padding, card internal padding |
| xl | 32px | Gap between sections |
| 2xl | 48px | Major section breaks |
| gutter | 12px | Product grid gap between cards |

### Spacing Rules

- Screen margins: always **16px** on both sides
- Sections separated by **whitespace (32px)**, not divider lines
- Card internal padding: **16-24px**
- Consistent **12px gap** in product grids
- Touch targets: minimum **44px height**

---

## 6. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm | 6px | Inputs, small buttons |
| md | 12px | Cards, modals, product images |
| lg | 16px | Bottom sheets, large containers |
| full | 9999px | Pills, badges, avatars, stepper buttons, color swatches |

---

## 7. Elevation

**Pick ONE style per element — never combine border + shadow.**

| Style | CSS/Value | When to use |
|-------|-----------|-------------|
| Hairline border | `1px solid #EEEEEE` | Default for cards, list items, inputs |
| Subtle shadow | `0 2px 8px rgba(0,0,0,0.06)` | Floating elements: sticky bars, bottom sheets, FABs |
| None | No border, no shadow | Content that doesn't need visual separation |

### Elevation Rules

- **Never** use border AND shadow together on the same element
- Cards: hairline border (default)
- Sticky bottom bars (cart CTA, checkout): subtle shadow
- Bottom sheets: subtle shadow + backdrop dim (`rgba(0,0,0,0.3)`)

---

## 8. Icons

**Icon Set: Lucide** ([lucide.dev](https://lucide.dev))

| Attribute | Value |
|-----------|-------|
| Package | `lucide-react-native` (mobile), `lucide-react` (web/admin) |
| Style | Clean, 2px stroke, minimal |
| Size (UI) | 20px |
| Size (Tab Bar) | 24px |
| Color | Matches text color (primary text or secondary grey) |
| Active state | Filled variant — tab bar active only |
| Inactive state | Outlined — everything else |

### Icon Rules

- No emoji anywhere in the final UI
- Consistent 2px stroke weight across all icons
- Icons are functional — every icon must represent an action or status
- No decorative icons

---

## 9. Component Patterns

### 9.1 Product Card

The most important component in the app. Keep it extremely clean.

```
┌─────────────────────┐
│                     │
│    Product Image    │  ← 3:4 ratio, fills width, 12px radius
│    (no overlays)    │
│                     │
├─────────────────────┤
│ Product Name        │  ← 16px, medium, 1 line max
│ ₹3,500  ₹4,500     │  ← price bold, compare strikethrough
│ Only 3 left         │  ← 12px, muted red (only if low stock)
└─────────────────────┘
```

- NO badges overlaying the image
- NO category labels on the card
- NO icons on the card (no heart, no cart)
- Tap entire card to navigate to detail
- Hairline border, 12px radius

### 9.2 Buttons

| Type | Style | Usage |
|------|-------|-------|
| Primary | Solid `#8B3A4A` bg, white text, full-width, 48px height | Main CTA (1 per screen) |
| Secondary | 1px border `#8B3A4A`, no fill, burgundy text | Secondary actions |
| Ghost | No border, no fill, burgundy text | Tertiary actions (links) |
| Disabled | 40% opacity of any above | Inactive state |

- All buttons: 6px border radius, 14px semibold text
- All buttons: press feedback animation (scale 0.97)

### 9.3 Input Fields

```
LABEL                    ← 12px, text secondary, above input
┌─────────────────────┐
│ Placeholder text    │  ← 14px, text tertiary
└─────────────────────┘
```

- 1px border `#EEEEEE`, 6px radius
- 48px height (touch friendly)
- Label above (not floating label)
- Focus: border changes to `#8B3A4A`
- Error: border `#C44A4A` + error message below in 12px red

### 9.4 Bottom Tab Bar

```
┌──────┬──────┬──────┬──────┬──────┐
│ Home │ Shop │ Cart │Orders│Account│
│  ○   │  ○   │ ○ ²  │  ○   │  ○   │
└──────┴──────┴──────┴──────┴──────┘
```

- 5 tabs: Home, Shop, Cart, Orders, Account
- **Icons + small labels below** (always visible)
- Active: filled icon + primary burgundy color + burgundy label
- Inactive: outlined icon + text tertiary + grey label
- White background, subtle top border (`#EEEEEE`)
- Cart tab: small count badge (burgundy circle, white number)
- Height: 56px + safe area padding
- Label size: 10px, medium weight
- **Tapping a tab always opens that tab's first screen** (Shop → the product list, Orders → the orders list, and so on), even when the customer is deep inside it

### 9.5 Navigation Header

```
┌───────────────────────────────────┐
│  ←    Page Title                  │
└───────────────────────────────────┘
```

- Back arrow (left) + page title (**left-aligned**, after back arrow)
- No decorative elements
- Background: `#FAFAF7` (same as app background)
- Bottom: hairline border, no shadow
- Height: 56px
- Title: 16px, DM Sans, medium weight

### 9.6 Status Badges

| Status | Background | Text Color |
|--------|------------|------------|
| Placed | `#E3F2FD` | `#1565C0` (blue) |
| Confirmed | `#FFF8E1` | `#F57F17` (amber) |
| Packed | `#FFF3E0` | `#E65100` (orange) |
| Shipped | `#FFF3E0` | `#E65100` (orange) |
| Delivered | `#E8F5E9` | `#2E7D32` (green) |
| Cancelled | `#FCE4EC` | `#C62828` (red) |

- Pill shape (full radius), 11px semibold uppercase text
- Horizontal padding 8px, vertical 3px

> **Implementation status (2026-11-22):** The table above is the original design. The shipped styles differ for two states and add the post-delivery states. Light values (dark values are in section 3a):
>
> | Status | Web list badge | Mobile list badge |
> |--------|----------------|-------------------|
> | Placed | `#E8E8E5` bg, `#8B3A4A` text (neutral + brand, not blue) | Same colours |
> | Confirmed | `#FFF8E1` / `#F57F17` | Same |
> | Packed | `#FFF3E0` / `#E65100` | Same |
> | Shipped | Packed colours | `#FFF3E0` / `#E65100` (same values) |
> | Delivered | Warm tint (`#FFDAAB` at 40%) bg, `#795E38` text (not green) | `accentBg` tint, `#795E38` text |
> | Cancelled | `#FCE4EC` / `#C62828` | Same |
> | Return requested, Return approved, Returned, Refund pending | Neutral placed style, labelled "Return requested", "Return approved", "Returned", "Refund pending" | No dedicated style: falls back to the Placed style with the status text (e.g. "RETURN REQUESTED") |
> | Return rejected | Cancelled style, "Return rejected" | Falls back as above |
> | Refunded | Delivered style, "Refunded" | Falls back as above |
>
> **Order detail (web):** a cancelled order shows a banner in the cancelled colours ("Order cancelled on {date}" plus the reason) instead of the progress timeline. A return or refund status shows a notice card (package icon + status label) above a timeline with all five delivery steps complete. The mobile order detail shows the cancelled banner but has no return/refund state yet.

### 9.7 Bottom Sheet

Used for: filters, sort options, address selection on larger screens

- Slides up from bottom with backdrop dim (`rgba(0,0,0,0.3)`)
- 16px top radius, white background
- Drag handle: 32px × 4px, `#DDDDDD`, centered, 8px from top
- Subtle shadow on the sheet

---

## 10. Animations & Interactions

**Rule: Every animation must serve a purpose.** If it's just decorative, remove it.

### Screen Transitions

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Stack push/pop | Native horizontal slide | 300ms |
| Tab switch | Content cross-fade | 200ms |

### Touch Feedback

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Button press | Scale down to 0.97, spring back | 100ms down, 200ms up |
| Card tap | Opacity to 0.85, restore on release | 100ms |

### Loading States

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Initial content load | Skeleton shimmer (grey placeholders) | Continuous until loaded |
| Pull to refresh | Custom branded spinner (burgundy dot or Juhar mark) | Until data loads |

### Cart Interactions

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Add to cart | Brief checkmark overlay on button, then restore text | 500ms |
| Quantity change | Number fade out + scale in new number | 150ms |
| Remove item | Row slides out to left, remaining items collapse up | 250ms |

### Order Status

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Status timeline | Dots/steps animate in staggered on screen load | 100ms each step |

### Overlays

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Bottom sheet open | Slide up from bottom + backdrop dim (`rgba(0,0,0,0.3)`) | 250ms |
| Bottom sheet close | Slide down + backdrop fade out | 200ms |

### Animation Rules

- 60fps minimum — if frames drop, remove the animation
- No parallax scrolling
- No hero image zoom effects
- No floating animated elements
- No spinners (use skeleton shimmer) — except pull-to-refresh branded spinner
- Ease curves: `ease-out` for enters, `ease-in` for exits
- Pulsing reserved for splash screen loading dots only

### Implementation: `AnimatedUI.tsx`

Reusable animation components in `apps/mobile/src/components/AnimatedUI.tsx`:

| Component | Behaviour | Used In |
|---|---|---|
| `FadeInUp` | Fade in + slide up on mount (configurable delay, duration, distance) | Home, Explore, ProductDetail, Profile, OrderSuccess |
| `FadeIn` | Simple opacity fade-in | General use |
| `ScalePress` | Scale to 0.97 on press, spring back on release | Home hero, interactive cards |
| `StaggeredList` | Renders children with incremental delay | List animations |
| `BounceIn` | Spring scale 0→1 with opacity | OrderSuccess checkmark |
| `Pulse` | Subtle infinite scale pulse (splash dots only) | SplashScreen |

---

## 11. Product Image Guidelines

| Attribute | Specification |
|-----------|--------------|
| Aspect ratio | 3:4 (portrait) |
| Border radius | 12px (md) |
| Background | Neutral/white product photography |
| Overlays | None — clean product photo only |
| Placeholder | Light grey (`#F0F0F0`) with subtle icon |
| Multiple images | Horizontal swipe, dot pagination below |
| Zoom | Pinch-to-zoom on detail screen |

---

## 12. Web App & Responsive Design

**Status:** Implemented (`apps/web` — Next.js 14 App Router + Tailwind CSS)

The web app (`localhost:3001`) mirrors all mobile app features with responsive layouts:

| Breakpoint | Width | Grid Columns | Layout |
|------------|-------|-------------|-------|
| Mobile | < 640px | 2 product columns | App-like with bottom nav, sticky CTAs |
| Tablet (md) | 640–768px | 2–3 columns | Card grids, larger touch targets (h-14) |
| Desktop (lg) | 1024px+ | 4–5 columns | Full-width, side-by-side layouts, table views |

### 12.1 Web Pages (11 routes)

| Route | Mobile Layout | Desktop Layout |
|-------|---------------|----------------|
| `/` (Home) | Sub-header + hero + horizontal scroll arrivals | Full-width hero + 4-col grid |
| `/shop` | Search + chips + 2-col grid | Search (max-w-xl) + filter chips + 5-col grid |
| `/shop/[slug]` | Stacked image → info + sticky bottom CTA | 55/45 split (sticky image + thumbnails / info + inline CTA) |
| `/cart` | Stacked items + price summary | 2-col (items / sticky price sidebar) |
| `/checkout/address` | Stacked address cards | 2-col grid cards + sticky summary sidebar |
| `/checkout/address/new` | Stacked form fields | Numbered sections + 4-col fields + live preview sidebar |
| `/checkout/review` | Stacked sections | Single column, centered |
| `/order-success` | Centered card layout | Same, max-w-md |
| `/orders` | Card list | Table layout with filter chips + column headers |
| `/orders/[id]` | Vertical timeline + stacked sections | Horizontal timeline + 2-col (content / sticky sidebar) |
| `/account` | App-like profile card + tiles + menu | Split-panel login; 2-col profile (sidebar / content grid) |

### 12.2 Web-specific Components

- **Header** (`components/Header.tsx`): Sticky, brand + nav links (desktop), icons hidden on mobile (bottom nav handles it). Cart badge count. The dark-mode toggle (sun/moon icon) shows at every width; search, cart and account are desktop-only.
- **BottomNav** (`components/BottomNav.tsx`): 5 tabs matching mobile app, hidden on desktop (`lg:hidden`). Cart badge count.
- **CartProvider** (`lib/cart-context.tsx`): React context providing `itemCount` to Header and BottomNav. It reads the server cart (logged in) or the localStorage guest cart, and refreshes only when the cart changes (`notifyCartChanged()` in `lib/cart-events.ts`, also across tabs through the `storage` event), when the customer returns to the tab or window (`focus` / `visibilitychange`), and every 5 minutes while the tab is visible as a safety net. There is no polling timer. Scheduling lives in `lib/cart-refresh.ts`.
- **ThemeProvider** (`lib/theme-context.tsx`): React context providing `{ isDark, toggleTheme }`. Toggles the `dark` class on `<html>`, saves the choice in `localStorage` (`juhar_theme`) and updates the `theme-color` meta tag. See section 3a.
- **Viewport:** pinch-zoom is allowed (the viewport sets only `width=device-width, initial-scale=1`; earlier it disabled scaling). The browser theme colour is `#FAFAF7` in light mode and `#121212` in dark mode.

### 12.3 Cart Badge Count

Both web and mobile show a badge on the cart icon:
- **Web**: Burgundy circle badge on Header (desktop) and BottomNav (mobile). Via `useCartCount()` context.
- **Mobile**: Native `tabBarBadge` on Cart tab, fed by `TabNavigator`. It refreshes when the cart changes (`notifyCartChanged()` in `services/cartEvents.ts`), when the app returns to the foreground, and every 5 minutes while the app is in the foreground. There is no polling timer (scheduling in `services/cartRefresh.ts`).
- Badge hidden when count is 0, shows "99+" for counts over 99.

### 12.4 Guest Cart (Local Cart)

Users can browse and add items to cart without logging in:

| Step | Behaviour |
|------|-----------|
| Guest adds to bag | Stored in `AsyncStorage` (mobile) / `localStorage` (web) via `localCart.ts` |
| Guest views cart | Local cart rendered using `localCartToResponse()` |
| Guest updates qty / removes | Updates local storage directly |
| Guest taps "Proceed to Checkout" | Redirected to login screen |
| After login | `syncLocalCartToServer()` pushes all local items to server cart, clears local storage |

**Files:** `apps/mobile/src/services/localCart.ts`, `apps/web/src/lib/cart-context.tsx`

### 12.5 RefreshButton Component

Reusable refresh icon (`RefreshCw`) with spin animation on press. Used on Home, Shop, Cart, Orders, Profile headers. `useNativeDriver` disabled on web for transform compatibility.

**File:** `apps/mobile/src/components/RefreshButton.tsx`

---

## 13. Screen-by-Screen Designs

### 13.1 Splash (Screen 1)

**Purpose:** Brand moment while app loads. Auto-transitions to Home (returning user) or Welcome (first launch).

```
┌─────────────────────────────┐
│                             │
│                             │
│                             │
│                             │
│          [Juhar Logo]      │  ← Centered, Noto Serif
│           ଜୁହାର୍              │  ← Odia script below, 14px caption
│                             │
│                             │
│                             │
│                             │
│                             │
└─────────────────────────────┘
```

- Background: `#FAFAF7`
- "Juhar" wordmark: Noto Serif, 32px, `#8B3A4A`
- "ଜୁହାର୍" subtitle: DM Sans, 14px, `#6B6B6B`
- Duration: 1.5–2s (or until API health check returns)
- Animation: Logo fades in (opacity 0→1, 400ms ease-out), cross-fade to next screen
- No tagline, no illustration, no decorative background

---

### 13.2 Welcome / Onboarding (Screen 2)

**Purpose:** First-time users only. 3 swipeable pages. Skip always visible.

```
┌─────────────────────────────┐
│                      Skip → │  ← Ghost button, top-right
│                             │
│    ┌───────────────────┐    │
│    │   Illustration    │    │  ← Simple, flat, minimal color
│    │   or Product      │    │
│    │   Photo           │    │
│    └───────────────────┘    │
│                             │
│    Handwoven with care      │  ← Noto Serif, 24px
│                             │
│    Sambalpuri sarees made   │  ← DM Sans, 14px, #6B6B6B
│    by master weavers from   │     Center-aligned
│    Western Odisha.          │
│                             │
│         ● ○ ○               │  ← Active dot: #8B3A4A
│                             │
│  ┌─────────────────────────┐│
│  │     Start Shopping      ││  ← Page 3 only; Pages 1-2: "Next →"
│  └─────────────────────────┘│
└─────────────────────────────┘
```

**3 Pages:**

| Page | Headline | Subtext |
|------|----------|---------|
| 1 | Handwoven with care | Sambalpuri sarees made by master weavers from Western Odisha. |
| 2 | Direct from the loom | No middlemen. Fair prices for weavers, honest prices for you. |
| 3 | Delivered to your door | Cash on delivery. Easy returns. 5–7 day shipping. |

- Swipe between pages, dot indicators scale active (1.0→1.3)
- Pages 1–2: "Next →" ghost button; Page 3: "Start Shopping" primary button
- "Skip" top-right always visible → goes to Home
- After completion/skip: `hasOnboarded = true` in AsyncStorage, never shown again

---

### 13.3 No Internet (Screen 3)

**Purpose:** Shown when network unreachable.

```
┌─────────────────────────────┐
│                             │
│                             │
│         wifi-off            │  ← Lucide, 48px, #999999
│                             │
│     No internet connection  │  ← Noto Serif, 20px
│                             │
│     Check your connection   │  ← DM Sans, 14px, #6B6B6B
│     and try again.          │     Center-aligned
│                             │
│     ┌───────────────────┐   │
│     │      Retry        │   │  ← Secondary button (outline)
│     └───────────────────┘   │     160px width
│                             │
└─────────────────────────────┘
```

- Auto-detects network restore → dismisses automatically
- Retry: re-checks, brief spinner inside button
- No tab bar visible
- If mid-flow: overlays current screen

---

### 13.4 App Update Required (Screen 4)

**Purpose:** Force-update gate. Non-dismissable.

```
┌─────────────────────────────┐
│                             │
│                             │
│         download            │  ← Lucide, 48px, #999999
│                             │
│       Update available      │  ← Noto Serif, 20px
│                             │
│    A newer version of       │  ← DM Sans, 14px, #6B6B6B
│    Juhar is available.     │     Center-aligned
│    Please update to         │
│    continue.                │
│                             │
│  ┌─────────────────────────┐│
│  │    Update Now            ││  ← Primary button, full-width
│  └─────────────────────────┘│     Opens Play Store / App Store
└─────────────────────────────┘
```

- Non-dismissable: no back, no skip, no tab bar
- On app resume: re-checks version → dismisses if updated
- No hardware back (Android)

---

### 13.5 Maintenance (Screen 5)

**Purpose:** API down for maintenance. Informational only.

```
┌─────────────────────────────┐
│                             │
│                             │
│         wrench              │  ← Lucide, 48px, #999999
│                             │
│      We'll be back soon     │  ← Noto Serif, 20px
│                             │
│    We're making some        │  ← DM Sans, 14px, #6B6B6B
│    improvements. Please     │     Center-aligned
│    check back in a while.   │
│                             │
└─────────────────────────────┘
```

- No action button — nothing user can do
- Auto-polls API health every 30s → auto-transitions to Home when healthy
- No tab bar, no back button

---

### 13.6 Login — Phone (Screen 6)

**Purpose:** Phone number input for OTP auth. Appears on protected actions.

```
┌─────────────────────────────┐
│  ←                          │
│                             │
│    Log in to Juhar         │  ← Noto Serif, 24px
│                             │
│    Enter your phone number  │  ← DM Sans, 14px, #6B6B6B
│    to continue.             │
│                             │
│    PHONE NUMBER             │  ← Label, 12px, #6B6B6B
│    ┌──────┬────────────────┐│
│    │ +91  │ 98765 43210    ││  ← 48px, numeric keyboard
│    └──────┴────────────────┘│     +91 fixed, non-editable
│                             │
│  ┌─────────────────────────┐│
│  │      Send OTP           ││  ← Disabled until 10 valid digits
│  └─────────────────────────┘│
└─────────────────────────────┘
```

- Validates: exactly 10 digits, starts with 6–9
- Button disabled (40% opacity) until valid
- Error: inline below input, 12px `#C44A4A`
- Input focus: border `#EEEEEE` → `#8B3A4A`
- Numeric keyboard auto-opens

---

### 13.7 Login — OTP Verify (Screen 7)

**Purpose:** 6-digit OTP input. Auto-submits on completion.

```
┌─────────────────────────────┐
│  ←                          │
│                             │
│    Verify your number       │  ← Noto Serif, 24px
│                             │
│    OTP sent to              │  ← DM Sans, 14px, #6B6B6B
│    +91 98765 43210          │  ← DM Sans, 14px bold, #1A1A1A
│                             │
│    ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│    │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │  ← 48×48px, 8px gap
│    └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
│                             │
│    Resend OTP in 0:28       │  ← 14px, #999999
│    Change number            │  ← Ghost, 14px, #8B3A4A
│                             │
└─────────────────────────────┘
```

- Auto-advance on digit entry, backspace moves back
- Auto-submit on 6th digit (no button)
- Error: shake animation, clear all, refocus first, "Invalid OTP" 12px `#C44A4A`
- Resend timer: 30s countdown → "Resend OTP" tappable ghost `#8B3A4A`
- Success → Home (existing) or Name Capture (new user)
- Box border: `#EEEEEE`, focus: `#8B3A4A`

---

### 13.8 Name Capture (Screen 8)

**Purpose:** First-time users only. Collect name after OTP. Shown once.

```
┌─────────────────────────────┐
│                             │
│                             │
│    Welcome to Juhar        │  ← Noto Serif, 24px
│                             │
│    What should we call you? │  ← DM Sans, 14px, #6B6B6B
│                             │
│    YOUR NAME                │  ← Label, 12px
│    ┌───────────────────────┐│
│    │ e.g. Priya            ││  ← Placeholder #999999
│    └───────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │      Continue           ││  ← Disabled until ≥ 2 chars
│  └─────────────────────────┘│
│    Skip →                   │  ← Ghost, center, #8B3A4A
└─────────────────────────────┘
```

- No back arrow (can't skip auth mid-flow)
- "Skip" saves user with no name (editable from Profile later)
- On continue: `PATCH /me` → navigate to Home

---

### 13.9 Home (Screen 9)

**Purpose:** Main landing. Collections + new arrivals.

```
┌─────────────────────────────┐
│    Juhar                   │  ← Noto Serif, 24px, #8B3A4A
│                             │
│  ┌─────────────────────────┐│
│  │     Hero Image          ││  ← Full-width, 16:9, 12px radius
│  │     (featured saree)    ││     Tappable → Explore filtered
│  └─────────────────────────┘│
│                             │
│    Collections              │  ← Noto Serif, 18px
│                             │
│  ┌──────────┐ ┌──────────┐ │  ← 2×2 grid, 12px gap
│  │  Silk    │ │  Cotton  │ │     1:1 ratio, 12px radius
│  └──────────┘ └──────────┘ │     Name: 14px, white, dark gradient
│  ┌──────────┐ ┌──────────┐ │     Tap → Explore filtered
│  │  Pasapali│ │  Ikat    │ │
│  └──────────┘ └──────────┘ │
│                             │
│    New Arrivals    See all →│  ← Section title + ghost link
│                             │
│  ┌────────┐ ┌────────┐ ┌───│  ← Horizontal scroll, 160px cards
│  │  img   │ │  img   │ │   │     12px gap, standard product card
│  │  3:4   │ │  3:4   │ │   │     Latest 8 from API
│  ├────────┤ ├────────┤ ├───│
│  │Name    │ │Name    │ │   │
│  │₹3,500  │ │₹2,800  │ │   │
│  └────────┘ └────────┘ └───│
│                             │
├─────────────────────────────┤
│ Home  Shop  Cart Orders Acc │
└─────────────────────────────┘
```

- Pull-to-refresh with branded spinner
- Shimmer skeleton on first load
- Sections separated by 32px whitespace
- No trust badges, no authenticity section, no footer strip

---

### 13.10 Explore / Shop (Screen 10)

**Purpose:** Full catalog. Category filter, sort, 2-column grid.

```
┌─────────────────────────────┐
│    Shop                     │  ← Noto Serif, 24px
│                             │
│  ┌─────────────────────────┐│
│  │ 🔍 Search sarees...     ││  ← Tappable → Search screen
│  └─────────────────────────┘│
│                             │
│  ┌────┐ ┌──────┐ ┌──────┐  │  ← Horizontal chips
│  │All │ │Silk  │ │Cotton│  │     Active: #8B3A4A bg, white
│  └────┘ └──────┘ └──────┘  │     Inactive: #EEEEEE bg
│                             │
│  24 sarees         Sort ↓  │  ← Count + sort ghost button
│                             │
│  ┌──────────┐ ┌──────────┐ │  ← 2-column, 12px gap
│  │  img 3:4 │ │  img 3:4 │ │     Standard product card
│  ├──────────┤ ├──────────┤ │     Cursor pagination
│  │Name      │ │Name      │ │     Shimmer at bottom while loading
│  │₹3,500    │ │₹2,800    │ │
│  └──────────┘ └──────────┘ │
│         ···                 │
├─────────────────────────────┤
│ Home  Shop  Cart Orders Acc │
└─────────────────────────────┘
```

**Sort bottom sheet:**

| Option | Default |
|--------|---------|
| Newest first | ● (default) |
| Price: Low to High | ○ |
| Price: High to Low | ○ |
| Popular | ○ |

- Radio list, 48px rows, `#8B3A4A` active dot
- Drag handle, backdrop dim, 16px top radius

> **Implementation status:** the sort control is a small pill under the category chips (mobile: tap it for a three-row menu with a check on the active row; web: a select). It offers the three sorts the API supports (Newest, Price: low to high, Price: high to low); "Popular" is not built. The sort covers the whole catalog and works together with the category chip. The count is the real total ("58 sarees"), not the number loaded. Instead of shimmer or infinite scroll, 20 sarees load first and an outlined "Load more sarees" button adds the next 20; below it a line says "Showing 20 of 58 sarees" (then "All 58 sarees shown"). Changing the sort, category or search starts again from the first page. The web search waits for a short pause in typing before asking the API.
>
> **Search and filters (step 47):** the search box on both apps searches the shop in place (not a separate Search screen): it waits 300 ms after typing, needs 2 letters, and has a ✕ that clears it. When nothing matches it says `No results for "…"` with a "Browse all" button that clears the search, the filters and the category. The filter icon next to the search box shows a badge with the number of filters on. Mobile: it opens a bottom sheet with chips for Fabric, Weave and Colour (one choice each, tap again to switch off), two price boxes in rupees and the buttons "Clear all" and "Show sarees". Web: it opens a panel under the search box with three dropdowns and two price boxes that apply after a short pause. The lists are read from the catalog (`GET /products/filters`), and the filters that are on show as removable chips under the category chips. A price range whose lowest is above its highest shows a message and is not applied.

**Empty state:** Lucide `search` 48px + "No sarees found" + "Try a different category"

---

### 13.11 Product Detail (Screen 11)

**Purpose:** Full product view. Most important customer screen.

```
┌─────────────────────────────┐
│  ←                 ♡    ↗   │  ← Back, Wishlist, Share
│                             │
│  ┌─────────────────────────┐│
│  │     Product Image       ││  ← Full-width, 3:4, swipeable
│  │     (pinch-to-zoom)     ││
│  └─────────────────────────┘│
│         ● ○ ○ ○             │  ← Dot pagination
│                             │
│  Pasapali Silk Saree        │  ← Noto Serif, 20px
│  ₹3,500  ₹4,500  22% off   │  ← Price / MRP strike / discount
│  Only 3 left                │  ← 13px, #C44A4A (if stock ≤ 3)
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Colour                     │  ← Variant swatches, 36px circles
│  (●Red) (○Blue) (○Green)   │     Selected: 2px #8B3A4A border
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Check delivery             │
│  ┌──────────────────┐ Check │  ← PIN input + check button
│  │ Enter PIN code   │  →    │
│  ✓ Delivery in 5–7 days    │  ← Success: #3D8B63
│  ✓ Cash on delivery         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Details                    │
│  Fabric ········· Silk      │  ← Key-value rows
│  Weave ·········· Pasapali  │     Alternating bg
│  Origin ········· Bargarh   │
│  Length ········· 6.2m      │
│  Blouse Piece ··· Included  │
│  Wash Care ······ Dry clean │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Delivery & Returns         │
│  📦 5–7 business days       │  ← Lucide icons + 14px text
│  🔄 7-day returns           │
│  💵 Cash on delivery        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  You may also like          │  ← Horizontal scroll, 160px cards
│  ┌────────┐ ┌────────┐ ┌───│     Same category, max 6
│  │  img   │ │  img   │ │   │     Excludes current product
│  └────────┘ └────────┘ └───│
│                             │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │  ← Sticky bar, subtle shadow
│ │      Add to Bag         │ │     Out of stock: disabled + text
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Home  Shop  Cart Orders Acc │
└─────────────────────────────┘
```

**Header icons:**

| Icon | Position | Size | Default | Active |
|------|----------|------|---------|--------|
| Back `←` | Left | 24px | `#1A1A1A` | — |
| Heart `♡` | Right #1 | 24px | `#1A1A1A` outlined | `#C44A4A` filled |
| Share `↗` | Right #2 | 24px | `#1A1A1A` | — |

- Wishlist: requires login, scale animation (0.8→1.2→1.0, 200ms)
- Share: no login required. **App:** the phone's share sheet (WhatsApp, Messages, ...) with "<title> on Juhar" and the link `https://juhar.co.in/shop/<saree>` (the website address is the build setting `EXPO_PUBLIC_WEB_URL`; the public address when unset); where there is no share sheet (the browser preview) the link is copied and "Link copied" is shown. **Website:** the browser's share sheet on a phone; on a desktop the link (this site's own address plus the saree page) is copied and "Link copied" shows for a moment. Closing the share sheet shows nothing. Both layouts of the website's product page have the button.
- PIN check: 6-digit, numeric. Check asks the API (`GET /delivery/check`): a served PIN shows "Delivery in 5–7 days" and "Cash on delivery available"; a PIN with no real postal zone shows "That does not look like a valid PIN code" and an army post office PIN shows "We cannot deliver to …" (red, no delivery promise); a network failure shows the usual error with its Reference. Typing again clears the answer. The pilot delivers all over India. The same rule is applied when an address is saved and at checkout.
- Variant change updates price/stock/images
- Add to Bag: login check → checkmark animation (500ms) → text restores
- Shimmer skeleton on load

---

### 13.12 Cart / My Bag (Screen 12)

**Purpose:** View bag, adjust quantities, checkout.

> **Coupons are not in the pilot.** The bag used to show a coupon box that accepted any text and showed a made-up −₹100; the server prices the order and has no coupons, so the customer saw a different total at checkout. The box and the coupon lines are removed (the sketch below still shows them as the future design). Bring them back only together with a real coupon system on the API (validation, usage limits, the discount in the order total).

```
┌─────────────────────────────┐
│  ←    My Bag (3)            │
│                             │
│  ┌─────────────────────────┐│
│  │ ┌─────┐                 ││  ← Tap image/name → Product Detail
│  │ │ img │ Pasapali Silk   ││     Image: 80×106px (3:4)
│  │ │ 3:4 │ Red             ││
│  │ │     │ ₹3,500  ₹4,500 ││  ← Price + MRP strikethrough
│  │ └─────┘                 ││
│  │  📦 Delivery by 22 Nov  ││  ← Estimated delivery per item
│  │       ┌───┬───┬───┐     ││
│  │       │ − │ 1 │ + │     ││  ← Qty stepper, 32px height
│  │       └───┴───┴───┘     ││
│  │  ♡ Wishlist        🗑   ││  ← Move to wishlist / Remove
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│  ← Out of stock item:
│  │ ┌─────┐                 ││     50% opacity, no stepper
│  │ │ img │ Bandha Silk     ││     Red "Out of stock" text
│  │ │     │ ✕ Out of stock   ││
│  │  ♡ Wishlist        🗑   ││
│  └─────────────────────────┘│
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  ┌──────────────────┐ Apply │  ← Coupon code input
│  │ Enter coupon code│  →    │     Uppercase, max 20 chars
│  └──────────────────┘       │     Success: green pill + savings
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │     Error: 12px #C44A4A below
│  Price Details              │
│  Subtotal (2 items)  ₹6,300│  ← OOS items excluded
│  Coupon (FIRST100)    −₹100│  ← Green, only if applied
│  Shipping              ₹99 │  ← or "FREE" in #3D8B63
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Total              ₹6,199 │  ← 16px bold
│  Free shipping on ₹5,000+  │  ← 12px #3D8B63, if sub < the free-above amount (amounts come from GET /api/v1/config/shipping, not typed in)
├─────────────────────────────┤
│ ┌─────────────────────────┐ │  ← Sticky bar, subtle shadow
│ │   Proceed to Checkout   │ │     Blocked if OOS items remain
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Home  Shop  Cart Orders Acc │
└─────────────────────────────┘
```

**Empty state:** Lucide `shopping-bag` 48px + "Your bag is empty" + "Browse our collection and add something you love." + Secondary button "Start Shopping" → Explore

**Item actions:**
- ♡ Wishlist: Lucide `heart` + text, 13px, `#999999` — moves item to wishlist
- 🗑 Remove: Lucide `trash-2`, 18px, `#999999` — slide-out-left animation (250ms)
- Qty stepper: minus disabled at 1, plus disabled at available stock
- Qty change: number fade + scale animation (150ms)

**Coupon states (future design; not built, see the note at the top):**
- Input: uppercase forced, "Apply" ghost disabled until ≥ 3 chars
- Applied: input replaced by `#E8F5E9` pill with code + ✕ remove + savings text
- Only 1 coupon at a time
- Needs a coupon backend first; there is none yet

---

### 13.13 Checkout — Select Address (Screen 13)

**Purpose:** Pick delivery address from saved list, or add new.

```
┌─────────────────────────────┐
│  ←    Delivery Address      │
│                             │
│  ┌─────────────────────────┐│
│  │ ● Home (Default)        ││  ← Radio selected, #8B3A4A
│  │   Priya Mohanty         ││     Default badge: #E8F5E9, #2E7D32
│  │   123, Budha Raja Road  ││     Address: 14px, #6B6B6B
│  │   Sambalpur, Odisha     ││
│  │   768001                ││
│  │   +91 98765 43210       ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ ○ Office                ││  ← Radio unselected
│  │   ...                   ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │  + Add New Address      ││  ← Secondary button → Add Address
│  └─────────────────────────┘│
│                             │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │   Deliver Here           │ │  ← Primary button → Order Review
│ └─────────────────────────┘ │     Disabled until address selected
├─────────────────────────────┤
```

- Default address auto-selected on load
- Address cards: hairline border, 12px radius, white bg
- No tab bar (checkout flow)

---

### 13.14 Checkout — Add Address (Screen 14)

**Purpose:** Full address form. Used from checkout and Profile → My Addresses.

```
┌─────────────────────────────┐
│  ←    Add Address           │
│                             │
│  Fields (all 48px height):  │
│  - Full Name (required)     │
│  - Phone +91 (required)     │
│  - Address Line 1 (required)│
│  - Address Line 2 (optional)│
│  - Landmark (optional)      │
│  - City + District (2-col)  │
│  - State + PIN Code (2-col) │
│  - Label chips: Home/Office/Other
│  - ☐ Set as default        │
│                             │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │    Save Address          │ │  ← Disabled until required valid
│ └─────────────────────────┘ │
├─────────────────────────────┤
```

**Validation:**

| Field | Required | Rule |
|-------|----------|------|
| Full name | Yes | Min 2 chars |
| Phone | Yes | 10 digits, starts 6–9 |
| Line 1 | Yes | Min 5 chars |
| Line 2 | No | — |
| Landmark | No | — |
| City | Yes | Min 2 chars |
| District | Yes | Min 2 chars |
| State | Yes | Default: Odisha |
| PIN code | Yes | `/^[1-9][0-9]{5}$/` |
| Label | Yes | Default: Home |

- Errors inline below field, 12px `#C44A4A`
- Focus: border `#EEEEEE` → `#8B3A4A`
- Label chips: single select, pill shape, active `#8B3A4A` bg
- Keyboard-aware scroll
- No tab bar (checkout flow)

---

### 13.15 Checkout — Order Review (Screen 15)

**Purpose:** Final review before placing order.

```
┌─────────────────────────────┐
│  ←    Order Review          │
│                             │
│  Delivering to              │
│  ┌─────────────────────────┐│
│  │  Priya Mohanty          ││  ← Snapshotted address
│  │  123, Budha Raja Road   ││
│  │  Sambalpur, 768001      ││
│  │                Change → ││  ← Ghost link → Select Address
│  └─────────────────────────┘│
│                             │
│  Items (2)                  │
│  ┌─────────────────────────┐│
│  │ ┌─────┐                 ││  ← 60×80px image, read-only
│  │ │ img │ Pasapali Silk   ││
│  │ │     │ Red · Qty: 1    ││
│  │ └─────┘        ₹3,500  ││
│  │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─││
│  │ ┌─────┐                 ││
│  │ │ img │ Sonepuri Cotton ││
│  │ │     │ Blue · Qty: 2   ││
│  │ └─────┘        ₹5,600  ││
│  └─────────────────────────┘│
│                             │
│  Payment                    │
│  ┌─────────────────────────┐│
│  │ ● Cash on Delivery      ││  ← Selected, #8B3A4A
│  │   Pay when you receive  ││
│  │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─││
│  │ ○ UPI                   ││  ← Disabled, 40% opacity
│  │   Coming soon           ││
│  └─────────────────────────┘│
│                             │
│  Price Details              │
│  Subtotal (3 items)  ₹9,100│
│  Shipping              FREE│
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Total              ₹9,000 │  ← 16px bold
│                             │
│  📦 Estimated delivery      │
│     22–26 Nov 2026          │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │  ← COD: "Place Order"
│ │     Place Order          │ │     UPI: "Proceed to Payment"
│ └─────────────────────────┘ │     Generates idempotency key
├─────────────────────────────┤
```

- Dynamic CTA: "Place Order" for COD, "Proceed to Payment" for UPI
- Button shows loading spinner during submission
- Double-tap safe (idempotency key)
- No tab bar (checkout flow)

---

### 13.16 Order Success (Screen 16)

**Purpose:** Confirmation after successful order.

```
┌─────────────────────────────┐
│                             │
│                             │
│            ✓                │  ← Animated checkmark, 64px
│                             │     #3D8B63, draw-in (500ms)
│                             │
│    Order placed!            │  ← Noto Serif, 24px
│                             │     Center-aligned
│    JUH-00000042             │  ← 16px medium, #8B3A4A
│                             │     Tappable → copy to clipboard
│    Estimated delivery       │
│    22–26 Nov 2026           │  ← 14px, #6B6B6B
│                             │
│    We'll send updates to    │
│    +91 98765 43210          │
│                             │
│  ┌─────────────────────────┐│
│  │     View Order          ││  ← Primary → Order Detail
│  └─────────────────────────┘│
│    Continue Shopping →      │  ← Ghost → Home (reset nav)
└─────────────────────────────┘
```

- No back button, no tab bar
- Hardware back (Android) → Home
- Order number tap → "Copied!" toast

---

### Saved items (wishlist)

> **Implementation status:** the heart is on every shop card and on the product page; the Account tile "Wishlist" opens the list. **The feature is called "Wishlist" everywhere** (tile, page title, button labels). **Shop card:** one heart per saree, filled when any colour of it is saved. **Product page:** one heart for the selected colour; the page opens on the saved colour if there is one. **Wishlist (web page and mobile screen):** a card per saved colour with price, an "Add to Bag" button and a remove (bin) button. Once a colour is in the bag the button says "Go to Bag" (it opens the bag); this is read from the bag itself, so it goes back to "Add to Bag" when the bag is emptied elsewhere. **In the bag:** each item has a "Save to Wishlist" heart (turns to "Saved"); the item stays in the bag, and it works for guests too. A colour that is out of stock says "Out of Stock"; one whose product is no longer sold says "No longer available" and has no Add to Bag button and no link. While the list is loading a spinner shows (it never flashes "Sign in" at a logged-in customer). **Guests:** the hearts work and are kept on the device; the Wishlist page says "You have N on your wishlist on this device. Sign in to keep them in your account", and they move into the account at login. If Add to Bag fails the reason is shown with the Reference line (web inline, mobile alert). **Always current:** the wishlist count and the list update without a reload: at once after a tap, within a second or two when another tab of the site changes something, when the customer comes back to the tab or app, and within about 30 seconds when it was changed on another device.

---

### 13.17 Orders List (Screen 17)

**Purpose:** Order history with status badges. Newest first.

```
┌─────────────────────────────┐
│  ←    My Orders             │
│                             │
│  ┌─────────────────────────┐│
│  │  JUH-00000042           ││
│  │  15 Nov 2026   [Placed] ││  ← Status badge per §9.6
│  │  ┌─────┐ Pasapali Silk  ││  ← First item image 48×64px
│  │  │ img │ +1 more item   ││
│  │  └─────┘                ││
│  │  ₹9,000            →   ││  ← Tap → Order Detail
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │  JUH-00000041           ││
│  │  12 Nov 2026 [Delivered]││
│  │  ...                    ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│ Home  Shop  Cart Orders Acc │
└─────────────────────────────┘
```

- Paginated, pull-to-refresh. 20 orders load first; an outlined "Load more orders" button under the list adds the next 20, and the footer says "Showing 20 of 55 orders" (then "All 55 orders shown"). The header count is the customer's real total, not the number loaded. On the web the status chips are applied by the server and show the real number of orders in each status
- Empty state: Lucide `package` + "No orders yet" + "Start Shopping" secondary button
- Not logged in: Lucide `user` + "Log in to view orders" + "Log In" primary button
- Shimmer: 3 card placeholders

---

### Error references (all apps)

When an API call fails, the error message in the web and mobile apps (sign-in, saving an address, adding to the bag, placing an order) has a small line under it: `Reference: <id>` with a **Copy** button (11 to 12px, tertiary text colour, so it stays out of the way). A customer can read the id out to support, who search the logs for `req=<id>`. Where the error is an alert box (mobile "Add to Bag"), the line is added to the alert text. Nothing is shown when there is no id, for example when the network is down (the message then says "We could not reach the server. Please check your internet connection and try again."). The message itself is always a plain sentence a customer can act on ("Sorry, one of the sarees in your bag is not in stock in the quantity you asked for. Please check your bag and try again."), never a code such as `INSUFFICIENT_STOCK`: the API sends the code separately and the wording comes from one catalog in the API. Admin: each row of the Orders table shows the customer's user id (`ID 683855ca`, a Copy button copies the full id).

---

### 13.18 Order Detail (Screen 18)

**Purpose:** Full order info with status timeline, tracking, items, address.

```
┌─────────────────────────────┐
│  ←    JUH-00000042          │
│                             │
│  Order Status               │
│  ┌─────────────────────────┐│
│  │  ● Placed    15 Nov     ││  ← Completed: #3D8B63 filled
│  │  │                      ││     Connecting line: #3D8B63
│  │  ● Confirmed  15 Nov    ││
│  │  │                      ││
│  │  ○ Packed               ││  ← Future: #EEEEEE unfilled
│  │  │                      ││
│  │  ○ Shipped              ││
│  │  │                      ││
│  │  ○ Delivered             ││
│  └─────────────────────────┘│     Staggered animation (100ms/step)
│                             │
│  Tracking                   │  ← Only when status ≥ shipped
│  ┌─────────────────────────┐│
│  │  India Post             ││
│  │  EE123456789IN  Copy →  ││  ← Tap copies, "Copied!" toast
│  └─────────────────────────┘│
│                             │
│  Items (2)                  │  ← Snapshotted from order time
│  ┌─────────────────────────┐│
│  │ ┌─────┐ Pasapali Silk   ││
│  │ │ img │ Red · Qty: 1    ││
│  │ └─────┘        ₹3,500  ││
│  └─────────────────────────┘│
│                             │
│  Delivery Address           │  ← Snapshotted address
│  ┌─────────────────────────┐│
│  │  Priya Mohanty          ││
│  │  123, Budha Raja Road   ││
│  │  Sambalpur, 768001      ││
│  └─────────────────────────┘│
│                             │
│  Payment                    │
│  ┌─────────────────────────┐│
│  │  Cash on Delivery       ││
│  │  Subtotal        ₹9,100 ││
│  │  Shipping          FREE ││
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ││
│  │  Total           ₹9,000 ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │  💬 Need help?          ││  ← Opens WhatsApp with order #
│  │  Contact us on WhatsApp ││
│  │                  Open → ││
│  └─────────────────────────┘│
│                             │
├─────────────────────────────┤
│ Home  Shop  Cart Orders Acc │
└─────────────────────────────┘
```

- No cancel button (removed from scope)
- WhatsApp: `wa.me/91XXXXXXXXXX?text=Order%20JUH-00000042`

---

### 13.19 Profile / Account (Screen 19)

**Purpose:** User profile and account menu. Option C layout.

```
┌─────────────────────────────┐
│    Account                  │  ← Noto Serif, 24px
│                             │
│  ┌─────────────────────────┐│
│  │ ┌────┐  Priya Mohanty  ││  ← Avatar 56px left, info right
│  │ │ PM │  +91 98765 43210││     Initials: #8B3A4A bg, white
│  │ └────┘                  ││
│  └─────────────────────────┘│
│                             │
│  ┌──────┐ ┌──────┐ ┌──────┐│  ← Quick action tiles
│  │  📦  │ │  ♡   │ │  📍  ││     56×56px, white bg, hairline
│  │Orders│ │Saved │ │Addr. ││     12px radius, icon + 11px label
│  └──────┘ └──────┘ └──────┘│
│                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                             │
│  👤  Edit Profile        → │  ← Flat rows, 52px height
│  ❓  FAQs                → │     Lucide icons + labels
│  💬  Help & Support      → │     Hairline dividers
│                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  🚪  Log Out               │  ← #C44A4A text
│                             │
├─────────────────────────────┤
│ Home  Shop  Cart Orders Acc │
└─────────────────────────────┘
```

**Not logged in:** Lucide `user` 48px + "Log in to your account" + "View orders, save addresses, and more." + "Log In" primary button

- Quick tiles: Orders → Screen 17, Saved → Wishlist, Addr → Screen 20
- Edit Profile → bottom sheet or screen for name/email edit
- FAQs → Screen 22
- Help & Support → WhatsApp
- Log Out: alert confirmation → clears tokens → Home
- Avatar: initials from name; if no name: Lucide `user` icon

---

### 13.20 My Addresses (Screen 20)

**Purpose:** Manage saved addresses.

> **Implementation status:** built on the website (`/account/addresses`, edit at `/account/addresses/[id]`) and in the app (Account > Addresses; the edit form is the Add Address screen opened with an address). Reached from the Account "Addresses" tile, and the pencil on the checkout address list opens the same edit form, then returns to checkout. Each card has **Edit**, **Make default** (not shown on the default) and **Delete** (asks first: the browser's confirm on the web, a native alert in the app). A customer with addresses always has exactly one default: the default's edit form shows a note instead of a switch, and deleting the default makes the most recently added remaining address the default. When 10 addresses are saved the Add button is disabled with a message. An address that was deleted elsewhere shows "This address is no longer saved" with a link back. Past orders are not affected by edits or deletes (they keep their own copy).

```
┌─────────────────────────────┐
│  ←    My Addresses          │
│                             │
│  ┌─────────────────────────┐│
│  │  Home         Default   ││  ← Label + default badge
│  │  Priya Mohanty          ││     Badge: #E8F5E9 bg, #2E7D32
│  │  123, Budha Raja Road   ││
│  │  Sambalpur, 768001      ││
│  │  +91 98765 43210        ││
│  │  ✏️ Edit    🗑 Delete    ││  ← Edit → prefilled Add Address
│  └─────────────────────────┘│     Delete → alert confirmation
│                             │
│  ┌─────────────────────────┐│
│  │  Office                 ││
│  │  ...                    ││
│  │  ✏️ Edit    🗑 Delete    ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │  + Add New Address      ││  ← Secondary button → Screen 14
│  └─────────────────────────┘│
├─────────────────────────────┤
│ Home  Shop  Cart Orders Acc │
└─────────────────────────────┘
```

- Max 10 addresses (API enforced)
- Default first, then newest
- Empty state: Lucide `map-pin` + "No saved addresses" + "Add Address" primary button
- Delete: native alert, not bottom sheet

---

### 13.21 Search Results (Screen 21)

**Purpose:** Text search for products.

```
┌─────────────────────────────┐
│  ┌─────────────────────────┐│
│  │ ← 🔍 pasapali silk  ✕  ││  ← Auto-focused, keyboard open
│  └─────────────────────────┘│
│  8 results                  │
│                             │
│  ┌──────────┐ ┌──────────┐ │  ← 2-column grid
│  │  img 3:4 │ │  img 3:4 │ │     Standard product card (§9.1)
│  ├──────────┤ ├──────────┤ │     Cursor pagination
│  │Name      │ │Name      │ │
│  │₹3,500    │ │₹2,200    │ │
│  └──────────┘ └──────────┘ │
├─────────────────────────────┤
│ Home  Shop  Cart Orders Acc │
└─────────────────────────────┘
```

**Empty query state:** Recent Searches (max 5, stored in AsyncStorage, removable) + Popular chips (hardcoded for pilot)

**No results:** Lucide `search` + "No results for \"query\"" + "Browse All" secondary button → Explore

- Debounced: 300ms after last keystroke
- Minimum 2 chars to search
- ✕ clears text → shows empty query state

---

### 13.22 FAQs (Screen 22)

**Purpose:** Common questions. Accordion list, hardcoded for pilot.

```
┌─────────────────────────────┐
│  ←    FAQs                  │
│                             │
│  ┌─────────────────────────┐│
│  │  How do I place an      ││
│  │  order?               ▼ ││  ← Collapsed: chevron-down
│  │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─││
│  │  ▲ How long does        ││  ← Expanded: chevron-up
│  │    delivery take?       ││
│  │                         ││
│  │  We deliver within 5–7  ││  ← Answer: 14px, #6B6B6B
│  │  business days across   ││     Slides open (200ms ease-out)
│  │  India.                 ││
│  │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─││
│  │  What payment methods   ││
│  │  do you accept?       ▼ ││
│  │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─││
│  │  What is your return    ││
│  │  policy?              ▼ ││
│  │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─││
│  │  Are these handloom     ││
│  │  sarees authentic?    ▼ ││
│  │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─││
│  │  How do I contact       ││
│  │  support?             ▼ ││
│  └─────────────────────────┘│
│                             │
├─────────────────────────────┤
│ Home  Shop  Cart Orders Acc │
└─────────────────────────────┘
```

- Accordion: one open at a time, opening one closes others
- Chevron rotates 180° (200ms)
- Question: 14px medium, `#1A1A1A`; Answer: 14px, `#6B6B6B`
- Row height: 52px collapsed, auto expanded
- Content hardcoded in app (no CMS for pilot)

---

## Appendix: Decision Log

| Decision | Chosen | Alternatives Considered | Reason |
|----------|--------|------------------------|--------|
| Primary color | Soft Burgundy `#8B3A4A` | Deep Maroon, Clay, Charcoal | Modern but still heritage-rooted |
| Accent color | Warm Bronze `#B5956B` | Gold, Terracotta | Subtle luxury without being flashy |
| Headline font | Noto Serif | Playfair Display, Lora, Libre Baskerville | Clean serif, pairs with DM Sans |
| Body font | DM Sans | Inter, Plus Jakarta Sans, Outfit | Same family as headline, warm geometric |
| Background | `#FAFAF7` warm off-white | Pure white, warm ivory `#FFF8F4` | Cleaner than ivory, warmer than white |
| Design approach | Clean/minimal | Heritage luxury (Stitch v1) | User preference: "not fancy, clear, simple" |
| Icons | Lucide | Ionicons, Phosphor, Material, emoji | Clean 2px stroke, great RN support, shadcn standard |
