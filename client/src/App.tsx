import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { CommandPalette } from "@/components/command-palette";
import VoiceAssistant from "@/components/voice-assistant";
import Layout from "@/components/layout";
import Login from "@/pages/login";
import Home from "@/pages/home";
import CustomerAnalytics from "@/pages/customer-analytics";
import Leads from "@/pages/leads";
import Quotations from "@/pages/quotations";
import QuotationPrint from "@/pages/quotation-print";
import ProformaInvoices from "@/pages/proforma-invoices";
import MasterCustomers from "@/pages/master-customers";
import MasterItems from "@/pages/master-items";
import Invoices from "@/pages/invoices";
import Receipts from "@/pages/receipts";
import Debtors from "@/pages/debtors";
import CreditManagement from "@/pages/credit-management";
import Ledger from "@/pages/ledger";
import CompanySettings from "@/pages/company-settings";
import NotFound from "@/pages/not-found";
import Roles from "@/pages/roles";
import Users from "@/pages/users";
import EmailConfig from "@/pages/email-config";
import EmailTemplates from "@/pages/email-templates";
import WhatsAppConfig from "@/pages/whatsapp-config";
import WhatsAppTemplates from "@/pages/whatsapp-templates";
import RinggConfig from "@/pages/ringg-config";
import RinggScriptMappings from "@/pages/ringg-script-mappings";
import RinggCallHistory from "@/pages/ringg-call-history";
import CommunicationSchedules from "@/pages/communication-schedules";
import ClientRiskThermometer from "@/pages/client-risk-thermometer";
import PaymentRiskForecaster from "@/pages/payment-risk-forecaster";
import RecoveryHealthTest from "@/pages/recovery-health-test";
import PaymentAnalytics from "@/pages/payment-analytics";
import PaymentScorecard from "@/pages/payment-scorecard";
import ReliableCustomersReport from "@/pages/reliable-customers-report";
import RegisterTenant from "@/pages/register-tenant";
import TenantRegistrations from "@/pages/tenant-registrations";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import CategoryRules from "@/pages/category-rules";
import CategoryCalculation from "@/pages/category-calculation";
import UrgentActions from "@/pages/urgent-actions";
import FollowupAutomation from "@/pages/followup-automation";
import DailyDashboard from "@/pages/daily-dashboard";
import Tasks from "@/pages/tasks";
import CallQueue from "@/pages/call-queue";
import ActivityLog from "@/pages/activity-log";
import Leaderboard from "@/pages/leaderboard";
import DailyTargets from "@/pages/daily-targets";
import AuditLogs from "@/pages/audit-logs";
import SubscriptionPlans from "@/pages/subscription-plans";
import WhisperSettings from "@/pages/whisper-settings";
import BackupRestore from "@/pages/backup-restore";
import Pricing from "@/pages/pricing";
import PaymentSuccess from "@/pages/payment-success";
import PaymentFailed from "@/pages/payment-failed";
import Landing from "@/pages/landing";
import TenantProfile from "@/pages/tenant-profile";

function Router() {
  return (
    <Switch>
      <Route path="/welcome" component={Landing} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/register-tenant" component={RegisterTenant} />
      <Route path="/register" component={RegisterTenant} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/payment-failed" component={PaymentFailed} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/quotations/:id/print">
        <ProtectedRoute>
          <QuotationPrint />
        </ProtectedRoute>
      </Route>
      <Route>
        <ProtectedRoute>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/dashboard" component={Home} />
              <Route path="/customer-analytics" component={CustomerAnalytics} />
              <Route path="/leads" component={Leads} />
              <Route path="/quotations" component={Quotations} />
              <Route path="/proforma-invoices" component={ProformaInvoices} />
              <Route path="/invoices" component={Invoices} />
              <Route path="/receipts" component={Receipts} />
              <Route path="/debtors" component={Debtors} />
              <Route path="/credit-management" component={CreditManagement} />
              <Route path="/ledger" component={Ledger} />
              <Route path="/masters/customers" component={MasterCustomers} />
              <Route path="/masters/items" component={MasterItems} />
              <Route path="/risk/client-thermometer" component={ClientRiskThermometer} />
              <Route path="/risk/payment-forecaster" component={PaymentRiskForecaster} />
              <Route path="/risk/recovery-health" component={RecoveryHealthTest} />
              <Route path="/payment-analytics" component={PaymentAnalytics} />
              <Route path="/payment-analytics/scorecard" component={PaymentScorecard} />
              <Route path="/payment-analytics/reliable-customers" component={ReliableCustomersReport} />
              <Route path="/credit-control/category-rules" component={CategoryRules} />
              <Route path="/credit-control/category-calculation" component={CategoryCalculation} />
              <Route path="/credit-control/urgent-actions" component={UrgentActions} />
              <Route path="/credit-control/followup-automation" component={FollowupAutomation} />
              <Route path="/action-center/dashboard" component={DailyDashboard} />
              <Route path="/action-center/tasks" component={Tasks} />
              <Route path="/action-center/call-queue" component={CallQueue} />
              <Route path="/action-center/activity-log" component={ActivityLog} />
              <Route path="/team/leaderboard" component={Leaderboard} />
              <Route path="/team/targets" component={DailyTargets} />
              <Route path="/company-settings" component={CompanySettings} />
              <Route path="/email-config" component={EmailConfig} />
              <Route path="/email-templates" component={EmailTemplates} />
              <Route path="/whatsapp-config" component={WhatsAppConfig} />
              <Route path="/whatsapp-templates" component={WhatsAppTemplates} />
              <Route path="/ringg-config" component={RinggConfig} />
              <Route path="/ringg-script-mappings" component={RinggScriptMappings} />
              <Route path="/ringg-call-history" component={RinggCallHistory} />
              <Route path="/communication-schedules" component={CommunicationSchedules} />
              <Route path="/settings/roles" component={Roles} />
              <Route path="/settings/users" component={Users} />
              <Route path="/settings/profile" component={TenantProfile} />
              <Route path="/settings/backup-restore" component={BackupRestore} />
              <Route path="/audit-logs" component={AuditLogs} />
              <Route path="/tenant-registrations" component={TenantRegistrations} />
              <Route path="/subscription-plans" component={SubscriptionPlans} />
              <Route path="/whisper-settings" component={WhisperSettings} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <CommandPalette />
          <VoiceAssistant />
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
