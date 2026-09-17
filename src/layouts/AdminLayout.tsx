import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BarChart3, Link2, FileText, Trophy, History,
  Wallet, Users, FileStack, CreditCard, Lock, UserCog, Settings,
  ShieldCheck, Bell, Activity, LogOut, Home, ChevronDown, MessageSquare,
  UserPlus, Gift, Newspaper, Tag, Package, Download, Mail, ClipboardList
} from "lucide-react";
import MessagePopup from "@/components/MessagePopup";

interface DropdownGroup {
  label: string;
  icon: any;
  items: { to: string; icon: any; label: string }[];
}

const directTabs = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/survey-providers", icon: BarChart3, label: "Survey Providers" },
  { to: "/admin/single-link-providers", icon: Link2, label: "Single Link Providers" },
  { to: "/admin/survey-links", icon: FileText, label: "Survey Links" },
  { to: "/admin/pepperwahl", icon: ClipboardList, label: "Pepperwahl" },
];

const dropdownGroups: DropdownGroup[] = [
{
    label: "More",
    icon: ChevronDown,
    items: [
      { to: "/admin/offers", icon: Package, label: "Offers" },
      { to: "/admin/api-import", icon: Download, label: "API Import" },
      { to: "/admin/contests", icon: Trophy, label: "Contests" },
      { to: "/admin/earning-history", icon: History, label: "Earning History" },
      { to: "/admin/withdrawals", icon: Wallet, label: "Withdrawals" },
      { to: "/admin/users", icon: Users, label: "Users" },
      { to: "/admin/user-generation", icon: UserPlus, label: "User Generation" },
    ],
  },
  {
    label: "Monitoring",
    icon: Activity,
    items: [
      { to: "/admin/login-logs", icon: Activity, label: "Login Logs" },
      { to: "/admin/notifications", icon: Bell, label: "Notifications" },
      { to: "/admin/chats", icon: MessageSquare, label: "Chats" },
      { to: "/admin/inbox", icon: Mail, label: "Inbox" },
      { to: "/admin/conversations", icon: Users, label: "User Conversations" },
      { to: "/admin/click-tracking", icon: Activity, label: "Click Tracking" },
      { to: "/admin/postback-logs", icon: Activity, label: "Postback Logs" },
      { to: "/admin/test-postback", icon: Activity, label: "Test Postback" },
      { to: "/admin/downward-partners", icon: Activity, label: "Downward Partners" },
      { to: "/admin/sub-admins", icon: ShieldCheck, label: "Subadmins" },
      { to: "/admin/activity-feed", icon: Activity, label: "Activity Feed" },
    ],
  },
  {
    label: "Masters",
    icon: FileStack,
    items: [
      { to: "/admin/news", icon: Newspaper, label: "News" },
      { to: "/admin/promocodes", icon: Tag, label: "Promocodes" },
      { to: "/admin/pages", icon: FileStack, label: "Pages" },
      { to: "/admin/payment-methods", icon: CreditCard, label: "Payment Methods" },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    items: [
      { to: "/admin/activity-feed", icon: Activity, label: "Activity Feed" },
      { to: "/admin/change-password", icon: Lock, label: "Change Password" },
      { to: "/admin/update-profile", icon: UserCog, label: "Update Profile" },
      { to: "/admin/settings", icon: Settings, label: "Website Settings" },
    ],
  },
];

function NavDropdown({ group, pathname }: { group: DropdownGroup; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const isActive = group.items.some(i => pathname === i.to);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(!open);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={toggle}
        className={`${isActive ? "admin-tab-active" : "admin-tab"} flex items-center gap-1.5 whitespace-nowrap`}
      >
        <group.icon className="h-3.5 w-3.5" />
        {group.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          ref={ref}
          className="fixed bg-popover border border-border rounded-lg shadow-xl z-[9999] min-w-52 py-1 animate-fade-in"
          style={{ top: pos.top, left: pos.left }}
        >
          {group.items.map(item => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                pathname === item.to
                  ? "text-primary bg-primary/10 font-medium"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card border-b border-border overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-lg font-bold text-primary">Admin Panel</span>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <Home className="h-4 w-4" /> User Dashboard
            </Link>
            <button onClick={() => navigate("/auth")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto min-w-0">
          {directTabs.map(tab => (
            <Link
              key={tab.to}
              to={tab.to}
              className={`${location.pathname === tab.to ? "admin-tab-active" : "admin-tab"} whitespace-nowrap flex items-center gap-1.5`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          ))}
          {dropdownGroups.map(group => (
            <NavDropdown key={group.label} group={group} pathname={location.pathname} />
          ))}
        </div>
      </header>
      <main className="p-6 animate-fade-in">{children}</main>
      <MessagePopup userRole="admin" />
    </div>
  );
}
