import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, type Notification } from '../../contexts/NotificationContext';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { Button } from '../common/DesignSystem';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef as React.RefObject<HTMLElement>, onClose);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task_assigned':
      case 'task_completed':
      case 'task_due':
        return '📝';
      case 'expense_added':
      case 'expense_owed':
        return '💰';
      case 'settlement_received':
        return '💸';
      case 'group_invite':
        return '👥';
      case 'recurring_generated':
        return '🔁';
      default:
        return '🔔';
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      onClose();
    }
  };

  // Show only recent notifications (last 30 days)
  const recentNotifications = notifications.filter(notification => {
    const notificationDate = new Date(notification.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return notificationDate >= thirtyDaysAgo;
  }).slice(0, 10);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-2 w-96 max-h-96 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="ghost"
                size="sm"
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">We'll notify you when something happens!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group ${
                      !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {notification.actionUrl ? (
                      <Link to={notification.actionUrl} className="block">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm">
                            {getNotificationIcon(notification.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                              {notification.title}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                              {getTimeAgo(notification.createdAt)}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              clearNotification(notification.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>

                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm">
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                            {notification.title}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                            {getTimeAgo(notification.createdAt)}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>

                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {recentNotifications.length > 0 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <Link
                to="/settings"
                onClick={onClose}
                className="block w-full text-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Notification settings →
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}