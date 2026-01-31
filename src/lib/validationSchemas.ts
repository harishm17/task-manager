import { z } from 'zod';

// Task validation schemas
export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().optional(),
  assigned_to_person_id: z.string().optional(),
});

export const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().optional(),
  assigned_to_person_id: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  recurring_interval: z.number().min(1).max(365).default(1),
  recurring_end_date: z.string().optional(),
});

export const recurringTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assigned_to_person_id: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().min(1).max(365).default(1),
  next_occurrence: z.string().min(1, 'Next occurrence date is required'),
  end_date: z.string().optional(),
});

// Expense validation schemas
export const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  amount_cents: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  category_id: z.string().optional(),
  paid_by_person_id: z.string().min(1, 'Who paid is required'),
  expense_date: z.string().min(1, 'Date is required'),
  split_method: z.enum(['equal', 'exact', 'percentage', 'shares', 'adjustment']).default('equal'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export const expenseFormSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  amount: z.string().min(1, 'Amount is required').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Amount must be a positive number'
  ),
  category_id: z.string().optional(),
  paid_by_person_id: z.string().min(1, 'Who paid is required'),
  expense_date: z.string().min(1, 'Date is required'),
  split_method: z.enum(['equal', 'exact', 'percentage', 'shares', 'adjustment']).default('equal'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  recurring_interval: z.number().min(1).max(365).default(1),
  recurring_end_date: z.string().optional(),
});

// Split validation schemas
export const equalSplitSchema = z.object({
  participants: z.array(z.string()).min(1, 'At least one participant required'),
});

export const exactSplitSchema = z.object({
  splits: z.array(z.object({
    person_id: z.string(),
    amount: z.number().min(0, 'Amount cannot be negative'),
  })).min(1, 'At least one split required'),
}).refine(
  (data) => {
    const total = data.splits.reduce((sum, split) => sum + split.amount, 0);
    return total > 0;
  },
  'Total split amount must be greater than 0'
);

export const percentageSplitSchema = z.object({
  splits: z.array(z.object({
    person_id: z.string(),
    percentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100'),
  })).min(1, 'At least one split required'),
}).refine(
  (data) => {
    const total = data.splits.reduce((sum, split) => sum + split.percentage, 0);
    return Math.abs(total - 100) < 0.01; // Allow for small floating point errors
  },
  'Percentages must total 100%'
);

export const sharesSplitSchema = z.object({
  splits: z.array(z.object({
    person_id: z.string(),
    shares: z.number().min(0.1, 'Shares must be at least 0.1'),
  })).min(1, 'At least one split required'),
}).refine(
  (data) => {
    const total = data.splits.reduce((sum, split) => sum + split.shares, 0);
    return total > 0;
  },
  'Total shares must be greater than 0'
);

// Group validation schemas
export const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(255, 'Group name must be less than 255 characters'),
  type: z.enum(['personal', 'household']).default('household'),
  default_currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
});

export const householdGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(255, 'Group name must be less than 255 characters'),
});

// User validation schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

// Invitation validation schemas
export const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const acceptInviteSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(255, 'Display name must be less than 255 characters'),
});

// Settings validation schemas
export const userProfileSchema = z.object({
  name: z.string().max(255, 'Name must be less than 255 characters').optional(),
  email: z.string().email('Please enter a valid email address'),
});

export const groupSettingsSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(255, 'Group name must be less than 255 characters'),
  default_currency: z.string().length(3, 'Currency must be 3 characters'),
});

// Search validation schemas
export const searchQuerySchema = z.string().max(100, 'Search query too long');

// Type exports for TypeScript
export type TaskFormData = z.infer<typeof taskFormSchema>;
export type ExpenseFormData = z.infer<typeof expenseFormSchema>;
export type GroupFormData = z.infer<typeof groupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type UserProfileFormData = z.infer<typeof userProfileSchema>;
export type InviteFormData = z.infer<typeof inviteSchema>;
