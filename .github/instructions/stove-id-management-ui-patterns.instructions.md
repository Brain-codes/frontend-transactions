---
applyTo: "**"
---

# Stove ID Management UI Design Patterns

This document serves as a reference guide for the UI design patterns established in the Stove ID Management page. Use these patterns to maintain consistency across all similar pages in the application.

---

## **Color Scheme**

### Primary Brand Color

- **Color Code**: `#07376a`
- **Usage**: Primary buttons, table headers, important CTAs
- **Tailwind Class**: `bg-brand`

### Light Blue Background (Accent)

- **Color Code**: `#EFF6FF`
- **Usage**: Filter sections, search bars, accent backgrounds
- **Tailwind Class**: `bg-brand-light`
- **Defined in**: `tailwind.config.mjs` → `brand.light`

### Border Color

- **Color**: Gray-200
- **Tailwind Class**: `border-gray-200`
- **Usage**: All bordered containers (filters, cards, tables, search bars)

---

## **Layout Patterns**

### Main Background

- **Background**: Pure white (`bg-white`)
- **Applied to**: DashboardLayout and all main content areas
- **Previously**: Gray background (`bg-gray-50`) - REMOVED

### Page Structure Order

1. **Page Header** (Title only, no subtitle)
2. **Filters Section** (includes organization search as first field)
3. **Statistics Cards**
4. **Table Controls**
5. **Data Table**
6. **Pagination**

---

## **Filter Section Pattern**

### Container Styling

```jsx
<div className="bg-brand-light p-4 rounded-lg border border-gray-200">
  <div className="flex flex-wrap items-center gap-4">
    {/* Filter fields here */}
  </div>
</div>
```

### Key Features

- **Background**: Light blue (`bg-brand-light`)
- **Padding**: `p-4`
- **Border**: `border border-gray-200`
- **Rounded corners**: `rounded-lg`
- **Layout**: Inline flex wrap (all filters on same line when possible)

### Filter Fields

- **Organization search width**: `flex-1 min-w-[200px]` (first field in filter row)
- **Other field width**: `flex-1 min-w-[150px]`
- **Input background**: White (`bg-white`)
- **No labels**: Use placeholders instead
- **Placeholders**: Simple text (e.g., "Search organizations...", "Stove ID", "Branch", "Status")
- **Auto-apply**: Filters apply automatically on change (no Apply button needed)

### Organization Search Inside Filters

```jsx
{
  /* Organization Search */
}
<div className="flex-1 min-w-[200px]" ref={orgDropdownRef}>
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
    <Input
      placeholder="Search organizations..."
      value={orgSearch}
      onChange={(e) => {
        setOrgSearch(e.target.value);
        fetchOrganizations(e.target.value);
        setOpenOrgPopover(true);
      }}
      onFocus={() => setOpenOrgPopover(true)}
      className="pl-9 bg-white"
    />
  </div>
  {openOrgPopover && (
    <div className="absolute z-50 min-w-[200px] max-w-[300px] mt-2 bg-white rounded-md border border-gray-200 shadow-md max-h-64 overflow-y-auto">
      {/* Dropdown content */}
    </div>
  )}
</div>;
```

**Key Features**:

- First field in filter row
- Dropdown width: `min-w-[200px] max-w-[300px]` for responsive behavior
- Search icon positioned at `left-3`
- Opens on focus or typing
- Closes on click outside using ref

### Selected Organization Badge

```jsx
{
  /* Selected Organization Badge */
}
{
  selectedOrgIds.length > 0 && (
    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md border border-gray-200">
      <Building2 className="h-4 w-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-900">
        {getSelectedOrgName()}
      </span>
      <button
        onClick={() => {
          handleSelectOrganization([]);
          setOrgSearch("");
        }}
        className="ml-1 text-gray-400 hover:text-gray-600"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
```

**Badge Pattern**:

- Displays after other filter fields in the same row
- White background with border
- Building icon + organization name
- Individual X button to clear just the organization
- Badge appears in filter row, not below search input

### Clear Filters Button

```jsx
{
  /* Clear Filters Button */
}
{
  hasActiveFilters && (
    <div>
      <Button onClick={handleClearFilters} size="sm" variant="outline">
        <X className="h-4 w-4 mr-2" />
        Clear
      </Button>
    </div>
  );
}
```

**Button Pattern**:

- Size: `sm`
- Variant: `outline` (not filled)
- Icon: 16px (`h-4 w-4`) with `mr-2` spacing
- Only shows when filters or organization is selected
- Clears both regular filters AND organization selection

---

## **Statistics Cards Pattern**

### Container Layout

```jsx
<div className="flex gap-4">{/* Cards here */}</div>
```

### Individual Card

```jsx
<Card className="w-fit">
  <CardContent className="p-4">
    {loadingStats ? (
      <div className="flex items-center justify-center h-16 w-48">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    ) : (
      <div className="flex items-center gap-4">
        <div className="bg-purple-100 p-3 rounded-full">
          <Package className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Card Label</p>
          <p className="text-2xl font-bold text-purple-600">
            {stats.value.toLocaleString()}
          </p>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

### Key Features

- **Card width**: `w-fit` (content-based, not full width)
- **No shadows**: Cards have no shadow (removed from Card component)
- **Left-aligned**: Use `flex gap-4` on container
- **Icon position**: Left side with circular background
- **Icon size**: `h-6 w-6`
- **Icon background**: `p-3 rounded-full`
- **Number formatting**: Use `.toLocaleString()` for thousands separator

### Card Color Scheme (Standard Order)

1. **Total/Received**: Purple (`bg-purple-100`, `text-purple-600`)
2. **Sold/Completed**: Blue (`bg-blue-100`, `text-blue-600`)
3. **Available/Active**: Green (`bg-green-100`, `text-green-600`)

### Icons by Type

- **Total/Inventory**: `Package` icon
- **Completed/Success**: `CheckCircle` icon
- **Active/Available**: `Package` icon

---

## **Data Table Pattern**

### Container Styling

```jsx
<div className="bg-white rounded-lg border border-gray-200 relative overflow-hidden">
  {/* Loading overlay */}
  <Table>{/* Table content */}</Table>
</div>
```

### Key Features

- **Rounded corners**: `rounded-lg`
- **Overflow**: `overflow-hidden` (makes rounded corners visible)
- **Border**: `border border-gray-200`

### Table Header

```jsx
<TableHeader className="bg-brand">
  <TableRow className="hover:bg-brand">
    <TableHead className="text-white py-4 first:rounded-tl-lg">
      Column 1
    </TableHead>
    <TableHead className="text-white py-4">Column 2</TableHead>
    <TableHead className="text-center text-white py-4 last:rounded-tr-lg">
      Actions
    </TableHead>
  </TableRow>
</TableHeader>
```

**Styling**:

- **Background**: `bg-brand` (primary color)
- **Text color**: `text-white`
- **Vertical padding**: `py-4`
- **First column**: `first:rounded-tl-lg` (top-left rounded)
- **Last column**: `last:rounded-tr-lg` (top-right rounded)
- **No hover effect**: `hover:bg-brand` (same as background)

### Table Rows (Alternating Colors)

```jsx
stoveIds.map((stove, index) => (
  <TableRow
    key={stove.id}
    className={`${
      index % 2 === 0 ? "bg-white" : "bg-brand-light"
    } hover:bg-gray-50`}
  >
    {/* Table cells */}
  </TableRow>
));
```

**Pattern**:

- **Even rows (0, 2, 4...)**: White (`bg-white`)
- **Odd rows (1, 3, 5...)**: Light blue (`bg-brand-light`)
- **Hover**: `hover:bg-gray-50` (same for all rows)

### Action Buttons in Table

```jsx
<TableCell className="text-center">
  <Button
    size="sm"
    onClick={() => handleAction(item.id)}
    disabled={loadingItemId === item.id}
    className="bg-brand hover:bg-brand/90"
  >
    {loadingItemId === item.id ? (
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
    ) : null}
    View Details
  </Button>
</TableCell>
```

**Button Pattern**:

- **Size**: `sm`
- **Styling**: Same as filter buttons (`bg-brand hover:bg-brand/90`)
- **Loading state**: Show spinner before text
- **No icon buttons**: Use text buttons instead

---

## **General UI Principles**

### Borders

- **All containers**: Use `border border-gray-200`
- **Never borderless**: Filters, cards, search bars, tables all have borders

### Spacing

- **Section gaps**: `space-y-6` on main container
- **Card gaps**: `gap-4` between cards
- **Filter field gaps**: `gap-4` between fields

### Rounded Corners

- **Standard**: `rounded-lg` for all containers
- **Tables**: Apply `overflow-hidden` to show rounded corners with colored headers

### Loading States

- **Icon**: `Loader2` with `animate-spin`
- **Size**: `h-4 w-4` for inline, `h-5 w-5` for larger areas
- **Color**: `text-gray-400` for neutral loading states
- **Position**: Show spinner in place of content (not as overlay unless specified)

### Typography

- **Page titles**: `text-2xl font-bold text-gray-900`
- **Card labels**: `text-sm text-gray-600`
- **Card values**: `text-2xl font-bold text-[color]-600`
- **Table text**: `text-sm` for body cells
- **No descriptions**: Remove subtitle/description text under page titles

### Icons

- **Standard size**: `h-4 w-4` for inline icons
- **Card icons**: `h-6 w-6`
- **Icon imports**: From `lucide-react`

---

## **Responsive Behavior**

### Organization Search Dropdown

- **Width**: `min-w-[200px] max-w-[300px]` (prevents excessive expansion)
- **Position**: First field inside filter container
- **All screens**: Part of filter flex-wrap layout

### Filters

- **All screens**: `flex-wrap` with `min-w-[200px]` for organization search, `min-w-[150px]` for other fields
- Fields wrap to new lines on smaller screens
- Organization badge and Clear button wrap when needed

### Cards

- **All screens**: Horizontal layout with `flex gap-4`
- Cards stay left-aligned, don't spread across width

---

## **Component Removal Patterns**

### What Was Removed

1. **Gray backgrounds**: Changed to pure white (`bg-white`)
2. **Card shadows**: Removed from Card component for cleaner look
3. **Sidebar for organization selection**: Replaced with inline search inside filter box
4. **Separate organization search section**: Moved inside filter container as first field
5. **Apply Filters button**: Removed, filters now auto-apply on change
6. **Page subtitles/descriptions**: Only show main title
7. **Icon-only action buttons**: Replaced with text buttons
8. **Tooltips on table actions**: Removed, use descriptive button text
9. **Labels on filter fields**: Removed, use placeholders only
10. **Filter section icon**: Removed thumbnail/filter icon from filter header
11. **Selected text under search**: Replaced with badge in filter row

### Command/Popover Components

- **Not used**: Built custom dropdown with native HTML/React instead
- **Reason**: Better control over behavior and styling
- **Pattern**: Use `<Input>` with absolute positioned dropdown div

---

## **Code Patterns to Follow**

### Import Pattern

```jsx
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Search,
  X,
  Package,
  CheckCircle,
  Building2,
} from "lucide-react";
```

### State Management Pattern

```jsx
const [orgSearch, setOrgSearch] = useState("");
const [openOrgPopover, setOpenOrgPopover] = useState(false);
const [loadingOrgs, setLoadingOrgs] = useState(false);
const orgDropdownRef = useRef(null);

// Close dropdown on click outside
useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      orgDropdownRef.current &&
      !orgDropdownRef.current.contains(event.target)
    ) {
      setOpenOrgPopover(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

// Auto-apply filter handler
const handleFilterChange = (field, value) => {
  const newFilters = { ...filters, [field]: value };
  setFilters(newFilters);
  // Auto-apply filters
  fetchStoveIds(1, pagination.page_size, newFilters);
};

// Clear filters (includes organization)
const handleClearFilters = () => {
  const clearedFilters = {
    stove_id: "",
    status: "",
    branch: "",
    state: "",
    date_from: "",
    date_to: "",
  };
  setFilters(clearedFilters);
  handleSelectOrganization([]);
  setOrgSearch("");
  fetchStoveIds(1, pagination.page_size, clearedFilters);
};

// Check if any filters are active (including organization)
const hasActiveFilters =
  Object.values(filters).some((value) => value !== "") ||
  selectedOrgIds.length > 0;
```

---

## **Quick Reference Checklist**

When applying these patterns to a new page:

- [ ] Main background is pure white
- [ ] Cards have no shadows
- [ ] Filters have light blue background with border
- [ ] Filter fields are inline with no labels (placeholders only)
- [ ] Organization search is first field inside filter box (not separate)
- [ ] Organization dropdown width: min-w-[200px] max-w-[300px]
- [ ] Selected organization displays as badge with clear button
- [ ] Filters auto-apply on change (no Apply button)
- [ ] Clear button clears both filters and organization
- [ ] Statistics cards are fit-width and left-aligned
- [ ] Cards follow color scheme: Purple → Blue → Green
- [ ] Table has rounded corners with overflow-hidden
- [ ] Table header has primary brand color with white text and py-4
- [ ] Table rows alternate: white and light blue
- [ ] Action buttons use text, not icons
- [ ] Primary action buttons use bg-brand styling
- [ ] Clear/secondary buttons use variant="outline"
- [ ] Loading states use Loader2 spinner
- [ ] All containers have border-gray-200
- [ ] No page subtitles/descriptions

---

## **File References**

- **Main implementation**: `src/app/stove-management/page.jsx`
- **Tailwind config**: `tailwind.config.mjs` (brand.light color defined here)
- **Layout component**: `src/app/components/DashboardLayout.tsx` (white background)
- **UI components**: `src/components/ui/` (button, input, card, table)

---

_This document was created from the Stove ID Management UI redesign completed on January 19, 2026._
