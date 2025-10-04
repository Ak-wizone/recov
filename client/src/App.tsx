import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import Layout from "@/components/layout";
import Login from "@/pages/login";
import Home from "@/pages/home";
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

function Router() {
  return (
    <Switch>
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
              <Route path="/company-settings" component={CompanySettings} />
              <Route path="/settings/roles" component={Roles} />
              <Route path="/settings/users" component={Users} />
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
