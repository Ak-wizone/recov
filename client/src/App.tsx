import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
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
import RegisterTenant from "@/pages/register-tenant";
import TenantRegistrations from "@/pages/tenant-registrations";

function Router() {
  return (
    <Switch>
      <Route path="/register-tenant" component={RegisterTenant} />
      <Route path="/login" component={Login} />
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
              <Route path="/tenant-registrations" component={TenantRegistrations} />
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
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
