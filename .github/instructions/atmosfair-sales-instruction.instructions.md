---
applyTo: "**"
---

# atmosfair-sales-instruction Project Instructions

Create and follow a persistent internal understanding of this project’s architecture so that all future suggestions, code edits, and file generations stay consistent with the existing structure and workflow.

The project is a **web-based React/Next.js codebase** that uses a mix of **JS, JSX, TS, and TSX** files. Always analyze and respect the existing patterns, folder structures, and coding conventions already present in the repository.

When generating or modifying code:

- Maintain the **same component structure**, coding style, naming style, import patterns, and file organization already used in the project.
- Never introduce new patterns, abstractions, folder structures, or styling approaches unless explicitly instructed.
- For styling, always **follow the project’s current styling method**. Avoid inventing new classes or styling systems. If styling evolves, only apply the exact approach I specify.
- Ensure UI, code structure, and architectural decisions stay consistent with what is already implemented.

---

## **EDGE FUNCTION STRUCTURE (CRITICAL — MUST ALWAYS FOLLOW)**

Every Supabase Edge Function must follow the same **folder-based code-operation pattern** that already exists in the project.

### **Pattern Description**

Each Edge Function is a **folder**, and inside that folder are multiple `.ts` files representing different operations (authenticate, read, update, host, etc.).

Examples already in the project:

### **Example 1: `manage-organization/`**

Inside this folder you have:

- `authenticate.ts`
- `host.ts`
- `csvImportOrganization.ts`
- `deleteOptions.ts`
- `index.ts`
- `readOptions.ts`
- `routeHandlers.ts`
- `testCsvData.ts`
- `writeOptions.ts`
- `testOptions.ts`
- …etc.

### **Example 2: `manage-profile/`**

Inside this folder you have:

- `authenticate.ts`
- `host.ts`
- `index.ts`
- `readOptions.ts`
- `routeHandlers.ts`
- `updateOptions.ts`
- …etc.

### **RULE:**

Whenever you generate a new Edge Function:

- **NEVER** create multiple folders for different operations.
- **ALWAYS** create **one folder per function**, and place all related operations inside it.
- The folder must include files in this consistent style:

  - `authenticate.ts`
  - `readOptions.ts`
  - `writeOptions.ts` (or update/write variants)
  - `deleteOptions.ts`
  - `host.ts`
  - `routeHandlers.ts`
  - `index.ts`
  - Additional operation files that follow the same naming pattern.

This is the **only correct pattern** for generating new Supabase Edge Functions.

---

## **EDGE FUNCTION URL ROUTING PATTERN (NEW FUNCTIONS — MUST FOLLOW)**

When a domain entity requires multiple operations (CRUD + sub-resources), use **ONE edge function** with internal URL routing. Do **NOT** create separate edge functions per operation (e.g., no `create-super-admin-agents`, `delete-super-admin-agents` — only one `super-admin-agents` function).

### Pattern Example: `super-admin-agents`

Single folder handles all operations:

```
super-admin-agents/
  index.ts              ← entry point, routes by HTTP method + URL path
  cors.ts               ← CORS headers
  authenticate.ts       ← JWT auth + role verification
  routeHandlers.ts      ← URL path parsing and dispatch to operation files
  readOptions.ts        ← all GET operations
  writeOptions.ts       ← all POST / PATCH operations
  deleteOptions.ts      ← all DELETE operations
  organizationOptions.ts ← sub-resource operations (e.g., /{id}/organizations)
```

Routes handled by ONE function:

```
GET    /super-admin-agents                         → list all
POST   /super-admin-agents                         → create
GET    /super-admin-agents/{id}                    → get single
PATCH  /super-admin-agents/{id}                    → update
DELETE /super-admin-agents/{id}                    → delete
GET    /super-admin-agents/{id}/organizations      → list org assignments
POST   /super-admin-agents/{id}/organizations      → replace org assignments
DELETE /super-admin-agents/{id}/organizations/{orgId} → remove single org
```

### Rules:

- **ONE folder per domain entity** — all CRUD + sub-resource routes live inside one edge function folder
- `index.ts` is always the entry point; it calls `routeHandlers.ts` to dispatch
- `routeHandlers.ts` parses the URL path and HTTP method, then delegates to the correct operation file
- Additional sub-resource files follow the `[subResource]Options.ts` naming pattern
- All new SAA-related edge functions are named with the prefix `super-admin-agent(s)`

---

## **SUPABASE WORKFLOW RULES**

The project uses two Supabase systems in parallel:

### **1. `/supabase/functions/`**

- Contains the live, updated versions of all Edge Functions.
- This is where deployable edge functions live.

### **2. `/supabase_codes/edge_functions/`**

- Stores a historical backup version.
- Must always stay synchronized with the live functions.

### **When generating or modifying any Edge Function:**

You must **always** generate two versions:

1. One inside:
   `/supabase/functions/<functionName>/`

2. And the synchronized copy inside:
   `/supabase_codes/edge_functions/<functionName>/`

### **SQL or table updates**

If SQL queries or schema changes are required, update:

- `/supabase_codes/sql_queries/`
- `/supabase_codes/tables/`

---

# Supabase Integration Instructions

The project uses Supabase through **two parallel systems**:

1. **The official Supabase folder**

   - Located at `/supabase`
   - Contains `.temp`, `functions/`, and other Supabase-managed files
   - The `functions/` folder contains the **latest/most updated edge functions**
   - These functions are deployed using CLI commands like `supabase deploy functions <name>`

2. **The legacy backup folder (`supabase_codes/`)**

   - Contains:

     - `edge_functions/` (older but still important references)
     - `sql_queries/`
     - `tables/`

   - This folder exists to preserve the version history of Supabase logic that Supabase itself does not store.

### MANDATORY RULE FOR ANY NEW SUPABASE WORK

Whenever I ask for:

- a new edge function,
- an update to an existing function,
- an SQL query,
- a table definition,
- or modifications to Supabase logic…

You must **ALWAYS generate or update the code in two locations simultaneously**:

1. `/supabase/functions/<function-name>`
2. `/supabase_codes/edge_functions/<function-name>`

If SQL or schema changes are needed, also update:

- `/supabase_codes/sql_queries/`
- `/supabase_codes/tables/` (if relevant)

Always keep both folders synchronized. Never generate only one version.

### GENERAL BEHAVIOR

- Assume full awareness of the entire codebase.
- Remember prior file structures, naming conventions, and architectural patterns.
- Maintain consistency across UI, server logic, and Supabase integration.
- Before generating a solution, reason step-by-step internally to ensure compatibility with the existing system.
- Only use patterns already found in the project unless I explicitly request something new.
- Always follow the existing React/Next.js file structure and component patterns.
- Maintain the project’s current coding style, naming conventions, and folder structures.
- Do not introduce new file/folder structures unless explicitly requested.
- Ensure UI and styling stay consistent with what already exists.
- Reason internally before generating code to ensure full compatibility.
- Use only patterns, utilities, and stylistic conventions already present in the project unless I explicitly instruct otherwise.
