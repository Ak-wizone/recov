import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import Leads from "@/pages/leads";
import MasterCustomers from "@/pages/master-customers";
import MasterItems from "@/pages/master-items";
import Invoices from "@/pages/invoices";
import Receipts from "@/pages/receipts";
import CompanySettings from "@/pages/company-settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/leads" component={Leads} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/receipts" component={Receipts} />
        <Route path="/masters/customers" component={MasterCustomers} />
        <Route path="/masters/items" component={MasterItems} />
        <Route path="/company-settings" component={CompanySettings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
