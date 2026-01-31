<div align="center">

# 💰 DivvyDo — Roommate Expense Manager

### Penny-perfect expense splitting for shared households

Split bills, track balances, and settle up—built for roommates who don't want spreadsheets.

[Overview](#-overview) • [Demo](#-demo) • [Features](#-features) • [Getting Started](#-getting-started) • [Testing](#-testing)

</div>

---

## 🎯 Overview

**DivvyDo** is a production-ready expense management app designed for roommates and shared households. No more awkward conversations about who owes what—track expenses, split bills using 5 different methods, and settle balances with confidence.

### The Problem
- 💸 Manual expense tracking in spreadsheets is error-prone
- 🧮 Calculating fair splits across multiple people is tedious
- 💰 Tracking who owes whom becomes messy with multiple transactions
- 📱 Existing apps are overcomplicated or charge fees

### The Solution
DivvyDo provides:
- **5 split methods** for any scenario (equal, exact, percentage, shares, adjustment)
- **Penny-perfect rounding** ensuring cents never disappear or duplicate
- **Automatic balance calculation** showing net and pairwise balances
- **Receipt uploads** with Supabase Storage integration
- **Admin tooling** for managing household members and exporting data

---

## 🎬 Demo

### 📹 Video Walkthrough

> **Coming Soon**: 90-second demo showing expense splitting and balance calculation

### 📸 Screenshots

**Expense Split Interface**
![Expense Splitting](./docs/screenshots/expense-split.png)
*5 split methods: equal, exact, percentage, shares, and adjustment*

**Balance Dashboard**
![Balance View](./docs/screenshots/balances.png)
*Net and pairwise balances with settlement tracking*

**Admin Tools**
![Admin Panel](./docs/screenshots/admin-tools.png)
*CSV exports, people merging, and invite management*

### 🚀 Try It Locally

Follow the [Getting Started](#-getting-started) guide below to run locally.

---

## ✨ Features

### 💸 Expense Management

**5 Split Methods** — Handle any splitting scenario:
1. **Equal**: Split evenly among N people (e.g., $100 ÷ 4 = $25 each)
2. **Exact**: Specify exact amounts per person (e.g., Alice $30, Bob $70)
3. **Percentage**: Split by percentages (e.g., Alice 60%, Bob 40%)
4. **Shares**: Weight-based splitting (e.g., Alice 2 shares, Bob 1 share)
5. **Adjustment**: Fixed adjustments on top of equal split (e.g., +$5 for Alice, -$5 for Bob)

**Penny-Perfect Rounding**:
- Ensures total split amounts always equal the original expense
- Distributes rounding errors fairly (largest-remainder method)
- Example: $100 split 3 ways → $33.34, $33.33, $33.33 (not $33.33 × 3 = $99.99)

**Receipt Uploads**:
- Upload photos via Supabase Storage
- Public bucket with row-level security
- Automatic file validation and size limits

**Recurring Templates**:
- Save frequently used expenses (rent, utilities, subscriptions)
- Manual generation (automated cron coming soon)

### 📊 Balance Tracking

**Net Balances**:
- See who owes money overall vs. who is owed
- Visual indicators (red for owes, green for owed)

**Pairwise Balances**:
- Detailed breakdown of who owes whom
- Example: "Alice owes Bob $45.67"

**Settlement Recording**:
- Mark balances as settled when paid
- Keeps audit trail of all transactions

### 🏠 Household Management

**Groups**:
- Personal group for individual expenses
- Household groups for shared expenses
- Quick group switcher
- Rename, leave, or delete groups (admin only)

**Invite System**:
- Generate invite codes with expiration
- Email-based placeholder creation
- Automatic placeholder claim on signup

**Admin Tools**:
- **CSV Exports**: Download all expenses with full details
- **Merge People**: Combine duplicate entries with audit logs
- **Placeholder Management**: Convert email placeholders to real users

### ✅ Task Management

**Basic Task Tracking**:
- Create, edit, and delete tasks
- Assign to household members
- Set status (todo, in progress, done) and priority
- Filters and search
- Recurring task templates

---

## 🏗️ Architecture

### Tech Stack

**Frontend**:
- React 19 with TypeScript
- Vite for build tooling
- React Router for navigation
- Vitest + React Testing Library for testing

**Backend**:
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Row-Level Security for data protection
- Edge Functions for server-side logic

**Testing**:
- 25 test files covering:
  - Financial calculation logic
  - Balance computation
  - Component rendering
  - Split method accuracy

### Database Schema

```
users
├── id (uuid, PK)
├── email (text)
├── name (text)
└── created_at (timestamp)

groups
├── id (uuid, PK)
├── name (text)
├── created_by (uuid, FK → users)
└── created_at (timestamp)

group_members
├── group_id (uuid, FK → groups)
├── user_id (uuid, FK → users)
├── role (text: 'admin' | 'member')
└── joined_at (timestamp)

expenses
├── id (uuid, PK)
├── group_id (uuid, FK → groups)
├── description (text)
├── amount (numeric)
├── payer_id (uuid, FK → users)
├── split_method (text)
├── split_details (jsonb)
├── receipt_url (text)
└── created_at (timestamp)

balances
├── group_id (uuid, FK → groups)
├── user_from (uuid, FK → users)
├── user_to (uuid, FK → users)
├── amount (numeric)
└── updated_at (timestamp)
```

### Split Method Implementation

All split calculations are in `/src/utils/splitCalculations.ts`:

```typescript
export function calculateSplit(
  amount: number,
  method: SplitMethod,
  participants: Participant[]
): SplitResult[] {
  // Returns array of {userId, amount} ensuring sum equals original amount
}
```

**Rounding Algorithm** (Largest Remainder Method):
1. Calculate ideal amounts (may have fractions)
2. Round down all amounts to nearest cent
3. Calculate total shortage
4. Distribute shortage (1 cent each) to participants with largest remainders

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/harishm17/task-manager.git
cd task-manager

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file based on `.env.example`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

1. Create a Supabase project
2. Apply migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

3. Create storage bucket:
   - Go to Supabase Dashboard → Storage
   - Create a public bucket named `receipts`
   - Enable RLS policies

### Edge Functions

Deploy Edge Functions for admin operations:

```bash
# Deploy accept-invite function
supabase functions deploy accept-invite

# Deploy merge-people function
supabase functions deploy merge-people
```

### Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

---

## 🧪 Testing

**Test Suite**: 25 test files with comprehensive coverage

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Categories

**Unit Tests**:
- `splitCalculations.test.ts` — All 5 split methods
- `balanceCalculations.test.ts` — Net and pairwise balance logic
- `roundingAlgorithm.test.ts` — Penny-perfect rounding

**Component Tests**:
- `ExpenseForm.test.tsx` — Form validation and submission
- `BalanceCard.test.tsx` — Balance display rendering
- `SplitMethodSelector.test.tsx` — Split method UI

**Integration Tests**:
- `ExpenseFlow.test.tsx` — Full expense creation and balance update
- `SettlementFlow.test.tsx` — Settlement recording workflow

### Example Test

```typescript
describe('Equal Split Method', () => {
  it('should split $100 equally among 3 people with correct rounding', () => {
    const result = calculateSplit(100, 'equal', [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' }
    ]);

    expect(result).toEqual([
      { userId: '1', amount: 33.34 },
      { userId: '2', amount: 33.33 },
      { userId: '3', amount: 33.33 }
    ]);

    // Verify total equals original amount
    const total = result.reduce((sum, r) => sum + r.amount, 0);
    expect(total).toBe(100);
  });
});
```

---

## 🛠️ Development Scripts

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

---

## 📦 Deployment

### Deploy to Netlify

1. Create `netlify.toml` (already included)
2. Connect GitHub repository to Netlify
3. Configure environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Build Command

```bash
npm run build
```

**Output**: `dist/` directory

---

## 🚧 Roadmap

### Current Progress

✅ Auth + profile (signup, signin, password reset)
✅ Groups (personal + household, switcher, admin controls)
✅ Tasks (create/edit/delete, assignees, filters, recurring)
✅ Expenses (5 split methods, receipts, recurring, reports)
✅ Balances (net + pairwise, settlement recording)
✅ Admin tools (invites, placeholders, merge, CSV exports)
✅ Test suite (25 test files)

### Not Yet Implemented

⬜ Real-time updates (Supabase Realtime)
⬜ Notifications (in-app + email)
⬜ Automated recurring generation (cron jobs)
⬜ Mobile app (React Native)
⬜ Budget tracking
⬜ Expense categories with budgets

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Harish Manoharan**
- GitHub: [@harishm17](https://github.com/harishm17)
- LinkedIn: [linkedin.com/in/harishm17](https://linkedin.com/in/harishm17)
- Email: harish.manoharan@utdallas.edu
- Portfolio: [harishm17.github.io](https://harishm17.github.io)

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend infrastructure
- [Vite](https://vitejs.dev/) - Build tooling
- [React](https://reactjs.org/) - UI framework
- [Vitest](https://vitest.dev/) - Testing framework

---

**Built for roommates, by someone who knows the pain of splitting bills.**
