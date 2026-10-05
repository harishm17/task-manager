# DivvyDo: Roommate Expense Manager

Expense splitting, balances, and shared tasks for households. React and TypeScript on the front end, Supabase (Postgres, Auth, Storage, Edge Functions) on the back end.

## Status

- **`main` currently has a known build error.** `src/contexts/RealtimeContext.tsx` imports `useGroupContext` from `GroupContext`, which only exports `useGroups`. `npm run build` (`tsc -b && vite build`) fails until that is fixed (the same build also has four other TypeScript errors).
- **CI is red** for the same reason, plus an outdated workflow (Node 18 with Vite 7, and a `tsc --noEmit` step that checks nothing because the root `tsconfig.json` has `"files": []`).
- The unit and component tests pass locally (25 files, 74 tests with `npx vitest run`), but most component tests mock the API layer, so they do not exercise the database policies, the edge functions, or the realtime provider.

---

## Features

### Expenses and splitting

Five split methods, all stored in integer cents (`amount_cents INTEGER CHECK (amount_cents > 0)`):

1. **Equal**: split evenly; any leftover cents go to the first people in the list (e.g. $100.00 across 3 people is $33.34, $33.33, $33.33)
2. **Exact**: specify an amount per person; the total must match the expense
3. **Percentage**: percentages must sum to 100
4. **Shares**: weight-based (e.g. 2 shares vs 1 share)
5. **Adjustment** (labelled "Reimburse" in the UI): one person owes the full amount to the payer

Percentage and shares splits use largest-remainder rounding: amounts are rounded down to whole cents, and the remaining cents go to the people with the largest fractional parts (ties broken deterministically by person id), so the splits always sum to the expense total. The logic is in `src/lib/api/expenses.ts`.

Other expense features:
- Receipt upload to a Supabase Storage bucket named `receipts`
- Expense categories
- Recurring expense templates, generated on demand from the UI
- CSV export of expenses, settlements, balances, and tasks

### Balances and settlements
- Net balance per person and pairwise balances, computed in `src/lib/api/balances.ts` from expenses, splits, and settlements
- Settlement recording

### Groups and people
- Personal and household groups, with a group switcher
- Admin and member roles; admins can rename or delete a group
- Token-based invitations with an expiry date (7 days by default), accepted through the `accept-invite` edge function
- Placeholder people (for example, someone added by name before they sign up) and a `merge-people` edge function that combines duplicates and writes an audit record

### Tasks
- Create, edit, and delete tasks with assignee, status (`todo`, `in_progress`, `completed`), and priority
- Filters and search
- Recurring task templates

### In-app notifications
A notification center backed by browser local storage. The `send-notification-email` edge function is a stub: it logs the email it would send, and the email provider call is commented out.

---

## Architecture

**Front end**: React 19, TypeScript, Vite 7, React Router, TanStack Query, React Hook Form, Tailwind CSS. Tests use Vitest and React Testing Library.

**Back end** (all under `supabase/`):
- Postgres schema in `migrations/`: `users`, `groups`, `group_members`, `group_people`, `expenses`, `expense_splits`, `settlements`, `invitations`, `tasks`, `recurring_expenses`, `recurring_tasks`, `expense_categories`, and others
- Row-level security enabled on the tables, with `SECURITY DEFINER` helper functions for membership and admin checks
- Edge functions in `functions/`: `accept-invite`, `merge-people`, `generate-recurring`, `send-notification-email`

**Realtime**: `RealtimeContext` and `useRealtimeSubscription` subscribe to Supabase Realtime changes. This is the code that currently breaks the build (see Status).

---

## Getting Started

### Prerequisites
- Node.js 20+ and npm
- A Supabase project

### Install and configure

```bash
git clone https://github.com/harishm17/task-manager.git
cd task-manager
npm install
cp .env.example .env
```

Set these in `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database

```bash
npm install -g supabase
supabase link --project-ref your-project-ref
supabase db push
```

The migrations do not create the receipts bucket. In the Supabase dashboard, create a Storage bucket named `receipts` (the code reads public URLs from it) and add storage policies.

### Edge functions

```bash
supabase functions deploy accept-invite
supabase functions deploy merge-people
```

`generate-recurring` and `send-notification-email` are also in `supabase/functions/` but are not called from the front end.

### Run

```bash
npm run dev
```

Open `http://localhost:5173`.

---

## Testing

```bash
npm test          # Vitest in watch mode
npm run test:run  # single run
```

Tests live in `src/__tests__/`. Logic tests (`balances.test.ts`, `expense-splits.test.ts`, `recurring.test.ts`, `exports.test.ts`) cover the split, balance, recurrence, and export code directly. The remaining files are React Testing Library component tests with the API layer mocked. There are no tests for the SQL policies or edge functions.

## Scripts

```bash
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build (currently failing, see Status)
npm run preview    # Preview a build
npm run lint       # ESLint
npm run test       # Vitest (watch)
npm run test:run   # Vitest (single run)
npm run seed:demo  # Seed demo data (scripts/seed-demo-data.ts)
```

---

## Deployment

The repo includes a multi-stage `Dockerfile` (Node build, then nginx), `deploy.sh` for Google Cloud Run, `cloudbuild.yaml`, and a `netlify.toml`. Because the build currently fails on `main`, none of these paths will produce an image or bundle until the build error is fixed.

### Google Cloud Run

Requires the gcloud CLI, Docker, and a GCP project.

```bash
gcloud config set project YOUR_PROJECT_ID
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export VITE_SUPABASE_ANON_KEY="your-anon-key"
./deploy.sh
```

`deploy.sh` builds the image, pushes it to Google Container Registry, and deploys to Cloud Run (512Mi memory, 1 CPU, 0 to 10 instances). The container injects the Supabase variables at startup (`docker-entrypoint.sh`), and nginx serves a `/health` endpoint.

To test the container locally:

```bash
cp .env.example .env   # fill in your Supabase values
./deploy-local.sh      # http://localhost:8080, health check at /health
```

### Netlify

Connect the repository, set the two environment variables, use `npm run build` as the build command and `dist` as the publish directory.

---

## Not implemented

- Automated (scheduled) recurring generation: it runs only on demand from the UI
- Sending notification emails
- Budgets

---

## License

No license file is currently included in this repository.

## Author

**Harish Manoharan**
- GitHub: [@harishm17](https://github.com/harishm17)
- LinkedIn: [linkedin.com/in/harishm17](https://linkedin.com/in/harishm17)
- Email: harish_manoharan@outlook.com
- Portfolio: [harishm17.github.io](https://harishm17.github.io)
