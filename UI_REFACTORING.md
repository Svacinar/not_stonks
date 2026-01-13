# UI Refactoring Plan: Spending Dashboard

## Overview

This document contains work items to modernize the spending dashboard UI from a dated 2010-style interface to a fresh, modern design using shadcn/ui components.

**Design System Reference:** See `CLAUDE.md` for design tokens, component patterns, and styling conventions.

**Analysis Summary:**
- 4 pages with repetitive inline Tailwind classes
- No component library (button/card patterns repeated 15+ times)
- No design tokens (colors hardcoded throughout)
- No dark mode support
- Modal accessibility issues

---

## Work Items - Foundation (Must Complete First)

### UI-01: Initialize shadcn/ui and Configure Tooling
**Status:** DONE
**Severity:** HIGH

**Problem:** No component library exists. Tailwind config is minimal with empty `extend: {}`. No utility function for conditional classes.

**Dependencies:** None

**Files to Create:**
- `frontend/components.json`
- `frontend/src/lib/utils.ts`

**Files to Modify:**
- `frontend/package.json`
- `frontend/tailwind.config.js`
- `frontend/tsconfig.json`
- `frontend/vite.config.ts`

**Requirements:**
1. Run `npx shadcn@latest init` in frontend directory with options: Style=Default, Base color=Slate, CSS variables=Yes
2. Verify `components.json` created with correct paths
3. Verify `src/lib/utils.ts` contains `cn()` utility function
4. Add path alias `@/*` to tsconfig.json pointing to `./src/*`
5. Update vite.config.ts to resolve `@` alias using `path.resolve`
6. Install `tailwindcss-animate` plugin

**Acceptance Criteria:**
- [x] `npx shadcn add button` works without errors
- [x] `cn()` utility available at `@/lib/utils`
- [x] TypeScript compiles without path alias errors
- [x] `npm run dev` starts without errors

**Implementation Notes:**
- Created `frontend/components.json` with shadcn/ui configuration (style=default, baseColor=slate, cssVariables=true)
- Created `frontend/src/lib/utils.ts` with `cn()` utility using clsx and tailwind-merge
- Added `baseUrl` and `paths` to `frontend/tsconfig.json` for `@/*` alias
- Updated `frontend/vite.config.ts` with path alias resolution using `path.resolve`
- Installed dependencies: clsx, tailwind-merge, class-variance-authority, @radix-ui/react-slot, tailwindcss-animate
- Button component created at `frontend/src/components/ui/button.tsx` as test (verified shadcn CLI works)

---

### UI-02: Define Color Design Tokens
**Status:** DONE
**Severity:** HIGH

**Problem:** Colors hardcoded throughout. Example: `BANK_COLORS` object in DashboardPage.tsx with hex values like `#005BAC`.

**Dependencies:** UI-01

**Files to Create:**
- `frontend/src/constants/colors.ts`

**Files to Modify:**
- `frontend/src/index.css`

**Requirements:**
1. Add CSS variables to `index.css` in `:root` for light theme and `.dark` for dark theme
2. Include semantic tokens: `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`
3. Include bank colors: `--bank-csob`, `--bank-raiffeisen`, `--bank-revolut`
4. Include chart palette: `--chart-1` through `--chart-12`
5. Create `constants/colors.ts` exporting `BANK_COLORS` and `CHART_COLORS_HEX` arrays

**Acceptance Criteria:**
- [x] CSS variables defined in `:root` and `.dark`
- [x] `constants/colors.ts` exports BANK_COLORS and CHART_COLORS_HEX
- [x] No TypeScript errors
- [x] Page renders correctly (visual check)

**Implementation Notes:**
- Added CSS variables to `frontend/src/index.css` in `:root` (light) and `.dark` (dark) selectors
- Included all semantic tokens: background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, radius
- Added bank colors: --bank-csob, --bank-raiffeisen, --bank-revolut
- Added chart palette: --chart-1 through --chart-12 with dark mode variants
- Created `frontend/src/constants/colors.ts` with BANK_COLORS, CHART_COLORS_HEX, CHART_COLORS_HSL, and BANK_COLORS_HSL exports
- Updated React DayPicker overrides to use CSS variable-based colors

---

### UI-03: Extend Tailwind Configuration
**Status:** DONE
**Severity:** HIGH

**Problem:** Tailwind config has empty `extend: {}` with no custom color mappings to CSS variables.

**Dependencies:** UI-02

**Files to Modify:**
- `frontend/tailwind.config.js`

**Requirements:**
1. Add `darkMode: ["class"]` to config
2. Extend colors to map semantic names to CSS variables (e.g., `primary: "hsl(var(--primary))"`)
3. Add bank colors: `bank.csob`, `bank.raiffeisen`, `bank.revolut`
4. Configure border radius using `--radius` variable
5. Add animation keyframes for accordion (shadcn requirement)
6. Add `tailwindcss-animate` to plugins array

**Acceptance Criteria:**
- [x] `bg-primary`, `text-primary` classes work
- [x] `bg-card`, `bg-background` classes work
- [x] `bg-bank-csob`, `bg-bank-revolut` classes work
- [x] `dark:` prefix classes work for dark mode

**Implementation Notes:**
- Added `darkMode: ["class"]` to enable class-based dark mode switching
- Extended colors object with all semantic tokens (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring)
- Added bank colors under `bank.csob`, `bank.raiffeisen`, `bank.revolut`
- Added chart colors 1-12 under `chart.1` through `chart.12`
- Configured borderRadius with lg/md/sm variants using `--radius` CSS variable
- Added accordion-down/accordion-up keyframes and animations for shadcn components
- Added `tailwindcss-animate` plugin to plugins array

---

### UI-04: Update CLAUDE.md After Foundation Setup
**Status:** DONE
**Severity:** MEDIUM

**Problem:** CLAUDE.md contains planned structure that should be verified against actual implementation.

**Dependencies:** UI-01, UI-02, UI-03

**Files to Modify:**
- `CLAUDE.md`

**Requirements:**
1. Verify CSS variables in CLAUDE.md match actual index.css
2. Verify import path examples work with actual tsconfig paths
3. Update any discrepancies between documentation and implementation
4. Ensure color token table is accurate

**Acceptance Criteria:**
- [x] CLAUDE.md accurately reflects the actual setup
- [x] Import examples work when copied into code
- [x] Color token table matches index.css values

**Implementation Notes:**
- Updated CLAUDE.md semantic colors table to include all tokens defined in index.css
- Added missing tokens: `--popover`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground`, `--destructive-foreground`, `--input`, `--radius`
- Verified import path examples (`@/lib/utils`, `@/components/ui/*`) work with tsconfig.json paths configuration
- Verified all color values in table match actual index.css values for both light and dark modes
- Files changed: `CLAUDE.md`

---

## Work Items - Core Components

### UI-05: Create Button Component
**Status:** DONE
**Severity:** HIGH

**Problem:** Button styling repeated 20+ times across pages with long class strings.

**Dependencies:** UI-01

**Files to Create:**
- `frontend/src/components/ui/button.tsx`

**Requirements:**
1. Run `npx shadcn@latest add button`
2. Verify component has variants: default, destructive, outline, secondary, ghost, link
3. Verify component has sizes: default, sm, lg, icon
4. Test rendering all variants

**Acceptance Criteria:**
- [x] Button component exists at `src/components/ui/button.tsx`
- [x] All 6 variants render correctly
- [x] All 4 sizes render correctly
- [x] Focus ring visible on keyboard focus
- [x] Disabled state works

**Implementation Notes:**
- Button component was created during UI-01 initialization as a test for shadcn CLI
- Component uses class-variance-authority (cva) for variant management
- Includes all 6 variants: default, destructive, outline, secondary, ghost, link
- Includes all 4 sizes: default, sm, lg, icon
- Focus ring implemented via `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Disabled state implemented via `disabled:pointer-events-none disabled:opacity-50`

---

### UI-06: Create Card Component
**Status:** DONE
**Severity:** HIGH

**Problem:** Card pattern `bg-white rounded-lg shadow p-6` repeated 11+ times across pages.

**Dependencies:** UI-01

**Files to Create:**
- `frontend/src/components/ui/card.tsx`

**Requirements:**
1. Run `npx shadcn@latest add card`
2. Verify subcomponents: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
3. Verify styling uses rounded-xl (12px) and shadow-sm

**Acceptance Criteria:**
- [x] Card component exists at `src/components/ui/card.tsx`
- [x] Card has soft shadow
- [x] Card uses rounded corners (rounded-xl)
- [x] All subcomponents work correctly
- [x] Supports dark mode

**Implementation Notes:**
- Ran `npx shadcn@latest add card` to create the component
- Component includes all 6 subcomponents: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- Updated `rounded-lg` to `rounded-xl` to match CLAUDE.md design conventions (12px border radius)
- Uses `shadow-sm` for soft shadow effect
- Dark mode supported via `bg-card text-card-foreground` CSS variables
- Files created: `frontend/src/components/ui/card.tsx`

---

### UI-07: Create Input and Label Components
**Status:** DONE
**Severity:** HIGH

**Problem:** Input styling repeated with inconsistent focus states across forms.

**Dependencies:** UI-01

**Files to Create:**
- `frontend/src/components/ui/input.tsx`
- `frontend/src/components/ui/label.tsx`

**Requirements:**
1. Run `npx shadcn@latest add input`
2. Run `npx shadcn@latest add label`
3. Verify Input has visible border, focus ring, disabled state
4. Verify Label associates correctly with inputs

**Acceptance Criteria:**
- [x] Input component exists at `src/components/ui/input.tsx`
- [x] Label component exists at `src/components/ui/label.tsx`
- [x] Input has visible border by default
- [x] Focus state shows ring (not just border color)
- [x] Disabled input is visually distinct

**Implementation Notes:**
- Ran `npx shadcn@latest add input` to create Input component
- Ran `npx shadcn@latest add label` to create Label component (installed @radix-ui/react-label dependency)
- Input uses `border border-input` for visible border by default
- Input focus state uses `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Input disabled state uses `disabled:cursor-not-allowed disabled:opacity-50`
- Label uses Radix UI's LabelPrimitive.Root with `peer-disabled:cursor-not-allowed peer-disabled:opacity-70` for disabled pairing

---

### UI-08: Create Select Component
**Status:** DONE
**Severity:** HIGH

**Problem:** Native `<select>` elements used throughout, inconsistent with design system.

**Dependencies:** UI-01

**Files to Create:**
- `frontend/src/components/ui/select.tsx`

**Requirements:**
1. Run `npx shadcn@latest add select`
2. Verify subcomponents: Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel
3. Test keyboard navigation (Arrow keys, Enter, Escape)

**Acceptance Criteria:**
- [x] Select component exists at `src/components/ui/select.tsx`
- [x] Dropdown opens/closes correctly
- [x] Keyboard navigation works
- [x] Selected value displays correctly
- [x] Placeholder text shown when no selection

**Implementation Notes:**
- Ran `npx shadcn@latest add select` which installed `@radix-ui/react-select` dependency
- Installed `lucide-react` for Check/ChevronDown/ChevronUp icons used by the component
- Component exports all required subcomponents: Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem
- Also includes bonus components: SelectSeparator, SelectScrollUpButton, SelectScrollDownButton
- Keyboard navigation (Arrow keys, Enter, Escape) built into Radix UI Select primitive
- Files created: `frontend/src/components/ui/select.tsx`

---

### UI-09: Create Dialog Component
**Status:** DONE
**Severity:** HIGH

**Problem:** Export modal in TransactionsPage has accessibility issues: no focus trap, no role="dialog", no aria-labelledby.

**Dependencies:** UI-01

**Files to Create:**
- `frontend/src/components/ui/dialog.tsx`

**Requirements:**
1. Run `npx shadcn@latest add dialog`
2. Verify subcomponents: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
3. Test focus trap, Escape key closes, click outside closes

**Acceptance Criteria:**
- [x] Dialog component exists at `src/components/ui/dialog.tsx`
- [x] Modal traps focus when open
- [x] Escape key closes modal
- [x] Click outside closes modal
- [x] Screen reader announces modal correctly

**Implementation Notes:**
- Ran `npx shadcn@latest add dialog` which installed `@radix-ui/react-dialog` dependency
- Component exports all required subcomponents: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
- Also includes bonus components: DialogPortal, DialogOverlay for advanced customization
- Focus trap, Escape key, and click-outside-to-close behaviors provided by Radix UI Dialog primitive
- Screen reader accessibility via Radix UI's ARIA implementation (role="dialog", aria-labelledby, aria-describedby)
- Files created: `frontend/src/components/ui/dialog.tsx`

---

### UI-10: Create Badge Component
**Status:** DONE
**Severity:** MEDIUM

**Problem:** Category indicators use inline styles for color dots. No reusable badge component.

**Dependencies:** UI-01

**Files to Create:**
- `frontend/src/components/ui/badge.tsx`

**Requirements:**
1. Run `npx shadcn@latest add badge`
2. Verify variants: default, secondary, outline, destructive

**Acceptance Criteria:**
- [x] Badge component exists at `src/components/ui/badge.tsx`
- [x] All 4 variants render correctly
- [x] Proper padding and rounded corners
- [x] Supports dark mode

**Implementation Notes:**
- Ran `npx shadcn@latest add badge` to create the component
- Component includes all 4 variants: default, secondary, destructive, outline
- Uses `rounded-full` for pill-shaped badges with `px-2.5 py-0.5` padding
- Dark mode supported via CSS variable-based colors (bg-primary, bg-secondary, bg-destructive)
- Uses class-variance-authority (cva) for variant management
- Files created: `frontend/src/components/ui/badge.tsx`

---

### UI-11: Create Table Component
**Status:** DONE
**Severity:** HIGH

**Problem:** Table markup repeated in DashboardPage, TransactionsPage, RulesPage with inconsistent styling.

**Dependencies:** UI-01

**Files to Create:**
- `frontend/src/components/ui/table.tsx`

**Requirements:**
1. Run `npx shadcn@latest add table`
2. Verify subcomponents: Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption

**Acceptance Criteria:**
- [x] Table component exists at `src/components/ui/table.tsx`
- [x] Header row has distinct styling
- [x] Row hover state shows background change
- [x] Proper border/divider between rows
- [x] Supports dark mode

**Implementation Notes:**
- Ran `npx shadcn@latest add table` to create the component
- Component exports all 8 subcomponents: Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption
- Header styling uses `font-medium text-muted-foreground` for distinct appearance with `border-b`
- Row hover state implemented via `hover:bg-muted/50 transition-colors` on TableRow
- Border dividers implemented via `border-b` on TableRow, last row border removed in TableBody
- Dark mode supported via CSS variable-based colors (bg-muted, text-muted-foreground)

---

### UI-12: Create Skeleton Component
**Status:** DONE
**Severity:** MEDIUM

**Problem:** Loading states only show spinner. No content preview during loading.

**Dependencies:** UI-01, UI-06

**Files to Create:**
- `frontend/src/components/ui/skeleton.tsx`
- `frontend/src/components/skeletons/CardSkeleton.tsx`
- `frontend/src/components/skeletons/TableRowSkeleton.tsx`

**Requirements:**
1. Run `npx shadcn@latest add skeleton`
2. Create CardSkeleton using Card and Skeleton components
3. Create TableRowSkeleton using TableRow, TableCell, and Skeleton components

**Acceptance Criteria:**
- [x] Skeleton component exists with pulse animation
- [x] CardSkeleton matches card dimensions roughly
- [x] TableRowSkeleton accepts configurable column count
- [x] Skeletons use muted background color

**Implementation Notes:**
- Ran `npx shadcn@latest add skeleton` to create base component with `animate-pulse` animation
- Skeleton component uses `bg-muted` for muted background color per design system
- Created `CardSkeleton` with optional `showHeader` and `showDescription` props for flexible card layouts
- Created `TableRowSkeleton` with `columnCount` prop and optional `columnWidths` array for configurable columns
- Both skeleton compositions use Card/Table components from UI-06/UI-11 for consistent styling
- Files created: `frontend/src/components/ui/skeleton.tsx`, `frontend/src/components/skeletons/CardSkeleton.tsx`, `frontend/src/components/skeletons/TableRowSkeleton.tsx`

---

### UI-13: Create AlertDialog Component
**Status:** DONE
**Severity:** HIGH

**Problem:** Delete confirmation in RulesPage is inline with confusing "Delete?" text and checkmark to confirm.

**Dependencies:** UI-09

**Files to Create:**
- `frontend/src/components/ui/alert-dialog.tsx`

**Requirements:**
1. Run `npx shadcn@latest add alert-dialog`
2. Verify subcomponents: AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction

**Acceptance Criteria:**
- [x] AlertDialog component exists
- [x] Confirmation has clear title and description
- [x] Cancel and Action buttons clearly labeled
- [x] Action button supports destructive styling
- [x] Cancel is focused by default

**Implementation Notes:**
- Ran `npx shadcn@latest add alert-dialog` which installed `@radix-ui/react-alert-dialog` dependency
- Component exports all required subcomponents: AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction
- Also includes bonus components: AlertDialogPortal, AlertDialogOverlay for advanced customization
- Cancel button focus by default is built into Radix UI AlertDialog primitive (prevents accidental destructive actions)
- Action button supports destructive styling via `buttonVariants({ variant: "destructive" })` classes
- Files created: `frontend/src/components/ui/alert-dialog.tsx`

---

## Work Items - Page Refactoring

### UI-14: Refactor DashboardPage to Use Design System
**Status:** DONE
**Severity:** HIGH

**Problem:** DashboardPage has hardcoded colors, repeated card patterns, and inline chart color arrays.

**Dependencies:** UI-05, UI-06, UI-11, UI-12

**Files to Create:**
- `frontend/src/components/skeletons/DashboardSkeleton.tsx`

**Files to Modify:**
- `frontend/src/pages/DashboardPage.tsx`

**Requirements:**
1. Import Button, Card, CardContent, CardHeader, CardTitle, Table components
2. Import BANK_COLORS, CHART_COLORS_HEX from `@/constants/colors`
3. Remove local BANK_COLORS definition
4. Replace hardcoded chart colors with CHART_COLORS_HEX
5. Replace all `<div className="bg-white rounded-lg shadow p-6">` with Card component
6. Replace buttons with Button component
7. Replace table with Table component
8. Create DashboardSkeleton for loading state

**Acceptance Criteria:**
- [x] No inline `bg-white rounded-lg shadow p-6` patterns remain
- [x] All colors reference imports from constants/colors.ts
- [x] Stats cards use Card component
- [x] Chart containers use Card component
- [x] Recent transactions uses Table component
- [x] Loading state uses skeleton instead of spinner

**Implementation Notes:**
- Created `frontend/src/components/skeletons/DashboardSkeleton.tsx` with skeleton layout matching dashboard structure
- Replaced all Card patterns with `Card`, `CardContent`, `CardHeader`, `CardTitle` components
- Replaced Table with `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` components
- Replaced "Upload Statements" button with `Button` component using `asChild` prop for Link
- Replaced "View all" link with `Button variant="link"` component
- Imported `BANK_COLORS` and `CHART_COLORS_HEX` from `@/constants/colors`, removed local definition
- Updated vitest.config.ts to include `@/` path alias for test resolution
- Updated DashboardPage.test.tsx to check for skeleton instead of loading spinner

---

### UI-15: Refactor TransactionsPage to Use Design System
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Largest page with most UI patterns. Export modal has accessibility issues.

**Dependencies:** UI-05, UI-06, UI-07, UI-08, UI-09, UI-11

**Files to Modify:**
- `frontend/src/pages/TransactionsPage.tsx`

**Requirements:**
1. Import Button, Card, Input, Label, Select, Dialog, Table components
2. Replace filter panel container with Card component
3. Replace form inputs with Input/Label components
4. Replace native selects with Select component
5. Replace export modal (lines 624-675) with Dialog component
6. Replace table with Table component
7. Replace pagination buttons with Button component

**Acceptance Criteria:**
- [ ] Filter panel uses Card with form components
- [ ] Form elements use Input/Select/Label components
- [ ] Table uses Table component
- [ ] Modal uses Dialog component with proper accessibility
- [ ] Pagination buttons use Button component

---

### UI-16: Refactor RulesPage to Use Design System
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Delete confirmation is confusing inline pattern. Form needs component updates.

**Dependencies:** UI-05, UI-06, UI-07, UI-08, UI-11, UI-13

**Files to Modify:**
- `frontend/src/pages/RulesPage.tsx`

**Requirements:**
1. Import Button, Card, Input, Label, Select, Table, AlertDialog components
2. Replace add rule form with Card containing Input/Select components
3. Replace rules table with Table component
4. Replace inline delete confirmation (lines 469-496) with AlertDialog
5. Replace action buttons with Button component

**Acceptance Criteria:**
- [ ] Add rule form uses Card with Input/Select components
- [ ] Rules table uses Table component
- [ ] Delete confirmation uses AlertDialog with clear messaging
- [ ] Delete action styled as destructive
- [ ] Action buttons use Button component

---

### UI-17: Refactor UploadPage to Use Design System
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** Drag-drop zone and file list need modernization. Success message styling inconsistent.

**Dependencies:** UI-05, UI-06

**Files to Modify:**
- `frontend/src/pages/UploadPage.tsx`

**Requirements:**
1. Import Button, Card components and cn utility
2. Update drag-drop zone with modern dashed border, use cn() for conditional classes
3. Update success state to use Card with green border/background
4. Replace file list with clean bordered design
5. Replace buttons with Button component

**Acceptance Criteria:**
- [ ] Drag-drop zone has modern dashed border with hover state
- [ ] File list items have clean appearance
- [ ] Success/error states use consistent Card styling
- [ ] Buttons use Button component

---

### UI-18: Update Sidebar Component
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** Sidebar uses hardcoded colors. Could use cn() utility and transitions.

**Dependencies:** UI-02

**Files to Modify:**
- `frontend/src/components/Sidebar.tsx`

**Requirements:**
1. Import cn utility from `@/lib/utils`
2. Use cn() for conditional class combinations
3. Add transition classes for smooth interactions
4. Update mobile overlay to use backdrop-blur-sm

**Acceptance Criteria:**
- [ ] Sidebar uses cn() utility for conditional classes
- [ ] Transitions are smooth (150-300ms)
- [ ] Mobile overlay has backdrop blur
- [ ] Active nav item has clear visual distinction

---

### UI-19: Update DateRangePicker Component
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** DateRangePicker could use Button component for trigger and preset buttons.

**Dependencies:** UI-05, UI-06

**Files to Modify:**
- `frontend/src/components/DateRangePicker.tsx`

**Requirements:**
1. Import Button component and cn utility
2. Replace trigger button with Button variant="outline"
3. Replace preset buttons with Button variant="ghost" or "secondary"
4. Update dropdown panel styling to use rounded-xl and shadow-lg

**Acceptance Criteria:**
- [ ] Trigger uses Button component with outline variant
- [ ] Dropdown panel has rounded corners and shadow
- [ ] Preset buttons use Button ghost/secondary variants

---

## Work Items - Polish & Enhancement

### UI-20: Add Dark Mode Support
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** No dark mode support. All pages only have light theme.

**Dependencies:** UI-02, UI-14, UI-15, UI-16, UI-17

**Files to Create:**
- `frontend/src/contexts/ThemeContext.tsx`

**Files to Modify:**
- `frontend/src/App.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/index.html`

**Requirements:**
1. Create ThemeContext with theme state ('light' | 'dark' | 'system') and localStorage persistence
2. Wrap App with ThemeProvider
3. Add theme toggle button to Sidebar
4. Add inline script to index.html to prevent flash of wrong theme

**Acceptance Criteria:**
- [ ] Dark mode toggle visible in sidebar
- [ ] All pages render correctly in dark mode
- [ ] Charts adapt to dark mode
- [ ] Theme preference persists across sessions
- [ ] No flash of wrong theme on page load

---

### UI-21: Add Loading Skeletons to All Pages
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** Loading states only show spinner, no content preview.

**Dependencies:** UI-12, UI-14, UI-15, UI-16

**Files to Create:**
- `frontend/src/components/skeletons/TransactionTableSkeleton.tsx`
- `frontend/src/components/skeletons/RulesTableSkeleton.tsx`

**Files to Modify:**
- `frontend/src/pages/TransactionsPage.tsx`
- `frontend/src/pages/RulesPage.tsx`

**Requirements:**
1. Create TransactionTableSkeleton showing 5-10 skeleton rows
2. Create RulesTableSkeleton showing 3-5 skeleton rows
3. Replace LoadingSpinner usage with appropriate skeletons in each page

**Acceptance Criteria:**
- [ ] Each page has appropriate loading skeleton
- [ ] Skeletons match layout of loaded content
- [ ] Smooth transition from skeleton to content

---

### UI-22: Add Micro-Interactions and Transitions
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** No animations, UI feels static and dated.

**Dependencies:** UI-05, UI-06, UI-09

**Files to Modify:**
- `frontend/src/index.css`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/card.tsx`

**Requirements:**
1. Add base transition classes to index.css for buttons, links, inputs
2. Add `active:scale-[0.98]` to Button for press feedback
3. Add optional `interactive` variant to Card with hover shadow
4. Ensure table rows have transition-colors on hover

**Acceptance Criteria:**
- [ ] Buttons have smooth hover/press feedback
- [ ] Interactive cards lift slightly on hover
- [ ] Modals fade in smoothly
- [ ] No jarring state changes

---

### UI-23: Improve Chart Styling for Dark Mode
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** Charts use hardcoded colors and don't adapt to dark mode.

**Dependencies:** UI-02, UI-20

**Files to Modify:**
- `frontend/src/pages/DashboardPage.tsx`

**Requirements:**
1. Create useChartTheme hook or utility to detect dark mode
2. Update chart options to use theme-aware text colors, grid colors, tooltip backgrounds
3. Ensure legends and axis labels are readable in both themes

**Acceptance Criteria:**
- [ ] Chart text colors adapt to theme
- [ ] Tooltips styled consistently with design system
- [ ] Legends readable in both themes
- [ ] Grid lines visible but subtle in both themes

---

### UI-24: Responsive Improvements
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** Mobile experience could be improved in several areas.

**Dependencies:** UI-14, UI-15, UI-16, UI-17

**Files to Modify:**
- `frontend/src/pages/TransactionsPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`

**Requirements:**
1. Audit all pages at 320px width
2. Improve filter panel grid stacking on TransactionsPage
3. Ensure modals use `sm:max-w-md` to be mobile-friendly
4. Wrap tables in `overflow-x-auto` container
5. Verify touch targets are at least 44px

**Acceptance Criteria:**
- [ ] All pages usable at 320px width
- [ ] No horizontal scroll on page body
- [ ] Touch targets at least 44px
- [ ] Modals don't overflow on mobile

---

### UI-25: Create Design System Documentation
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** No formal documentation for design decisions beyond CLAUDE.md.

**Dependencies:** UI-01, UI-02, UI-03, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11, UI-12, UI-13

**Files to Create:**
- `DESIGN_SYSTEM.md`

**Requirements:**
1. Document color system with all tokens
2. Document typography scale
3. Document spacing conventions
4. Document each component with usage examples
5. Document accessibility checklist
6. Document dark mode guidelines

**Acceptance Criteria:**
- [ ] All design tokens documented
- [ ] Component usage examples provided
- [ ] Accessibility requirements listed
- [ ] Dark mode guidelines documented

---

### UI-26: Final Verification and Cleanup
**Status:** NOT IMPLEMENTED
**Severity:** HIGH

**Problem:** Need to verify all changes work together correctly.

**Dependencies:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11, UI-12, UI-13, UI-14, UI-15, UI-16, UI-17, UI-18, UI-19, UI-20, UI-21, UI-22, UI-23, UI-24, UI-25

**Requirements:**
1. Run `npm run build` - must complete without errors
2. Run `npm run typecheck` - must complete without errors
3. Run `npm run test` - all tests must pass
4. Run `npm run test:e2e` - all E2E tests must pass
5. Visual verification of all pages in light mode
6. Visual verification of all pages in dark mode
7. Test keyboard navigation (Tab through interactive elements)
8. Test at 320px mobile width
9. Remove any console.log statements added during development
10. Remove any commented-out old code

**Acceptance Criteria:**
- [ ] `npm run build` completes without errors
- [ ] `npm run typecheck` completes without errors
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] All pages work in light mode
- [ ] All pages work in dark mode
- [ ] Keyboard navigation works throughout
- [ ] Mobile layout is usable
- [ ] No debug code remains

---

## Dependency Summary

```
UI-01 (shadcn init) ← Foundation, no dependencies
├── UI-02 (Colors) ← depends on UI-01
│   └── UI-03 (Tailwind) ← depends on UI-02
│       └── UI-04 (CLAUDE.md) ← depends on UI-01, UI-02, UI-03
├── UI-05 (Button) ← depends on UI-01
├── UI-06 (Card) ← depends on UI-01
├── UI-07 (Input/Label) ← depends on UI-01
├── UI-08 (Select) ← depends on UI-01
├── UI-09 (Dialog) ← depends on UI-01
│   └── UI-13 (AlertDialog) ← depends on UI-09
├── UI-10 (Badge) ← depends on UI-01
├── UI-11 (Table) ← depends on UI-01
└── UI-12 (Skeleton) ← depends on UI-01, UI-06

UI-14 (Dashboard) ← depends on UI-05, UI-06, UI-11, UI-12
UI-15 (Transactions) ← depends on UI-05, UI-06, UI-07, UI-08, UI-09, UI-11
UI-16 (Rules) ← depends on UI-05, UI-06, UI-07, UI-08, UI-11, UI-13
UI-17 (Upload) ← depends on UI-05, UI-06
UI-18 (Sidebar) ← depends on UI-02
UI-19 (DateRangePicker) ← depends on UI-05, UI-06

UI-20 (Dark Mode) ← depends on UI-02, UI-14, UI-15, UI-16, UI-17
UI-21 (Skeletons) ← depends on UI-12, UI-14, UI-15, UI-16
UI-22 (Animations) ← depends on UI-05, UI-06, UI-09
UI-23 (Charts) ← depends on UI-02, UI-20
UI-24 (Responsive) ← depends on UI-14, UI-15, UI-16, UI-17
UI-25 (Docs) ← depends on UI-01 through UI-13

UI-26 (Verification) ← depends on ALL above
```
