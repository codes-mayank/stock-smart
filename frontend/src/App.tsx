import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/useData";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const Auth = React.lazy(() => import("./pages/Auth"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Inventory = React.lazy(() => import("./pages/Inventory"));
const Sales = React.lazy(() => import("./pages/Sales"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const ShopNetwork = React.lazy(() => import("./pages/ShopNetwork"));
const ShopProducts = React.lazy(() => import("./pages/ShopProducts"));
const Customer = React.lazy(() => import("./pages/Customer"));
const CustomerProfile = React.lazy(() => import("./pages/CustomerProfile"));
const Admin = React.lazy(() => import("./pages/Admin"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Marketplace = React.lazy(() => import("./pages/Marketplace"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const CreditBook = React.lazy(() => import("./pages/CreditBook"));
const ComboOffers = React.lazy(() => import("./pages/ComboOffers"));
const AdminOverview = React.lazy(() => import("./pages/admin/AdminOverview"));
const AdminUsers = React.lazy(() => import("./pages/admin/AdminUsers"));
const AdminInventory = React.lazy(() => import("./pages/admin/AdminInventory"));
const AdminUtilities = React.lazy(() => import("./pages/admin/AdminUtilities"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Guard component to ensure only users with role 'customer' can access customer routes
  function CustomerGuard() {
    const { data: profile, isLoading: profileLoading } = useProfile();
    if (profileLoading) return <LoadingSpinner fullScreen />;
    // Allow access if profile not found yet (new signup) or if role is customer
    if (profile && profile.role !== 'customer') return <Navigate to="/" replace />;
    return <Customer />;
  }

  // Guard component for customer profile
  function CustomerProfileGuard() {
    const { data: profile, isLoading: profileLoading } = useProfile();
    if (profileLoading) return <LoadingSpinner fullScreen />;
    if (profile && profile.role !== 'customer') return <Navigate to="/" replace />;
    return <CustomerProfile />;
  }

  // Guard component for root path to redirect customers to their dashboard
  function HomeGuard() {
    const { user } = useAuth();
    const { data: profile, isLoading: profileLoading } = useProfile();
    if (profileLoading) return <LoadingSpinner fullScreen />;
    if (profile?.role === 'admin' || user?.email === 'admin@gmail.com') return <Navigate to="/admin" replace />;
    if (profile?.role === 'customer') return <Navigate to="/customer" replace />;
    return <Dashboard />;
  }

  // Auth page redirect — checks role to send customers to /customer
  function AuthRedirect() {
    const { user } = useAuth();
    const { data: profile, isLoading: profileLoading } = useProfile();
    if (profileLoading) return <LoadingSpinner fullScreen />;
    if (profile?.role === 'admin' || user?.email === 'admin@gmail.com') return <Navigate to="/admin" replace />;
    if (profile?.role === 'customer') return <Navigate to="/customer" replace />;
    return <Navigate to="/" replace />;
  }

  // Guard component for admin routes
  function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { data: profile, isLoading: profileLoading } = useProfile();
    
    if (profileLoading) {
      return <LoadingSpinner fullScreen text="Verifying admin access..." />;
    }
    
    // Grant access if database role is 'admin' OR if email is the master admin email
    const hasAdminAccess = profile?.role === 'admin' || user?.email === 'admin@gmail.com';

    if (!hasAdminAccess) {
      return <Navigate to="/" replace />;
    }
    
    return <>{children}</>;
  }

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <>
      <AnimatedBackground />
      <AnimatePresence mode="wait">
        <Suspense fallback={<LoadingSpinner fullScreen />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/auth" element={user ? <AuthRedirect /> : <Auth />} />
            <Route path="/marketplace" element={<AppLayout><Marketplace /></AppLayout>} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<HomeGuard />} />
                      <Route path="/customer" element={<CustomerGuard />} />
                      <Route path="/customer/profile" element={<CustomerProfileGuard />} />
                      <Route path="/inventory" element={<Inventory />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/admin" element={<AdminGuard><AdminOverview /></AdminGuard>} />
                      <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
                      <Route path="/admin/inventory" element={<AdminGuard><AdminInventory /></AdminGuard>} />
                      <Route path="/admin/utilities" element={<AdminGuard><AdminUtilities /></AdminGuard>} />
                      <Route path="/sales" element={<Sales />} />
                      <Route path="/credit-book" element={<CreditBook />} />
                      <Route path="/combo-offers" element={<ComboOffers />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/network" element={<ShopNetwork />} />
                      <Route path="/shop/:id" element={<ShopProducts />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
