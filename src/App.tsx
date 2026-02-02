import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GroupProvider } from './contexts/GroupContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { RequireAuth } from './components/RequireAuth';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { OnboardingWrapper } from './components/onboarding/OnboardingWrapper';
import { TutorialProvider } from './components/common/TutorialTooltip';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/ToastProvider';
import { LoadingFallback } from './components/common/LoadingFallback';

// Lazy load pages for code splitting
const BalancesPage = lazy(() => import('./pages/BalancesPage').then(m => ({ default: m.BalancesPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const InviteAcceptPage = lazy(() => import('./pages/InviteAcceptPage').then(m => ({ default: m.InviteAcceptPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const TasksPage = lazy(() => import('./pages/TasksPage').then(m => ({ default: m.TasksPage })));
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage').then(m => ({ default: m.UpdatePasswordPage })));
const HealthCheckPage = lazy(() => import('./pages/HealthCheckPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes - reduce unnecessary refetches
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider />
          <AuthProvider>
            <GroupProvider>
              <RealtimeProvider>
                <OnboardingProvider>
                  <NotificationProvider>
                    <TutorialProvider>
                    <BrowserRouter>
                      <Suspense fallback={<LoadingFallback />}>
                        <Routes>
                          {/* Public health check endpoint */}
                          <Route path="/health" element={<HealthCheckPage />} />

                        <Route element={<AuthLayout />}>
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/signup" element={<SignupPage />} />
                          <Route path="/reset-password" element={<ResetPasswordPage />} />
                          <Route path="/update-password" element={<UpdatePasswordPage />} />
                          <Route path="/invite/:token" element={<InviteAcceptPage />} />
                        </Route>
                        <Route
                          element={
                            <RequireAuth>
                              <OnboardingWrapper>
                                <AppLayout />
                              </OnboardingWrapper>
                            </RequireAuth>
                          }
                        >
                          <Route index element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<DashboardPage />} />
                          <Route path="/tasks" element={<TasksPage />} />
                          <Route path="/expenses" element={<ExpensesPage />} />
                          <Route path="/balances" element={<BalancesPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Route>
                      </Routes>
                      </Suspense>
                    </BrowserRouter>
                    </TutorialProvider>
                  </NotificationProvider>
                </OnboardingProvider>
              </RealtimeProvider>
            </GroupProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
