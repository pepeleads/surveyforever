import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayout from "./layouts/AdminLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import BalanceHistory from "./pages/dashboard/BalanceHistory";
import UpdateAccount from "./pages/dashboard/UpdateAccount";
import Inbox from "./pages/dashboard/Inbox";
import UserChat from "./pages/dashboard/UserChat";
import Affiliates from "./pages/dashboard/Affiliates";
import Withdrawal from "./pages/dashboard/Withdrawal";
import ConvertPoints from "./pages/dashboard/ConvertPoints";
import DailySurveys from "./pages/dashboard/DailySurveys";
import Offers from "./pages/dashboard/Offers";
import Offerwalls from "./pages/dashboard/Offerwalls";
import OfferwallViewer from "./pages/dashboard/OfferwallViewer";
import Contest from "./pages/dashboard/Contest";
import News from "./pages/dashboard/News";
import Promocode from "./pages/dashboard/Promocode";
import WithdrawalHistory from "./pages/dashboard/WithdrawalHistory";
import Leaderboard from "./pages/dashboard/Leaderboard";
import SupportTicket from "./pages/dashboard/SupportTicket";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SurveyProviders from "./pages/admin/SurveyProviders";
import SingleLinkProviders from "./pages/admin/SingleLinkProviders";
import SurveyLinks from "./pages/admin/SurveyLinks";
import AdminContests from "./pages/admin/AdminContests";
import EarningHistory from "./pages/admin/EarningHistory";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminUsers from "./pages/admin/AdminUsers";
import SubAdmins from "./pages/admin/SubAdmins";
import AdminNotifications from "./pages/admin/AdminNotifications";
import LoginLogs from "./pages/admin/LoginLogs";
import { AdminPages, AdminPaymentMethods, ChangePassword, AdminUpdateProfile, WebsiteSettings } from "./pages/admin/AdminSimplePages";
import AdminNews from "./pages/admin/AdminNews";
import AdminPromocodes from "./pages/admin/AdminPromocodes";
import AdminOffers from "./pages/admin/AdminOffers";
import ApiImport from "./pages/admin/ApiImport";
import UserGeneration from "./pages/admin/UserGeneration";
import AdminChats from "./pages/admin/AdminChats";
import AdminInbox from "./pages/admin/AdminInbox";
import EnhancedAdminInbox from "./pages/admin/EnhancedAdminInbox";
import AdminConversationInbox from "./pages/admin/AdminConversationInbox";
import AdminMessageCreate from "./pages/admin/messages/create";
import AdminClickTracking from "./pages/admin/AdminClickTracking";
import DownwardPartners from "./pages/admin/DownwardPartners";
import PostbackLogs from "./pages/admin/PostbackLogs";
import TestPostback from "./pages/admin/TestPostback";
import ActivityFeedControls from "./pages/admin/ActivityFeedControls";
import AdminQualification from "./pages/admin/AdminQualification";
import PepperwahSurveys from "./pages/admin/PepperwahSurveys";
import PepperwahSurveyPage from "./pages/PepperwahSurveyPage";
import Reports from "./pages/dashboard/Reports";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdminOrSubAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  if (!isAdminOrSubAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const DashboardPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><DashboardLayout>{children}</DashboardLayout></ProtectedRoute>
);
const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><AdminRoute><AdminLayout>{children}</AdminLayout></AdminRoute></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/dashboard" element={<DashboardPage><DashboardHome /></DashboardPage>} />
          <Route path="/dashboard/balance-history" element={<DashboardPage><BalanceHistory /></DashboardPage>} />
          <Route path="/dashboard/update-account" element={<DashboardPage><UpdateAccount /></DashboardPage>} />
          <Route path="/dashboard/inbox" element={<DashboardPage><Inbox /></DashboardPage>} />
          <Route path="/dashboard/chat" element={<DashboardPage><UserChat /></DashboardPage>} />
          <Route path="/dashboard/affiliates" element={<DashboardPage><Affiliates /></DashboardPage>} />
          <Route path="/dashboard/withdrawal" element={<DashboardPage><Withdrawal /></DashboardPage>} />
          <Route path="/dashboard/convert-points" element={<DashboardPage><ConvertPoints /></DashboardPage>} />
          <Route path="/dashboard/daily-surveys" element={<DashboardPage><DailySurveys /></DashboardPage>} />
          <Route path="/dashboard/offers" element={<DashboardPage><Offers /></DashboardPage>} />
          <Route path="/dashboard/reports" element={<DashboardPage><Reports /></DashboardPage>} />
          <Route path="/survey/pepperwahl/:surveyId" element={<PepperwahSurveyPage />} />
          <Route path="/dashboard/offerwalls" element={<DashboardPage><Offerwalls /></DashboardPage>} />
          <Route path="/dashboard/offerwall/:slug" element={<DashboardPage><OfferwallViewer /></DashboardPage>} />
          <Route path="/dashboard/contest" element={<DashboardPage><Contest /></DashboardPage>} />
          <Route path="/dashboard/news" element={<DashboardPage><News /></DashboardPage>} />
          <Route path="/dashboard/promocode" element={<DashboardPage><Promocode /></DashboardPage>} />
          <Route path="/dashboard/withdrawal-history" element={<DashboardPage><WithdrawalHistory /></DashboardPage>} />
          <Route path="/dashboard/leaderboard" element={<DashboardPage><Leaderboard /></DashboardPage>} />
          <Route path="/dashboard/support" element={<DashboardPage><SupportTicket /></DashboardPage>} />
          <Route path="/admin" element={<AdminPage><AdminDashboard /></AdminPage>} />
          <Route path="/admin/survey-providers" element={<AdminPage><SurveyProviders /></AdminPage>} />
          <Route path="/admin/single-link-providers" element={<AdminPage><SingleLinkProviders /></AdminPage>} />
          <Route path="/admin/survey-links" element={<AdminPage><SurveyLinks /></AdminPage>} />
          <Route path="/admin/contests" element={<AdminPage><AdminContests /></AdminPage>} />
          <Route path="/admin/earning-history" element={<AdminPage><EarningHistory /></AdminPage>} />
          <Route path="/admin/withdrawals" element={<AdminPage><AdminWithdrawals /></AdminPage>} />
          <Route path="/admin/users" element={<AdminPage><AdminUsers /></AdminPage>} />
          <Route path="/admin/sub-admins" element={<AdminPage><SubAdmins /></AdminPage>} />
          <Route path="/admin/notifications" element={<AdminPage><AdminNotifications /></AdminPage>} />
          <Route path="/admin/login-logs" element={<AdminPage><LoginLogs /></AdminPage>} />
          <Route path="/admin/news" element={<AdminPage><AdminNews /></AdminPage>} />
          <Route path="/admin/promocodes" element={<AdminPage><AdminPromocodes /></AdminPage>} />
          <Route path="/admin/pages" element={<AdminPage><AdminPages /></AdminPage>} />
          <Route path="/admin/payment-methods" element={<AdminPage><AdminPaymentMethods /></AdminPage>} />
          <Route path="/admin/change-password" element={<AdminPage><ChangePassword /></AdminPage>} />
          <Route path="/admin/update-profile" element={<AdminPage><AdminUpdateProfile /></AdminPage>} />
          <Route path="/admin/settings" element={<AdminPage><WebsiteSettings /></AdminPage>} />
          <Route path="/admin/offers" element={<AdminPage><AdminOffers /></AdminPage>} />
          <Route path="/admin/api-import" element={<AdminPage><ApiImport /></AdminPage>} />
          <Route path="/admin/chats" element={<AdminPage><AdminChats /></AdminPage>} />
          <Route path="/admin/inbox" element={<AdminPage><EnhancedAdminInbox /></AdminPage>} />
          <Route path="/admin/messages/create" element={<AdminPage><AdminMessageCreate /></AdminPage>} />
          <Route path="/admin/conversations" element={<AdminPage><AdminConversationInbox /></AdminPage>} />
          <Route path="/admin/click-tracking" element={<AdminPage><AdminClickTracking /></AdminPage>} />
          <Route path="/admin/downward-partners" element={<AdminPage><DownwardPartners /></AdminPage>} />
          <Route path="/admin/postback-logs" element={<AdminPage><PostbackLogs /></AdminPage>} />
          <Route path="/admin/test-postback" element={<AdminPage><TestPostback /></AdminPage>} />
          <Route path="/admin/user-generation" element={<AdminPage><UserGeneration /></AdminPage>} />
          <Route path="/admin/activity-feed" element={<AdminPage><ActivityFeedControls /></AdminPage>} />
          <Route path="/admin/qualification" element={<AdminPage><AdminQualification /></AdminPage>} />
          <Route path="/admin/pepperwahl" element={<AdminPage><PepperwahSurveys /></AdminPage>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
