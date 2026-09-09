import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpsertProfile } from "@/hooks/useData";
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  Store,
  ShoppingBag,
  User,
  BookOpen,
  Sparkles,
  Users,
  Settings,
  ShieldAlert,
  BarChart3,
  Menu,
  X,
  LogOut,
  Leaf,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import NotificationsPanel from "@/components/ui/notifications";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const shopkeeperItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Sales", url: "/sales", icon: TrendingUp },
  { title: "Credit", url: "/credit-book", icon: BookOpen },
  { title: "Combos", url: "/combo-offers", icon: Sparkles },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Network", url: "/network", icon: Store },
];

const customerItems = [
  { title: "Local Market", url: "/customer", icon: ShoppingBag },
  { title: "Browse Shops", url: "/network", icon: Store },
];

const adminItems = [
  { title: "Overview", url: "/admin", icon: ShieldAlert },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Inventory", url: "/admin/inventory", icon: Package },
  { title: "Utilities", url: "/admin/utilities", icon: Settings },
];

export function TopNavbar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const upsertProfile = useUpsertProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const toggleShopStatus = async () => {
    if (profile) {
      await upsertProfile.mutateAsync({
        ...profile,
        is_open: !profile.is_open,
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isOnCustomerPage = location.pathname.startsWith("/customer");
  const isAdminPage = location.pathname.startsWith("/admin");
  const userRole = profile?.role || (isOnCustomerPage ? "customer" : "shopkeeper");

  let navItems = [];
  if (isAdminPage) {
    navItems = adminItems;
  } else if (userRole === "customer" || isOnCustomerPage) {
    navItems = customerItems;
  } else {
    navItems = shopkeeperItems;
  }

  const profileLink =
    userRole === "customer" || isOnCustomerPage ? "/customer/profile" : "/profile";

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 bg-background border-b border-border`}
      >
        <div className="container mx-auto px-4 md:px-6 h-[70px] flex items-center justify-between">
          {/* Logo on Left */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/logo.svg" alt="ShopSphere" className="h-6 w-6 object-contain invert" />
            </div>
            <Link
              to={userRole === "customer" ? "/customer" : userRole === "admin" ? "/admin" : "/"}
              className="hidden md:block"
            >
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                ShopSphere
              </span>
            </Link>
          </div>

          {/* Centered Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-1 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.url ||
                (item.url !== "/" && location.pathname.startsWith(item.url));
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 flex items-center gap-2 ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-primary/10 rounded-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{item.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {userRole === "shopkeeper" && profile && (
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <Switch 
                  id="shop-status" 
                  checked={profile.is_open ?? true} 
                  onCheckedChange={toggleShopStatus}
                  disabled={upsertProfile.isPending}
                />
                <Label htmlFor="shop-status" className="text-sm font-medium whitespace-nowrap cursor-pointer">
                  {profile.is_open ?? true ? "Shop Open" : "Shop Closed"}
                </Label>
              </div>
            )}

            {userRole !== "customer" && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <NotificationsPanel />
              </motion.div>
            )}

            <ThemeToggle />

            <div className="hidden sm:block">
              <Link to={profileLink}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="h-8 w-8 rounded-full border border-border overflow-hidden bg-muted flex items-center justify-center"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-2 text-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background pt-16 lg:hidden"
          >
            <div className="flex flex-col p-4 space-y-2 h-full overflow-y-auto">
              <div className="px-4 pb-4 mb-4 border-b border-border flex items-center gap-3">
                <div className="h-10 w-10 rounded-full border border-border bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {profile?.owner_name || user?.email || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                </div>
              </div>

              {userRole === "shopkeeper" && profile && (
                <div className="px-4 pb-4 mb-2 flex items-center justify-between">
                  <Label htmlFor="mobile-shop-status" className="text-sm font-medium cursor-pointer">
                    {profile.is_open ?? true ? "Shop is Open" : "Shop is Closed"}
                  </Label>
                  <Switch 
                    id="mobile-shop-status" 
                    checked={profile.is_open ?? true} 
                    onCheckedChange={toggleShopStatus}
                    disabled={upsertProfile.isPending}
                  />
                </div>
              )}

              {navItems.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 + 0.1 }}
                >
                  <Link
                    to={item.url}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                      location.pathname === item.url ||
                      (item.url !== "/" && location.pathname.startsWith(item.url))
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.title}
                  </Link>
                </motion.div>
              ))}

              <div className="mt-auto pt-4 border-t border-border">
                <Link
                  to={profileLink}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <User className="w-5 h-5" />
                  Profile Settings
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
