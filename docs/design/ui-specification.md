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
- Background is always `#FAFAF7`, never pure white `#FFFFFF`
- Cards are `#FFFFFF` to create subtle contrast against the warm background
- No color used purely for decoration

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

- **Header** (`components/Header.tsx`): Sticky, brand + nav links (desktop), icons hidden on mobile (bottom nav handles it). Cart badge count.
- **BottomNav** (`components/BottomNav.tsx`): 5 tabs matching mobile app, hidden on desktop (`lg:hidden`). Cart badge count.
- **CartProvider** (`lib/cart-context.tsx`): React context providing `itemCount` to Header and BottomNav. Polls every 2s, checks server cart (logged in) or localStorage guest cart.

### 12.3 Cart Badge Count

Both web and mobile show a badge on the cart icon:
- **Web**: Burgundy circle badge on Header (desktop) and BottomNav (mobile). Via `useCartCount()` context.
- **Mobile**: Native `tabBarBadge` on Cart tab. Polls every 3s via `TabNavigator`.
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
- Share: native share sheet (WhatsApp, copy link), no login required
- PIN check: 6-digit, numeric. Pilot: all PINs valid. Remembers in session.
- Variant change updates price/stock/images
- Add to Bag: login check → checkmark animation (500ms) → text restores
- Shimmer skeleton on load

---

### 13.12 Cart / My Bag (Screen 12)

**Purpose:** View bag, adjust quantities, coupon, checkout.

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
│  Free shipping on ₹5,000+  │  ← 12px #3D8B63, if sub < 5000
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

**Coupon states:**
- Input: uppercase forced, "Apply" ghost disabled until ≥ 3 chars
- Applied: input replaced by `#E8F5E9` pill with code + ✕ remove + savings text
- Only 1 coupon at a time
- Coupon backend behind feature flag for pilot

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
│  Coupon (FIRST100)    −₹100│  ← #3D8B63, only if applied
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

- Paginated, pull-to-refresh
- Empty state: Lucide `package` + "No orders yet" + "Start Shopping" secondary button
- Not logged in: Lucide `user` + "Log in to view orders" + "Log In" primary button
- Shimmer: 3 card placeholders

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
