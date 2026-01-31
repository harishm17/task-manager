import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { AnimatePresence, motion } from 'framer-motion';
import { useGroups } from '../../contexts/GroupContext';
import { useAuth } from '../../contexts/AuthContext';
import { fetchTasks } from '../../lib/api/tasks';
import { fetchExpenses } from '../../lib/api/expenses';
import { fetchGroupPeople } from '../../lib/api/groupPeople';
import { hasSupabaseEnv } from '../../lib/supabaseClient';
import { Input } from '../common/DesignSystem';

interface SearchResult {
  id: string;
  type: 'task' | 'expense' | 'person';
  title: string;
  subtitle: string;
  url: string;
  metadata?: Record<string, any>;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const { activeGroup } = useGroups();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const groupId = activeGroup?.id;

  // Fetch all searchable data
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', groupId],
    queryFn: () => fetchTasks(groupId || ''),
    enabled: Boolean(groupId && hasSupabaseEnv && isOpen),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => fetchExpenses(groupId || ''),
    enabled: Boolean(groupId && hasSupabaseEnv && isOpen),
  });

  const { data: people = [] } = useQuery({
    queryKey: ['group-people', groupId],
    queryFn: () => fetchGroupPeople(groupId || ''),
    enabled: Boolean(groupId && hasSupabaseEnv && isOpen),
  });

  // Prepare search data
  const searchData = useMemo(() => {
    const results: SearchResult[] = [];

    // Add tasks
    tasks.forEach(task => {
      results.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        subtitle: `Task • ${task.status.replace('_', ' ')} • ${task.priority}`,
        url: '/tasks',
        metadata: {
          status: task.status,
          priority: task.priority,
          assignedTo: task.assigned_to_person_id,
          dueDate: task.due_date,
        },
      });
    });

    // Add expenses
    expenses.forEach(expense => {
      results.push({
        id: `expense-${expense.id}`,
        type: 'expense',
        title: expense.description,
        subtitle: `Expense • $${(expense.amount_cents / 100).toFixed(2)} • ${expense.expense_date}`,
        url: '/expenses',
        metadata: {
          amount: expense.amount_cents,
          date: expense.expense_date,
          category: expense.category?.name,
          paidBy: expense.paid_by_person?.display_name,
        },
      });
    });

    // Add people
    people.forEach(person => {
      if (person.user_id !== user?.id) { // Don't include current user
        results.push({
          id: `person-${person.id}`,
          type: 'person',
          title: person.display_name,
          subtitle: person.email ? `Person • ${person.email}` : 'Person',
          url: '/settings', // Could link to person profile in future
          metadata: {
            email: person.email,
            isCurrentUser: person.user_id === user?.id,
          },
        });
      }
    });

    return results;
  }, [tasks, expenses, people, user]);

  // Setup Fuse.js search
  const fuse = useMemo(() => {
    return new Fuse(searchData, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'subtitle', weight: 0.3 },
        { name: 'metadata.category', weight: 0.2 },
        { name: 'metadata.paidBy', weight: 0.1 },
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
    });
  }, [searchData]);

  // Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const results = fuse.search(query);
    return results.slice(0, 8).map(result => ({
      ...result.item,
      score: result.score,
      matches: result.matches,
    }));
  }, [fuse, query]);

  // Quick actions for empty search
  const quickActions = useMemo(() => {
    if (query.trim()) return [];

    return [
      {
        id: 'new-task',
        title: 'Create task',
        subtitle: `"${query || 'buy groceries'}"`,
        icon: '✓',
        action: () => {
          onClose();
          navigate('/tasks');
        },
      },
      {
        id: 'new-expense',
        title: 'Add expense',
        subtitle: `"${query || 'groceries'}"`,
        icon: '💰',
        action: () => {
          onClose();
          navigate('/expenses');
        },
      },
    ];
  }, [query, navigate, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < searchResults.length + quickActions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          const allItems = [...searchResults, ...quickActions];
          const selectedItem = allItems[selectedIndex];
          if (selectedItem) {
            if ('action' in selectedItem) {
              selectedItem.action();
            } else {
              onClose();
              navigate(selectedItem.url);
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, navigate, searchResults, quickActions, selectedIndex]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    onClose();
    navigate(result.url);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'task': return '📝';
      case 'expense': return '💰';
      case 'person': return '👤';
      default: return '🔍';
    }
  };

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'task': return 'TASKS';
      case 'expense': return 'EXPENSES';
      case 'person': return 'PEOPLE';
      default: return 'RESULTS';
    }
  };

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    searchResults.forEach(result => {
      const typeLabel = getResultTypeLabel(result.type);
      if (!groups[typeLabel]) groups[typeLabel] = [];
      groups[typeLabel].push(result);
    });
    return groups;
  }, [searchResults]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            {/* Search Input */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="text-slate-400">🔍</div>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tasks, expenses, people..."
                  className="flex-1 border-0 shadow-none text-lg p-0 focus:ring-0"
                  autoFocus
                />
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {query.trim() ? (
                // Search Results
                <div className="p-2">
                  {Object.entries(groupedResults).map(([typeLabel, results]) => (
                    <div key={typeLabel} className="mb-4">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {typeLabel} ({results.length})
                      </div>
                      {results.map((result, resultIndex) => {
                        const globalIndex = Object.values(groupedResults)
                          .slice(0, Object.keys(groupedResults).indexOf(typeLabel))
                          .reduce((acc, group) => acc + group.length, 0) + resultIndex;

                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                              globalIndex === selectedIndex ? 'bg-slate-100' : ''
                            }`}
                          >
                            <div className="text-lg">{getResultIcon(result.type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 truncate">
                                {result.title}
                              </div>
                              <div className="text-sm text-slate-500 truncate">
                                {result.subtitle}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  {searchResults.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      No results found for "{query}"
                    </div>
                  )}
                </div>
              ) : (
                // Quick Actions
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    QUICK ACTIONS
                  </div>
                  {quickActions.map((action, index) => (
                    <button
                      key={action.id}
                      onClick={action.action}
                      className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                        index === selectedIndex ? 'bg-slate-100' : ''
                      }`}
                    >
                      <div className="text-lg">{action.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{action.title}</div>
                        <div className="text-sm text-slate-500">{action.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <div>
                ⌘ Navigate • ↵ Open • Esc Close
              </div>
              {query.trim() && (
                <div>
                  💡 Use filters like "from:alice" or "category:food"
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
