# Sajani — UI Design Specification

**Version:** 1.0  
**Date:** 15 November 2026  
**Status:** Finalized

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
| **Name** | Sajani (ସଜନୀ) |
| **Meaning** | "Beloved" in Odia |
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

**Two fonts only:** DM Serif Display (headlines) + DM Sans (everything else).

Both are from the same design family — they pair perfectly.

### Type Scale

| Style | Font | Size | Weight | Line Height | Usage |
|-------|------|------|--------|-------------|-------|
| Page Title | DM Serif Display | 24px | 400 | 32px | Screen titles, hero text |
| Section Title | DM Serif Display | 18px | 400 | 26px | Section headings |
| Product Title | DM Sans | 16px | 500 (Medium) | 22px | Product names, card titles |
| Body | DM Sans | 14px | 400 (Regular) | 22px | Descriptions, general text |
| Caption | DM Sans | 12px | 400 (Regular) | 18px | Metadata, timestamps, hints |
| Price | DM Sans | 18px | 700 (Bold) | 24px | Current price |
| Price Strike | DM Sans | 14px | 400 (Regular) | 20px | Original/MRP price, strikethrough |
| Button | DM Sans | 14px | 600 (Semibold) | 20px | Button labels |
| Badge | DM Sans | 11px | 600 (Semibold) | 14px | Status pills, small tags |
| Tab Label | DM Sans | 10px | 500 (Medium) | 14px | Bottom tab bar labels |

### Typography Rules

- **DM Serif Display** — headlines only. Never for body, buttons, labels, or badges.
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
| Pull to refresh | Custom branded spinner (burgundy dot or Sajani mark) | Until data loads |

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
- No bouncing or pulsing elements
- No floating animated elements
- No spinners (use skeleton shimmer) — except pull-to-refresh branded spinner
- Ease curves: `ease-out` for enters, `ease-in` for exits

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

## 12. Responsive Breakpoints (Future Web)

| Breakpoint | Width | Grid Columns | Usage |
|------------|-------|-------------|-------|
| Mobile | < 640px | 2 product columns | Primary target |
| Tablet | 640–1024px | 3 product columns | Secondary |
| Desktop | > 1024px | 4 product columns, max-width 1200px centered | Future web |

---

## Appendix: Decision Log

| Decision | Chosen | Alternatives Considered | Reason |
|----------|--------|------------------------|--------|
| Primary color | Soft Burgundy `#8B3A4A` | Deep Maroon, Clay, Charcoal | Modern but still heritage-rooted |
| Accent color | Warm Bronze `#B5956B` | Gold, Terracotta | Subtle luxury without being flashy |
| Headline font | DM Serif Display | Playfair Display, Lora, Libre Baskerville | Clean serif, pairs with DM Sans |
| Body font | DM Sans | Inter, Plus Jakarta Sans, Outfit | Same family as headline, warm geometric |
| Background | `#FAFAF7` warm off-white | Pure white, warm ivory `#FFF8F4` | Cleaner than ivory, warmer than white |
| Design approach | Clean/minimal | Heritage luxury (Stitch v1) | User preference: "not fancy, clear, simple" |
| Icons | Lucide | Ionicons, Phosphor, Material, emoji | Clean 2px stroke, great RN support, shadcn standard |
