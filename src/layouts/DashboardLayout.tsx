import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, History, UserCog, Mail, Users, Wallet, ArrowLeftRight,
  ClipboardList, Gift, Newspaper, Tag, CreditCard, Trophy, HelpCircle,
  LogOut, Shield, Globe, Menu, X, DollarSign, Star, ChevronDown, ChevronRight, UserPlus, Copy, PanelLeftClose,
  TrendingUp, Network, MessageSquare, Headphones, BarChart2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MessagePopup from "@/components/MessagePopup";

interface NavGroup {
  label: string;
  icon: any;
  items: { to: string; icon: any; label: string }[];
  collapsible?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }],
    collapsible: false, // Single item, no dropdown
  },
  {
    label: "Account & Finance",
    icon: DollarSign,
    items: [
      { to: "/dashboard/balance-history", icon: History, label: "Balance History" },
      { to: "/dashboard/withdrawal", icon: Wallet, label: "Withdrawal" },
      { to: "/dashboard/withdrawal-history", icon: CreditCard, label: "Withdrawal History" },
      { to: "/dashboard/convert-points", icon: ArrowLeftRight, label: "Convert Points" },
      { to: "/dashboard/update-account", icon: UserCog, label: "Update Account" },
    ],
    collapsible: true,
  },
  {
    label: "Earnings & Activities",
    icon: TrendingUp,
    items: [
      { to: "/dashboard/daily-surveys", icon: ClipboardList, label: "Daily Surveys" },
      { to: "/dashboard/offers", icon: Gift, label: "Offers" },
      { to: "/dashboard/reports", icon: BarChart2, label: "Reports" },
      { to: "/dashboard/contest", icon: Trophy, label: "Contest" },
      { to: "/dashboard/promocode", icon: Tag, label: "Promocode" },
    ],
    collapsible: true,
  },
  {
    label: "Network & Performance",
    icon: Network,
    items: [
      { to: "/dashboard/affiliates", icon: Users, label: "Your Affiliates" },
      { to: "/dashboard/leaderboard", icon: Star, label: "Leaderboard" },
    ],
    collapsible: true,
  },
  {
    label: "Communication & Support",
    icon: MessageSquare,
    items: [
      { to: "/dashboard/inbox", icon: Mail, label: "Inbox" },
      { to: "/dashboard/chat", icon: MessageSquare, label: "Live Chat" },
      { to: "/dashboard/news", icon: Newspaper, label: "News" },
      { to: "/dashboard/support", icon: Headphones, label: "Support Ticket" },
    ],
    collapsible: true,
  },
];

let sessionTrackedThisLoad = false;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, user, signOut, isAdminOrSubAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarClosed, setSidebarClosed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    const expanded: Record<string, boolean> = {};
    navGroups.forEach((group) => {
      if (group.items.some((item) => location.pathname === item.to)) {
        expanded[group.label] = true;
      }
    });
    setExpandedGroups((prev) => ({ ...prev, ...expanded }));
  }, [location.pathname]);

  useEffect(() => {
    if (!profile?.id || sessionTrackedThisLoad) return;
    sessionTrackedThisLoad = true;
    const sessionId = crypto.randomUUID();
    sessionStorage.setItem("session_id", sessionId);
    supabase.functions.invoke("track-login", {
      body: { user_agent: navigator.userAgent, method: "SESSION_RESUME", session_id: sessionId },
    }).then(({ data }) => {
      if (data?.login_log_id) sessionStorage.setItem("login_log_id", data.login_log_id);
    }).catch(e => console.error("Session tracking failed:", e));
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      const loginLogId = sessionStorage.getItem("login_log_id");
      supabase.from("page_visits").insert({
        user_id: profile.id, login_log_id: loginLogId || null, page_path: location.pathname,
      }).then(() => {});
    }
  }, [location.pathname, profile?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setSidebarClosed(true);
  };

  const openSidebar = () => {
    setSidebarOpen(true);
    setSidebarClosed(false);
  };

  const handleNavClick = (e: React.MouseEvent, to: string) => {
    if (!user) {
      e.preventDefault();
      setShowAuthPrompt(true);
    } else {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile menu toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg border border-border">
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      
      {/* Desktop sidebar toggle - only show when sidebar is closed */}
      {sidebarClosed && (
        <button 
          onClick={openSidebar} 
          className="hidden lg:flex fixed top-4 left-4 z-50 p-2 bg-card rounded-lg border border-border items-center gap-2"
          title="Open Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar - NO gap when closed */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-all duration-300 overflow-y-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        sidebarClosed ? "lg:-translate-x-full lg:w-0 lg:border-0" : "lg:translate-x-0"
      )}>
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <Globe className="h-10 w-10 text-primary" />
              <span className="text-xl font-bold text-primary">SurveyForever</span>
            </Link>
            <button onClick={closeSidebar} className="p-1 rounded-md hover:bg-accent/50 transition-colors" title="Close Sidebar">
              <X className="h-4 w-4" />
            </button>
          </div>
          {profile && (
            <div className="mt-3 mb-2">
              <p className="font-semibold text-sm">{profile.first_name || profile.username}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            </div>
          )}
        </div>

        <nav className="px-2 pb-4">
          {navGroups.map((group) => {
            const isExpanded = expandedGroups[group.label] ?? false;
            const isActive = group.items.some((item) => location.pathname === item.to);

            // Single-item group (Dashboard) - render as direct link, no dropdown
            if (!group.collapsible) {
              const item = group.items[0];
              return (
                <div key={group.label} className="mb-1">
                  <Link
                    to={item.to}
                    onClick={(e) => handleNavClick(e, item.to)}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      location.pathname === item.to
                        ? "bg-primary/15 text-primary"
                        : "text-sidebar-foreground hover:bg-accent/50"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </div>
              );
            }

            return (
              <div key={group.label} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "flex items-center justify-between w-full px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <group.icon className="h-3.5 w-3.5" />
                    <span>{group.label}</span>
                  </div>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                {isExpanded && (
                  <div className="ml-1 space-y-0.5 mt-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={(e) => handleNavClick(e, item.to)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors",
                          location.pathname === item.to
                            ? "bg-primary/15 text-primary font-medium"
                            : "text-sidebar-foreground hover:bg-accent/50"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isAdminOrSubAdmin && (
            <div className="mb-1">
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Administration</p>
              <div className="ml-1">
                <Link to="/admin" onClick={(e) => handleNavClick(e, "/admin")} className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors",
                  location.pathname.startsWith("/admin")
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-sidebar-foreground hover:bg-accent/50"
                )}>
                  <Shield className="h-3.5 w-3.5" />
                  Admin Panel
                </Link>
              </div>
            </div>
          )}

          <div className="mt-2 border-t border-sidebar-border pt-2 space-y-1">
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-xs text-sidebar-foreground hover:bg-accent/50 rounded-md w-full transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </nav>
      </aside>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-background/80 z-30" onClick={() => setSidebarOpen(false)} />}

      {/* Main content - NO margin when sidebar closed */}
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300",
        sidebarClosed ? "lg:ml-0" : ""
      )}>
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {/* Show menu button in header when sidebar closed */}
          {sidebarClosed && (
            <button onClick={openSidebar} className="hidden lg:flex p-1.5 rounded-md hover:bg-accent/50 shrink-0">
              <Menu className="h-4 w-4" />
            </button>
          )}
          <div className="lg:hidden w-8 shrink-0" />
          <div className="flex items-center gap-2 ml-auto">
            {profile && (
              <>
                <span className="text-xs font-semibold whitespace-nowrap">Hi, <span className="text-primary">{profile.first_name || profile.username}</span></span>
                <span className="text-[10px] text-muted-foreground">|</span>
                <span className="text-primary text-xs font-bold whitespace-nowrap">${Number(profile.cash_balance).toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground">|</span>
                <span className="text-info text-xs font-bold whitespace-nowrap">{profile.points} pts</span>
                <span className="text-[10px] text-muted-foreground">|</span>
                <span className="text-xs font-semibold text-success whitespace-nowrap">Refer & Earn</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Input
                    value={`${window.location.origin}/auth?ref=${profile.referral_code}`}
                    readOnly
                    className="h-6 text-[10px] bg-accent/50 w-40 px-1.5 py-0"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${profile.referral_code}`);
                      toast({ title: "Copied!", description: "Referral link copied" });
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <Link to="/dashboard/withdrawal" className="shrink-0">
                  <Button size="sm" className="h-6 text-xs px-3 rounded">Withdraw</Button>
                </Link>
              </>
            )}
          </div>
        </header>
        <div className="p-4 md:p-6 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Auth Prompt Dialog */}
      <Dialog open={showAuthPrompt} onOpenChange={setShowAuthPrompt}>
        <DialogContent className="max-w-xs text-center">
          <div className="py-4 space-y-3">
            <UserPlus className="h-10 w-10 text-primary mx-auto" />
            <h3 className="text-lg font-bold">Sign Up Required</h3>
            <p className="text-sm text-muted-foreground">Create an account or sign in to access this feature.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { setShowAuthPrompt(false); navigate("/auth"); }}>
                Sign Up / Sign In
              </Button>
              <Button variant="outline" onClick={() => setShowAuthPrompt(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <MessagePopup userRole="user" />
    </div>
  );
}
