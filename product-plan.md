# Roommate-First Task + Expense Management App - Comprehensive Planning Document

## Executive Summary

**App Name:** DivvyDo

**Target Users:**
1. **Roommates (Primary)** - College students, young professionals sharing apartments (3–6 people)
2. **Families (Incidental)** - Can use the same “household group” features; no family-specific MVP roles/gamification

**Core Problems:**
- **Private to-dos:** Users need a personal list that stays private by default
- **Shared coordination:** Households need shared tasks, shared expenses, and clear balances to reduce conflict

**Solution:** A roommate-first app combining **private personal tasks** with **shared household tasks + expense splitting** (Splitwise-inspired), using a simple **group switcher** (Personal ↔ Household).

**Platform Strategy:**
- MVP (10 weeks): Web app / PWA (mobile-first) for tasks + expenses + balances
- Post-launch: Add features only when demand proves it (recurrence, advanced splits like percentages/shares, reports)
- Native apps: Only if PWA traction proves App Store demand

**Target Scale:** 50 households in Month 1, scalable to thousands

**Key Differentiator:** Private-first personal to-dos + shared household tasks + expenses in one place, with low-confusion context switching.

**Switching Wedge (Why change from Splitwise + chats?):**
- **Private-first tasks + shared household ledger** (one app, clear context switching)
- **No “make the app unusable” paywalls** for core tracking
- **Proof-of-correctness** (show exactly how balances are computed)
- **Migration-friendly** (import/export so users don’t feel trapped)

## Current Implementation Snapshot (Repo)

**Status:** MVP Core Features Complete (Polishing phase).

**Implemented**
- **Foundation:** Supabase schema/migrations, Auth flows (sign up/in, reset, update), Group switcher (Personal/Household), Settings.
- **Tasks:** Full CRUD, assigning, priority, status, recurring templates (creation logic only), filtering, search.
- **Expenses:** Full CRUD, complex splits (equal/exact/percent/shares/adjustment), receipt upload, recurring templates, filtering.
- **Balances:** Real-time (via polling) net balance calculation, settlement recording, history.
- **Invites:** Token-based invite acceptance flow.

**Not Yet Implemented / In Progress**
- **Real-time:** WebSockets are deferred (using polling).
- **Notifications:** In-app and email notifications are not wired.
- **Automated Cron:** Recurring tasks/expenses must be manually generated or rely on planned Edge Functions (not fully automated yet).
- **Mobile Polish:** PWA manifest and service worker setup.
- **Header CTAs:** "New Task" / "Add Expense" buttons in headers are currently static (forms are inline).

---

## 1. User Requirements & Problems to Solve

### 1.1 Incidental Family Use (Not MVP Focus)

Families can use the same **household group** features (shared tasks + optional expenses). Family-specific concepts (parent/child roles, gamification, allowance tracking) are **deferred** until validated demand.

#### Core Pain Points
1. **Lack of visibility** - Who's doing what, when, and whether it's done
2. **Forgotten cleaning tasks** - Regular furniture/floor cleaning slips through the cracks
3. **Poor coordination** - Overlapping responsibilities, missed handoffs
4. **No accountability** - Tasks assigned but not tracked or completed
5. **Mixed contexts** - Personal tasks mixed with household tasks

#### User Personas

**Parent/Admin (Age 35-50)**
- Needs: Assign tasks, track completion, manage household members, view overall progress
- Goals: Smooth household operations, teach responsibility, reduce mental load
- Frustrations: Nagging, repeated reminders, unclear accountability

**Teen/Young Adult (Age 13-25)**
- Needs: Clear task assignments, due dates, ability to mark complete, personal task list
- Goals: Know what's expected, avoid parental nagging, maintain some autonomy
- Frustrations: Unclear expectations, forgotten tasks, interruptions

---

### 1.2 Roommate Use Case

#### Core Pain Points
1. **Money transparency** - "Did you pay the electricity bill?" "Who bought groceries last?"
2. **Expense fairness** - Unequal usage, need for flexible splits
3. **Task equity** - "I'm the only one who ever cleans the bathroom!"
4. **Passive-aggressive communication** - Notes on fridge, tension in group chats
5. **Move-out complications** - Settling debts, security deposit disputes
6. **Shared supply tracking** - Running out of essentials (toilet paper, dish soap)
7. **Proof of payment** - Need receipts for landlord disputes

#### User Personas

**College Student Roommate (Age 18-24)**
- Needs: Split expenses fairly, track who owes what, coordinate cleaning, manage shared groceries
- Goals: Avoid conflict, maintain fairness, save money
- Frustrations: Roommates not paying on time, unequal task distribution, lost receipts
- Tech-savvy: Comfortable with apps like Venmo, Splitwise, Slack

**Young Professional Roommate (Age 24-32)**
- Needs: Simple expense tracking, automated recurring bills, clear accountability
- Goals: Professional living environment, minimize drama, transparency
- Frustrations: Chasing people for money, unclear who bought what, maintenance issues
- Time-constrained: Wants quick, efficient solutions

#### Key Differences from Families
- **Temporary relationships** - 6-12 month leases vs permanent family bonds
- **Financial focus** - Money matters more, need hard proof
- **Equal peers** - No hierarchy, everyone has equal say
- **Lower inherent trust** - Need transparency and accountability systems
- **Turnover** - Roommates leave, new ones join, need settlement & handoff

---

## 2. Core Features & Functionality

### 2.1 MVP Phase 1A: Core Task Management (Weeks 1-10)
**Roommates-first (families can use incidentally with the same features)**

#### Authentication & User Management
- Email/password sign up and login
- Password reset
- User profile (name, avatar, email)
- Account settings

#### Group Management
- Create household group
- Invite members via shareable link/code (email optional but recommended for auto-claim)
- Accept/decline invitations (or join via invite link)
- View group members
- **Permissions (MVP):** Household members are equals; admins handle destructive actions and role management (promote/demote members, keep at least one admin)

#### Adoption & Switching (Critical)
To beat network effects, users must get value even if not everyone installs immediately.
- **Unclaimed household members (placeholders):** Create a household with “John”, “Sarah” entries and start splitting expenses immediately; roommates can claim their identity later.
- **Claim flow:** Email-only auto-match. If no email match exists, the user joins as a new person and an admin can merge later.
- **Admin merge:** Admins can merge a placeholder into a claimed person (moves tasks/expenses/settlements, then archives the placeholder) and writes an audit entry.
- **No import MVP:** focus on fast setup with unclaimed members; import can be added later if demanded.
- **Portability:** Export tasks, expenses, settlements, and balances to CSV at any time.

#### Groups & Personal Space (Private-First)
**Two group types:**
1. **Personal (auto-created)** - Private tasks visible only to the user (default context)
2. **Household Groups** - Shared tasks + expenses visible to all household members

**Group Switcher:**
- Always visible in top nav: `[Personal] / [Apartment 4B] / ...`
- All views (tasks, expenses, balances, dashboard) are filtered by the active group
- **Expenses/Balances appear only in household groups**
- Clear visual distinction:
  - Personal: Cool blue accent (`#3B82F6`)
  - Household: Teal accent (`#14B8A6`)

#### Task Management (CRUD)
- **Create task:**
  - Title (required)
  - Description (optional, rich text)
- Assign to person (claimed or unclaimed) or leave unassigned
  - Due date (optional)
  - Priority (Low, Medium, High)
  - Status (To Do, In Progress, Completed)
  - Group selection (defaults to Personal; can choose a household group)
  - Related expense (Phase 1B - link tasks to expenses)

- **Read/View tasks:**
  - List view with filters (status, assignee, priority)
  - Task detail view (inline panel or modal)
  - Search by title/description

- **Update task:**
  - Edit all fields
  - Reassign
  - Change status
  - Update due date

- **Delete task:**
  - Soft delete with confirmation
  - Admins (household) or any roommate can delete
  - Users can delete their own tasks

#### Recurring Tasks
- Frequency options:
  - Daily (every X days)
  - Weekly (select days of week)
  - Monthly (select day of month)
  - Custom interval
- Auto-generate new task instances based on schedule
- Next occurrence preview
- End date (optional)
- **Rotation support (Phase 2):** Auto-assign to different people each cycle
  - Example: Bathroom cleaning rotates weekly among roommates

#### Task Views
1. **List View (Primary)**
   - Sortable columns (due date, priority, assignee)
   - Filters (status, assignee, priority)
   - Bulk select (Phase 2)
   - Quick status toggle
   - Nested view for task dependencies (Phase 2)

2. **Dashboard**
   - Welcome message with user name
   - Stats cards:
     - Tasks due today
     - Overdue tasks
     - Completed this week
     - Pending tasks
   - **For Roommates:** Balance summary (who owes/owed)
   - Upcoming tasks (next 7 days)
   - Recent activity feed

3. **Mobile-Responsive Design**
   - Optimized for phones/tablets
   - Touch-friendly UI
   - Floating action button (FAB) for quick add
   - Swipe gestures for actions

#### Real-Time Updates
- Task changes appear instantly across all logged-in devices
- WebSocket-based sync (via Supabase Realtime)
- Optimistic UI updates (instant feedback)
- Automatic reconnection handling

#### Notifications (In-App)
- Task assigned to you
- Task due soon (24 hours before)
- Task overdue
- Task completed by member
- **For Roommates:** New expense added, balance reminder

---

### 2.2 MVP Phase 1B: Expense Tracking (Weeks 11-16)
**Roommate-Focused Feature (Splitwise Alternative)**

#### Core Expense Features

**Add Expenses**
- Description (e.g., "Groceries - Trader Joe's")
- Amount (total expense)
- Currency (USD default, multi-currency in Phase 2)
- Category (Rent, Utilities, Groceries, Household, Entertainment, Other)
- Paid by (which roommate paid)
- Date (when expense occurred)
- **Split method:** Equal split + custom exact splits (MVP)
  - Phase 2: Exact amounts, percentages, shares, adjustment
- Select participants (who benefited; may include payer)
- Assign tasks to claimed or unclaimed people
- Receipt upload (photo/PDF)
- Notes (optional)
- Link to task (optional - e.g., "Buy groceries" task)

**Balance Dashboard**
- Real-time balance calculation
- **"You owe" section:**
  - List of people you owe money to
  - Amount owed to each person
  - Breakdown of expenses
- **"You are owed" section:**
  - List of people who owe you
  - Amount owed by each person
  - Breakdown of expenses
- **Net balance:** Overall "You owe $X" or "You are owed $X"
- Visual balance indicators (color-coded: green = owed, red = owe)

**Settlement System**
- "Settle Up" button next to each balance
- Record payment:
  - Full amount or partial payment
  - Payment method (Cash, Venmo, Zelle, PayPal, Bank Transfer, Other)
  - Optional note
  - Date of settlement
- Settlement history (audit trail)
- Payments reduce balances (ledger model); expenses remain a permanent history (void instead of “settle” an expense)

**Settlement convenience (to reduce friction):**
- Copy payment note (“Paid $38.25 to Sarah for groceries + utilities”)
- Deep-link buttons (when possible): “Open Venmo / PayPal” (no API integration required)

**Expense List/History**
- Chronological list of all expenses
- Filters: By category, person, date range, active/voided
- Search expenses
- Expense detail view:
  - Full expense breakdown
  - Who paid, who owes how much
  - How this expense contributes to current balances (net of recorded settlements)
  - Receipt preview
  - Comments (Phase 2)
  - Monthly grouping (January 2026: $2,847 total)

**Trust UX (money apps must feel correct):**
- “Show the math” on balances: tap a balance → list contributing expense-splits and settlements.
- Clear voiding: voided expenses remain visible with a reason (prevents “where did it go?” disputes).

**Categories**
- Default categories:
  - 🏠 Rent
  - ⚡ Utilities (Electricity, Water, Gas)
  - 🌐 Internet
  - 🛒 Groceries
  - 🧹 Household Supplies
  - 🎬 Entertainment
  - 🚗 Transport
  - 🍕 Food/Dining Out
  - 📦 Other
- Custom categories (add your own)
- Category icons and colors

**Real-Time Updates**
- Balances update when expenses are added or settlements are recorded
- Notifications when roommate adds expense you're part of
- Live balance synchronization across devices

---

### 2.3 Phase 2A: Advanced Expense Features (Weeks 17-22)

#### Advanced Split Methods
1. **Equal Split** - Divide evenly (MVP)
2. **Exact Amounts** - Specify exact amount each person owes
   - Example: A owes $40, B owes $35, C owes $25 for $100 expense
3. **Percentages** - Split by percentage
   - Example: A pays 50%, B pays 30%, C pays 20%
4. **Shares** - Weighted distribution
   - Example: A gets 2 shares, B gets 1 share (A pays 2/3, B pays 1/3)
5. **Adjustment/Reimbursement** - Someone paid but doesn't owe
   - Example: A paid $100, but only B and C owe ($50 each)

#### Recurring Expenses
- Create recurring expense templates
- Auto-generate monthly expenses (rent, utilities, internet)
- Automatic split based on saved rules
- Edit single occurrence vs all occurrences
- Notification when new recurring expense is created

#### Debt Simplification
- Algorithm to minimize transactions
- Example: If A owes B $50, B owes C $50 → Simplify to A owes C $50
- "Simplify Debts" button
- Show before/after transaction comparison

#### Expense Reports & Analytics
- **Monthly/Yearly Reports:**
  - Total spending by category (pie chart)
  - Total spending by person (bar chart)
  - Spending trends over time (line chart)
  - Average monthly expenses
- **Export:**
  - CSV export (for Excel/Google Sheets)
  - PDF export (for records/tax purposes)
- **Insights:**
  - "You spent 20% more this month than last month"
  - "Groceries are your biggest expense category"
  - "You've been owed $45 for 3 weeks - send a reminder?"

#### Expense Groups
- Group related expenses (e.g., "Weekend Trip to LA")
- See total cost of grouped expenses
- Useful for one-time events separate from regular bills

#### Payment Reminders
- Gentle reminders for outstanding balances
- Configurable: Remind after X days of owing > $Y
- In-app notifications + optional email (Phase 2)

---

### 2.4 Phase 2B: Roommate-Specific Features (Weeks 23-26)

#### Shopping Lists
- Collaborative grocery/supply lists
- Add items with optional price
- Check off items as purchased
- "Convert to Expense" button - auto-create expense from shopping trip
- Track who bought each item
- Item history (how often we buy milk, paper towels, etc.)

#### Supply Inventory & Alerts
- Track household supplies:
  - Toilet paper, paper towels, dish soap, laundry detergent
  - Trash bags, cleaning supplies, sponges, light bulbs
- Stock levels: Full, Low, Out
- Last purchased by (person) and when
- Low stock alerts - notify group when item marked "Low"
- Purchase history - see how often items need restocking

#### Cleaning Rotation
- Automated fair task assignment
- Create rotation schedules (weekly, bi-weekly)
- Example rotations:
  - Bathroom cleaning (rotates among all roommates)
  - Kitchen cleaning
  - Trash/recycling duty
  - Vacuuming common areas
- Track completion history (accountability)
- Swap requests - trade your week with another roommate
- Skip tracking - if someone skips, assign extra next cycle

#### Utility & Bill Tracking
- Track recurring bills over time:
  - Electricity: $95 (Jan), $120 (Dec), $88 (Nov)
  - Water, Gas, Internet, Streaming services
- Month-over-month comparison charts
- Auto-split utilities equally or custom percentages
- Due date reminders - "Internet bill due in 3 days"
- Payment confirmation tracking - who paid which bill

#### Maintenance & Repairs
- Report issues:
  - Dishwasher broken
  - Leaky faucet
  - AC not working
- Status tracking: Reported → Contacted Landlord → Scheduled → Fixed
- Photo attachments to document issues
- Landlord communication log
- Maintenance history
- Shared responsibility - who's following up with landlord

#### House Wiki / Knowledge Base
- Shared information hub:
  - WiFi network name and password
  - Trash/recycling pickup schedule
  - Quiet hours (e.g., 10 PM - 8 AM)
  - Guest policy (overnight guests, advance notice)
  - Parking assignments
  - Emergency contacts (landlord, building manager, maintenance)
  - Appliance manuals (upload PDFs)
  - House rules
- Editable by all (wiki-style)
- Version history (see who changed what)
- Pin important items to top

#### Move-In/Move-Out Management
- **Move-in checklist:**
  - Document apartment condition with photos
  - Note existing damage
  - Record appliance/furniture inventory
- **Security deposit tracking:**
  - Amount, expected return date
  - Deductions calculator
- **Move-out checklist:**
  - Cleaning checklist
  - Final walkthrough
  - Return keys
  - Forward mail
- **Final settlement:**
  - Settle all outstanding balances
  - Split security deposit return
- **Handoff to new roommate:**
  - Transfer utilities
  - Share house info
  - Update group membership

#### House Inventory (Who Owns What)
- Track furniture, appliances, electronics ownership
  - "John's couch, Sarah's TV, Mike's coffee maker"
- Photo documentation
- Estimated value (for insurance)
- Move-out planning - who takes what

#### Lease Management
- Store lease information:
  - Lease start/end dates
  - Rent amount and due date
  - Notice period (e.g., 60 days before lease end)
  - Renewal option dates
- Automatic reminders:
  - Rent due in 3 days
  - Lease ending in 60 days (time to give notice)
  - Renewal decision deadline
- Landlord contact info

---

### 2.5 Phase 2C: Enhanced Task Features (Weeks 23-28)
**For households (roommates-first)**

#### Multiple Views
- **Kanban Board View**
  - Columns: To Do, In Progress, Completed
  - Drag-and-drop to change status
  - Color-coded by priority or assignee
  - Filter by group, assignee, category

- **Calendar View**
  - Month/Week/Day views
  - Tasks displayed on due dates
  - Drag-and-drop to reschedule
  - Color-coding by assignee or priority
  - Integration with expenses (rent due dates, bill due dates)

- **Timeline/Gantt View**
  - Visual task dependencies
  - Project timelines
  - Critical path highlighting
- Useful for complex household projects or roommate move-out planning

#### Task Dependencies
- Link tasks (Task B depends on Task A)
- Block dependent tasks until prerequisites complete
- Visual dependency chains
- Validation to prevent circular dependencies
- Example use cases:
  - Household: "Buy paint" → "Paint bedroom" → "Move furniture back"
  - Roommate: "Find new roommate" → "Sign lease amendment" → "Hand off keys"

#### Task Templates
- Save common task structures
- Template library (group-specific)
- Quick create from template
- Examples:
  - **Household:** "Weekly cleaning routine", "Car service", "Grocery shopping"
  - **Roommate:** "Monthly deep clean", "Move-in checklist", "Utility setup"

#### Comments & Collaboration
- Comment threads on tasks
- @mention members
- Rich text formatting
- Edit/delete own comments
- Real-time comment updates
- Notification on new comment

#### File Attachments (beyond receipts)
- Upload photos, PDFs, documents to tasks
- Multiple files per task
- File preview (images)
- Download files
- Max file size limit (10MB per file)
- Storage quota per group (1GB free tier)

#### Gamification & Points (Family-focused, optional for Roommates)
- Points awarded for task completion
- Point values based on task complexity/priority
- Leaderboard (weekly, monthly, all-time)
- Badges/achievements
- Customizable rewards (admin-defined)
- Roommates can opt out of gamification

#### Projects
- Group related tasks under project
- Project progress tracking (% complete)
- Project-level filtering
- Examples:
  - Family: "Spring Cleaning 2024", "Vacation Planning"
  - Roommate: "Apartment Search", "Move-Out Preparation"

#### Advanced Features
- Task duplication
- Bulk actions (select multiple, change status/assignee)
- Activity log (who did what, when)
- Task history (audit trail)
- Export tasks (CSV, PDF)

---

### 2.6 Phase 3: Mobile Apps (Weeks 29-44)

#### React Native + Expo Apps
- iOS app (App Store)
- Android app (Google Play)
- Feature parity with web app
- Native mobile UX patterns

#### Mobile-Specific Features
- **Push notifications:**
  - Task assignments
  - Due date reminders
  - New expenses
  - Balance reminders
  - Settlement requests
- **Offline mode:**
  - SQLite local storage
  - Background sync when online
  - Queue actions offline, sync later
- **Camera integration:**
  - Scan receipts for expenses
  - Photo attachments for tasks
  - Before/after photos for move-in/move-out
- **Home screen widgets:**
  - Today's tasks
  - Current balances
  - Upcoming due dates
- **Quick actions:**
  - 3D Touch / Long-press on app icon
  - "Add Task", "Add Expense", "View Balances"
- **Voice shortcuts:**
  - Siri: "Add milk to shopping list"
  - Google Assistant: "Show my roommate balances"

#### Platform-Specific
- **iOS:**
  - Face ID / Touch ID for sensitive info
  - Apple Pay integration (future)
  - Sign in with Apple
  - Haptic feedback
  - ShareSheet integration

- **Android:**
  - Fingerprint auth
  - Google Pay integration (future)
  - Material Design 3
  - Share functionality

---

## 3. Technical Architecture

### 3.1 Tech Stack

#### Frontend (Web)
- **Framework:** React 18+
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **Component Library:** shadcn/ui (Radix UI primitives)
- **State Management:** Zustand or Jotai (lightweight)
- **Data Fetching:** TanStack Query (React Query v5)
- **Routing:** React Router v6
- **Form Handling:** React Hook Form + Zod validation
- **Date/Time:** date-fns or Day.js
- **Rich Text Editor:** Tiptap or Lexical
- **Icons:** Lucide React or Heroicons
- **Charts:** Recharts or Chart.js (for expense reports)

#### Backend
**Option A: Supabase (Recommended)**
- PostgreSQL database (managed)
- Authentication (built-in with RLS)
- Real-time subscriptions (WebSocket)
- File storage (S3-compatible)
- Row-level security (RLS) - perfect for multi-tenant
- Edge Functions (serverless)
- Free tier: 500MB DB, 1GB storage, 2GB bandwidth
- **Why perfect for this app:**
  - Built-in real-time for balances and tasks
  - RLS ensures roommates can't see other households' data
  - Scales easily to thousands of users

**Option B: Custom Backend**
- **Runtime:** Node.js 20+
- **Framework:** Express.js or Fastify
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Real-time (post-MVP):** Socket.io + Redis (for pub/sub)
- **File Storage:** AWS S3 / Cloudflare R2
- **Authentication:** JWT + bcrypt

**Recommendation:** Start with Supabase for speed, migrate to custom backend only if you need specific customizations.

#### Mobile (Phase 3)
- **Framework:** React Native
- **Toolchain:** Expo (EAS Build, EAS Submit)
- **Navigation:** React Navigation
- **State/Data:** Shared with web via monorepo
- **Offline:** SQLite + sync layer (WatermelonDB or custom)
- **Push Notifications:** Expo Notifications (APNs + FCM)

#### Infrastructure
- **Hosting (Web):** Vercel (frontend + serverless functions)
- **Database:** Supabase (managed Postgres) or Railway/Render
- **File Storage:** Supabase Storage or Cloudflare R2
- **CDN:** Cloudflare (global distribution)
- **Monitoring:** Sentry (error tracking), Vercel Analytics
- **CI/CD:** GitHub Actions

---

### 3.2 Database Schema

#### Core Tables

**Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Groups Table** (renamed from Families to support both types)
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('personal', 'household')),
  default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Group Members Table**
```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
```

**Group People Table (claimed + unclaimed participants)**
```sql
CREATE TABLE group_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255), -- optional; email-only auto-claim
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uniq_group_people_user
  ON group_people(group_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX uniq_group_people_email
  ON group_people(group_id, lower(email))
  WHERE email IS NOT NULL AND is_archived = FALSE;

CREATE TABLE people_merge_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  source_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL,
  target_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL,
  merged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  moved_counts JSONB NOT NULL, -- {tasks: X, expenses: Y, splits: Z, settlements: W}
  merged_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Deletion policy:** Do not hard-delete `group_people` if referenced. Archive and hide by default.

**Tasks Table**
```sql
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
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_group ON tasks(group_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to_person_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
```

**Recurring Tasks Table (simplified)**
```sql
CREATE TABLE recurring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  interval INTEGER DEFAULT 1,
  assigned_to_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL,
  next_occurrence DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### Expense Tables

**Expense Categories Table**
```sql
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10), -- emoji
  color VARCHAR(20), -- hex color
  is_default BOOLEAN DEFAULT FALSE, -- system-provided categories
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default categories: Rent, Utilities, Groceries, Household, Entertainment, Transport, Other
```

**Expenses Table**
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0), -- total amount
  currency VARCHAR(3) DEFAULT 'USD',
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  paid_by_person_id UUID REFERENCES group_people(id) ON DELETE RESTRICT, -- who paid
  expense_date DATE NOT NULL,
  split_method VARCHAR(50) NOT NULL DEFAULT 'equal' CHECK (split_method IN ('equal', 'exact', 'percentage', 'shares', 'adjustment')),
  receipt_url TEXT, -- stored file URL
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  is_deleted BOOLEAN DEFAULT FALSE, -- soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_expenses_paid_by_person ON expenses(paid_by_person_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
```

**Expense Splits Table**
```sql
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  person_id UUID REFERENCES group_people(id) ON DELETE CASCADE,
  amount_owed_cents INTEGER NOT NULL CHECK (amount_owed_cents >= 0), -- how much this person owes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, person_id)
);

CREATE INDEX idx_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_splits_person ON expense_splits(person_id);
```

**Settlements Table**
```sql
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  from_person_id UUID REFERENCES group_people(id) ON DELETE RESTRICT, -- who paid
  to_person_id UUID REFERENCES group_people(id) ON DELETE RESTRICT, -- who received
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50), -- Cash, Venmo, Zelle, PayPal, Bank Transfer, etc.
  notes TEXT,
  settled_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK(from_person_id != to_person_id)
);

CREATE INDEX idx_settlements_group ON settlements(group_id);
CREATE INDEX idx_settlements_from ON settlements(from_person_id);
CREATE INDEX idx_settlements_to ON settlements(to_person_id);
```

**Recurring Expenses Table (Phase 2)**
```sql
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  amount_cents INTEGER, -- can be null if amount varies
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  paid_by_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL, -- who usually pays (can rotate)
  split_method VARCHAR(50) NOT NULL DEFAULT 'equal',
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  day_of_week INTEGER, -- 0-6 for weekly
  day_of_month INTEGER, -- 1-31 for monthly
  start_date DATE NOT NULL,
  end_date DATE, -- optional
  next_occurrence DATE NOT NULL,
  last_created_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Balances View (Calculated, not stored)**
```sql
CREATE OR REPLACE FUNCTION calculate_balances(p_group_id UUID)
RETURNS TABLE (
  from_person_id UUID,
  to_person_id UUID,
  net_cents INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH expense_debts AS (
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

**Expense Groups Table (Phase 2)**
```sql
CREATE TABLE expense_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### Phase 2 Tables

**Task Dependencies Table**
```sql
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id),
  CHECK(task_id != depends_on_task_id)
);
```

**Task Templates Table**
```sql
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Task Comments Table**
```sql
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_task ON task_comments(task_id);
```

**Task Attachments Table**
```sql
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Projects Table**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Points Table (Family-focused)**
```sql
CREATE TABLE points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  reason VARCHAR(255),
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_user ON points(user_id);
CREATE INDEX idx_points_group ON points(group_id);
```

**Notifications Table**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
```

---

#### Roommate-Specific Tables (Phase 2B)

**Shopping Lists Table**
```sql
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Shopping List',
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Shopping List Items Table**
```sql
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  quantity VARCHAR(50),
  estimated_price DECIMAL(10, 2),
  is_purchased BOOLEAN DEFAULT FALSE,
  purchased_by_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Supply Inventory Table**
```sql
CREATE TABLE supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- Bathroom, Kitchen, Cleaning, etc.
  stock_level VARCHAR(50) CHECK (stock_level IN ('full', 'low', 'out')),
  last_purchased_by_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL,
  last_purchased_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Maintenance Issues Table**
```sql
CREATE TABLE maintenance_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'reported' CHECK (status IN ('reported', 'contacted_landlord', 'scheduled', 'in_progress', 'completed')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  photo_url TEXT,
  reported_by_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL,
  assigned_to_person_id UUID REFERENCES group_people(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**House Wiki Pages Table**
```sql
CREATE TABLE wiki_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  last_edited_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Lease Information Table**
```sql
CREATE TABLE lease_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  lease_start DATE NOT NULL,
  lease_end DATE NOT NULL,
  rent_amount DECIMAL(10, 2) NOT NULL,
  rent_due_day INTEGER, -- day of month (1-31)
  security_deposit DECIMAL(10, 2),
  notice_period_days INTEGER, -- e.g., 60 days
  landlord_name VARCHAR(255),
  landlord_contact VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.3 Real-Time Sync Architecture

#### MVP Decision: Defer real-time; use polling

Realtime subscriptions are valuable but add complexity (connection management, debugging, limits). For MVP, polling is enough for household coordination.

**Implementation (React Query polling):**
```typescript
useQuery({
  queryKey: ['tasks', groupId],
  queryFn: fetchTasks,
  refetchInterval: 10000,
  refetchOnWindowFocus: true,
});
```

**When to add real-time:** If users explicitly complain about stale data, enable Supabase Realtime later (group-scoped channels keyed by `group_id`).

---

### 3.4 API Design (if using custom backend)

#### Expenses Endpoints (additional to task endpoints)

**Expenses**
- `GET /groups/:id/expenses` - List expenses (with filters)
- `POST /groups/:id/expenses` - Create expense
- `GET /expenses/:id` - Get expense details
- `PATCH /expenses/:id` - Update expense
- `DELETE /expenses/:id` - Soft delete expense

**Balances**
- `GET /groups/:id/balances` - Get all balances for group
- `GET /groups/:id/balances/me` - Get my balances (who I owe, who owes me)

**Settlements**
- `POST /groups/:id/settlements` - Record a settlement
- `GET /groups/:id/settlements` - Settlement history

**Reports**
- `GET /groups/:id/reports/monthly` - Monthly expense summary
- `GET /groups/:id/reports/category` - Breakdown by category
- `GET /groups/:id/reports/person` - Breakdown by person

**Recurring Expenses** (Phase 2)
- `GET /groups/:id/recurring-expenses` - List recurring expenses
- `POST /groups/:id/recurring-expenses` - Create recurring expense
- `PATCH /recurring-expenses/:id` - Update recurring expense
- `DELETE /recurring-expenses/:id` - Delete recurring expense

---

## 4. UX/UI Design

### 4.1 Design Principles
1. **Clarity** - Clear information hierarchy, obvious actions
2. **Simplicity** - Minimal clicks to complete common tasks
3. **Context-aware** - UI adapts to group type (Personal vs Household)
4. **Consistency** - Reusable components, predictable patterns
5. **Feedback** - Immediate response to user actions
6. **Delight** - Smooth animations, satisfying interactions

### 4.2 Color Palette

**Primary Colors:**
- Blue 500: `#3B82F6` (Primary buttons, links)
- Blue 600: `#2563EB` (Hover states)
- Blue 50: `#EFF6FF` (Backgrounds)

**Status Colors:**
- Green 500: `#10B981` (Success, completed tasks, "you are owed")
- Yellow 500: `#F59E0B` (Warnings, due soon)
- Red 500: `#EF4444` (Errors, overdue, "you owe")
- Gray 500: `#6B7280` (Neutral, disabled)

**Workspace Colors:**
- Personal: Cool blue (`#3B82F6`)
- Family: Warm orange (`#F97316`)
- Roommate: Teal (`#14B8A6`)

**Priority Colors:**
- High: Red (`#EF4444`)
- Medium: Yellow (`#F59E0B`)
- Low: Green (`#10B981`)

**Expense Category Colors** (Phase 2):
- Rent: Purple (`#A855F7`)
- Utilities: Blue (`#3B82F6`)
- Groceries: Green (`#10B981`)
- Entertainment: Pink (`#EC4899`)
- Household: Orange (`#F97316`)

### 4.3 Typography
- **Font Family:** Inter or System UI
- **Headings:**
  - H1: 2.25rem (36px), bold
  - H2: 1.875rem (30px), semibold
  - H3: 1.5rem (24px), semibold
- **Body:** 1rem (16px), regular
- **Small:** 0.875rem (14px), regular
- **Tiny:** 0.75rem (12px), medium

### 4.4 Layout & Navigation

**Top Navigation Bar:**
```
┌──────────────────────────────────────────────────────────┐
│ 🏠 DivvyDo  [Personal ▼]   🔍 Search   🔔   👤 User   │
└──────────────────────────────────────────────────────────┘
```

**Left Sidebar (Desktop) - Household Group:**
```
┌──────────────────────┐
│ 📊 Dashboard         │
│ ✓ Tasks              │
│ 💰 Expenses          │ ← New
│   ├─ All Expenses    │
│   ├─ Balances        │
│   └─ Reports         │
│ 🛒 Shopping Lists    │ ← Phase 2B (optional)
│ 📦 Supplies          │ ← Phase 2B (optional)
│ 🔧 Maintenance       │ ← Phase 2B (optional)
│ 📅 Calendar          │
│ 📋 House Wiki        │ ← Phase 2B (optional)
│ ⚙️ Settings          │
└──────────────────────┘
```

**Left Sidebar (Desktop) - Personal Group:**
```
┌──────────────────────┐
│ 📊 Dashboard         │
│ ✓ Tasks              │
│ 📅 Calendar          │
│ ⚙️ Settings          │
└──────────────────────┘
```

**Bottom Navigation (Mobile):**
```
┌───────┬──────────┬────────┬──────────┐
│ Tasks │ Expenses │ + Add  │ Profile  │
└───────┴──────────┴────────┴──────────┘
```

### 4.5 Key Screens

#### Dashboard (Household Group)
```
┌──────────────────────────────────────────────────────┐
│  Good morning, Sarah! 👋                             │
│  Apartment 4B                                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌───────────┬───────────┬───────────┬───────────┐  │
│  │ Tasks Due │ Overdue   │ You Owe   │ You're    │  │
│  │ Today     │ Tasks     │           │ Owed      │  │
│  │    3      │    1      │  $125.50  │  $45.00   │  │
│  │           │           │  🔴       │  🟢       │  │
│  └───────────┴───────────┴───────────┴───────────┘  │
│                                                      │
│  Quick Actions                                       │
│  [Add Task] [Add Expense] [Settle Up] [Add to List] │
│                                                      │
│  Upcoming Tasks                                      │
│  ☐ Clean bathroom (Your turn)          Due Today    │
│  ☐ Take out trash                       Due Tomorrow│
│  ☐ Pay internet bill ($100)             Due Jan 20  │
│                                                      │
│  Recent Activity                                     │
│  • John added expense: Groceries ($150)  2h ago     │
│  • Mike settled $50 with you             Yesterday  │
│  • Sarah completed "Vacuum living room"  Yesterday  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### Expense Balance Dashboard (Detailed in earlier sections)
See section 2.2 for complete expense UI mockups.

#### Task List View (Same as before, with expense link)
```
┌────────────────────────────────────────────┐
│ Filters: [All] [Active] [Completed]       │
│ Sort by: [Due Date ▼] Search: [______]    │
├────────────────────────────────────────────┤
│ ☐ Buy groceries                      [⋮]  │
│   👤 You · 📅 Today · 🟡 Medium            │
│   💰 Expense: $150 (paid by John)         │ ← Expense link
├────────────────────────────────────────────┤
│ ☐ Clean bathroom                     [⋮]  │
│   👤 Sarah · 📅 Today · 🔴 High            │
│   🔁 Weekly (rotation)                     │
└────────────────────────────────────────────┘
```

### 4.6 Interaction Patterns

**Workspace Switching:**
- Click group dropdown in top nav
- See list of all groups (Personal + household groups)
- Click to switch - entire app context changes
- Visual indicator of current group (color accent)

**Quick Add (FAB on Mobile):**
- Tap floating action button
- Choose: Add Task, Add Expense, Add Shopping Item
- Context-aware: Only shows "Add Expense" in household groups

**Balance Interactions:**
- Click on balance amount → See expense breakdown
- "Settle Up" button → Opens settlement flow
- "Remind" button → Sends gentle in-app notification

**Keyboard Shortcuts:**
- `Ctrl/Cmd + K` → Quick search
- `N` → New task
- `E` → New expense (in household group)
- `?` → Show shortcuts help
- `/` → Focus search
- `Esc` → Close modal

---

## 5. Implementation Roadmap (Legacy; Superseded)

This section reflects the original comprehensive timeline (including speculative Phase 2+ features). The **canonical MVP schedule** is the 10-week roadmap in `technical-strategy.md` (section 4). Treat the items below as a **backlog**, not a delivery plan.

### Phase 1A: Core Task Management (Weeks 1-10)

#### Week 1-2: Project Foundation
- [ ] Initialize monorepo (if planning for mobile)
- [x] Set up React + Vite + TypeScript + TailwindCSS
- [x] Configure Supabase (database, auth, storage)
- [x] Design & implement database schema (users, groups, group_members, group_people, tasks, expenses)
- [ ] Set up Prisma ORM (if custom backend)
- [x] Implement authentication (sign up, login, logout, password reset)
- [x] Create base layout (navbar, sidebar, responsive)
- [x] Configure React Query for data fetching
- [x] Set up routing (React Router)

#### Week 3-4: Core Task Management
- [x] Implement task CRUD API
- [x] Build task list view with filtering (status, assignee, priority)
- [x] Create task detail modal
- [x] Add task creation form (all fields)
- [x] Implement task status updates
- [x] Add task deletion with confirmation
- [x] Implement task refresh (polling / refetch on focus)
- [x] Add task search functionality

#### Week 5-6: Groups & Adoption
- [x] Implement household group creation
- [x] Build invitation system (shareable link/code; email optional)
- [x] Add unclaimed household members (placeholders)
- [x] Create group switcher UI (Personal / Household)
- [x] Implement group-scoped visibility (RLS policies)
- [x] Keep permissions simple (creator is admin for destructive actions only)
- [x] Create group settings page (rename, leave, delete)
- [ ] Build member management (view, invite, remove)

#### Week 7-8: Recurring Tasks & Notifications
- [x] Design recurring task data model
- [x] Build recurring task UI (frequency, days, end date)
- [x] Implement recurrence logic (generate task instances)
- [ ] Create background job (cron or edge function) for recurring tasks
- [ ] Build notification system (in-app)
- [ ] Implement notification center UI
- [ ] Add notification preferences
- [ ] Create task reminders (due soon, overdue)

#### Week 9-10: Dashboard & Polish
- [x] Design & build dashboard with stats
  - Tasks due today, overdue, completed this week
  - Upcoming tasks widget
  - Recent activity feed
  - (Balance summary placeholders for household groups)
- [x] Improve mobile responsiveness (all screens)
- [ ] Add loading states and skeleton screens
- [ ] Implement error handling and retry logic
- [ ] Add optimistic UI updates
- [x] Write unit tests (critical functions)
- [ ] Conduct user testing with 5-10 users
- [ ] Fix bugs and polish UI

---

### Phase 1B: Basic Expense Tracking (Weeks 11-16)

#### Week 11-12: Expense Foundation
- [x] Design expense database schema (expenses, splits, settlements, categories)
- [x] Create default expense categories (Rent, Utilities, Groceries, etc.)
- [x] Implement expense CRUD API
- [x] Build "Add Expense" form
  - Description, amount, paid by, date, category
  - Equal split + custom exact splits (MVP)
  - Select participants (who benefited; may include payer)
- [x] Add receipt upload functionality
- [x] Create expense list view (history)
- [x] Implement expense detail view
- [x] Add expense search/filtering

#### Week 13-14: Balances & Settlements
- [x] Implement balance calculation logic
  - Who owes whom
  - Net balances (pairwise, no debt simplification in MVP)
- [x] Create balance dashboard UI
  - Visual "You owe" and "You are owed" sections
  - Breakdown by person
- [x] Build "Settle Up" flow
  - Select amount (full or partial)
  - Payment method dropdown
  - Record settlement
- [x] Add settlement history view
- [ ] Implement real-time balance updates

#### Week 15-16: Expense Polish & Integration
- [x] Add expense filtering (by category, person, date range)
- [x] Create monthly expense summary
- [ ] Add expense notifications (new expense, settlement)
- [ ] **Integration: Link tasks to expenses**
  - Optional expense field on tasks
  - "Convert task to expense" feature
- [ ] Improve expense mobile UI
- [x] Write tests for balance calculation
- [ ] Conduct expense feature testing with beta roommate users
- [ ] Fix bugs and polish
- [ ] **MILESTONE: Full MVP Launch**
  - Deploy to production
- Onboard first 50 users (roommate households first; families can opt in)

---

### Phase 2A: Advanced Expense Features (Weeks 17-22)

#### Week 17-18: Advanced Split Methods
- [x] Add percentage-based splitting
- [x] Create shares-based splitting
- [x] Build adjustment method (reimbursement)
- [x] Update "Add Expense" UI for advanced methods
- [x] Add split validation for percentage/shares

#### Week 19-20: Recurring Expenses & Reports
- [x] Design recurring expense system
- [x] Build recurring expense templates
- [ ] Implement auto-generation of recurring expenses (cron job)
- [ ] Create expense reports page
  - By category (pie chart)
  - By person (bar chart)
  - Spending trends (line chart over time)
- [ ] Add export functionality (CSV, PDF)

#### Week 21-22: Debt Simplification & Groups
- [ ] Implement debt simplification algorithm
  - Minimize number of transactions
  - Example: A→B→C becomes A→C
- [ ] Create expense groups (e.g., "Weekend Trip")
- [ ] Add multi-currency support
- [ ] Implement payment reminders (configurable)
- [ ] Add expense activity log
- [ ] Conduct user testing
- [ ] Fix bugs and optimize performance

---

### Phase 2B: Roommate-Specific Features (Weeks 23-26)

#### Week 23: Shopping Lists & Supplies
- [ ] Build collaborative shopping list
- [ ] Add items with optional prices
- [ ] "Convert to expense" feature (create expense from shopping trip)
- [ ] Create supply inventory system
  - Items, stock levels (Full/Low/Out)
  - Last purchased by tracking
- [ ] Add low stock alerts
- [ ] Implement purchase history

#### Week 24: Cleaning Rotation
- [ ] Design rotation algorithm (fair task assignment)
- [ ] Build rotation scheduler UI
- [ ] Implement auto-assign for recurring tasks
- [ ] Add rotation history (accountability)
- [ ] Create swap request feature (trade weeks)
- [ ] Skip tracking (extra assignment if skipped)

#### Week 25: Utilities & Maintenance
- [ ] Build utility tracker
  - Track bills over time
  - Month-over-month comparison charts
  - Auto-split utilities
- [ ] Create maintenance tracker
  - Report issues (with photos)
  - Track status (Reported → Fixed)
  - Landlord communication log

#### Week 26: House Wiki & Move Management
- [ ] Build house wiki/knowledge base
  - WiFi, trash schedule, emergency contacts
  - Editable by all, version history
- [ ] Create move-in/move-out checklists
- [ ] Add house inventory (who owns what)
- [ ] Implement lease tracking (dates, rent, deposit)
- [ ] Build final settlement calculator

---

### Phase 2C: Enhanced Task Features (Weeks 23-28)
**Can run parallel with Phase 2B**

#### Week 23-24: Multiple Views
- [ ] Implement Kanban board view (drag-and-drop)
- [ ] Create calendar view (month/week/day)
- [ ] Add view persistence (remember user preference)

#### Week 25-26: Dependencies & Templates
- [ ] Design task dependency system
- [ ] Implement dependency linking UI
- [ ] Add blocking logic (can't complete if dependency pending)
- [ ] Prevent circular dependencies (validation)
- [ ] Build task template system
- [ ] Create template library

#### Week 27-28: Comments, Attachments & Projects
- [ ] Implement comment threads on tasks
- [ ] Add @mentions in comments
- [ ] Build file attachment system (beyond receipts)
- [ ] Create project/task grouping
- [ ] Add timeline/Gantt view (for dependencies)
- [ ] Implement bulk actions
- [ ] Add activity log/history
- [ ] **Gamification (optional, likely family-leaning):**
  - Points system
  - Leaderboard

---

### Phase 3: Mobile Apps (Weeks 29-44)

#### Week 29-32: React Native Setup
- [ ] Set up monorepo structure (Turborepo or pnpm workspaces)
  - `packages/web`, `packages/mobile`, `packages/shared`
- [ ] Initialize Expo project (managed workflow)
- [ ] Configure React Navigation
- [ ] Set up EAS Build & Submit
- [ ] Implement authentication flow (mobile)
- [ ] Create base layouts and components
- [ ] Adapt shared business logic

#### Week 33-36: Core Features (Mobile)
- [ ] Adapt task management for mobile
  - List view, task detail, create/edit
- [ ] Build expense tracking UI (mobile)
  - Expense list, balance dashboard, add expense, settle up
- [ ] Implement group switcher
- [ ] Add pull-to-refresh
- [ ] Create swipe gestures (complete task, delete)
- [ ] Build floating action buttons (add task, add expense)

#### Week 37-40: Mobile-Specific Features
- [ ] Implement offline mode (SQLite + sync)
- [ ] Add push notifications (task assignments, balances, settlements)
- [ ] Integrate camera
  - Scan receipts (OCR with ML Kit or Tesseract)
  - Photo attachments for tasks/maintenance
- [ ] Create home screen widgets (today's tasks, balances)
- [ ] Add quick actions (3D Touch, long-press shortcuts)
- [ ] Optimize performance (FlatList virtualization, memoization)

#### Week 41-44: Testing & Launch
- [ ] Beta testing (TestFlight + Google Play Beta)
  - Recruit 50 beta testers
- [ ] Fix bugs and improve UX based on feedback
- [ ] Create app store assets (screenshots, description, video)
- [ ] Write privacy policy and terms of service
- [ ] Submit to App Store and Google Play
- [ ] Monitor crashes and reviews
- [ ] Launch marketing campaign (ProductHunt, social media)
- [ ] Onboard first 200 mobile users
- [ ] **MILESTONE: Mobile Launch**

---

## 6. Success Metrics

### Key Performance Indicators (KPIs)

#### User Engagement
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- Average session duration
- Tasks created per user per week
- Tasks completed per user per week
- **Expenses tracked per roommate per week**
- **Settlements recorded per roommate per month**

#### Group Engagement
- Average group size (roommate vs other household types)
- Active groups (at least 1 task or expense created/week)
- Tasks per group per week
- **Expenses per roommate group per week**
- **Average expense amount per roommate group per month**
- Comments per task (engagement indicator)

#### Retention
- Day 1, Day 7, Day 30 retention rates
- Churn rate
- Re-engagement rate (lapsed users returning)

#### Performance
- Page load time (< 2 seconds)
- Time to interactive (< 3 seconds)
- Real-time sync latency (< 500ms)
- Mobile app launch time (< 1 second)
- Balance calculation time (< 100ms for 100 expenses)

#### Quality
- Crash-free rate (> 99%)
- Error rate (< 1%)
- User-reported bugs per week
- Average bug resolution time

### Success Targets

**Month 1 (After Phase 1B - Week 16):**
- 50 registered users (mostly roommate households; families incidental)
- 20 active groups (mostly roommate households)
- 500+ tasks created
- 200+ expenses tracked (roommates)
- $10,000+ in total expenses tracked
- 70%+ task completion rate
- 60%+ Day 7 retention
- < 2s average page load
- 4.5+ star rating (beta feedback)

**Month 3 (After Phase 2):**
- 200+ users
- 80+ active groups
- 2,000+ tasks
- 1,000+ expenses
- $50,000+ in expenses tracked
- 500+ settlements recorded
- 65%+ Day 7 retention
- 4.5+ App Store/Play Store rating

**Month 6 (After Phase 3 - Mobile Launch):**
- 1,000+ users
- 400+ active groups
- 10,000+ tasks
- 5,000+ expenses
- $250,000+ in expenses tracked
- 70%+ Day 7 retention
- 50,000+ app downloads
- Featured on ProductHunt

---

## 7. Risks & Mitigation

### Technical Risks

**Risk: Real-time sync failures**
- Mitigation: Robust error handling, automatic reconnection, offline mode
- Fallback: Polling-based updates if WebSocket fails

**Risk: Balance calculation errors (critical for roommates)**
- Mitigation: Extensive unit tests, double-entry accounting principles
- Monitoring: Log all balance calculations, alert on anomalies
- Fallback: Manual balance adjustment by admin (last resort)

**Risk: Database performance degradation with growth**
- Mitigation: Proper indexing, query optimization, pagination
- Monitoring: Set up alerts for slow queries (> 500ms)
- Scaling: Read replicas, caching layer (Redis)

**Risk: File storage costs (receipts, photos)**
- Mitigation: Compression, file size limits (10MB), storage quotas (1GB per group)
- Fallback: Optional file attachments (not required)

**Risk: Mobile app rejection (App Store/Play Store)**
- Mitigation: Follow platform guidelines, thorough testing, clear privacy policy
- Contingency: Web app works well on mobile browsers

### Product Risks

**Risk: Low roommate adoption (competitive market)**
- Mitigation: Focus on unique combo (tasks + expenses), superior UX
- Marketing: Target college subreddits, Facebook housing groups
- Differentiation: Only app that does BOTH tasks and expenses seamlessly

**Risk: Expense tracking complexity (users don't understand split methods)**
- Mitigation: Start with equal + exact (simple + flexible), progressive disclosure for percentage/shares
- UX: Clear tooltips, examples, onboarding tutorial
- Support: In-app help, video tutorials

**Risk: Feature bloat (too complex for roommates who just want basics)**
- Mitigation: Context-aware UI (hide expense features outside household groups)
- Philosophy: Workspace-based feature sets
- Testing: User testing primarily with roommates; a few families if available

**Risk: Privacy concerns (sensitive financial data)**
- Mitigation: Clear privacy policy, encryption at rest and in transit
- Transparency: Explain data usage, provide export/delete options
- Compliance: GDPR-ready, SOC 2 (if scaling commercially)

**Risk: Roommate conflicts escalated by app**
- Mitigation: Gentle UX (avoid accusatory language), optional reminders
- Social: "Settle up" vs "You owe!" language
- Support: Conflict resolution tips in help docs

### Business Risks

**Risk: Scaling costs (infrastructure)**
- Mitigation: Start with generous free tiers (Supabase, Vercel)
- Monitoring: Track costs per user, optimize queries, implement caching
- Monetization: Premium tier to cover costs

**Risk: Competitor saturation (Splitwise, Todoist, etc.)**
- Mitigation: Unique positioning (private-first tasks + shared household expenses)
- Differentiation: Real-time collaboration, superior UX
- Network effects: Viral loops (invite roommates/housemates)

**Risk: Monetization challenges**
- Future: Freemium model
  - Free: Personal + 1 household group, unlimited tasks/expenses, 100MB storage, CSV export, no ads
  - Pro ($5/month): Unlimited groups, higher storage, advanced reports
  - Plus ($10/month): Higher limits + analytics + optional API access

---

## 8. Future Enhancements (Post-Launch)

### Advanced Features
- **AI-powered:**
  - Expense categorization (auto-categorize "Whole Foods" as Groceries)
  - Task suggestions ("You haven't cleaned bathroom in 2 weeks")
  - Spending insights ("You spent 20% more on groceries this month")
  - Fair split recommendations (based on usage patterns)
- **Voice input:**
  - "Add $50 grocery expense paid by me, split equally"
  - "Create task: clean bathroom, due tomorrow"
- **Smart notifications:**
  - ML-based timing (send rent reminder when user is most likely to pay)
- **Multi-group support:**
  - Manage multiple households (roommate or family)
- **Integrations:**
  - Google Calendar, Apple Calendar (sync tasks and bill due dates)
  - Venmo, Zelle API (auto-detect payments, create settlement records)
  - Bank account linking (Plaid) - auto-import transactions
  - IFTTT, Zapier (automation)
- **Advanced reporting:**
  - Tax export (for roommates deducting home office)
  - Spending trends, forecasting
  - Custom reports

### Platform Expansion
- **Desktop apps:** Electron or Tauri (native macOS, Windows, Linux)
- **Browser extension:** Quick add task/expense from any page
- **Smartwatch app:** Apple Watch, Wear OS (quick task complete, balance check)
- **Voice assistants:** Alexa, Google Home (example: "Ask DivvyDo who I owe money to")

### Monetization
**Free Tier:**
- Personal + 1 household group
- Unlimited tasks and expenses
- 100MB storage (receipts)
- Basic reports
- CSV export (always available)
- No ads

**Pro Tier ($5/month or $50/year):**
- Unlimited household groups
- 1GB storage
- Advanced reports (exports beyond CSV, e.g., PDF)
- Priority support
- Recurring expense automation
- Debt simplification

**Plus Tier ($10/month or $100/year):**
- Unlimited groups + higher storage
- All Pro features
- Advanced analytics
- API access (if needed)

**Lifetime Deal ($199 one-time):**
- All Pro features forever
- Early adopter badge
- Influence on roadmap

---

## 9. Getting Started (For Developers)

### Prerequisites
- Node.js 20+
- pnpm (or npm/yarn)
- Git
- Supabase account (free tier)
- Vercel account (optional, for deployment)

### Initial Setup

1. **Create new project:**
   ```bash
   pnpm create vite app --template react-ts
   cd app
   pnpm install
   ```

2. **Install dependencies:**
   ```bash
   # Core dependencies
   pnpm add @supabase/supabase-js @tanstack/react-query react-router-dom zustand
   pnpm add react-hook-form @hookform/resolvers zod
   pnpm add date-fns recharts

   # Development dependencies
   pnpm add -D tailwindcss postcss autoprefixer
   pnpm add -D @types/node

   # Initialize Tailwind
   npx tailwindcss init -p
   ```

3. **Configure Supabase:**
   - Create project at supabase.com
   - Copy project URL and anon key
   - Create `.env.local`:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

4. **Set up database schema:**
   - Use the schema and RLS from `technical-strategy.md` (section 2.2–2.3)
   - Run migrations in Supabase SQL editor (in order):
     1. Core tables (users, groups, group_members, group_people, tasks)
     2. Expense tables
     3. Indexes and RLS policies

5. **Run development server:**
   ```bash
   pnpm dev
   ```

6. **Build for production:**
   ```bash
   pnpm build
   pnpm preview
   ```

### Recommended Project Structure
```
app/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── tasks/           # Task components
│   │   ├── expenses/        # Expense components (new)
│   │   ├── layout/          # Navbar, Sidebar, etc.
│   │   └── common/          # Shared components
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Tasks.tsx
│   │   ├── Expenses.tsx     # New
│   │   ├── Balances.tsx     # New
│   │   ├── Settings.tsx
│   │   └── Auth.tsx
│   ├── hooks/
│   │   ├── useTasks.ts
│   │   ├── useExpenses.ts   # New
│   │   ├── useBalances.ts   # New
│   │   ├── useAuth.ts
│   │   └── useWorkspace.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── queries.ts
│   │   ├── balanceCalculator.ts  # New (balance logic)
│   │   └── utils.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── tasks.ts
│   │   └── expenses.ts      # New
│   ├── store/
│   │   └── group.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── .env.local
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 10. Conclusion

This plan outlines a comprehensive **dual-purpose task + expense management application** with:

✅ **Clear problem definition** - Solving coordination and financial tracking pain points for roommates; families are incidental

✅ **Unique positioning** - Only app combining task management with Splitwise-like expense splitting

✅ **Thoughtful UX** - Context-aware interface adapting to Personal vs Household groups

✅ **Scalable architecture** - Modern tech stack (React, Supabase, TypeScript, React Native)

✅ **Phased approach** - MVP (16 weeks) → Enhanced features → Mobile apps

✅ **Real-time collaboration** - Instant updates for tasks and balances across devices

✅ **Mobile-first future** - React Native for cross-platform apps with offline support

✅ **Strong monetization path** - Freemium model with clear value proposition

### Key Differentiators:
1. **Tasks + Expenses in one app** - No context switching between Todoist and Splitwise
2. **Workspace-based context** - Same app, same features for roommates; families incidental
3. **Real-time everything** - Tasks and balances update instantly
4. **Fair & transparent** - Automated rotation, clear balances, settlement tracking
5. **Move-in to move-out** - Complete roommate lifecycle management

### Next Steps:
1. ✅ **Review and validate this plan** primarily with roommates; include a few families if available
2. 🚀 **Set up development environment** (Week 1)
3. 💻 **Begin implementation** - Start with core task management (Weeks 1-10)
4. 💰 **Add expense tracking** (Weeks 11-16)
5. 📱 **Launch MVP** and gather feedback
6. 📈 **Iterate based on user data**

### Success Criteria:
- **Launch web MVP within 16 weeks** (tasks + expenses)
- **Onboard 50 users in Month 1** (roommate households first; families incidental)
- **Track $10,000+ in expenses** in first month (roommates)
- **Achieve 60%+ Day 7 retention**
- **Launch mobile apps by Month 10**
- **Reach 1,000 users by Month 6**

---

**Document Version:** 2.0 (Updated with Roommate Features & Expense Tracking)
**Last Updated:** January 4, 2026
**Author:** Claude + Harish M
**Status:** Implementation in progress

**Changelog:**
- v2.0: Added roommate use case, expense tracking (Splitwise alternative), roommate-specific features (shopping lists, supplies, maintenance, house wiki, lease management), updated database schema, revised roadmap to 16-week MVP
- v1.0: Initial task plan; refocused to roommates + expenses
