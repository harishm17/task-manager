import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { showInfo } from '../components/common/ToastProvider';

export type NotificationType = 'task_assigned' | 'task_due' | 'task_completed' | 'expense_added' | 'expense_owed' | 'settlement_received' | 'group_invite' | 'recurring_generated';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const STORAGE_KEY = 'divvydo.notifications';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const notificationsWithDates = parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        }));
        setNotifications(notificationsWithDates);
      } catch (error) {
        console.error('Failed to parse stored notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const notification: Notification = {
      ...notificationData,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: new Date(),
    };

    setNotifications(prev => [notification, ...prev]);

    // Show toast for important notifications
    if (notification.type === 'task_due' || notification.type === 'expense_owed') {
      showInfo(notification.title, notification.message);
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// Helper functions to create common notifications
export const notificationHelpers = {
  taskAssigned: (taskTitle: string, assigneeName: string, taskId: string) => ({
    type: 'task_assigned' as NotificationType,
    title: 'Task Assigned',
    message: `${assigneeName} assigned you to "${taskTitle}"`,
    actionUrl: `/tasks`,
    data: { taskId },
  }),

  taskDue: (taskTitle: string, dueDate: string, taskId: string) => ({
    type: 'task_due' as NotificationType,
    title: 'Task Due Soon',
    message: `"${taskTitle}" is due ${dueDate}`,
    actionUrl: `/tasks`,
    data: { taskId },
  }),

  taskCompleted: (taskTitle: string, completedBy: string, taskId: string) => ({
    type: 'task_completed' as NotificationType,
    title: 'Task Completed',
    message: `${completedBy} completed "${taskTitle}"`,
    actionUrl: `/tasks`,
    data: { taskId },
  }),

  expenseAdded: (description: string, amount: string, expenseId: string) => ({
    type: 'expense_added' as NotificationType,
    title: 'New Expense',
    message: `"${description}" for ${amount} was added`,
    actionUrl: `/expenses`,
    data: { expenseId },
  }),

  expenseOwed: (amount: string, payerName: string, expenseId: string) => ({
    type: 'expense_owed' as NotificationType,
    title: 'You Owe Money',
    message: `You owe ${amount} from ${payerName}`,
    actionUrl: `/balances`,
    data: { expenseId },
  }),

  settlementReceived: (amount: string, fromName: string, settlementId: string) => ({
    type: 'settlement_received' as NotificationType,
    title: 'Payment Received',
    message: `${fromName} paid you ${amount}`,
    actionUrl: `/balances`,
    data: { settlementId },
  }),

  groupInvite: (groupName: string, inviterName: string) => ({
    type: 'group_invite' as NotificationType,
    title: 'Group Invitation',
    message: `${inviterName} invited you to join "${groupName}"`,
    actionUrl: `/settings`,
  }),

  recurringGenerated: (type: 'task' | 'expense', title: string, id: string) => ({
    type: 'recurring_generated' as NotificationType,
    title: `Recurring ${type === 'task' ? 'Task' : 'Expense'} Created`,
    message: `New ${type}: "${title}" was automatically created`,
    actionUrl: type === 'task' ? '/tasks' : '/expenses',
    data: { id },
  }),
};