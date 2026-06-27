# Procurement Dashboard

Tracks IT procurement requests from scope review through purchase request (PR), purchase order (PO), and invoicing.

## Workflow stages

`Scope Review → PR Created → PR Approved → PO Issued → Invoiced → Closed`

This is a starting point — stages can be adjusted in `src/lib/types.ts` once the full process is defined.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Data layer: Node's built-in `node:sqlite` (no native build/download step) — file stored at `data/procurement.db`, created and seeded automatically on first run

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. A few sample requests are seeded automatically on first run so the dashboard isn't empty.

## Features

- **Dashboard** (`/`): summary cards (total requests, active requests, total PO value, total invoiced), status breakdown, items needing attention (active for 14+ days without an update), recent activity.
- **Requests** (`/requests`): searchable/filterable table of all requests.
- **Create/Edit** (`/requests/new`, `/requests/[id]`): form covering scope details, PR, PO, and invoice fields, plus delete.

## Data model

See `src/lib/types.ts` for the `ProcurementRequest` shape and `src/lib/repository.ts` for CRUD + dashboard aggregation functions. The whole team can create and edit requests — there's no role/permission separation yet.
