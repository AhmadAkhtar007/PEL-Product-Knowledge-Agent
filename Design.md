# PEL Smart Customer App — Design System
**Version 1.0 · Scope: Mobile (iOS/Android, React Native) + Web · Themes: Light & Dark**

---

## 0. How to Use This Document

This is a **token-driven** design system. Every color, size, and timing value used in a component traces back to a single named token in Section 3. Nothing in Section 5 (Components) should ever hardcode a hex value or a raw pixel number — it references a token. That's what makes light/dark mode and mobile/web parity possible from one source instead of two diverging implementations.

**Before anything ships:** every value marked in this doc is a placeholder built from publicly available signals about PEL's brand (blue wordmark, legacy appliance-manufacturer positioning), not PEL's official brand guideline. Section 10 is a checklist to close that gap. Do not treat values as final brand law — treat everything else (structure, scales, architecture, accessibility math) as ready to build on.

---

## 1. Brand Foundation

| | |
|---|---|
| Company | Pak Elektron Limited (PEL) — est. 1956, Lahore. Major home-appliance & power-equipment manufacturer. |
| Brand register | Trusted, established, mainstream-consumer. Not a startup/fintech/gaming register. |
| Primary brand hue | Blue — PEL's public logo and marketing consistently use blue; exact Pantone/hex to be confirmed with PEL brand team. |
| Product context | This is a RAG chatbot / smart-customer-service app — a support & product-assistant surface, not an entertainment app. Visual tone should read *helpful and competent*, not *futuristic and flashy*. |

**Design principle for this app:** we inherit the *ChatGPT interaction pattern* (streaming bubbles, input capsule, markdown rendering) because that pattern is well-understood by users and fits a conversational assistant. We do **not** inherit ChatGPT's or generic-AI-app *visual skin* (neon glow, heavy dark mode, pulsing orbs as decoration). The skin is PEL's.

---

## 2. Design Philosophy: Pattern vs. Identity

| Layer | What it governs | Source |
|---|---|---|
| **Interaction pattern** | Bubble layout, streaming text, input capsule with attach/mic/send, markdown/code rendering, typing indicators | Conversational-UI best practice (kept from original ask) |
| **Visual identity** | Color, type, radii, shadows, iconography, motion character | PEL brand (this document) |

Any future contributor adding a component asks: *"Is this a pattern (how chat apps work) or an identity choice (how PEL looks)?"* Patterns can borrow from category conventions. Identity choices must trace to Section 3 tokens.

---

## 3. Design Tokens

### 3.1 Core Color Tokens — Light Mode

| Token | Hex | Usage |
|---|---|---|
| `color.brand.primary` | `#007DC5` | Core PEL blue accent — buttons, links, active states, user chat bubble |
| `color.brand.primary.pressed` | `#0A6BA8` | Pressed/active state of primary blue |
| `color.brand.primary.subtle` | `#E6F3FB` | Tinted backgrounds behind blue content (info banners, selected chip fill) |
| `color.bg.app` | `#F7F8FA` | Main app background — soft off-white, not stark white |
| `color.surface.card` | `#FFFFFF` | Cards, sheets, hero banners, assistant chat bubble |
| `color.surface.sunken` | `#F0F2F5` | Input fields, inactive chip fill |
| `color.border.default` | `#E2E5EA` | Card borders, dividers |
| `color.border.strong` | `#CBD1DA` | Input focus-adjacent borders, stronger separators |
| `color.status.danger` | `#DC2626` | Destructive actions, recording state, error text |
| `color.status.danger.subtle` | `#FDECEC` | Error banner background |
| `color.status.success` | `#16A34A` | Success confirmations (e.g., "complaint resolved") |
| `color.status.warning` | `#D97706` | Warnings, pending states |
| `color.text.primary` | `#0F172A` | Headers, titles, primary body text |
| `color.text.secondary` | `#475569` | Sub-headers, secondary body text |
| `color.text.tertiary` | `#94A3B8` | Timestamps, placeholders, disabled text |
| `color.text.oninverse` | `#FFFFFF` | Text on filled brand-color surfaces |

### 3.2 Core Color Tokens — Dark Mode

Dark mode is **not** an inverted copy of light mode with the same blue turned into a glow effect. Backgrounds are deep but slightly warmed toward navy (ties back to brand hue instead of reading as generic near-black), and the accent blue is split into two values — one for text-safe button fills, one for accents/icons/borders where a brighter, more luminous blue is appropriate.

| Token | Hex | Usage |
|---|---|---|
| `color.brand.primary.accent` | `#2B9CDB` | Icons, links, active borders, focus rings, subtle glows — anywhere it sits *next to* content rather than *behind* white text |
| `color.brand.primary.fill` | `#1C7FB5` | Filled button backgrounds carrying white text (higher contrast than the lighter accent — see §7) |
| `color.brand.primary.subtle` | `#132635` | Tinted dark surface behind blue content |
| `color.bg.app` | `#0B0D10` | Main app background |
| `color.surface.card` | `#15181C` | Cards, sheets, assistant chat bubble |
| `color.surface.sunken` | `#0F1114` | Input fields, inactive chip fill |
| `color.border.default` | `#23272C` | Card borders, dividers |
| `color.border.strong` | `#343A41` | Input focus-adjacent borders |
| `color.status.danger` | `#F87171` | Destructive actions, recording state (softened for dark bg legibility) |
| `color.status.danger.subtle` | `#2A1618` | Error banner background |
| `color.status.success` | `#4ADE80` | Success confirmations |
| `color.status.warning` | `#FBBF24` | Warnings, pending states |
| `color.text.primary` | `#F5F7FA` | Headers, titles, primary body text |
| `color.text.secondary` | `#C5CAD1` | Sub-headers, secondary body text |
| `color.text.tertiary` | `#7C838C` | Timestamps, placeholders, disabled text |
| `color.text.oninverse` | `#0B0D10` | Text placed on light/accent-blue surfaces where dark text tests higher contrast (see §7) |

### 3.3 Semantic Token Map (theme-agnostic names components should actually use)

Components never reference `color.brand.primary` or a raw hex directly — they reference the semantic name below, which resolves differently per theme.

| Semantic token | Light value | Dark value |
|---|---|---|
| `action.primary.bg` | `color.brand.primary` | `color.brand.primary.fill` |
| `action.primary.bg.pressed` | `color.brand.primary.pressed` | `#155F8A` |
| `action.primary.text` | `color.text.oninverse` | `#FFFFFF` |
| `accent.icon` | `color.brand.primary` | `color.brand.primary.accent` |
| `surface.background` | `color.bg.app` | `color.bg.app` |
| `surface.raised` | `color.surface.card` | `color.surface.card` |
| `surface.input` | `color.surface.sunken` | `color.surface.sunken` |
| `bubble.user.bg` | `color.brand.primary` | `color.brand.primary.fill` |
| `bubble.user.text` | `#FFFFFF` | `#FFFFFF` |
| `bubble.assistant.bg` | `color.surface.card` | `color.surface.card` |
| `bubble.assistant.border` | `color.border.default` | `color.border.default` |
| `bubble.assistant.text` | `color.text.primary` | `color.text.primary` |

### 3.4 Typography

Font family: PEL's approved brand typeface. Until confirmed, use a well-hinted system-adjacent face (`Inter` on web, `SF Pro`/`Roboto` platform defaults on mobile) rather than leaving it unspecified — an explicit fallback is a decision, "standard system fonts" is an absence of one.

| Token | Size | Weight | Line height | Letter spacing | Case |
|---|---|---|---|---|---|
| `type.display` | 28 | 800 | 34 | 0 | Sentence |
| `type.title` | 22 | 700 | 28 | 0 | Sentence |
| `type.heading` | 17 | 700 | 22 | 0.5 | Uppercase (nav/section headers only) |
| `type.subheading` | 15 | 600 | 20 | 0.25 | Sentence |
| `type.body` | 15 | 400 | 22 | 0 | Sentence |
| `type.bodyStrong` | 15 | 600 | 22 | 0 | Sentence |
| `type.caption` | 13 | 400 | 18 | 0 | Sentence |
| `type.micro` | 11 | 500 | 14 | 0.2 | Sentence |

Note: the original doc's uppercase + wide letter-spacing was applied broadly (headers *and* sub-headers). Reserved here to nav/section titles only — uppercase-everything reads as a dense, aggressive tone that doesn't match a support-assistant context.

### 3.5 Spacing Scale

`space.xs` 4 · `space.sm` 8 · `space.md` 12 · `space.lg` 16 · `space.xl` 20 · `space.xxl` 24 · `space.xxxl` 32

Screen edge padding: `space.xl` (20) on mobile, `space.xxxl` (32) minimum on web with a max content width (see §6).

### 3.6 Radius Scale

`radius.sm` 8 (inputs, mini buttons) · `radius.md` 12 (buttons, small cards) · `radius.lg` 16 (standard cards, hero banners) · `radius.pill` 999 (chips, input capsule) · `radius.bubbleTail` 4 (the "sharp corner" on chat bubbles)

### 3.7 Elevation

Light mode uses real shadow (ambient light logic). Dark mode uses **border + subtle tint**, not shadow — shadows barely read on dark backgrounds and were the main source of the original doc's "neon glow" effect when overused. Reserve luminous glow strictly for the two states in §5.4 that need it (empty-state orb, active mic), not as a default card treatment.

| Token | Light | Dark |
|---|---|---|
| `elevation.card` | `0 1px 2px rgba(15,23,42,0.06), 0 2px 8px rgba(15,23,42,0.06)` | `border: 1px solid color.border.default` (no shadow) |
| `elevation.modal` | `0 8px 24px rgba(15,23,42,0.16)` | `border: 1px solid color.border.strong` + `bg: rgba(0,0,0,0.6)` scrim |
| `elevation.focusGlow` (brand-color glow, used *only* for empty-state orb / active mic ring) | `0 0 20px rgba(0,125,197,0.25)` | `0 0 20px rgba(43,156,219,0.35)` |

### 3.8 Motion

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `motion.fast` | 120ms | ease-out | Button press, chip toggle |
| `motion.standard` | 200ms | ease-in-out | Screen transitions, modal open |
| `motion.slow` | 400ms | ease-in-out | Empty-state orb pulse cycle |
| `motion.streamChar` | 12–20ms/char | linear | Assistant response streaming reveal |

---

## 4. Theming Architecture

Single source of truth as JSON, consumed by both platforms — this is what prevents RN and web from drifting apart the way the original doc (RN-only, ad hoc) had already started to.

```json
// tokens/core.json (excerpt)
{
  "color": {
    "brand": { "primary": { "value": "#007DC5" } },
    "bg":    { "app":     { "value": { "light": "#F7F8FA", "dark": "#0B0D10" } } }
  }
}
```

**Web (CSS custom properties, theme switch via `data-theme` attribute):**
```css
:root[data-theme="light"] {
  --action-primary-bg: #007DC5;
  --surface-background: #F7F8FA;
  --surface-raised: #FFFFFF;
  --text-primary: #0F172A;
}
:root[data-theme="dark"] {
  --action-primary-bg: #1C7FB5;
  --surface-background: #0B0D10;
  --surface-raised: #15181C;
  --text-primary: #F5F7FA;
}
```

**React Native (theme object, consumed via context — no per-component hardcoded colors):**
```javascript
export const lightTheme = {
  actionPrimaryBg: '#007DC5',
  surfaceBackground: '#F7F8FA',
  surfaceRaised: '#FFFFFF',
  textPrimary: '#0F172A',
};

export const darkTheme = {
  actionPrimaryBg: '#1C7FB5',
  surfaceBackground: '#0B0D10',
  surfaceRaised: '#15181C',
  textPrimary: '#F5F7FA',
};

// components consume via useTheme(), never `#007DC5` inline
```

Web should follow the same breakpoint-aware layout rules RN uses for tablet, so the token layer — not a second design pass — is what makes web "feel like" the app.

---

## 5. Components

### 5.1 Buttons

| Variant | Background | Text | Border | Radius |
|---|---|---|---|---|
| Primary | `action.primary.bg` | `action.primary.text`, `type.bodyStrong` | none | `radius.md` |
| Secondary | `surface.raised` | `text.primary` | 1px `border.default` | `radius.md` |
| Ghost/Mini | transparent | `accent.icon` | 1px `accent.icon` | `radius.sm` |
| Destructive | `status.danger` | white | none | `radius.md` |

Min touch target: 44×44 (mobile), 40×40 (web, mouse-driven).

### 5.2 Chips / Pills

Radius: `radius.pill`. Inactive: `surface.sunken` bg, `border.default` border, `text.secondary` label. Active: `action.primary.bg` fill, `action.primary.text` label, no border.

### 5.3 Cards & Surfaces

Background `surface.raised`, radius `radius.lg`, padding `space.xl`, elevation `elevation.card`. No brand-color border unless the card is actionable/selected — reserve blue outlines for selected/interactive states, not decoration.

### 5.4 Chat Interface

- **User bubble:** `bubble.user.bg`, right-aligned, `radius.lg` with `radius.bubbleTail` on bottom-right.
- **Assistant bubble:** `bubble.assistant.bg` + `bubble.assistant.border`, left-aligned, `radius.lg` with `radius.bubbleTail` on bottom-left.
- **Input capsule:** `surface.sunken` bg, `radius.pill`, camera/mic/send icons in `accent.icon`, send button switches to `action.primary.bg` fill only once text is entered (empty state = disabled/muted, avoids a permanently "loud" input bar).
- **Empty-state orb:** the one place a soft brand-color glow (`elevation.focusGlow`) is appropriate — pulsing scale animation, `motion.slow`, using the *accent* blue variant, not the button-fill blue.
- **Mic pulse ring:** same glow token, triggered only during active STT listening — not persistent.
- **Streaming/typing indicator:** three dots or a thin shimmer bar in `text.tertiary`, not a full waveform unless actual audio is playing.
- **Waveform (audio playback only):** bars in `accent.icon`, height-animated, `motion.fast` per bar update.

### 5.5 Modals & Overlays

Scrim: `rgba(15,23,42,0.45)` light / `rgba(0,0,0,0.6)` dark (softer than the original 0.85–0.95 — near-opaque scrims tend to feel heavier than needed and were part of the "premium-tech" over-styling rather than a PEL-specific choice). Modal surface: `surface.raised`, `elevation.modal`, `radius.lg`.

### 5.6 Navigation / App Bar

Background `surface.background` (not a separate elevated color — keeps nav feeling integrated, not like a floating tech-app header). Title: `type.heading`. Back/action icons: `text.primary`, active/selected icon: `accent.icon`.

### 5.7 Forms & Inputs

Background `surface.sunken`, border `border.default` (default) → `accent.icon` (focused, 2px), radius `radius.sm`, placeholder `text.tertiary`, label `type.subheading` in `text.secondary`.

### 5.8 Badges & Alerts

Info: `brand.primary.subtle` bg, `brand.primary` text/icon. Success/Warning/Danger: matching `.subtle` bg + full-strength text/icon token from §3.1/3.2. Radius `radius.sm`, padding `space.sm`/`space.md`.

---

## 6. Layout, Spacing & Responsive Rules

**Mobile:** screen padding `space.xl` (20). Safe area via `SafeAreaProvider`/`StatusBar.currentHeight`. Flex-row headers with `justifyContent: space-between`, `alignItems: center` (retained from original — this is sound RN practice, not a brand issue).

**Web breakpoints:**

| Breakpoint | Width | Layout behavior |
|---|---|---|
| `bp.mobile` | < 640px | Single column, mirrors RN layout, bottom-fixed input capsule |
| `bp.tablet` | 640–1023px | Single column, max content width 640px, centered |
| `bp.desktop` | ≥ 1024px | Two-pane: conversation list (280px fixed) + chat (max 760px, centered), input capsule docked to chat pane not full viewport width |

Chat message max-width: 720px even on ultra-wide desktop — prevents the "wall of unreadable line-length text" problem chat UIs get on large monitors.

---

## 7. Accessibility

### 7.1 Contrast — computed (WCAG 2.1 relative luminance)

| Pair | Ratio | Passes |
|---|---|---|
| Light: `text.primary` (#0F172A) on `bg.app` (#F7F8FA) | **16.8:1** | AAA |
| Dark: `text.primary` (#F5F7FA) on `bg.app` (#0B0D10) | **18.1:1** | AAA |
| Light: white text on `brand.primary` (#007DC5) button | **4.4:1** | AA for bold/large text (≥14px bold or ≥18px regular); use `type.bodyStrong` on buttons |
| Dark: white text on `brand.primary.fill` (#1C7FB5) button | **4.4:1** | Same as above — this is *why* dark mode uses the darker fill token for buttons, not the brighter accent |
| Dark: white text on `brand.primary.accent` (#2B9CDB) directly | 3.1:1 | Fails for small text — confirms why `accent` is reserved for icons/borders/large glow elements, never small button labels |

**Rule this produces:** any filled button with body-size text must use `.pressed`/`.fill` tokens, never the bright `.accent` token, in either theme. Verify final PEL brand blue against this same math once confirmed (§10) — if the official hex is meaningfully lighter/darker, these fill/accent splits need re-deriving.

### 7.2 Other requirements

- Minimum touch target 44×44pt mobile / 40×40px web.
- Focus rings on web: 2px `accent.icon` outline, 2px offset, on all interactive elements (buttons, chips, inputs) — visible via keyboard nav.
- Reduced motion: respect `prefers-reduced-motion` (web) / OS-level reduce-motion (mobile) — disable orb pulse and streaming character-by-character reveal in favor of instant text display.
- RTL/Urdu: layout mirrors under RTL (`flexDirection: row-reverse` equivalents), numerals and chat timestamps stay LTR per standard Urdu-UI convention. Flag as a build requirement, not a later add-on, given PEL's Pakistan market.

---

## 8. Platform Implementation Guide

- **RN:** ThemeProvider wraps app root, theme resolved from OS `Appearance` API with manual override in settings; all `StyleSheet.create` calls pull from `useTheme()`, zero inline hex.
- **Web:** `data-theme` attribute on `<html>`, toggled via a settings control and persisted; Tailwind config extended to map utility classes (`bg-surface-raised`, `text-primary`, etc.) to the CSS custom properties in §4, so `bg-[#111111]` style hardcoding is not possible without an ESLint rule flag.
- **Shared:** one `tokens/core.json` is the only place color/spacing/type values are declared; both platforms generate their theme objects from it in a build step, so this document and the code cannot silently diverge.

---

## 9. Governance & Versioning

- Source of truth: `tokens/core.json` + this document, versioned together in the design-system repo.
- Any new component requires a token audit before merge (no new hardcoded values).
- Semantic-version this doc (1.0 → 1.1 for additive tokens, 2.0 for breaking renames).
- Brand color and typeface are **provisional** until Section 10 is resolved — treat any PR that hardcodes `#007DC5` as technical debt even before that resolution, since it should be pulling `action.primary.bg` regardless of final value.

---

## 10. Verification Checklist — resolve before final ship

- [ ] Confirm PEL's official brand blue hex/Pantone value with brand/marketing team
- [ ] Confirm approved brand typeface (or formal sign-off to use Inter/system default)
- [ ] Obtain logo files + clear-space/minimum-size rules for in-app placement (splash, app bar, empty states)
- [ ] Re-run contrast math in §7.1 once official blue is confirmed — fill/accent split may need adjusting
- [ ] Confirm default theme (light vs dark) via actual user testing or brand-team preference, not assumption
- [ ] Confirm Urdu font stack renders correctly at `type.caption`/`type.micro` sizes (small Urdu text often needs larger minimums than Latin)
- [ ] Legal/compliance review of destructive-action red and any recording-state indicator language, if this app handles service complaints (per PEL's existing Khidmat Markaz app pattern)
