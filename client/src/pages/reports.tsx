import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  IndianRupee,
  Wallet,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Download,
  DollarSign,
  AlertCircle,
  Phone,
  Mail,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  date: string;
  amount: number;
  method: string;
  voucherNumber: string;
}

interface InvoiceDetail {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  daysOverdue: number;
  interestRate: number;
  interest: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  payments: Payment[];
}

interface CustomerSummary {
  id: string;
  customerName: string;
  customerCode: string;
  mobile: string;
  email: string;
  contactPerson: string;
  category: string;
  openingBalance: number;
  totalInvoices: number;
  totalReceipts: number;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  totalInterest: number;
  partialPayments: number;
  avgDaysOverdue: number;
  invoices: InvoiceDetail[];
}

interface ReportData {
  customers: CustomerSummary[];
  grandTotals: {
    customers: number;
    invoices: number;
    amount: number;
    paid: number;
    pending: number;
    interest: number;
    openingBalance: number;
  };
}

export default function Reports() {
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'interest' | 'amount' | 'count'>('interest');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ["/api/reports/interest-summary"],
  });

  const sortedCustomers = useMemo(() => {
    if (!reportData?.customers) return [];
    
    return [...reportData.customers].sort((a, b) => {
      let compareValue = 0;
      switch (sortBy) {
        case 'interest':
          compareValue = a.totalInterest - b.totalInterest;
          break;
        case 'amount':
          compareValue = a.totalPending - b.totalPending;
          break;
        case 'count':
          compareValue = a.totalInvoices - b.totalInvoices;
          break;
        default:
          compareValue = a.totalInterest - b.totalInterest;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }, [reportData?.customers, sortBy, sortOrder]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const toggleSort = (field: 'interest' | 'amount' | 'count') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const exportToCSV = () => {
    if (!sortedCustomers.length) return;
    
    let csv = 'Customer Code,Customer Name,Contact Person,Mobile,Email,Category,Invoice Count,Total Amount,Paid Amount,Pending Amount,Total Interest,Partial Payments,Avg Days Overdue\n';
    sortedCustomers.forEach((c) => {
      csv += `${c.customerCode},"${c.customerName}","${c.contactPerson}","${c.mobile}","${c.email}",${c.category},${c.totalInvoices},${c.totalAmount.toFixed(2)},${c.totalPaid.toFixed(2)},${c.totalPending.toFixed(2)},${c.totalInterest.toFixed(2)},${c.partialPayments},${c.avgDaysOverdue}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interest-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Alpha':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Beta':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Gamma':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Delta':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const grandTotals = reportData?.grandTotals || {
    customers: 0,
    invoices: 0,
    amount: 0,
    paid: 0,
    pending: 0,
    interest: 0,
    openingBalance: 0,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {/* Total Customers */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Customers</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                {grandTotals.customers}
              </p>
            </div>

            {/* Total Invoices */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Invoices</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                {grandTotals.invoices}
              </p>
            </div>

            {/* Total Amount */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Amount</p>
              <p className="text-xl font-bold text-green-900 dark:text-green-100 mt-1">
                {formatCurrency(grandTotals.amount)}
              </p>
            </div>

            {/* Paid Amount */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/50 dark:to-teal-900/50 border-teal-200 dark:border-teal-800">
              <p className="text-sm font-medium text-teal-600 dark:text-teal-400">Paid Amount</p>
              <p className="text-xl font-bold text-teal-900 dark:text-teal-100 mt-1">
                {formatCurrency(grandTotals.paid)}
              </p>
            </div>

            {/* Pending Amount */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 border-orange-200 dark:border-orange-800">
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Pending Amount</p>
              <p className="text-xl font-bold text-orange-900 dark:text-orange-100 mt-1">
                {formatCurrency(grandTotals.pending)}
              </p>
            </div>

            {/* Total Interest */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Interest</p>
              <p className="text-xl font-bold text-red-900 dark:text-red-100 mt-1">
                {formatCurrency(grandTotals.interest)}
              </p>
            </div>

            {/* Opening Balance */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 border-indigo-200 dark:border-indigo-800">
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Opening Balance</p>
              <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">
                {formatCurrency(grandTotals.openingBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort Controls with Export Button */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
            <Button
              variant={sortBy === 'interest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('interest')}
            >
              Interest {sortBy === 'interest' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'amount' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('amount')}
            >
              Pending Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'count' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('count')}
            >
              Invoice Count {sortBy === 'count' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
          <Button onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Customer List */}
      <div className="space-y-4">
        {sortedCustomers.map((customer) => (
          <Card key={customer.id} className="overflow-hidden">
            {/* Customer Header */}
            <div
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Customer Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-lg font-semibold truncate">{customer.customerName}</h3>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {customer.customerCode}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full",
                      getCategoryColor(customer.category)
                    )}>
                      {customer.category}
                    </span>
                    {customer.partialPayments > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {customer.partialPayments} Partial
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {customer.contactPerson}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.mobile}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {customer.email}
                    </span>
                  </div>
                </div>

                {/* Customer Stats */}
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Invoices</p>
                    <p className="text-lg font-bold">{customer.totalInvoices}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Receipts</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{customer.totalReceipts || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(customer.totalPaid)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(customer.totalPending)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Interest</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(customer.totalInterest)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Avg Overdue</p>
                    <p className="text-lg font-bold">{customer.avgDaysOverdue} days</p>
                  </div>
                  <div>
                    {expandedCustomer === customer.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Invoice Details */}
            {expandedCustomer === customer.id && (
              <div className="border-t bg-muted/30 p-4 animate-in slide-in-from-top-2">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Invoice Details with Payments
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-semibold">Invoice No</th>
                        <th className="text-left p-3 font-semibold">Invoice Date</th>
                        <th className="text-left p-3 font-semibold">Due Date</th>
                        <th className="text-right p-3 font-semibold">Amount</th>
                        <th className="text-right p-3 font-semibold">Paid</th>
                        <th className="text-right p-3 font-semibold">Pending</th>
                        <th className="text-center p-3 font-semibold">Status</th>
                        <th className="text-center p-3 font-semibold">Days Overdue</th>
                        <th className="text-center p-3 font-semibold">Rate</th>
                        <th className="text-right p-3 font-semibold">Interest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.invoices.map((invoice, idx) => (
                        <>
                          <tr key={invoice.id} className="border-b hover:bg-background/50">
                            <td className="p-3 font-medium">{invoice.invoiceNo}</td>
                            <td className="p-3 text-muted-foreground">{formatDate(invoice.invoiceDate)}</td>
                            <td className="p-3 text-muted-foreground">{formatDate(invoice.dueDate)}</td>
                            <td className="p-3 text-right">{formatCurrency(invoice.amount)}</td>
                            <td className="p-3 text-right font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(invoice.paidAmount)}
                            </td>
                            <td className="p-3 text-right font-semibold text-orange-600 dark:text-orange-400">
                              {formatCurrency(invoice.pendingAmount)}
                            </td>
                            <td className="p-3 text-center">
                              <span className={cn(
                                "px-2 py-1 text-xs font-semibold rounded",
                                invoice.paymentStatus === 'paid'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : invoice.paymentStatus === 'partial'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              )}>
                                {invoice.paymentStatus.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {invoice.daysOverdue > 0 ? (
                                <span className={cn(
                                  "px-2 py-1 text-xs font-semibold rounded-full",
                                  invoice.daysOverdue > 60
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    : invoice.daysOverdue > 30
                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                )}>
                                  {invoice.daysOverdue} days
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">{invoice.interestRate}% p.a.</td>
                            <td className="p-3 text-right font-bold text-red-600 dark:text-red-400">
                              {formatCurrency(invoice.interest)}
                            </td>
                          </tr>
                          {/* Payment History Row */}
                          {invoice.payments && invoice.payments.length > 0 && (
                            <tr key={`${invoice.id}-payments`}>
                              <td colSpan={10} className="p-0">
                                <div className="p-4 bg-background border rounded-lg m-2">
                                  <div className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Payment History ({invoice.payments.length} payments)
                                  </div>
                                  {invoice.payments.map((payment, pidx) => (
                                    <div key={pidx} className="flex justify-between py-2 border-b last:border-0">
                                      <div>
                                        <span className="font-medium">{formatDate(payment.date)}</span>
                                        <span className="text-muted-foreground text-xs ml-2">
                                          • {payment.method} ({payment.voucherNumber})
                                        </span>
                                      </div>
                                      <span className="font-semibold text-green-600 dark:text-green-400">
                                        {formatCurrency(payment.amount)}
                                      </span>
                                    </div>
                                  ))}
                                  {/* Progress bar */}
                                  <div className="mt-3">
                                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-green-500 to-green-400"
                                        style={{ width: `${(invoice.paidAmount / invoice.amount) * 100}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {((invoice.paidAmount / invoice.amount) * 100).toFixed(1)}% paid ({formatCurrency(invoice.paidAmount)} of {formatCurrency(invoice.amount)})
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-blue-50 dark:bg-blue-950/30 font-bold">
                        <td colSpan={3} className="p-3">Total for {customer.customerName}</td>
                        <td className="p-3 text-right">{formatCurrency(customer.totalAmount)}</td>
                        <td className="p-3 text-right text-green-600 dark:text-green-400">
                          {formatCurrency(customer.totalPaid)}
                        </td>
                        <td className="p-3 text-right text-orange-600 dark:text-orange-400">
                          {formatCurrency(customer.totalPending)}
                        </td>
                        <td></td>
                        <td className="p-3 text-center">{customer.avgDaysOverdue} avg</td>
                        <td></td>
                        <td className="p-3 text-right text-red-600 dark:text-red-400">
                          {formatCurrency(customer.totalInterest)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        ))}

        {sortedCustomers.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No customer data found with invoices or opening balance.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
