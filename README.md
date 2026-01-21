# DivvyDo

Roommate-first tasks + expenses in one app.

## Current Progress

- Auth + profile: sign up, sign in, password reset, profile update
- Groups: personal + household groups, switcher, rename/leave/delete (admin)
- Tasks: create/edit/delete, status/priority, assignees, filters/search, recurring templates (manual generate)
- Expenses: create/edit/delete, split methods (equal/exact/percentage/shares/adjustment), receipts, recurring templates (manual generate), summary reports (category/payer/month)
- Balances: net + pairwise balances, settlement recording
- Admin tools: invites, placeholders, merge people, CSV exports

## Not Yet Implemented

- Real-time updates
- Notifications (in-app/email)
- Automated recurring generation (cron)

## Getting Started

```bash
npm install
npm run dev
```

## Environment

Create a `.env` file based on `.env.example` with your Supabase keys.

## Database

Supabase schema lives in `supabase/migrations`. Apply migrations using the Supabase CLI.

## Storage

Create a public bucket named `receipts` in Supabase Storage for expense uploads.

## Edge Functions

- `accept-invite` handles invite acceptance, membership creation, and email-only placeholder claims.
- `merge-people` handles admin-only placeholder merges with audit logging.

## Scripts

- `npm run dev` - start the dev server
- `npm run build` - build for production
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint
