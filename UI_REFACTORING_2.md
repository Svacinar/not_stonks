# UI Refactoring Plan Phase 2: Premium Fintech Redesign

## Overview

This document contains work items to transform the spending dashboard from a functional but plain interface to a **Modern & Premium fintech aesthetic**. This builds on the foundation from Phase 1 (UI_REFACTORING.md).

**Design Direction:** Modern & Premium
- Subtle gradients (not bold/vibrant)
- Glass/frosted effects (backdrop-blur)
- Elegant shadow hierarchy
- Refined micro-interactions (smooth, not bouncy)
- Professional polish throughout

**Design System Reference:** See `CLAUDE.md` for existing design tokens and component patterns.

**Analysis Summary:**
- 15+ instances of hardcoded Tailwind color classes
- 6+ hardcoded hex colors in chart/visualization code
- No gradient usage anywhere in the app
- No micro-interactions or entrance animations
- Sidebar, stat cards, and buttons lack visual polish
- Empty states and loading spinners are uninspired

---

## Visual Specifications

### Brand Gradients
```css
--gradient-brand: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(217 91% 60%) 50%, hsl(187 85% 53%) 100%);
--gradient-success: linear-gradient(135deg, hsl(152 76% 45%) 0%, hsl(170 76% 40%) 100%);
--gradient-danger: linear-gradient(135deg, hsl(0 84% 60%) 0%, hsl(350 80% 55%) 100%);
```

### Glass Effects
- Sidebar: `bg-sidebar/80 backdrop-blur-xl border-r border-white/10`
- Cards (optional variant): `bg-card/80 backdrop-blur-sm`

### Shadow Hierarchy
- Base: `shadow-sm`
- Elevated: `shadow-md`
- Hover: `shadow-lg shadow-primary/5`
- Featured: `shadow-xl shadow-primary/10`

### Animation Timing
- Micro-interactions: `duration-200 ease-out`
- Card transitions: `duration-300 ease-out`
- Page transitions: `duration-500 ease-out`

---

## Work Items - Foundation

### UI2-01: Add Success Semantic Color Token
**Status:** DONE
**Severity:** HIGH

**Problem:** Multiple components use hardcoded `text-green-600`/`bg-green-600` for success states (income amounts, success buttons, success alerts). There is no semantic `--success` color token in the design system.

**Dependencies:** None

**Files to Modify:**
- `frontend/src/index.css`
- `frontend/tailwind.config.js`

**Requirements:**
1. Add CSS variables to `:root`:
   ```css
   --success: 152 76% 45%;
   --success-foreground: 210 40% 98%;
   ```
2. Add dark mode variants to `.dark`:
   ```css
   --success: 152 70% 50%;
   --success-foreground: 222 84% 5%;
   ```
3. Extend Tailwind config colors with `success` and `success-foreground` mappings

**Acceptance Criteria:**
- [x] `bg-success`, `text-success`, `text-success-foreground` classes work
- [x] Colors render correctly in both light and dark mode
- [x] No TypeScript or build errors

**Implementation Notes:**
- Added `--success` and `--success-foreground` CSS variables to `:root` in `frontend/src/index.css`
- Added dark mode variants in `.dark` class with adjusted lightness
- Extended Tailwind config with `success` color mapping in `frontend/tailwind.config.js`
- Build passes successfully
- Pre-existing test failure in Sidebar.test.tsx (unrelated - from rebrand commit dd98b3b)

---

### UI2-02: Add Uncategorized/Fallback Color Token
**Status:** DONE
**Severity:** MEDIUM

**Problem:** Category color fallback uses hardcoded `#9ca3af` (gray-400) in multiple locations: `DashboardPage.tsx:593`, `TransactionsPage.tsx:564`, `RulesPage.tsx:230`.

**Dependencies:** None

**Files to Modify:**
- `frontend/src/index.css`
- `frontend/tailwind.config.js`
- `frontend/src/constants/colors.ts`

**Requirements:**
1. Add `--uncategorized` CSS variable (same as muted-foreground or distinct gray)
2. Add `UNCATEGORIZED_COLOR` export to `constants/colors.ts`
3. Update Tailwind config with `uncategorized` color mapping

**Acceptance Criteria:**
- [x] `constants/colors.ts` exports `UNCATEGORIZED_COLOR`
- [x] `bg-uncategorized`, `text-uncategorized` classes work
- [x] Color is consistent across light/dark modes

**Implementation Notes:**
- Added `--uncategorized: 220 9% 64%` CSS variable to `:root` in `frontend/src/index.css`
- Added dark mode variant `--uncategorized: 220 9% 55%` in `.dark` class
- Extended Tailwind config with `uncategorized` color mapping in `frontend/tailwind.config.js`
- Added `UNCATEGORIZED_COLOR` (#9ca3af) and `UNCATEGORIZED_COLOR_HSL` exports to `frontend/src/constants/colors.ts`
- Build passes successfully
- Pre-existing test failure in Sidebar.test.tsx (unrelated - from rebrand commit dd98b3b)

---

### UI2-03: Define Brand Gradient CSS Custom Properties
**Status:** DONE
**Severity:** HIGH

**Problem:** No gradient utilities exist. The app uses flat colors everywhere, contributing to the "plain" feeling.

**Dependencies:** UI2-01

**Files to Modify:**
- `frontend/src/index.css`
- `frontend/tailwind.config.js`

**Requirements:**
1. Add gradient CSS custom properties to `:root`:
   ```css
   --gradient-brand: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(217 91% 60%) 50%, hsl(187 85% 53%) 100%);
   --gradient-success: linear-gradient(135deg, hsl(152 76% 45%) 0%, hsl(170 76% 40%) 100%);
   --gradient-danger: linear-gradient(135deg, hsl(0 84% 60%) 0%, hsl(350 80% 55%) 100%);
   --gradient-subtle: linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--accent) / 0.05) 100%);
   ```
2. Add dark mode gradient variants with adjusted lightness
3. Add Tailwind utilities: `bg-gradient-brand`, `bg-gradient-success`, `bg-gradient-danger`, `bg-gradient-subtle`

**Acceptance Criteria:**
- [x] `bg-gradient-brand` renders a blue-to-cyan gradient
- [x] `bg-gradient-success` renders a green-to-teal gradient
- [x] Gradients adapt appropriately in dark mode
- [x] `bg-gradient-subtle` provides a subtle background tint

**Implementation Notes:**
- Added `--gradient-brand`, `--gradient-success`, `--gradient-danger`, `--gradient-subtle` CSS variables to `:root` in `frontend/src/index.css`
- Added dark mode variants in `.dark` class with adjusted lightness values for better visibility
- Extended Tailwind config with `backgroundImage` mapping for all four gradient utilities in `frontend/tailwind.config.js`
- Build passes successfully; gradient classes are JIT-compiled when used
- Pre-existing test failure in Sidebar.test.tsx (unrelated - from rebrand commit dd98b3b)

---

### UI2-04: Add Animation Keyframes and Utilities
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** No custom animations exist beyond the basic accordion animations from shadcn. The app feels static with no entrance animations or micro-interactions.

**Dependencies:** None

**Files to Modify:**
- `frontend/src/index.css`
- `frontend/tailwind.config.js`

**Requirements:**
1. Add keyframes to index.css:
   ```css
   @keyframes fade-in-up {
     from { opacity: 0; transform: translateY(10px); }
     to { opacity: 1; transform: translateY(0); }
   }
   @keyframes fade-in {
     from { opacity: 0; }
     to { opacity: 1; }
   }
   @keyframes scale-in {
     from { opacity: 0; transform: scale(0.95); }
     to { opacity: 1; transform: scale(1); }
   }
   @keyframes shimmer {
     0% { background-position: -200% 0; }
     100% { background-position: 200% 0; }
   }
   @keyframes pulse-subtle {
     0%, 100% { opacity: 1; }
     50% { opacity: 0.7; }
   }
   ```
2. Add animation utilities to Tailwind config:
   - `animate-fade-in-up`: `fade-in-up 0.5s ease-out forwards`
   - `animate-fade-in`: `fade-in 0.3s ease-out forwards`
   - `animate-scale-in`: `scale-in 0.2s ease-out forwards`
   - `animate-shimmer`: `shimmer 2s linear infinite`
3. Add animation delay utilities: `animation-delay-100`, `animation-delay-200`, etc.

**Acceptance Criteria:**
- [ ] `animate-fade-in-up` causes elements to fade in while moving up
- [ ] Animation delay utilities work for staggered effects
- [ ] `animate-shimmer` creates a loading shimmer effect
- [ ] Animations respect `prefers-reduced-motion`

---

### UI2-05: Extend Tailwind with Glass Effect Utilities
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** No glass/frosted effect utilities exist for creating the premium layered look.

**Dependencies:** None

**Files to Modify:**
- `frontend/tailwind.config.js`

**Requirements:**
1. Add backdrop-blur preset combinations:
   ```js
   '.glass': {
     '@apply bg-background/80 backdrop-blur-xl border border-white/10': {}
   },
   '.glass-subtle': {
     '@apply bg-background/60 backdrop-blur-sm': {}
   }
   ```
2. Or add via Tailwind plugin for `glass` and `glass-subtle` classes

**Acceptance Criteria:**
- [ ] `.glass` class creates frosted glass effect
- [ ] Effect works in both light and dark modes
- [ ] No performance issues on mobile devices

---

## Work Items - Components

### UI2-06: Create Alert Component
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Success/status messages in `RulesPage.tsx:270-299` and `UploadPage.tsx:177-229` use inline hardcoded styles. No reusable Alert component exists.

**Dependencies:** UI2-01

**Files to Create:**
- `frontend/src/components/ui/alert.tsx`

**Requirements:**
1. Create Alert component with variants: `default`, `success`, `destructive`, `warning`
2. Include subcomponents: `Alert`, `AlertTitle`, `AlertDescription`
3. Use semantic color tokens (success, destructive from design system)
4. Add subtle left border accent matching variant color
5. Include optional dismiss button via `onDismiss` prop
6. Add entrance animation (`animate-fade-in-up`)

**Acceptance Criteria:**
- [ ] Alert component exists at `src/components/ui/alert.tsx`
- [ ] All 4 variants render with correct semantic colors
- [ ] Left border accent matches variant (e.g., green for success)
- [ ] Supports dark mode via CSS variables
- [ ] Dismiss button works when `onDismiss` provided
- [ ] Alert animates in smoothly

---

### UI2-07: Add Success Variant to Button Component
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Multiple places use inline `bg-green-600 hover:bg-green-700 text-white` instead of a Button variant:
- `RulesPage.tsx:342` - "Add Rule" button
- `UploadPage.tsx:214` - "View Transactions" button

**Dependencies:** UI2-01

**Files to Modify:**
- `frontend/src/components/ui/button.tsx`

**Requirements:**
1. Add `success` variant to `buttonVariants`:
   ```typescript
   success: "bg-success text-success-foreground hover:bg-success/90"
   ```
2. Ensure it works with all size variants

**Acceptance Criteria:**
- [ ] `<Button variant="success">` renders with green styling
- [ ] Hover, focus, and disabled states work correctly
- [ ] Dark mode renders correctly

---

### UI2-08: Enhance Button with Hover Elevation Effects
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** Buttons have basic color transitions but no elevation changes on hover. They feel flat and lack premium polish.

**Dependencies:** None

**Files to Modify:**
- `frontend/src/components/ui/button.tsx`

**Requirements:**
1. Add hover elevation to default and success variants:
   ```typescript
   "hover:shadow-md hover:-translate-y-0.5"
   ```
2. Add subtle glow effect for primary actions:
   ```typescript
   "hover:shadow-lg hover:shadow-primary/20"
   ```
3. Ensure transitions are smooth: `transition-all duration-200`
4. Keep `active:scale-[0.98]` for press feedback

**Acceptance Criteria:**
- [ ] Default button lifts slightly on hover with shadow
- [ ] Primary button has subtle glow on hover
- [ ] Transitions feel smooth and premium
- [ ] Ghost and link variants don't have elevation (appropriate)

---

### UI2-09: Create StatCard Component
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Stat cards in `DashboardPage.tsx:386-467` have inconsistent styling and hardcoded colors. Each card's icon container uses different arbitrary colors.

**Dependencies:** UI2-01, UI2-03, UI2-04

**Files to Create:**
- `frontend/src/components/ui/stat-card.tsx`

**Requirements:**
1. Create StatCard component with props:
   ```typescript
   interface StatCardProps {
     title: string;
     value: string | number;
     icon: React.ReactNode;
     trend?: { value: number; label?: string }; // e.g., { value: 12, label: "vs last month" }
     variant?: 'default' | 'success' | 'warning' | 'danger';
     className?: string;
   }
   ```
2. Icon container uses gradient background based on variant:
   - default: `bg-gradient-to-br from-primary/20 to-primary/5`
   - success: `bg-gradient-to-br from-success/20 to-success/5`
   - danger: `bg-gradient-to-br from-destructive/20 to-destructive/5`
3. Add hover effect: `hover:shadow-lg hover:-translate-y-1 transition-all duration-300`
4. Trend indicator shows up/down arrow with colored text (green for positive, red for negative)
5. Use Card component as base

**Acceptance Criteria:**
- [ ] StatCard renders with consistent styling
- [ ] Icon containers use gradient backgrounds
- [ ] Hover effect lifts card with shadow
- [ ] Trend indicator shows direction and value
- [ ] All variants work in light and dark mode

---

### UI2-10: Enhance Card with Elevation Variants
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** Card component only has `shadow-sm`. No elevation variants exist for creating visual hierarchy.

**Dependencies:** UI2-05

**Files to Modify:**
- `frontend/src/components/ui/card.tsx`

**Requirements:**
1. Add `elevation` variant to cardVariants:
   ```typescript
   elevation: {
     sm: "shadow-sm",
     md: "shadow-md",
     lg: "shadow-lg shadow-primary/5",
     none: "shadow-none"
   }
   ```
2. Add `glass` boolean prop for glass effect variant
3. Add default hover effect option: `hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`

**Acceptance Criteria:**
- [ ] `<Card elevation="lg">` renders with larger shadow
- [ ] `<Card glass>` renders with frosted glass effect
- [ ] Interactive cards have smooth hover transitions
- [ ] Default Card behavior unchanged (backwards compatible)

---

### UI2-11: Add Size Variants to Input Component
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** Button has `size` variants (sm, default, lg) but Input does not, creating inconsistency.

**Dependencies:** None

**Files to Modify:**
- `frontend/src/components/ui/input.tsx`

**Requirements:**
1. Refactor Input to use cva for variants
2. Add `size` variant:
   - `sm`: `h-9 px-2.5 text-sm`
   - `default`: `h-10 px-3` (current)
   - `lg`: `h-11 px-4`
3. Export `inputVariants` for external use

**Acceptance Criteria:**
- [ ] `<Input size="sm">` renders smaller input
- [ ] `<Input size="lg">` renders larger input
- [ ] Sizes visually match Button sizes
- [ ] No breaking changes to existing usage

---

### UI2-12: Create SortIcon Component
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** Table sort indicators in `TransactionsPage.tsx:316-317` use ASCII ` ▲` ` ▼` instead of proper icons.

**Dependencies:** None

**Files to Create:**
- `frontend/src/components/ui/sort-icon.tsx`

**Requirements:**
1. Create SortIcon with props: `direction: 'asc' | 'desc' | null`
2. Use Lucide icons (`ChevronUp`, `ChevronDown`) or custom SVG
3. When `null`, show neutral/inactive state (muted color)
4. Add smooth rotation/transition animation between states
5. Include proper `aria-label`

**Acceptance Criteria:**
- [ ] SortIcon renders appropriate arrow for direction
- [ ] Null state shows muted indicator
- [ ] Smooth transition when direction changes
- [ ] Proper accessibility attributes

---

### UI2-13: Redesign LoadingSpinner with Gradient
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** Loading spinner is a basic gray ring. It lacks personality and doesn't match the premium aesthetic.

**Dependencies:** UI2-03

**Files to Modify:**
- `frontend/src/components/LoadingSpinner.tsx`

**Requirements:**
1. Redesign spinner to use brand gradient
2. Add smooth rotation animation with easing
3. Consider adding subtle pulse effect
4. Support size variants: `sm`, `default`, `lg`
5. Ensure it works on any background color

**Acceptance Criteria:**
- [ ] Spinner uses brand gradient colors
- [ ] Animation is smooth and premium-feeling
- [ ] Size variants work correctly
- [ ] Looks good in both light and dark mode

---

## Work Items - Page Refactoring

### UI2-14: Refactor Amount Color Display
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Transaction amounts use hardcoded colors:
- `DashboardPage.tsx:584` - `text-red-600 dark:text-red-400` / `text-green-600 dark:text-green-400`
- `TransactionsPage.tsx:495` - `text-red-600` / `text-green-600` (missing dark mode!)

**Dependencies:** UI2-01

**Files to Modify:**
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/TransactionsPage.tsx`

**Requirements:**
1. Replace `text-red-600` with `text-destructive`
2. Replace `text-green-600` with `text-success`
3. CSS variables handle dark mode automatically (no `dark:` prefix needed)

**Acceptance Criteria:**
- [ ] All amount colors use semantic tokens
- [ ] Dark mode works correctly in both pages
- [ ] No hardcoded red/green classes remain for amounts

---

### UI2-15: Refactor Success Buttons to Use Variant
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Multiple buttons use inline green styling:
- `RulesPage.tsx:342` - "Add Rule"
- `UploadPage.tsx:214` - "View Transactions"

**Dependencies:** UI2-07

**Files to Modify:**
- `frontend/src/pages/RulesPage.tsx`
- `frontend/src/pages/UploadPage.tsx`

**Requirements:**
1. Replace inline green styling with `<Button variant="success">`
2. Remove className overrides

**Acceptance Criteria:**
- [ ] All success/confirm buttons use `variant="success"`
- [ ] No inline `bg-green-*` classes on buttons

---

### UI2-16: Refactor Status Alerts to Use Alert Component
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Status messages use inline hardcoded styling:
- `RulesPage.tsx:269-299` - Success alert with hardcoded green
- `UploadPage.tsx:177-229` - Success card with hardcoded green border

**Dependencies:** UI2-06

**Files to Modify:**
- `frontend/src/pages/RulesPage.tsx`
- `frontend/src/pages/UploadPage.tsx`

**Requirements:**
1. Replace inline success alert with `<Alert variant="success">`
2. Use AlertTitle and AlertDescription subcomponents
3. Maintain dismiss functionality via `onDismiss` prop

**Acceptance Criteria:**
- [ ] Success messages use Alert component
- [ ] No inline green color classes in alert sections
- [ ] Dismiss behavior preserved

---

### UI2-17: Refactor Chart Hardcoded Colors
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** Chart code has hardcoded colors:
- `DashboardPage.tsx:149` - `#6b7280` for uncategorized
- `DashboardPage.tsx:204,232` - `rgba(...)` for chart fills
- `DashboardPage.tsx:231,235` - `#10b981` for income line

**Dependencies:** UI2-02, UI2-03

**Files to Modify:**
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/constants/colors.ts`
- `frontend/src/hooks/useChartTheme.ts`

**Requirements:**
1. Use `UNCATEGORIZED_COLOR` from constants for fallback colors
2. Add income/success chart colors to constants or useChartTheme
3. Use theme-aware fill colors (consider CSS color-mix for alpha)
4. Ensure chart colors work in both themes

**Acceptance Criteria:**
- [ ] No hardcoded hex colors in chart configuration
- [ ] Colors sourced from design tokens/constants
- [ ] Charts look good in both light and dark mode

---

### UI2-18: Refactor Category Color Fallback
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** Category color fallback `#9ca3af` hardcoded in three places.

**Dependencies:** UI2-02

**Files to Modify:**
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/TransactionsPage.tsx`
- `frontend/src/pages/RulesPage.tsx`

**Requirements:**
1. Import `UNCATEGORIZED_COLOR` from constants
2. Replace all hardcoded `#9ca3af` with the constant

**Acceptance Criteria:**
- [ ] All category fallbacks use the constant
- [ ] `grep '#9ca3af'` returns no results in pages/

---

### UI2-19: Replace Native Selects with Select Component
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** Native `<select>` elements used with manual styling instead of Select component:
- `RulesPage.tsx:324-337` - New rule category
- `RulesPage.tsx:409-424` - Edit rule category

**Dependencies:** None

**Files to Modify:**
- `frontend/src/pages/RulesPage.tsx`

**Requirements:**
1. Replace native selects with shadcn Select component
2. Maintain all existing functionality
3. Test keyboard navigation

**Acceptance Criteria:**
- [ ] RulesPage uses Select component for categories
- [ ] Keyboard navigation works
- [ ] Visual consistency with design system

---

### UI2-20: Enhance DashboardPage with StatCard Component
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Dashboard stat cards (`DashboardPage.tsx:386-467`) use inconsistent inline styling with hardcoded colors.

**Dependencies:** UI2-09

**Files to Modify:**
- `frontend/src/pages/DashboardPage.tsx`

**Requirements:**
1. Replace inline stat card markup with StatCard component
2. Map each stat to appropriate variant:
   - Total Spending: `danger`
   - Transaction Count: `default`
   - Average Transaction: `default`
   - Largest Category: `warning` or `default`
3. Add trend indicators if data available
4. Add entrance animations with stagger

**Acceptance Criteria:**
- [ ] All stat cards use StatCard component
- [ ] Cards have gradient icon backgrounds
- [ ] Hover effects work (lift + shadow)
- [ ] Animations stagger on page load

---

### UI2-21: Add Table Row Hover Effects
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** Table rows have minimal hover feedback. The tables feel static.

**Dependencies:** None

**Files to Modify:**
- `frontend/src/components/ui/table.tsx`
- `frontend/src/pages/TransactionsPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`

**Requirements:**
1. Enhance TableRow hover state:
   ```tsx
   "hover:bg-accent/50 transition-colors duration-150"
   ```
2. Add subtle left border on hover for visual feedback:
   ```tsx
   "hover:border-l-2 hover:border-l-primary"
   ```
3. Ensure clickable rows have `cursor-pointer`

**Acceptance Criteria:**
- [ ] Table rows have visible hover feedback
- [ ] Transition is smooth
- [ ] Works in both light and dark mode

---

### UI2-22: Refactor Toast and ErrorMessage Colors
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** Toast and ErrorMessage components use hardcoded Tailwind colors with no dark mode support.

**Dependencies:** UI2-01

**Files to Modify:**
- `frontend/src/components/Toast.tsx`
- `frontend/src/components/ErrorMessage.tsx`

**Requirements:**
1. Update Toast colors to use semantic tokens:
   - Success: `bg-success/10 border-success/30 text-success`
   - Error: `bg-destructive/10 border-destructive/30 text-destructive`
   - Warning: `bg-warning/10 border-warning/30` (add warning token if needed)
   - Info: `bg-primary/10 border-primary/30 text-primary`
2. Update ErrorMessage to use `bg-destructive/10 border-destructive/30`
3. Ensure dark mode works via CSS variables

**Acceptance Criteria:**
- [ ] Toast colors use semantic tokens
- [ ] ErrorMessage uses semantic tokens
- [ ] Both work correctly in dark mode

---

## Work Items - Visual Polish

### UI2-23: Redesign Sidebar with Premium Styling
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Sidebar is functional but plain. Uses basic flat design with minimal visual interest. Navigation items have simple color swap with no elevation or accent effects.

**Dependencies:** UI2-03, UI2-04, UI2-05

**Files to Modify:**
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/index.css` (if needed for sidebar-specific styles)

**Requirements:**
1. Add glass effect to sidebar background:
   ```tsx
   "bg-sidebar/90 backdrop-blur-xl border-r border-border/50"
   ```
2. Enhance active nav item styling:
   - Add left accent border: `border-l-2 border-l-primary`
   - Add subtle gradient fill: `bg-gradient-to-r from-primary/15 to-transparent`
   - Add slight shadow: `shadow-sm`
3. Improve nav item hover:
   - Add subtle scale: `hover:translate-x-1`
   - Smooth transition: `transition-all duration-200`
4. Increase spacing: Change `space-y-1` to `space-y-2`
5. Add subtle gradient accent to logo area
6. Enhance theme toggle buttons with better visual distinction

**Acceptance Criteria:**
- [ ] Sidebar has frosted glass effect
- [ ] Active nav item has left border + gradient fill
- [ ] Hover states feel premium with subtle movement
- [ ] Spacing is more generous
- [ ] Works correctly in both themes

---

### UI2-24: Enhance Page Headers with Gradient Text
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** Page headers use plain text with no visual distinction. Headers don't convey brand personality.

**Dependencies:** UI2-03

**Files to Create:**
- `frontend/src/components/ui/gradient-text.tsx` (optional utility component)

**Files to Modify:**
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/TransactionsPage.tsx`
- `frontend/src/pages/RulesPage.tsx`
- `frontend/src/pages/UploadPage.tsx`

**Requirements:**
1. Create optional GradientText component or utility class:
   ```tsx
   "bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent"
   ```
2. Apply to main page titles (h1 elements)
3. Ensure readability in both themes
4. Keep it subtle - not overly colorful

**Acceptance Criteria:**
- [ ] Page headers have subtle gradient effect
- [ ] Text remains readable
- [ ] Effect is elegant, not garish
- [ ] Works in both themes

---

### UI2-25: Add Empty State Illustrations
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** Empty states use generic icons. They lack personality and encouragement.

**Dependencies:** None

**Files to Create:**
- `frontend/src/components/EmptyState.tsx`
- `frontend/public/illustrations/empty-dashboard.svg`
- `frontend/public/illustrations/empty-transactions.svg`

**Files to Modify:**
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/TransactionsPage.tsx`

**Requirements:**
1. Create EmptyState component with props:
   - `illustration`: path to SVG
   - `title`: heading text
   - `description`: body text
   - `action?`: optional CTA button
2. Create simple line-art illustrations (or source from open libraries)
3. Illustrations should work in both themes (use currentColor or CSS variables)
4. Add subtle entrance animation

**Acceptance Criteria:**
- [ ] Empty states have custom illustrations
- [ ] Illustrations adapt to theme
- [ ] Component is reusable across pages
- [ ] File sizes are reasonable (<15KB each)

---

### UI2-26: Implement Staggered Entrance Animations
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** Page content appears instantly with no animation. This feels abrupt and misses opportunity for polish.

**Dependencies:** UI2-04

**Files to Modify:**
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/TransactionsPage.tsx`
- `frontend/src/pages/RulesPage.tsx`

**Requirements:**
1. Add `animate-fade-in-up` to major page sections
2. Use `animation-delay-*` utilities for stagger effect:
   - Header: no delay
   - Stat cards: 100ms, 150ms, 200ms, 250ms (staggered)
   - Charts: 300ms
   - Tables: 400ms
3. Respect `prefers-reduced-motion` media query
4. Keep animations subtle (duration ~500ms, small translate)

**Acceptance Criteria:**
- [ ] Page content animates in with stagger
- [ ] Animation feels smooth and premium
- [ ] Respects reduced motion preference
- [ ] No layout shift during animation

---

### UI2-27: Final Verification and Cleanup
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Need to verify all Phase 2 changes work together correctly.

**Dependencies:** All UI2-* items

**Requirements:**
1. Run `npm run build` - must complete without errors
2. Run `npm run typecheck` - must complete without errors
3. Run `npm run test` - all tests must pass
4. Run `npm run test:e2e` - all E2E tests must pass
5. Visual verification in light mode:
   - [ ] Sidebar has glass effect and refined navigation
   - [ ] Stat cards have gradients and hover effects
   - [ ] Tables have row hover feedback
   - [ ] Buttons have elevation on hover
   - [ ] Animations play smoothly
6. Visual verification in dark mode (same checks)
7. Grep for remaining hardcoded colors:
   - `grep -r "text-red-" frontend/src/pages/`
   - `grep -r "text-green-" frontend/src/pages/`
   - `grep -r "bg-red-" frontend/src/pages/`
   - `grep -r "bg-green-" frontend/src/pages/`
   - `grep -r "#[0-9a-fA-F]\{6\}" frontend/src/pages/`
8. Performance check: no jank on animations
9. Accessibility: keyboard navigation still works

**Acceptance Criteria:**
- [ ] Build passes
- [ ] All tests pass
- [ ] No hardcoded colors remain
- [ ] All pages look polished in both themes
- [ ] Animations are smooth
- [ ] Keyboard navigation works

---

## Dependency Graph

```
Foundation:
UI2-01 (Success Token) ← No dependencies
├── UI2-03 (Gradients) ← depends on UI2-01
├── UI2-06 (Alert) ← depends on UI2-01
├── UI2-07 (Success Button) ← depends on UI2-01
├── UI2-09 (StatCard) ← depends on UI2-01, UI2-03, UI2-04
├── UI2-14 (Amount Colors) ← depends on UI2-01
└── UI2-22 (Toast Colors) ← depends on UI2-01

UI2-02 (Uncategorized Token) ← No dependencies
├── UI2-17 (Chart Colors) ← depends on UI2-02, UI2-03
└── UI2-18 (Category Fallback) ← depends on UI2-02

UI2-04 (Animations) ← No dependencies
├── UI2-09 (StatCard) ← depends on UI2-04
├── UI2-23 (Sidebar) ← depends on UI2-04
└── UI2-26 (Entrance Animations) ← depends on UI2-04

UI2-05 (Glass Effects) ← No dependencies
├── UI2-10 (Card Elevation) ← depends on UI2-05
└── UI2-23 (Sidebar) ← depends on UI2-05

Components (dependent on foundation):
UI2-06 (Alert) → UI2-16 (Refactor Alerts)
UI2-07 (Success Button) → UI2-15 (Refactor Buttons)
UI2-09 (StatCard) → UI2-20 (Dashboard StatCards)

Independent:
UI2-08 (Button Hover) ← No dependencies
UI2-11 (Input Sizes) ← No dependencies
UI2-12 (SortIcon) ← No dependencies
UI2-13 (LoadingSpinner) ← depends on UI2-03
UI2-19 (Native Selects) ← No dependencies
UI2-21 (Table Hover) ← No dependencies
UI2-24 (Gradient Text) ← depends on UI2-03
UI2-25 (Empty States) ← No dependencies

Final:
UI2-27 (Verification) ← depends on ALL
```

---

## Priority Order

### Phase 1: Foundation (Do First)
1. UI2-01 - Success Token
2. UI2-02 - Uncategorized Token
3. UI2-03 - Brand Gradients
4. UI2-04 - Animation Keyframes
5. UI2-05 - Glass Effects

### Phase 2: Core Components
6. UI2-06 - Alert Component
7. UI2-07 - Success Button Variant
8. UI2-08 - Button Hover Effects
9. UI2-09 - StatCard Component
10. UI2-10 - Card Elevation

### Phase 3: Page Refactoring (High Impact)
11. UI2-14 - Amount Colors
12. UI2-15 - Success Buttons
13. UI2-16 - Status Alerts
14. UI2-20 - Dashboard StatCards
15. UI2-23 - Sidebar Redesign

### Phase 4: Remaining Pages
16. UI2-17 - Chart Colors
17. UI2-18 - Category Fallbacks
18. UI2-19 - Native Selects
19. UI2-21 - Table Hover
20. UI2-22 - Toast/Error Colors

### Phase 5: Polish
21. UI2-11 - Input Sizes
22. UI2-12 - SortIcon
23. UI2-13 - LoadingSpinner
24. UI2-24 - Gradient Text
25. UI2-25 - Empty States
26. UI2-26 - Entrance Animations

### Final
27. UI2-27 - Verification

---

## Critical Files Summary

**Foundation files to modify first:**
- `frontend/src/index.css` - Color tokens, gradients, animations
- `frontend/tailwind.config.js` - Tailwind extensions

**New components to create:**
- `frontend/src/components/ui/alert.tsx`
- `frontend/src/components/ui/stat-card.tsx`
- `frontend/src/components/ui/sort-icon.tsx`

**Major page updates:**
- `frontend/src/pages/DashboardPage.tsx` - StatCards, chart colors, animations
- `frontend/src/pages/RulesPage.tsx` - Alert, buttons, selects
- `frontend/src/pages/UploadPage.tsx` - Alert, buttons
- `frontend/src/components/Sidebar.tsx` - Full redesign

**Component enhancements:**
- `frontend/src/components/ui/button.tsx` - Success variant, hover effects
- `frontend/src/components/ui/card.tsx` - Elevation variants
- `frontend/src/components/LoadingSpinner.tsx` - Gradient redesign
- `frontend/src/components/Toast.tsx` - Semantic colors
- `frontend/src/components/ErrorMessage.tsx` - Semantic colors
