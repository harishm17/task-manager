# Technical Review & Implementation Strategy
## Roommate Task + Expense Management App

**Document Type:** Technical Architecture & Implementation Decisions
**Pairs With:** `product-plan.md`
**Purpose:** Critical analysis, technical decisions, and actionable roadmap
**Author:** Technical Review (Claude)
**Date:** January 4, 2026
**Status:** Implementation in progress

---

## Executive Summary

This document provides a **critical technical review** of the original 44-week plan and proposes a **leaner, validated approach** to building a roommate-focused task + expense management app.

### Key Decisions Made

✅ **Target Audience:** Roommates-first (for MVP). Families can also use it as a shared household group (same feature set).
✅ **Backend:** Supabase (PostgreSQL + Auth + Storage + Row-Level Security)
✅ **Real-time Sync:** SKIP WebSockets for MVP. Use polling (React Query refetch every 10s).
✅ **Mobile Strategy:** Progressive Web App (PWA) first. Native apps only if traction proves demand.
✅ **Offline Mode:** SKIP for MVP. Add in v2 if users request.
✅ **Timeline:** 10-week MVP → Launch → Iterate based on feedback
✅ **Feature Scope:** Cut 70% of Phase 2B features. Build based on user demand, not speculation.
✅ **Private-first Tasks:** Every user starts in a private Personal space; shared tasks/expenses live in household groups.

### Critical Concerns Addressed

🚨 **Biggest Risk:** Building features nobody wants. **Mitigation:** Launch minimal MVP, measure usage, build what users actually ask for.
🚨 **Second Risk:** Competing with Splitwise's network effects. **Mitigation:** Target roommates who DON'T use Splitwise yet (new apartments, younger users, international students).
🚨 **Third Risk:** Complexity creep. **Mitigation:** Ruthless scope cuts, deferring 80% of "nice-to-have" features.

---

## Current Build Snapshot (Repo)

**Status:** Core MVP Implemented. Validation Phase.

**Implemented**
- **Backend:** Supabase schema + RPCs + RLS policies active. Edge functions for invites/merges.
- **Frontend:** React + Vite + Tailwind + shadcn/ui.
- **State/Sync:** React Query with 10s polling (verified in `App.tsx`).
- **Features:** Tasks, Expenses (with complex splits logic on frontend), Balances (calculated on frontend/backend), Settings.
- **Components:** `TaskList` and `ExpenseList` handle creation/editing/listing inline.

**Open Gaps vs Plan**
- **Notifications:** Placeholder UI only; no backend wiring.
- **Automated Recurring:** No cron triggers set up yet (DB tables exist).
- **PWA:** Service worker registration not yet visible in `main.tsx`.
- **UI Refinement:** Header "Create" buttons are static; creation happens in inline forms within the list components.

---

## 1. Strategic Positioning (Refined)

### Original Plan Issues

The original plan tried to serve two audiences (families + roommates) with distinct features:
- Family-specific: Gamification, points, parent/child roles
- Roommate-specific: Expense splitting, shopping lists, lease management, maintenance, house wiki

**Problem:** This creates two apps in one, increasing complexity 3x.

### New Positioning

**"The coordination app for roommate households"**

**Core Value Proposition:**
> "Tasks + expenses in one place. No more switching between Splitwise and group chats."

**Target User:**
- College students (18-24) in shared apartments/dorms
- Young professionals (24-32) in urban roommate situations
- 3-6 people per household
- 6-12 month lease cycles
- Tech-savvy, mobile-first

**Why This Works:**
1. **Singular focus** = clearer product, simpler onboarding
2. **Incidental family use**: A household is a household; families can use the same group features
3. **Clearer marketing** ("Built for roommates" without splitting the product)

---

## 2. Technical Architecture (Simplified)

### 2.1 Technology Stack (Final Decisions)

#### Frontend
```
Framework:        React 18+ with TypeScript
Build Tool:       Vite
Styling:          TailwindCSS + shadcn/ui components
State Management: Zustand (lightweight, simpler than Redux)
Data Fetching:    TanStack Query (React Query v5)
Forms:            React Hook Form + Zod validation
Routing:          React Router v6
Date/Time:        date-fns
Icons:            Lucide React
Charts:           Recharts (for expense reports in Phase 2)
```

**Why these choices:**
- **Zustand over Jotai/Redux**: Simpler API, less boilerplate, perfect for this scope
- **TanStack Query**: Built-in polling, cache management, optimistic updates
- **Vite**: 10x faster than CRA, hot reload is instant
- **shadcn/ui**: Copy-paste components, full control, no package bloat

#### Backend
```
Platform:     Supabase (managed PostgreSQL + Auth + Storage)
Database:     PostgreSQL 15+
Auth:         Supabase Auth (email/password, magic links)
Storage:      Supabase Storage (receipts, photos)
Real-time:    DEFERRED - Use polling for MVP
Functions:    Supabase Edge Functions (Deno) for cron jobs
```

**Why Supabase:**
- **Speed:** Auth + database + storage out of the box = save 2-3 weeks
- **Row-Level Security (RLS):** Perfect for multi-tenant (each household is isolated)
- **Free tier:** 500MB database, 1GB storage, 2GB bandwidth (enough for 100-200 users)
- **Real-time option:** Can enable later if needed, no rewrite required
- **Postgres:** Best relational DB, JSONB support, strong typing

**Why NOT custom Node.js backend:**
- Adds 2-3 weeks of development time (auth, file upload, migrations)
- Requires separate hosting (Railway/Render = $7-20/month)
- More maintenance burden (security patches, backups)
- Supabase handles all of this

#### Infrastructure
```
Web Hosting:  Vercel (free tier: unlimited bandwidth, global CDN)
Database:     Supabase (free tier → Pro $25/month when needed)
Monitoring:   Sentry (error tracking), Vercel Analytics (page views)
CI/CD:        GitHub Actions (test + deploy on push)
```

### 2.2 Database Schema (Simplified)

**Key Change from Original Plan:** Remove workspace abstraction. Use groups directly.

**Additional MVP Decision:** Use a **Personal group** for private tasks and one or more **Household groups** for shared tasks/expenses.
On signup, auto-create:
- Personal group
- group_members row (user → personal group)
- group_people row (user → personal group)

**Switching/Adoption MVP Decision (Critical):** Support **unclaimed household members** (placeholders) so one person can start tracking expenses immediately, then roommates can “claim” themselves later.
Claiming is email-only auto-match (server-side). Admins can also merge placeholders into claimed people to fix duplicates.

#### Simplified Schema

```sql
-- Users (managed by Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups (Personal or Household)
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('personal', 'household')),
  default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group Members (many-to-many)
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Group People (participants in tasks/expenses)
-- Purpose: allow "unclaimed" members to exist in a household before they sign up.
-- A household can have people with or without linked auth users.
-- Deletion policy: never hard-delete if referenced; archive instead.
CREATE TABLE group_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255), -- optional; auto-claim is email-only
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(group_id, id)
);

-- Prevent duplicate claimed people
CREATE UNIQUE INDEX uniq_group_people_user
  ON group_people(group_id, user_id)
  WHERE user_id IS NOT NULL;

-- Prevent duplicate emails (used for auto-claim)
CREATE UNIQUE INDEX uniq_group_people_email
  ON group_people(group_id, lower(email))
  WHERE email IS NOT NULL AND is_archived = FALSE;

-- Merge audit log (admin-only, server-side)
CREATE TABLE people_merge_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  source_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL,
  target_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL,
  merged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  moved_counts JSONB NOT NULL, -- {tasks: X, expenses: Y, splits: Z, settlements: W}
  merged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_group ON tasks(group_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to_person_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Recurring Task Templates (simplified)
CREATE TABLE recurring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  interval INTEGER DEFAULT 1, -- every X days/weeks/months
  assigned_to_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL,
  next_occurrence DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Categories
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10), -- emoji
  color VARCHAR(20), -- hex color
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO expense_categories (name, icon, color, is_default) VALUES
  ('Rent', '🏠', '#A855F7', true),
  ('Utilities', '⚡', '#3B82F6', true),
  ('Internet', '🌐', '#06B6D4', true),
  ('Groceries', '🛒', '#10B981', true),
  ('Household', '🧹', '#F97316', true),
  ('Food/Dining', '🍕', '#EF4444', true),
  ('Transport', '🚗', '#6366F1', true),
  ('Entertainment', '🎬', '#EC4899', true),
  ('Other', '📦', '#6B7280', true);

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  paid_by_person_id UUID NOT NULL REFERENCES group_people(id) ON DELETE RESTRICT,
  expense_date DATE NOT NULL,
  split_method VARCHAR(50) NOT NULL DEFAULT 'equal' CHECK (split_method IN ('equal', 'exact', 'percentage', 'shares', 'adjustment')),
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_expenses_paid_by_person ON expenses(paid_by_person_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- Expense Splits (who owes what for each expense)
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  person_id UUID REFERENCES group_people(id) ON DELETE CASCADE,
  amount_owed_cents INTEGER NOT NULL CHECK (amount_owed_cents >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, person_id)
);

CREATE INDEX idx_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_splits_person ON expense_splits(person_id);

-- Settlements (payments between users)
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  from_person_id UUID REFERENCES group_people(id) ON DELETE RESTRICT,
  to_person_id UUID REFERENCES group_people(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(50), -- Cash, Venmo, Zelle, etc.
  notes TEXT,
  settled_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  CHECK(from_person_id != to_person_id)
);

CREATE INDEX idx_settlements_group ON settlements(group_id);
CREATE INDEX idx_settlements_from ON settlements(from_person_id);
CREATE INDEX idx_settlements_to ON settlements(to_person_id);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  email VARCHAR(255), -- optional: bind invite to an email; otherwise treat token as the gate
  invited_by UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
```

#### Balance Calculation (Materialized View for Performance)

```sql
-- Create a function to calculate net balances between users in a group.
-- Ledger model:
--   debts = expense_splits (participants owing the payer)
--   payments = settlements (money already transferred)
-- NOTE: Use integer cents to avoid rounding bugs in application code.
CREATE OR REPLACE FUNCTION calculate_balances(p_group_id UUID)
RETURNS TABLE (
  from_person_id UUID,
  to_person_id UUID,
  net_cents INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH expense_debts AS (
    -- What each person owes from expenses (participant -> payer)
    SELECT
      es.person_id AS debtor_id,
      e.paid_by_person_id AS creditor_id,
      SUM(es.amount_owed_cents)::INTEGER AS amount_cents
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE e.group_id = p_group_id
      AND e.is_deleted = FALSE
      AND es.person_id != e.paid_by_person_id
    GROUP BY es.person_id, e.paid_by_person_id
  ),
  settlement_payments AS (
    -- Payments already made (debtor -> creditor)
    SELECT
      s.from_person_id AS debtor_id,
      s.to_person_id AS creditor_id,
      SUM(s.amount_cents)::INTEGER AS amount_cents
    FROM settlements s
    WHERE s.group_id = p_group_id
    GROUP BY s.from_person_id, s.to_person_id
  )
  SELECT
    COALESCE(ed.debtor_id, sp.debtor_id) AS from_person_id,
    COALESCE(ed.creditor_id, sp.creditor_id) AS to_person_id,
    (COALESCE(ed.amount_cents, 0) - COALESCE(sp.amount_cents, 0))::INTEGER AS net_cents
  FROM expense_debts ed
  FULL OUTER JOIN settlement_payments sp
    ON ed.debtor_id = sp.debtor_id
    AND ed.creditor_id = sp.creditor_id
  WHERE (COALESCE(ed.amount_cents, 0) - COALESCE(sp.amount_cents, 0)) != 0;
END;
$$ LANGUAGE plpgsql;
```

### 2.3 Row-Level Security (RLS) Policies

**Critical for multi-tenant security.** Users can only access data from groups they belong to.

```sql
-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_merge_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Groups: Users can only see groups they're members of
CREATE POLICY "Users can view their groups"
  ON groups FOR SELECT
  USING (is_group_member(id));

-- Group Members: Users can view members of their groups
CREATE POLICY "Users can view group members"
  ON group_members FOR SELECT
  USING (is_group_member(group_id));

-- Group People: Users can view people in their groups
CREATE POLICY "Users can view group people"
  ON group_people FOR SELECT
  USING (is_group_member(group_id));

-- Group People: Users can create unclaimed people in household groups
CREATE POLICY "Users can create group people in household groups"
  ON group_people FOR INSERT
  WITH CHECK (
    is_group_member(group_id)
    AND EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.type = 'household')
  );

-- Claiming a placeholder should be done via an Edge Function using service role,
-- which verifies an invite token and email-only match before setting user_id.
-- Invite acceptance should be handled by an Edge Function (e.g. accept-invite),
-- which creates group_members, claims by email if possible, or inserts a new person.
-- Merging placeholders should also be handled server-side (service role):
-- 1) pick source_person_id (unclaimed) + target_person_id (claimed)
-- 2) re-point tasks/expenses/splits/settlements to target
-- 3) archive source_person_id
-- 4) write people_merge_audit entry
-- A merge-people Edge Function should enforce admin-only access and merge logic.

-- Merge Audit: admins can view; inserts happen via service role only
CREATE POLICY "Admins can view merge audit"
  ON people_merge_audit FOR SELECT
  USING (is_group_admin(group_id));

-- Tasks: Users can view/edit tasks in their groups
CREATE POLICY "Users can view tasks in their groups"
  ON tasks FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "Users can create tasks in their groups"
  ON tasks FOR INSERT
  WITH CHECK (
    is_group_member(group_id)
    AND (
      assigned_to_person_id IS NULL
      OR EXISTS (
        SELECT 1 FROM group_people gp
        WHERE gp.id = assigned_to_person_id AND gp.group_id = group_id
      )
    )
  );

CREATE POLICY "Users can update tasks in their groups"
  ON tasks FOR UPDATE
  USING (is_group_member(group_id))
  WITH CHECK (
    is_group_member(group_id)
    AND (
      assigned_to_person_id IS NULL
      OR EXISTS (
        SELECT 1 FROM group_people gp
        WHERE gp.id = assigned_to_person_id AND gp.group_id = group_id
      )
    )
  );

CREATE POLICY "Users can delete tasks they created (or admin)"
  ON tasks FOR DELETE
  USING (created_by = auth.uid() OR is_group_admin(group_id));

-- Expenses: Similar policies
CREATE POLICY "Users can view expenses in their groups"
  ON expenses FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "Users can create expenses in their groups"
  ON expenses FOR INSERT
  WITH CHECK (
    is_group_member(group_id)
    AND EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.type = 'household')
    AND EXISTS (SELECT 1 FROM group_people gp WHERE gp.id = paid_by_person_id AND gp.group_id = group_id)
  );

CREATE POLICY "Users can update expenses they created"
  ON expenses FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (
    EXISTS (SELECT 1 FROM group_people gp WHERE gp.id = paid_by_person_id AND gp.group_id = group_id)
  );

-- Expense Splits: Users can view splits for expenses in their groups
CREATE POLICY "Users can view splits for their group expenses"
  ON expense_splits FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses e WHERE is_group_member(e.group_id)
    )
  );

CREATE POLICY "Users can create splits for their group expenses"
  ON expense_splits FOR INSERT
  WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses e WHERE is_group_member(e.group_id)
    )
    AND EXISTS (
      SELECT 1
      FROM expenses e
      JOIN group_people gp ON gp.id = person_id
      WHERE e.id = expense_id AND gp.group_id = e.group_id
    )
  );

-- Expense Categories: Read-only for clients (seeded defaults)
CREATE POLICY "Users can view expense categories"
  ON expense_categories FOR SELECT
  USING (true);

-- Settlements: Users can view settlements in their groups
CREATE POLICY "Users can view settlements in their groups"
  ON settlements FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "Users can create settlements in their groups"
  ON settlements FOR INSERT
  WITH CHECK (
    is_group_member(group_id)
    AND EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.type = 'household')
    AND from_person_id = (
      SELECT gp.id
      FROM group_people gp
      WHERE gp.group_id = group_id AND gp.user_id = auth.uid()
      LIMIT 1
    )
    AND EXISTS (SELECT 1 FROM group_people gp WHERE gp.id = to_person_id AND gp.group_id = group_id)
  );

-- Invitations: members can view; admins can create. Accepting an invite by token should happen via an Edge Function.
CREATE POLICY "Users can view invitations (group members)"
  ON invitations FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (is_group_admin(group_id) AND invited_by = auth.uid());
```

### 2.4 Real-Time Sync Strategy (DEFERRED)

**Decision: Skip WebSocket for MVP. Use polling.**

#### Why Skip Real-Time for MVP?

1. **Complexity:** WebSocket connections, reconnection logic, channel management, subscription cleanup = 1-2 weeks extra work
2. **Debugging:** Real-time bugs are harder to reproduce and fix
3. **Scaling:** WebSocket connections have limits (100 per channel on Supabase free tier)
4. **User Impact:** For this use case, 10-second polling is FINE. Users don't need instant updates.

#### Polling Implementation (React Query)

```typescript
// hooks/useExpenses.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useExpenses(groupId: string) {
  return useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          paid_by_person:group_people!expenses_paid_by_person_id(*),
          expense_splits(*, person:group_people(*)),
          expense_categories(*)
        `)
        .eq('group_id', groupId)
        .eq('is_deleted', false)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}
```

**When to add real-time:** If users explicitly complain "I don't see updates fast enough" (unlikely), enable Supabase Realtime in Phase 2.

### 2.5 Mobile Strategy: PWA First

**Decision: Build Progressive Web App (PWA), not React Native.**

#### Why PWA over Native Apps?

| Feature | PWA | React Native |
|---------|-----|--------------|
| Development time | 0 weeks (same codebase) | +8-12 weeks |
| App Store approval | Not needed | Required (can be rejected) |
| Updates | Instant (deploy + refresh) | App Store review (3-7 days) |
| Offline support | Service Workers | Complex sync layer |
| Install friction | Add to Home Screen (1 tap) | App Store download |
| Push notifications | Web Push API (works on Android, limited iOS) | Full support |
| Camera access | Yes (getUserMedia API) | Yes |
| File upload | Yes | Yes |
| Distribution cost | $0 | $99/year (Apple) + $25 (Google) |

**PWA Capabilities (Modern Browsers):**
- ✅ Install to home screen (looks like native app)
- ✅ Offline mode (Service Workers + IndexedDB)
- ✅ Push notifications (Android Chrome, Edge, Firefox. iOS Safari = limited)
- ✅ Camera access (receipt scanning)
- ✅ File uploads
- ✅ Background sync

**When to build native apps:** If PWA proves traction (1000+ active users) AND users explicitly request App Store presence.

#### PWA Implementation Checklist

```json
// public/manifest.json
{
  "name": "DivvyDo - Roommate Task & Expense Manager",
  "short_name": "DivvyDo",
  "description": "Tasks + expenses for roommates in one app",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3B82F6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

```typescript
// src/registerServiceWorker.ts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

---

## 3. Feature Scope (Ruthless Cuts)

### 3.1 MVP Features (10 Weeks)

**ONLY build these for initial launch:**

#### Core (Must Have)
- [x] User authentication (email/password; magic link optional)
- [x] Password reset (email link)
- [x] Private Personal space (default) for tasks
- [x] Create/join household groups (roommates-first; families can also use)
- [x] Invite members via shareable link / code (email optional for auto-claim)
- [x] Unclaimed household members (placeholders) for tasks + expenses
- [x] Admin merge: placeholder → claimed person (audit log, archive)
- [x] **Tasks:** Create, assign, status, due dates, priority, delete (default to Personal)
- [x] **Expenses:** Create, delete, amount, paid by, category, date
- [x] **Expense splits:** Equal, exact, percent, shares, adjustment
- [x] **Balance dashboard:** Who owes whom, net balances
- [x] **Settlements:** Record payments; balances computed from expenses minus settlements (no per-split settle state)
- [x] Dashboard (your tasks, your balance, upcoming)
- [x] Mobile-responsive design

#### Polish (Should Have)
- [x] Receipt upload (photos/PDFs)
- [x] Expense filtering (by category, person, date)
- [x] Task filtering (by status, assignee)
- [x] Search (tasks, expenses)
- [x] Export (CSV) for tasks + expenses + settlements + balances
- [x] Simple recurring tasks (weekly/monthly)
- [x] User profiles (name, avatar)
- [x] Group settings (rename, leave)
- [x] Member role management (promote/demote, at least one admin)

### 3.2 Phase 2 Features (Post-Launch, Based on Demand)

**DO NOT build until users ask for them:**

#### Phase 2A: Enhanced Core (Weeks 11-14)
- [x] Recurring expenses (manual generate; cron later)
- [x] Advanced expense splits (percentages, shares, adjustment)
- [x] Expense reports (by category, by person, monthly summary)
- [ ] Export (CSV, PDF)

#### Phase 2B: Power Features (Weeks 15-18)
- [ ] Task comments
- [ ] Task dependencies
- [ ] Kanban board view
- [ ] Calendar view
- [ ] Bulk actions

#### Phase 2C: Roommate-Specific (Only if Requested)
- [ ] Shopping lists
- [ ] Notifications (in-app, email)

### 3.3 Cut Entirely (Unless Explicit User Demand)

**DO NOT build these unless 50+ users ask:**

- ❌ Supply inventory (toilet paper tracking)
- ❌ Cleaning rotation automation
- ❌ Utilities tracking (month-over-month comparison)
- ❌ Maintenance issue tracker
- ❌ House wiki
- ❌ Move-in/move-out checklists
- ❌ Lease management
- ❌ Gamification (points, leaderboards)
- ❌ Timeline/Gantt view
- ❌ Task templates
- ❌ Projects
- ❌ Debt simplification algorithm

**Reasoning:** These are speculative features. Build them ONLY if user interviews or analytics show clear demand.

---

## 4. Implementation Roadmap (10 Weeks)

### Week 1-2: Foundation
**Goal:** Auth + database + basic UI working

- [x] Set up project (Vite + React + TypeScript + TailwindCSS)
- [x] Configure Supabase project
- [x] Run database migrations (schema from section 2.2)
- [x] Set up RLS policies
- [x] Implement authentication
  - [x] Sign up (email + password)
  - [x] Login
  - [ ] Magic link login (optional)
  - [x] Password reset
  - [x] Auth state persistence
- [x] Create base layout (navbar, sidebar for desktop, bottom nav for mobile)
- [x] Set up React Query
- [x] Set up routing (React Router)
- [ ] Deploy to Vercel (CI/CD pipeline)

**Deliverable:** User can sign up, log in, and land in their private Personal tasks.

---

### Week 3-4: Groups + Tasks
**Goal:** Users can create groups, invite members, create tasks

- [x] **Groups:**
  - [x] Create household group (name)
  - [x] Add unclaimed members (name-only placeholders)
  - [x] Invite members (shareable link/code; optional email for auto-claim)
  - [x] Accept invitation (join group)
  - [x] Claim flow: email-only auto-match; no manual list
  - [x] Admin merge (audit log + archive placeholder)
  - [x] View group members
  - [x] Leave group
  - [x] Delete group (admin only)
- [x] **Tasks:**
  - [x] Create task (defaults to Personal; can select household group)
  - [x] Task list view (filter by status, assignee, search)
  - [x] Task detail panel (inline view/edit)
  - [x] Update task status (todo → in progress → completed)
  - [x] Delete task
  - [x] Mark task complete (quick action)
- [x] **Dashboard:**
  - [x] Tasks due today
  - [x] Overdue tasks
  - [x] Your assigned tasks
  - [x] Recent activity (tasks + expenses + settlements)

**Deliverable:** Users can coordinate tasks as a household.

---

### Week 5-6: Expenses + Splits
**Goal:** Users can track expenses and see who owes whom

- [x] **Expenses:**
  - [x] Create expense form
    - [x] Amount, description, category, date
    - [x] Paid by (dropdown of group people: claimed + unclaimed)
    - [x] Split with (multi-select of group people; includes payer optionally)
    - [x] Equal split calculation or custom exact amounts
  - [x] Expense list view
    - [x] Show all expenses for group
    - [x] Filter by category, person, date range
    - [x] Search expenses
  - [x] Expense detail modal
    - [x] Full breakdown (who paid, who owes how much)
    - [x] Edit expense (if you created it)
    - [x] Delete expense (soft delete)
- [x] **Receipt uploads:**
  - [x] Add receipt_url field to expense form
  - [x] Upload to Supabase Storage
  - [x] Display receipt in expense detail (image preview, PDF link)

**Deliverable:** Users can track shared expenses.

---

### Week 7-8: Balances + Settlements
**Goal:** Users can see who owes whom and settle debts

- [x] **Balance dashboard:**
  - [x] Calculate balances using `calculate_balances()` function
  - [x] Display "You owe" section (list of people, amounts)
  - [x] Display "You are owed" section
  - [x] Net balance summary (overall: owe $X or owed $X)
  - [x] Breakdown on click (expense + settlement line items)
- [x] **Settlements:**
  - [x] "Settle Up" button next to each balance
  - [x] Settlement form (amount, payment method, date, note)
  - [x] Record settlement in database
  - [x] Settlement history view
- [x] **Expense split logic:**
  - [x] When expense created, generate expense_splits rows
  - [x] Equal split: divide `amount_cents` across participants, remainder assigned deterministically
  - [x] Exact split: validate sum equals `amount_cents`
  - [x] Payer can be a participant; debts are recorded only for participants where `person_id != paid_by_person_id`

**Deliverable:** Users can see balances and record settlements that reduce balances.

---

### Week 9-10: Polish + Launch Prep
**Goal:** Bug fixes, mobile optimization, deployment

- [ ] **Mobile responsiveness:**
  - [ ] Test all screens on mobile (iPhone SE, Pixel 5)
  - [ ] Optimize task list for mobile (swipe actions?)
  - [ ] Optimize expense form for mobile
  - [x] Bottom navigation for mobile
- [ ] **UI polish:**
- [ ] Loading states (skeletons)
  - [x] Empty states (no tasks, no expenses)
  - [ ] Error handling (toast notifications)
  - [ ] Optimistic updates (instant feedback)
- [ ] **Performance:**
  - [ ] Lazy load routes
  - [ ] Image optimization (compress avatars, receipts)
  - [ ] Query pagination (if expense list > 100 items)
- [ ] **Testing:**
  - [x] Write unit tests for balance calculation
  - [ ] E2E tests (Playwright) for critical flows:
    - [ ] Sign up → create group → invite member → create task
    - [ ] Add expense → verify balance updates
    - [ ] Settle debt → verify balance clears
  - [ ] Manual QA (5-10 beta testers)
- [ ] **Launch prep:**
  - [ ] Write privacy policy (required for data collection)
  - [ ] Write terms of service
  - [ ] Create landing page (explain value prop, signup)
  - [ ] Set up analytics (Vercel Analytics, Sentry)
  - [ ] Prepare launch announcement (ProductHunt, Reddit)
  - [x] Add CSV export (expenses, settlements, balances)

**Deliverable:** Shippable MVP.

---

## 5. Critical Technical Concerns

### 5.1 Balance Calculation Edge Cases

**Problem:** Money math is unforgiving. Bugs create real-world disputes.

#### Edge Case 1: Rounding Errors
```
Expense: $100, split 3 ways
User A owes: $33.33
User B owes: $33.33
User C owes: $33.33
Total: $99.99 ❌ (missing $0.01)
```

**Solution:** Last person in split absorbs remainder.
```typescript
function calculateEqualSplitCents(amountCents: number, participantCount: number): number[] {
  const base = Math.floor(amountCents / participantCount);
  const remainder = amountCents - base * participantCount;
  const splits = Array(participantCount).fill(base);
  splits[splits.length - 1] += remainder;
  return splits; // sums exactly to amountCents
}
```

#### Edge Case 2: Payer in Participants
```
Expense: $100 groceries, paid by Alice
Participants: Alice, Bob, Charlie
Split: $33.33 each
Alice owes herself $33.33? ❌
```

**Solution:** Allow the payer to be a participant, but only record debts from participant → payer when `participant != payer`.
```typescript
// Participants = people who benefited (may include payer).
// Create splits for all participants (including payer), but debts are derived from:
//   participant_owed_to_payer = split for participant where participant.id !== paid_by_person_id
```

#### Edge Case 3: Partial Settlements
```
User owes $100 total:
  - $60 from Expense A
  - $40 from Expense B
User settles $80. Which expenses get marked settled?
```

**Two approaches:**
1. **Proportional:** Mark both as partially settled (A: $48 settled, B: $32 settled)
2. **Chronological:** Settle oldest expenses first (A: fully settled, B: $20 settled)

**MVP Decision:** Don't mark individual expense_splits as settled. Settlement is a separate payment record. Balances are calculated dynamically.

#### Edge Case 4: Deleted Expenses
```
1. Alice adds $100 expense, Bob owes $50
2. Bob sees balance: owes Alice $50
3. Alice deletes expense (is_deleted = true)
4. Bob's balance should go to $0
```

**Solution:** Balance calculation filters `WHERE e.is_deleted = FALSE`

#### Edge Case 5: Concurrent Expense Additions
```
Time T1: Alice adds $100 expense, Bob owes $50
Time T2: Charlie adds $80 expense, Bob owes $40
Both hit database simultaneously.
Bob's balance should be: $90
```

**Solution:** PostgreSQL handles this correctly with ACID transactions. No special handling needed.

### 5.2 Invitation System Security

**Problem:** Email invitations can be exploited.

#### Attack Vector 1: Invitation Token Leakage
```
Attacker finds invitation link in browser history, joins household
```

**Mitigation:**
- Generate cryptographically secure random token (UUID v4)
- Set expiration (7 days)
- One-time use (mark as `accepted` after use)
- Optionally: Require invited user's email to match invitation

#### Attack Vector 2: Email Spoofing
```
Attacker invites victim's email to malicious group, phishing attack
```

**Mitigation:**
- Invitation emails clearly show WHO invited you and TO WHICH group
- User can decline invitation
- Groups can't be renamed to impersonate (no "Your Bank - Account Recovery" groups)

### 5.3 Row-Level Security (RLS) Testing

**Problem:** RLS misconfiguration can leak data between households.

#### Test Scenarios (Critical)
1. **User A cannot see User B's personal group tasks**
2. **User A cannot see Group X expenses if not a member**
3. **User A can only delete tasks they created**
4. **User A cannot update expenses created by User B**
5. **Admin can delete group, member cannot**

**Implementation:**
```typescript
// test/rls.test.ts
describe('Row-Level Security', () => {
  it('prevents cross-group data leakage', async () => {
    const userA = await createTestUser('alice@example.com');
    const userB = await createTestUser('bob@example.com');
    const groupA = await createGroup(userA, 'Alice Group');
    const groupB = await createGroup(userB, 'Bob Group');

    await createTask(groupA.id, userA, 'Secret task');

    // Try to read groupA tasks as userB
    const { data } = await supabase
      .auth.setSession(userB.session)
      .from('tasks')
      .select('*')
      .eq('group_id', groupA.id);

    expect(data).toHaveLength(0); // Should be empty
  });
});
```

### 5.4 File Upload (Receipts)

**Problem:** Unrestricted file uploads = storage abuse, malware.

#### Security Measures
1. **File size limit:** 10MB max per file
2. **File type whitelist:** JPEG, PNG, PDF only
3. **Storage quota:** 100MB per group (enforce in app logic)
4. **Virus scanning:** Use Supabase Storage's built-in scanning (Pro plan) or ClamAV

#### Implementation
```typescript
// lib/uploadReceipt.ts
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export async function uploadReceipt(file: File, groupId: string, expenseId: string) {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large (max 10MB)');
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type (only JPG, PNG, PDF allowed)');
  }

  // Generate unique filename
  const ext = file.name.split('.').pop();
  const filename = `${groupId}/${expenseId}/${Date.now()}.${ext}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filename, file);

  if (error) throw error;

  return data.path;
}
```

---

## 6. User Acquisition Strategy

### 6.1 The Cold Start Problem

**Challenge:** This app requires network effects (all roommates must use it). Bootstrapping is HARD.

#### Strategy: Target New Roommate Households

**Timing:** Focus on lease cycles
- **August-September:** College move-in, fall semester starts
- **January:** Spring semester, winter leases
- **May-June:** Summer leases, post-graduation moves

**Distribution Channels:**
1. **Reddit:**
   - r/college (2.5M members)
   - r/roommates (50k members)
   - University-specific subreddits (r/UCLA, r/NYU, etc.)
   - Post: "I built a free app to manage roommate tasks + expenses (Splitwise alternative)"

2. **Facebook Groups:**
   - University housing groups ("UCLA Housing", "NYU Roommates")
   - City-specific ("SF Roommates", "NYC Apartments")

3. **College Newsletters/Forums:**
   - Contact student newspapers (free tool spotlight)
   - Post on university forums

4. **TikTok/Instagram:**
   - Short videos: "How to avoid roommate drama using this free app"
   - Hashtags: #roommatetips #collegelife #apartmentliving

5. **ProductHunt Launch:**
   - Launch on a Tuesday (highest traffic day)
   - Get 10 friends to upvote in first hour (algorithmic boost)

### 6.2 Viral Loop Design

**Key Mechanic:** Users MUST invite roommates to get value.

#### Invitation Flow (Optimized for Conversion)
1. User signs up, creates group
2. **Immediately show:** "Invite your roommates to get started"
   - Pre-fill email fields (paste from clipboard)
   - Copy invitation link (share via text/WhatsApp)
3. **Incentive:** "Groups with 3+ members get priority support"
4. **Social proof:** "2,847 roommate households use DivvyDo"

#### K-Factor Target
- Average household: 4 roommates
- Conversion rate: 60% of invited roommates sign up
- K-factor: 1 user invites 3, 60% convert = 1.8 new users per existing user
- **K > 1 = viral growth**

---

## 7. Monetization Strategy (Post-Launch)

### 7.1 Free Tier (Initial Strategy)

**Everything is free for first 6-12 months.** Focus on growth, not revenue.

**Why:**
- College students won't pay (limited budgets)
- Need critical mass for network effects
- Prove value before asking for money

**Non-negotiables (switching trust):**
- No ads in core flows
- No “crippling” limits (e.g., daily entry caps) for basic expense tracking
- Export always available (users shouldn’t feel locked in)

### 7.2 Future Monetization (Phase 3)

#### Option A: Freemium
```
Free:
- 1 household group (Personal always included)
- Unlimited tasks
- Unlimited expenses
- 100MB storage (receipts)
- Basic reports

Pro ($4.99/month per household):
- Unlimited groups
- 1GB storage
- Advanced reports (CSV/PDF export)
- Recurring expenses
- Priority support
```

#### Option B: Usage-Based
```
Free:
- Up to $2,000 tracked expenses per month
- Unlimited tasks

Pay ($0.99/month per $1,000 in expenses tracked):
- Example: Track $5,000/month = $4.95/month
- Aligns with value (higher expenses = more value)
```

#### Option C: Property Manager B2B
```
Target: Landlords/property managers with multiple units

Property Manager Plan ($49/month):
- Manage 10 properties
- See aggregate expenses across units
- Maintenance request tracking
- Lease management

This is higher margin than consumer.
```

**Recommendation:** Start with free, add Option A (freemium) after 1000 active users, explore Option C (B2B) if traction.

---

## 8. Risks & Mitigations (Revised)

### Risk 1: Nobody Uses It (Biggest Risk)
**Probability:** High (most apps fail due to lack of traction)

**Mitigation:**
- Validate BEFORE building (talk to 20 roommate households this week)
- Build landing page, collect emails (target: 100 emails before launch)
- Launch in 10 weeks, not 44 weeks
- If no traction after 3 months, pivot or kill

### Risk 2: Splitwise Network Effects
**Probability:** Medium

**Mitigation:**
- Target roommates who DON'T use Splitwise yet
- Clear switching promise (no ads, no crippling paywalls, export always available)
- Position as "Splitwise + tasks" (additive, not replacement)

### Risk 3: Balance Calculation Bugs
**Probability:** Medium (money math is hard)

**Mitigation:**
- Extensive unit tests (100 test cases for edge cases)
- Manual QA (testers verify balances match spreadsheet calculations)
- Bug bounty ($50 per critical bug found in balance logic)

### Risk 4: Low Retention
**Probability:** Medium (task apps have ~30% 7-day retention)

**Mitigation:**
- Email/push reminders (tasks due, balances owed)
- Weekly digest ("This week: 5 tasks completed, $200 in expenses")
- Habit formation (use app daily to check balances)

### Risk 5: Scope Creep
**Probability:** High (developer tendency to over-build)

**Mitigation:**
- This document (ruthless feature cuts)
- Weekly reviews (are we building the MVP or adding features?)
- User-driven roadmap (build what users ask for, not what's "cool")

---

## 9. Success Metrics (Revised)

### Week 10 (MVP Launch)
- [ ] 50 beta users signed up
- [ ] 10 active groups (using app weekly)
- [ ] 100+ tasks created
- [ ] 50+ expenses tracked
- [ ] $5,000+ in total expenses tracked
- [ ] 0 critical bugs (money calculation errors, data leaks)

### Month 3 (Post-Launch)
- [ ] 200 users
- [ ] 50 active groups
- [ ] 1,000+ tasks created
- [ ] 500+ expenses tracked
- [ ] 60%+ 7-day retention
- [ ] $25,000+ in expenses tracked
- [ ] 100+ settlements recorded

### Month 6 (Growth Phase)
- [ ] 1,000 users
- [ ] 250 active groups
- [ ] 5,000+ expenses tracked
- [ ] $150,000+ in expenses tracked
- [ ] 4.5+ star rating (user feedback)
- [ ] Featured on ProductHunt (top 5 of the day)
- [ ] Decision point: Monetize or continue free growth?

---

## 10. Next Steps (Immediate Actions)

### Before Writing Code (This Week)

1. **User Validation (2-3 days):**
   - [ ] Interview 10 roommate households (friends, Reddit, Facebook groups)
   - [ ] Ask: "How do you currently manage tasks + expenses?"
   - [ ] Ask: "Would you switch to an app that does both?"
   - [ ] Show mockups (create simple Figma wireframes)
   - [ ] Collect 50 email signups (landing page: Carrd or Webflow)

2. **Design Mockups (2-3 days):**
   - [ ] Create Figma wireframes for:
     - [ ] Sign up / Login
     - [ ] Dashboard
     - [ ] Task list
     - [ ] Add expense form
     - [ ] Balance dashboard
   - [ ] Test with 3-5 potential users (validate UX)

3. **Technical Setup (1 day):**
   - [ ] Create Supabase project
   - [ ] Set up GitHub repo
   - [ ] Initialize Vite + React + TypeScript project
   - [ ] Deploy skeleton to Vercel (verify CI/CD works)

### Week 1: Start Building
- [ ] Follow Week 1-2 roadmap (section 4)
- [ ] Ship authentication + empty dashboard
- [ ] Get 5 beta testers to sign up (validate onboarding flow)

---

## 11. Conclusion

### Key Takeaways

1. **Focus on roommates ONLY.** Families can use the same app without special features.
2. **Cut 70% of features.** Build core tasks + expenses, ship in 10 weeks.
3. **Skip real-time sync.** Polling is simpler and good enough.
4. **Build PWA, not native apps.** Save 8-12 weeks, iterate faster.
5. **Validate before building.** Talk to users, collect emails, prove demand.
6. **Launch fast, iterate based on feedback.** Don't spend 44 weeks building features nobody wants.

### This Document vs Original Plan

| Aspect | Original Plan | This Strategy |
|--------|---------------|---------------|
| Timeline | 44 weeks | 10 weeks MVP |
| Features | 50+ features | 15 core features |
| Audience | Families + Roommates | Roommates (families can use it) |
| Real-time | WebSocket from day 1 | Polling, add real-time later |
| Mobile | React Native (Week 29) | PWA from day 1 |
| Backend | Custom Node.js considered | Supabase only |
| Scope | Build everything | Build minimum, iterate |

### Final Recommendation

**Ship a working MVP in 10 weeks:**
- Auth + groups + tasks + expenses + balances + settlements
- Mobile-responsive web app (PWA)
- Polling (not real-time)
- Equal + exact + percent + shares + adjustment split

**Then:**
- Get 100 users
- Measure usage (which features do they use most?)
- Build Phase 2 based on REAL user demand, not speculation

**This approach:**
- ✅ Reduces risk (fail fast if no demand)
- ✅ Faster time-to-market (10 weeks vs 44 weeks)
- ✅ Simpler to maintain (fewer features = fewer bugs)
- ✅ User-driven (build what users ask for)

---

**Ready to build?** Start with user validation interviews this week, then begin Week 1 implementation.

**Questions?** Review this document alongside `product-plan.md` for complete context.

---

**Document Version:** 1.0
**Last Updated:** January 4, 2026
**Status:** Implementation in progress
**Next Review:** After MVP launch (Week 10)
