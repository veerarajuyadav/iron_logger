import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import ProtectedRoute from "@/lib/ProtectedRoute";
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import CalendarPage from "@/pages/CalendarPage";
import WorkoutLoggerPage from "@/pages/WorkoutLoggerPage";
import HistoryPage from "@/pages/HistoryPage";
import BodyWeightPage from "@/pages/BodyWeightPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ExercisesPage from "@/pages/ExercisesPage";
import SettingsPage from "@/pages/SettingsPage";
import { Toaster } from "sonner";

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function Shell({ children }) {
  return <AppShell>{children}</AppShell>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster theme="dark" position="top-right" />
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <RegisterPage />
              </PublicOnly>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Shell>
                  <DashboardPage />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Shell>
                  <CalendarPage />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/log"
            element={
              <ProtectedRoute>
                <Shell>
                  <WorkoutLoggerPage />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/log/:id"
            element={
              <ProtectedRoute>
                <Shell>
                  <WorkoutLoggerPage />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <Shell>
                  <HistoryPage />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/body-weight"
            element={
              <ProtectedRoute>
                <Shell>
                  <BodyWeightPage />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Shell>
                  <AnalyticsPage />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exercises"
            element={
              <ProtectedRoute>
                <Shell>
                  <ExercisesPage />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Shell>
                  <SettingsPage />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
