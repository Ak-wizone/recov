import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Star,
  Search,
  Download,
  Mail,
  MessageCircle,
  ArrowLeft,
  TrendingUp,
  Award,
} from "lucide-react";
import { Link } from "wouter";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

interface ReliableCustomer {
  customerId: string;
  clientName: string;
  category: string;
  onTimeRate: number;
  paymentScore: number;
  totalInvoices: number;
  totalOutstanding: string;
  avgDelayDays: number;
  classification: string;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Alpha":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "Beta":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "Gamma":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Delta":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

export default function ReliableCustomersReport() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: customers = [], isLoading } = useQuery<ReliableCustomer[]>({
    queryKey: ["/api/payment-analytics/reliable-customers"],
  });

  // Filter customers based on search (only if data is loaded)
  const filteredCustomers = customers && customers.length > 0
    ? customers.filter(customer =>
        customer?.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer?.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleExportExcel = () => {
    try {
      const exportData = filteredCustomers.map(customer => ({
        "Customer Name": customer.clientName,
        "Category": customer.category,
        "On-Time Rate (%)": customer.onTimeRate.toFixed(1),
        "Payment Score": customer.paymentScore,
        "Total Invoices": customer.totalInvoices,
        "Outstanding Amount": parseFloat(customer.totalOutstanding).toFixed(2),
        "Avg Delay Days": customer.avgDelayDays,
        "Classification": customer.classification,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reliable Customers");

      // Auto-size columns
      const maxWidth = 30;
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.min(maxWidth, Math.max(key.length, ...exportData.map(row => String(row[key as keyof typeof row]).length)))
      }));
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `reliable-customers-${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredCustomers.length} reliable customers to Excel`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export to Excel",
        variant: "destructive",
      });
    }
  };

  const handleEmailReport = () => {
    toast({
      title: "Email Feature",
      description: "Email functionality will be integrated with your email configuration",
    });
  };

  const handleWhatsAppShare = () => {
    toast({
      title: "WhatsApp Feature",
      description: "WhatsApp sharing will be integrated with your WhatsApp configuration",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-6 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/payment-analytics" data-testid="link-back">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Reliable Customers Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Customers with ≥80% on-time payment rate (Star performers)
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Reliable Customers
              </CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-total-reliable">
                {filteredCustomers.length}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Star performers
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg On-Time Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-avg-ontime">
                {filteredCustomers.length > 0
                  ? (filteredCustomers.reduce((acc, c) => acc + c.onTimeRate, 0) / filteredCustomers.length).toFixed(1)
                  : 0}%
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Across all reliable customers
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Payment Score
              </CardTitle>
              <Award className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-avg-score">
                {filteredCustomers.length > 0
                  ? (filteredCustomers.reduce((acc, c) => acc + c.paymentScore, 0) / filteredCustomers.length).toFixed(0)
                  : 0}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Out of 100 points
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by customer name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExportExcel} variant="outline" data-testid="button-export-excel">
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                <Button onClick={handleEmailReport} variant="outline" data-testid="button-email">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button onClick={handleWhatsAppShare} variant="outline" data-testid="button-whatsapp">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Reliable Customers List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Star className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  {customers.length === 0
                    ? "No reliable customers found. Calculate payment patterns first."
                    : "No customers match your search criteria"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">On-Time Rate</TableHead>
                      <TableHead className="text-right">Payment Score</TableHead>
                      <TableHead className="text-right">Total Invoices</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Avg Delay</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.customerId} data-testid={`row-customer-${customer.customerId}`}>
                        <TableCell className="font-medium">
                          <Link 
                            href={`/payment-analytics/scorecard?customerId=${customer.customerId}`}
                            data-testid={`link-customer-${customer.customerId}`}
                          >
                            <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" data-testid={`text-customer-name-${customer.customerId}`}>
                              {customer.clientName}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(customer.category)}>
                            {customer.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {customer.onTimeRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {customer.paymentScore}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{customer.totalInvoices}</TableCell>
                        <TableCell className="text-right">
                          ₹{parseFloat(customer.totalOutstanding).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{customer.avgDelayDays} days</TableCell>
                        <TableCell>
                          <Link 
                            href={`/payment-analytics/scorecard?customerId=${customer.customerId}`}
                            data-testid={`link-view-details-${customer.customerId}`}
                          >
                            <Button size="sm" variant="ghost" data-testid={`button-view-${customer.customerId}`}>
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
