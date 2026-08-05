import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./features/projectPlanning/pages/LoginPage";
import DashboardPage from "./features/projectPlanning/pages/DashboardPage";
import ProjectListPage from "./features/projectPlanning/pages/ProjectListPage";
import ProjectDetailPage from "./features/projectPlanning/pages/ProjectDetailPage";
import ClientsPage from "./features/projectPlanning/pages/ClientsPage";
import ClientProjectsPage from "./features/projectPlanning/pages/ClientProjectsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (user === null)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center" data-testid="auth-loading">
        <Loader2 size={28} className="animate-spin text-orange-500" />
      </div>
    );
  if (user === false) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/admin/projects" element={<ProtectedRoute><ProjectListPage /></ProtectedRoute>} />
            <Route path="/admin/projects/:id" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
            <Route path="/admin/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
            <Route path="/admin/clients/:id/projects" element={<ProtectedRoute><ClientProjectsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" theme="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
