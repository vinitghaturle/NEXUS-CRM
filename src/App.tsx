import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './features/auth/LoginPage';
import { PlaceholderPage } from './components/ui/PlaceholderPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { EventsPage } from './features/events/EventsPage';
import { TaskBoardPage } from './features/tasks/TaskBoardPage';
import { CreativePage } from './features/creative/CreativePage';
import { SocialPage } from './features/social/SocialPage';
import { NewsletterPage } from './features/newsletter/NewsletterPage';
import { BirthdaysPage } from './features/birthdays/BirthdaysPage';
import { AchievementsPage } from './features/achievements/AchievementsPage';
import { FormsPage } from './features/forms/FormsPage';
import { IssuesPage } from './features/issues/IssuesPage';
import { MeetingsPage } from './features/meetings/MeetingsPage';
import { DocumentsPage } from './features/documents/DocumentsPage';
import { SetupPage } from './features/admin/SetupPage';
import { BudgetPage } from './features/budget/BudgetPage';
import { RecognitionPage } from './features/recognition/RecognitionPage';
import { PerformancePage } from './features/performance/PerformancePage';
import { ReportsPage } from './features/reports/ReportsPage';
import { TeamsPage } from './features/teams/TeamsPage';

// Initialize TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            
            {/* 1. Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* 2. Protected App Portal (Renders inside AppShell) */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              {/* Default redirect to dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              
              {/* V1 Core — visible to all roles */}
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="tasks" element={<TaskBoardPage />} />
              <Route path="meetings" element={<MeetingsPage />} />

              {/* Teams — visible to PRESIDENT, VP, ADMIN */}
              <Route 
                path="teams" 
                element={
                  <ProtectedRoute allowedRoles={['PRESIDENT', 'VP', 'ADMIN']}>
                    <TeamsPage />
                  </ProtectedRoute>
                } 
              />

              {/* Advanced Modules — ADMIN only (routes preserved, just locked) */}
              <Route 
                path="creative" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <CreativePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="social" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <SocialPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="newsletter" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <NewsletterPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="birthdays" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <BirthdaysPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="achievements" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AchievementsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="forms" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <FormsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="issues" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <IssuesPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="documents" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <DocumentsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="recognition" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <RecognitionPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="budgets" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <BudgetPage />
                  </ProtectedRoute>
                } 
              />

              {/* Administration Panel — ADMIN only */}
              <Route 
                path="admin/users" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <PlaceholderPage 
                      title="Users & Teams Ledger" 
                      description="Add user records, assign department leads, and configure active roles." 
                    />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/evaluations" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <PerformancePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/reports" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <ReportsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/audit" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <PlaceholderPage 
                      title="System Audit Log" 
                      description="Trace cryptographically verified user mutations, deadline shifts, and reassignments." 
                    />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/settings" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <PlaceholderPage 
                      title="Global CRM Settings" 
                      description="Configure maximum workload thresholds, active categories, and default fields." 
                    />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/setup" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <SetupPage />
                  </ProtectedRoute>
                } 
              />

            </Route>

            {/* 3. Fallback Route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />

          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
