# Project Instructions

## Project Overview
**atmosfair-sales-management** — A Next.js sales management web app for tracking transactions, stoves, partners, and admin operations.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **UI**: Tailwind CSS, Radix UI, shadcn/ui (`components.json`)
- **Backend**: Supabase (auth + database)
- **Charts**: Recharts
- **PDF/Export**: jsPDF, html2canvas
- **Icons**: Lucide React, React Icons

## Project Structure
```
src/
  app/        # Next.js App Router pages and layouts
  components/ # Reusable UI components
  lib/        # Supabase client and utility libraries
  types/      # TypeScript type definitions
  utils/      # Helper functions
```

## Key Conventions
- Use the **App Router** (`src/app/`) — no Pages Router
- Components go in `src/components/`, grouped by feature
- Use **Supabase** for all data fetching — avoid direct API calls outside of `src/lib/`
- Prefer **server components** unless interactivity requires `"use client"`
- Use **Tailwind** for styling — avoid inline styles
- Follow existing shadcn/ui patterns for new UI components

## Commands
```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run lint      # Run ESLint
npm run prod      # Build + start production
```

## Do Not
- Do not create new markdown documentation files unless explicitly asked
- Do not modify `supabase/` migration files without confirmation
- Do not add new dependencies without asking first

---

## Detailed Instructions

These files contain the full rules for this project. Read and follow them for every task:

- **Architecture & Supabase rules**: [.github/instructions/atmosfair-sales-instruction.instructions.md](.github/instructions/atmosfair-sales-instruction.instructions.md)
  - Edge Function folder structure
  - Dual-location rule (`/supabase/functions/` + `/supabase_codes/edge_functions/`)
  - SQL/schema update locations
  - General coding and consistency rules

- **UI design patterns**: [.github/instructions/stove-id-management-ui-patterns.instructions.md](.github/instructions/stove-id-management-ui-patterns.instructions.md)
  - Color scheme (`#07376a`, `bg-brand`, `bg-brand-light`)
  - Filter section layout and organization search pattern
  - Statistics cards, table headers, alternating rows
  - Loading states, typography, spacing, and responsive behavior
