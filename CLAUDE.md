# Spending Dashboard - AI Assistant Context

This document provides design system context for AI assistants working on the codebase. **Read this file before making any UI changes.**

## Project Overview

Personal finance dashboard for analyzing bank statements from CSOB, Raiffeisen, and Revolut with keyword-based categorization.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + SQLite (better-sqlite3)
- Testing: Vitest (unit) + Playwright (E2E)

## Design System: shadcn/ui

We use **shadcn/ui** - a collection of copy-paste components built on Radix UI primitives with Tailwind CSS styling.

**Key Principle:** Components are copied into `frontend/src/components/ui/` - they are owned code, not npm dependencies.

### Component Import Pattern
```tsx
// Correct - import from local ui folder
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Wrong - do not import from shadcn/ui npm package
import { Button } from 'shadcn/ui'  // NO!
```

### Utility Function
Always use the `cn()` utility for conditional classes:
```tsx
import { cn } from '@/lib/utils'

<div className={cn('base-class', condition && 'conditional-class')} />
```

## Color Tokens

All colors are defined as CSS variables in `frontend/src/index.css`. Use Tailwind classes that reference these tokens.

**Design Aesthetic:** Luxury Swiss Private Bank — Emerald & Gold palette, Satoshi geometric font, dark-default theme with warm ivory light mode.

### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--background` | `37 29% 94%` (warm ivory) | `220 28% 6%` (deep blue-black) | Page background |
| `--foreground` | `0 0% 10%` | `30 12% 88%` (warm off-white) | Primary text |
| `--card` | `0 0% 100%` | `220 22% 10%` | Card background |
| `--card-foreground` | `0 0% 10%` | `30 12% 88%` | Card text |
| `--popover` | `0 0% 100%` | `220 22% 10%` | Popover/dropdown background |
| `--popover-foreground` | `0 0% 10%` | `30 12% 88%` | Popover/dropdown text |
| `--primary` | `153 41% 30%` (deep emerald) | `153 41% 30%` | Primary actions |
| `--primary-foreground` | `37 29% 94%` | `30 12% 88%` | Text on primary |
| `--secondary` | `37 20% 90%` | `220 18% 14%` | Secondary elements |
| `--secondary-foreground` | `0 0% 10%` | `30 12% 88%` | Text on secondary |
| `--muted` | `37 20% 90%` | `220 18% 14%` | Muted backgrounds |
| `--muted-foreground` | `30 3% 41%` | `220 4% 50%` | Secondary text |
| `--accent` | `37 20% 90%` | `220 18% 14%` | Hover states |
| `--accent-foreground` | `0 0% 10%` | `30 12% 88%` | Text on accent |
| `--destructive` | `0 55% 39%` | `0 55% 39%` | Delete, errors |
| `--destructive-foreground` | `37 29% 94%` | `30 12% 88%` | Text on destructive |
| `--gold` | `44 52% 54%` | `44 52% 54%` | Gold highlights, accents |
| `--gold-muted` | `44 38% 40%` | `44 38% 40%` | Subdued gold |
| `--border` | `30 5% 85%` | `220 10% 16%` | Borders |
| `--input` | `30 5% 85%` | `220 10% 16%` | Input borders |
| `--ring` | `153 41% 30%` (emerald) | `44 52% 54%` (gold) | Focus rings |
| `--radius` | `0.5rem` | `0.5rem` | Base border radius |

### Bank Colors

| Bank | Color | Tailwind Class |
|------|-------|----------------|
| CSOB | `#005BAC` | `text-bank-csob`, `bg-bank-csob` |
| Raiffeisen | `#FFD100` | `text-bank-raiffeisen`, `bg-bank-raiffeisen` |
| Revolut | `#0666EB` | `text-bank-revolut`, `bg-bank-revolut` |

### Chart Color Palette

Desaturated jewel tones. Use these colors in order for charts:
```typescript
const chartColors = [
  'hsl(var(--chart-1))',  // deep emerald
  'hsl(var(--chart-2))',  // slate blue
  'hsl(var(--chart-3))',  // gold
  'hsl(var(--chart-4))',  // dusty rose
  'hsl(var(--chart-5))',  // sage
  'hsl(var(--chart-6))',  // muted purple
  'hsl(var(--chart-7))',  // dark goldenrod
  'hsl(var(--chart-8))',  // muted teal
  'hsl(var(--chart-9))',  // sienna
  'hsl(var(--chart-10))', // slate gray
  'hsl(var(--chart-11))', // dark sea green
  'hsl(var(--chart-12))', // peru
]
```

## Component Patterns

### Button Variants
```tsx
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link Style</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconComponent /></Button>

// Loading state
<Button disabled={isLoading}>
  {isLoading && <LoadingSpinner className="mr-2 h-4 w-4" />}
  Save
</Button>
```

### Card Pattern
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    Optional footer with actions
  </CardFooter>
</Card>
```

### Form Input Pattern
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="email@example.com" />
</div>
```

### Table Pattern
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.value1}</TableCell>
        <TableCell>{item.value2}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Dialog (Modal) Pattern
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Modal</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>
        Optional description text
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      Modal body content
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Alert Dialog (Confirmation) Pattern
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Styling Conventions

### Spacing Scale
Use Tailwind's default spacing scale consistently:
- `gap-2` (8px) - Tight spacing (inline elements)
- `gap-4` (16px) - Default spacing (form elements, list items)
- `gap-6` (24px) - Section spacing
- `p-4` (16px) - Card padding (small cards)
- `p-6` (24px) - Card padding (default)

### Border Radius
- Cards/containers: `rounded-xl` (12px)
- Buttons/inputs: `rounded-md` (6px)
- Badges/pills: `rounded-full`

### Shadows
Minimal shadow usage — rely on borders and subtle color for depth:
- Cards: No shadows (use `border` only)
- Modals/dropdowns: `shadow-lg`

### Typography Conventions
- Font: Satoshi (loaded via Fontshare CDN)
- Hero numbers / stat values: `text-4xl font-black`, with `dark:text-gold` and `[font-variant-numeric:tabular-nums]`
- Labels / meta text: `text-[11px] uppercase tracking-[0.12em] font-light`
- Page titles: `text-3xl font-light` with a gold rule divider below
- Body text: default weight (400)

### Transitions
All interactive elements should have transitions:
```tsx
// Buttons, links
className="transition-colors duration-150"

// Cards
className="transition-colors duration-200"

// Modal/dropdown entry
className="transition-all duration-200"
```

### Gold Accent Pattern
Use gold sparingly for highlights:
```tsx
// Active sidebar item
className="border-l-2 border-l-gold text-gold"

// Stat card values in dark mode
className="dark:text-gold"

// Decorative dividers
<div className="h-px bg-gradient-to-r from-gold/40 to-transparent" />
```

### Dark Mode
Dark mode is the default. All components must support both modes. Use `dark:` prefix:
```tsx
<div className="bg-card dark:bg-card text-foreground dark:text-foreground">
```

## File Structure

```
frontend/src/
├── components/
│   ├── ui/                    # shadcn/ui components (owned)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   └── skeleton.tsx
│   ├── skeletons/             # Loading skeleton compositions
│   │   ├── CardSkeleton.tsx
│   │   └── TableRowSkeleton.tsx
│   ├── DateRangePicker.tsx    # Custom component
│   ├── Sidebar.tsx            # Navigation
│   ├── Toast.tsx              # Notifications
│   └── ...
├── contexts/
│   └── ThemeContext.tsx       # Dark mode provider
├── lib/
│   └── utils.ts               # cn() utility
├── constants/
│   └── colors.ts              # Bank colors, chart palette
├── pages/
│   ├── DashboardPage.tsx
│   ├── TransactionsPage.tsx
│   ├── UploadPage.tsx
│   └── RulesPage.tsx
└── index.css                  # CSS variables, Tailwind directives
```

## Accessibility Requirements

**MUST follow these rules:**

1. **Labels:** All form inputs must have associated `<label>` elements
2. **Focus States:** All interactive elements must have visible focus rings
3. **Keyboard Navigation:** Tab order must be logical, Enter/Space must work
4. **ARIA:** Modals use `role="dialog"`, alerts use `role="alert"`
5. **Color Contrast:** Minimum WCAG AA compliance (4.5:1 for text)
6. **Focus Trap:** Modals must trap focus while open

## Common Commands

```bash
# Development
npm run dev              # Start frontend + backend

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run Playwright E2E tests

# Build
npm run build            # Production build

# Type checking
npm run typecheck        # TypeScript validation
```

## Important Notes

- **NEVER** use browser `alert()` - use Toast notifications instead
- **NEVER** hardcode hex colors - use CSS variables via Tailwind classes
- **ALWAYS** use the Button component instead of raw `<button>` elements
- **ALWAYS** use the Card component instead of `<div className="bg-white rounded-lg shadow...">`
- **ALWAYS** add `transition-*` classes to interactive elements
- **ALWAYS** test changes in both light and dark mode
