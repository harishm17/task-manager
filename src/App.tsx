import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GroupProvider } from './contexts/GroupContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { RequireAuth } from './components/RequireAuth';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { OnboardingWrapper } from './components/onboarding/OnboardingWrapper';
import { TutorialProvider } from './components/common/TutorialTooltip';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/ToastProvider';
import { BalancesPage } from './pages/BalancesPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { InviteAcceptPage } from './pages/InviteAcceptPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SettingsPage } from './pages/SettingsPage';
import { SignupPage } from './pages/SignupPage';
import { TasksPage } from './pages/TasksPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';

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
              <OnboardingProvider>
                <NotificationProvider>
                  <TutorialProvider>
                    <BrowserRouter>
                      <Routes>
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
                    </BrowserRouter>
                  </TutorialProvider>
                </NotificationProvider>
              </OnboardingProvider>
            </GroupProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
