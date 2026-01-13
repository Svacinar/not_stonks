# Spending Dashboard Design System

This document provides comprehensive documentation of the design system used in the Spending Dashboard application. It covers color tokens, typography, spacing, components, accessibility, and dark mode guidelines.

## Table of Contents

- [Color System](#color-system)
  - [Semantic Colors](#semantic-colors)
  - [Bank Colors](#bank-colors)
  - [Chart Colors](#chart-colors)
- [Typography](#typography)
- [Spacing](#spacing)
- [Border Radius](#border-radius)
- [Shadows](#shadows)
- [Components](#components)
  - [Button](#button)
  - [Card](#card)
  - [Input](#input)
  - [Label](#label)
  - [Select](#select)
  - [Dialog](#dialog)
  - [AlertDialog](#alertdialog)
  - [Table](#table)
  - [Badge](#badge)
  - [Skeleton](#skeleton)
- [Accessibility](#accessibility)
- [Dark Mode](#dark-mode)

---

## Color System

All colors are defined as CSS custom properties (variables) in `frontend/src/index.css`. Colors use the HSL format without the `hsl()` wrapper, allowing opacity modifiers (e.g., `hsl(var(--primary) / 0.5)`).

### Semantic Colors

These tokens provide consistent theming across light and dark modes.

| Token | Tailwind Class | Light Mode | Dark Mode | Usage |
|-------|---------------|------------|-----------|-------|
| `--background` | `bg-background` | `0 0% 100%` (white) | `222 84% 5%` (dark slate) | Page background |
| `--foreground` | `text-foreground` | `222 84% 5%` | `210 40% 98%` | Primary text |
| `--card` | `bg-card` | `0 0% 100%` | `222 84% 5%` | Card backgrounds |
| `--card-foreground` | `text-card-foreground` | `222 84% 5%` | `210 40% 98%` | Card text |
| `--popover` | `bg-popover` | `0 0% 100%` | `222 84% 5%` | Dropdown/popover backgrounds |
| `--popover-foreground` | `text-popover-foreground` | `222 84% 5%` | `210 40% 98%` | Dropdown/popover text |
| `--primary` | `bg-primary`, `text-primary` | `221 83% 53%` (blue) | `217 91% 60%` | Primary actions, links |
| `--primary-foreground` | `text-primary-foreground` | `210 40% 98%` | `222 84% 5%` | Text on primary backgrounds |
| `--secondary` | `bg-secondary` | `210 40% 96%` | `217 33% 17%` | Secondary elements |
| `--secondary-foreground` | `text-secondary-foreground` | `222 84% 5%` | `210 40% 98%` | Text on secondary backgrounds |
| `--muted` | `bg-muted` | `210 40% 96%` | `217 33% 17%` | Muted backgrounds, disabled states |
| `--muted-foreground` | `text-muted-foreground` | `215 16% 47%` | `215 20% 65%` | Secondary/muted text |
| `--accent` | `bg-accent` | `210 40% 96%` | `217 33% 17%` | Hover states, highlights |
| `--accent-foreground` | `text-accent-foreground` | `222 84% 5%` | `210 40% 98%` | Text on accent backgrounds |
| `--destructive` | `bg-destructive` | `0 84% 60%` (red) | `0 62% 30%` | Delete actions, errors |
| `--destructive-foreground` | `text-destructive-foreground` | `210 40% 98%` | `210 40% 98%` | Text on destructive backgrounds |
| `--border` | `border-border` | `214 32% 91%` | `217 33% 17%` | Default borders |
| `--input` | `border-input` | `214 32% 91%` | `217 33% 17%` | Input borders |
| `--ring` | `ring-ring` | `221 83% 53%` | `224 76% 48%` | Focus rings |
| `--radius` | `rounded-lg` | `0.5rem` | `0.5rem` | Base border radius |

### Bank Colors

Used for identifying transactions by bank source.

| Bank | CSS Variable | Tailwind Class | Hex Value |
|------|-------------|----------------|-----------|
| CSOB | `--bank-csob` | `bg-bank-csob`, `text-bank-csob` | `#005BAC` |
| Raiffeisen | `--bank-raiffeisen` | `bg-bank-raiffeisen`, `text-bank-raiffeisen` | `#FFD100` |
| Revolut | `--bank-revolut` | `bg-bank-revolut`, `text-bank-revolut` | `#0666EB` |

**Usage in code:**

```tsx
import { BANK_COLORS, BANK_COLORS_HSL } from '@/constants/colors'

// For static contexts (charts, etc.)
const color = BANK_COLORS.CSOB  // '#005BAC'

// For theme-aware contexts
const color = BANK_COLORS_HSL.CSOB  // 'hsl(var(--bank-csob))'
```

### Chart Colors

A 12-color palette for data visualizations. Use colors in order for consistency.

| Index | CSS Variable | Light Mode HSL | Description |
|-------|-------------|----------------|-------------|
| 1 | `--chart-1` | `142 76% 36%` | Green |
| 2 | `--chart-2` | `217 91% 60%` | Blue |
| 3 | `--chart-3` | `45 93% 47%` | Amber |
| 4 | `--chart-4` | `262 83% 58%` | Purple |
| 5 | `--chart-5` | `0 84% 60%` | Red |
| 6 | `--chart-6` | `187 85% 43%` | Cyan |
| 7 | `--chart-7` | `215 16% 47%` | Slate |
| 8 | `--chart-8` | `220 9% 46%` | Gray |
| 9 | `--chart-9` | `330 81% 60%` | Pink |
| 10 | `--chart-10` | `172 66% 50%` | Teal |
| 11 | `--chart-11` | `25 95% 53%` | Orange |
| 12 | `--chart-12` | `84 81% 44%` | Lime |

**Usage in code:**

```tsx
import { CHART_COLORS_HEX, CHART_COLORS_HSL } from '@/constants/colors'

// For Chart.js and other libraries requiring hex
const colors = CHART_COLORS_HEX  // ['#22c55e', '#3b82f6', ...]

// For theme-aware CSS-in-JS
const colors = CHART_COLORS_HSL  // ['hsl(var(--chart-1))', ...]
```

---

## Typography

The design system uses Tailwind CSS default typography utilities with the following conventions:

### Font Sizes

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 0.75rem (12px) | 1rem | Badges, small labels |
| `text-sm` | 0.875rem (14px) | 1.25rem | Body text, form labels, table cells |
| `text-base` | 1rem (16px) | 1.5rem | Default body text |
| `text-lg` | 1.125rem (18px) | 1.75rem | Dialog titles, section headers |
| `text-xl` | 1.25rem (20px) | 1.75rem | Page subtitles |
| `text-2xl` | 1.5rem (24px) | 2rem | Card titles |
| `text-3xl` | 1.875rem (30px) | 2.25rem | Page titles |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, table headers |
| `font-semibold` | 600 | Titles, buttons |
| `font-bold` | 700 | Emphasis |

### Common Patterns

```tsx
// Page title
<h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>

// Card title
<CardTitle className="text-2xl font-semibold">Revenue</CardTitle>

// Section header
<h2 className="text-lg font-semibold">Recent Transactions</h2>

// Body text
<p className="text-sm text-muted-foreground">No data available</p>

// Small label
<span className="text-xs font-medium text-muted-foreground">Updated today</span>
```

---

## Spacing

Use Tailwind's default spacing scale consistently throughout the application.

### Scale Reference

| Class | Value | Pixels |
|-------|-------|--------|
| `1` | 0.25rem | 4px |
| `2` | 0.5rem | 8px |
| `3` | 0.75rem | 12px |
| `4` | 1rem | 16px |
| `5` | 1.25rem | 20px |
| `6` | 1.5rem | 24px |
| `8` | 2rem | 32px |
| `10` | 2.5rem | 40px |
| `12` | 3rem | 48px |

### Usage Guidelines

| Context | Recommended | Example |
|---------|-------------|---------|
| Inline element spacing | `gap-2` | Icons next to text |
| Form element spacing | `gap-4`, `space-y-4` | Input groups |
| Section spacing | `gap-6`, `space-y-6` | Between cards |
| Card padding (compact) | `p-4` | Small cards, filter panels |
| Card padding (standard) | `p-6` | Main content cards |
| Page margins | `p-4` (mobile), `p-6` (desktop) | Layout padding |

```tsx
// Form with consistent spacing
<form className="space-y-4">
  <div className="space-y-2">
    <Label>Email</Label>
    <Input type="email" />
  </div>
  <Button>Submit</Button>
</form>

// Card grid with gap
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>
```

---

## Border Radius

Border radius values are derived from the `--radius` CSS variable (default: `0.5rem`).

| Token | Tailwind Class | Value | Usage |
|-------|---------------|-------|-------|
| `lg` | `rounded-lg` | `var(--radius)` (8px) | Default radius |
| `md` | `rounded-md` | `calc(var(--radius) - 2px)` (6px) | Buttons, inputs |
| `sm` | `rounded-sm` | `calc(var(--radius) - 4px)` (4px) | Small elements |
| - | `rounded-xl` | 12px | Cards, modals |
| - | `rounded-full` | 9999px | Badges, pills, avatars |

### Component Conventions

| Component | Border Radius |
|-----------|---------------|
| Cards | `rounded-xl` (12px) |
| Buttons | `rounded-md` (6px) |
| Inputs | `rounded-md` (6px) |
| Badges | `rounded-full` |
| Modals | `rounded-lg` (8px) |
| Dropdowns | `rounded-md` (6px) |

---

## Shadows

Use soft, subtle shadows for depth without harsh edges.

| Class | Usage |
|-------|-------|
| `shadow-sm` | Cards, subtle elevation |
| `shadow-md` | Hover states, interactive cards |
| `shadow-lg` | Modals, dropdowns, popovers |

```tsx
// Default card
<Card className="shadow-sm">...</Card>

// Interactive card with hover
<Card interactive className="shadow-sm hover:shadow-md">...</Card>

// Modal
<DialogContent className="shadow-lg">...</DialogContent>
```

---

## Components

All components are located in `frontend/src/components/ui/` and follow shadcn/ui patterns.

### Button

A versatile button component with multiple variants and sizes.

**Import:**
```tsx
import { Button } from '@/components/ui/button'
```

**Variants:**

| Variant | Usage | Appearance |
|---------|-------|------------|
| `default` | Primary actions | Blue background |
| `secondary` | Secondary actions | Gray background |
| `destructive` | Delete, dangerous actions | Red background |
| `outline` | Tertiary actions | Border only |
| `ghost` | Subtle actions | No background |
| `link` | Navigation links | Underline on hover |

**Sizes:**

| Size | Class | Height |
|------|-------|--------|
| `default` | `h-10 px-4 py-2` | 40px |
| `sm` | `h-9 px-3` | 36px |
| `lg` | `h-11 px-8` | 44px |
| `icon` | `h-10 w-10` | 40x40px |

**Examples:**

```tsx
// Primary action
<Button>Save Changes</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Outline button
<Button variant="outline">Edit</Button>

// Ghost button (icon)
<Button variant="ghost" size="icon">
  <X className="h-4 w-4" />
</Button>

// Link style
<Button variant="link">View all</Button>

// As a link (using asChild)
<Button asChild>
  <Link to="/dashboard">Go to Dashboard</Link>
</Button>

// Loading state
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Saving...
</Button>
```

### Card

A container component for grouping related content.

**Import:**
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
```

**Subcomponents:**

| Component | Purpose |
|-----------|---------|
| `Card` | Container with border, background, shadow |
| `CardHeader` | Title and description container |
| `CardTitle` | Large title text |
| `CardDescription` | Muted description text |
| `CardContent` | Main content area |
| `CardFooter` | Footer with actions |

**Examples:**

```tsx
// Basic card
<Card>
  <CardContent className="pt-6">
    Content here
  </CardContent>
</Card>

// Full card with all sections
<Card>
  <CardHeader>
    <CardTitle>Monthly Revenue</CardTitle>
    <CardDescription>Revenue trends for the past 30 days</CardDescription>
  </CardHeader>
  <CardContent>
    <Chart data={data} />
  </CardContent>
  <CardFooter>
    <Button variant="outline">Export</Button>
  </CardFooter>
</Card>

// Interactive card (clickable)
<Card interactive onClick={handleClick}>
  <CardContent className="pt-6">
    Click me
  </CardContent>
</Card>
```

### Input

A styled text input component.

**Import:**
```tsx
import { Input } from '@/components/ui/input'
```

**Examples:**

```tsx
// Basic input
<Input type="text" placeholder="Enter name" />

// With label
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="email@example.com" />
</div>

// Disabled
<Input disabled placeholder="Disabled input" />

// File input
<Input type="file" />
```

### Label

An accessible label component for form inputs.

**Import:**
```tsx
import { Label } from '@/components/ui/label'
```

**Examples:**

```tsx
// Basic label
<Label htmlFor="name">Name</Label>
<Input id="name" />

// With required indicator
<Label htmlFor="email">
  Email <span className="text-destructive">*</span>
</Label>
```

### Select

A custom dropdown select component built on Radix UI.

**Import:**
```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
```

**Examples:**

```tsx
// Basic select
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="Select category" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="food">Food</SelectItem>
    <SelectItem value="transport">Transport</SelectItem>
    <SelectItem value="utilities">Utilities</SelectItem>
  </SelectContent>
</Select>

// With groups
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select bank" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Czech Banks</SelectLabel>
      <SelectItem value="csob">CSOB</SelectItem>
      <SelectItem value="raiffeisen">Raiffeisen</SelectItem>
    </SelectGroup>
    <SelectGroup>
      <SelectLabel>International</SelectLabel>
      <SelectItem value="revolut">Revolut</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

### Dialog

A modal dialog component with proper accessibility.

**Import:**
```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
```

**Features:**
- Focus trap when open
- Escape key closes the dialog
- Click outside closes the dialog
- Screen reader accessible (role="dialog", aria-labelledby, aria-describedby)

**Examples:**

```tsx
// Controlled dialog
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here.
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      <Input placeholder="Name" />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// With trigger button
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <p>Dialog content goes here.</p>
  </DialogContent>
</Dialog>
```

### AlertDialog

A confirmation dialog for destructive or important actions.

**Import:**
```tsx
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
```

**Features:**
- Cancel button focused by default (prevents accidental destructive actions)
- Cannot be dismissed by clicking outside (requires explicit action)
- Proper ARIA attributes for screen readers

**Examples:**

```tsx
// Delete confirmation
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Rule</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to delete this rule? This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={handleDelete}
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Controlled alert dialog
<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm Action</AlertDialogTitle>
      <AlertDialogDescription>
        This will process all pending transactions.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirm}>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Table

A styled table component for displaying tabular data.

**Import:**
```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table'
```

**Features:**
- Built-in overflow handling (horizontal scroll on small screens)
- Row hover states
- Consistent border and spacing

**Examples:**

```tsx
<Table>
  <TableCaption>List of recent transactions</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Date</TableHead>
      <TableHead>Description</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {transactions.map((tx) => (
      <TableRow key={tx.id}>
        <TableCell>{tx.date}</TableCell>
        <TableCell>{tx.description}</TableCell>
        <TableCell className="text-right">{tx.amount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
  <TableFooter>
    <TableRow>
      <TableCell colSpan={2}>Total</TableCell>
      <TableCell className="text-right">{total}</TableCell>
    </TableRow>
  </TableFooter>
</Table>
```

### Badge

A small label component for status indicators and categories.

**Import:**
```tsx
import { Badge } from '@/components/ui/badge'
```

**Variants:**

| Variant | Usage |
|---------|-------|
| `default` | Primary status |
| `secondary` | Neutral status |
| `destructive` | Error/warning status |
| `outline` | Subtle indicator |

**Examples:**

```tsx
// Default badge
<Badge>Active</Badge>

// Secondary badge
<Badge variant="secondary">Pending</Badge>

// Destructive badge
<Badge variant="destructive">Failed</Badge>

// Outline badge
<Badge variant="outline">Draft</Badge>

// With custom color (category indicator)
<Badge
  className="border-transparent"
  style={{ backgroundColor: categoryColor }}
>
  {categoryName}
</Badge>
```

### Skeleton

A placeholder component for loading states.

**Import:**
```tsx
import { Skeleton } from '@/components/ui/skeleton'
```

**Prebuilt Skeletons:**
```tsx
import { CardSkeleton } from '@/components/skeletons/CardSkeleton'
import { TableRowSkeleton } from '@/components/skeletons/TableRowSkeleton'
```

**Examples:**

```tsx
// Basic skeleton
<Skeleton className="h-4 w-32" />

// Avatar skeleton
<Skeleton className="h-12 w-12 rounded-full" />

// Card skeleton
<CardSkeleton showHeader showDescription />

// Table loading state
<TableBody>
  {[...Array(5)].map((_, i) => (
    <TableRowSkeleton key={i} columnCount={4} />
  ))}
</TableBody>

// Custom skeleton composition
<div className="space-y-3">
  <Skeleton className="h-8 w-48" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
</div>
```

---

## Accessibility

### Requirements Checklist

All components and pages must meet these accessibility requirements:

- [ ] **Labels:** All form inputs have associated `<Label>` elements with matching `htmlFor`/`id` attributes
- [ ] **Focus States:** All interactive elements have visible focus rings (using `focus-visible:ring-2`)
- [ ] **Keyboard Navigation:** Tab order is logical, Enter/Space activate buttons and links
- [ ] **ARIA Attributes:** Modals use `role="dialog"`, alerts use `role="alert"`
- [ ] **Color Contrast:** Minimum WCAG AA compliance (4.5:1 ratio for normal text)
- [ ] **Focus Trap:** Modals trap focus while open
- [ ] **Touch Targets:** Interactive elements are at least 44x44px on mobile

### Focus Ring Pattern

All interactive elements use this focus ring pattern:

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

### Screen Reader Text

Use `sr-only` for visually hidden but accessible text:

```tsx
<button>
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</button>
```

### ARIA Labels

Provide descriptive labels for complex components:

```tsx
// Loading state
<div aria-busy="true" aria-live="polite">
  <Skeleton />
</div>

// Icon-only button
<Button size="icon" aria-label="Delete transaction">
  <Trash2 className="h-4 w-4" />
</Button>
```

---

## Dark Mode

### How It Works

Dark mode is implemented using:

1. **CSS Variables:** Color tokens defined in `:root` (light) and `.dark` (dark) selectors
2. **Class-based Toggle:** Tailwind's `darkMode: ["class"]` configuration
3. **ThemeContext:** React context for theme state management
4. **localStorage:** Theme preference persistence

### Theme Provider

The application is wrapped with `ThemeProvider`:

```tsx
// In App.tsx
import { ThemeProvider } from '@/contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
```

### Using Theme in Components

```tsx
import { useTheme } from '@/contexts/ThemeContext'

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  // theme: 'light' | 'dark' | 'system'
  // resolvedTheme: 'light' | 'dark' (actual applied theme)

  return (
    <button onClick={() => setTheme('dark')}>
      Enable Dark Mode
    </button>
  )
}
```

### Guidelines for Dark Mode Support

1. **Use semantic color tokens** instead of hardcoded colors:
   ```tsx
   // Good
   className="bg-background text-foreground"

   // Bad
   className="bg-white text-gray-900"
   ```

2. **Use design system classes** for all color needs:
   ```tsx
   // Good
   className="text-muted-foreground border-border"

   // Bad
   className="text-gray-500 border-gray-200"
   ```

3. **Test both themes** after any styling changes

4. **Charts and visualizations** should use theme-aware colors:
   ```tsx
   import { useChartTheme } from '@/hooks/useChartTheme'

   function Chart() {
     const { getDefaultOptions, colors } = useChartTheme()
     // Use getDefaultOptions() for chart configuration
   }
   ```

### Flash Prevention

An inline script in `index.html` applies the theme class before React hydrates, preventing flash of wrong theme:

```html
<script>
  (function() {
    const stored = localStorage.getItem('spending-dashboard-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'dark' || (stored === 'system' && prefersDark) || (!stored && prefersDark);
    if (theme) document.documentElement.classList.add('dark');
  })();
</script>
```

---

## File Structure

```
frontend/src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   │   ├── alert-dialog.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── skeleton.tsx
│   │   └── table.tsx
│   └── skeletons/             # Loading skeleton compositions
│       ├── CardSkeleton.tsx
│       ├── DashboardSkeleton.tsx
│       ├── RulesTableSkeleton.tsx
│       ├── TableRowSkeleton.tsx
│       └── TransactionTableSkeleton.tsx
├── constants/
│   └── colors.ts              # Color constants for JS usage
├── contexts/
│   └── ThemeContext.tsx       # Dark mode provider
├── hooks/
│   └── useChartTheme.ts       # Theme-aware chart configuration
├── lib/
│   └── utils.ts               # cn() utility function
└── index.css                  # CSS variables and base styles
```

---

## Utility Functions

### cn() - Class Name Merger

Combines Tailwind classes with proper conflict resolution:

```tsx
import { cn } from '@/lib/utils'

// Basic usage
cn('px-4 py-2', 'bg-primary')
// => 'px-4 py-2 bg-primary'

// Conditional classes
cn('px-4', isActive && 'bg-primary', isDisabled && 'opacity-50')
// => 'px-4 bg-primary' (if isActive=true, isDisabled=false)

// Override conflicts (last wins)
cn('px-4', 'px-6')
// => 'px-6'

// With className prop
function MyComponent({ className }) {
  return <div className={cn('base-styles', className)} />
}
```
