import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Users, CheckCircle, AlertTriangle, TrendingUp, Target, BarChart, AlertCircle, MessageSquare, Mail } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { EmailDialog } from "@/components/email-dialog";
import { openWhatsApp, getWhatsAppMessageTemplate } from "@/lib/whatsapp";
import * as XLSX from "xlsx";

interface CreditManagementData {
  customerId: string;
  customerName: string;
  category: string;
  creditLimit: number;
  utilizedLimit: number;
  availableLimit: number;
  utilizationPercentage: number;
  mobile?: string;
  email?: string;
}

export default function CreditManagement() {
  const { toast } = useToast();
  const [utilizationFilter, setUtilizationFilter] = useState<string | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedEmailCustomer, setSelectedEmailCustomer] = useState<CreditManagementData | null>(null);

  const { data: creditData = [], isLoading } = useQuery<CreditManagementData[]>({
    queryKey: ["/api/credit-management"],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/credit-management/export");
      if (!response.ok) throw new Error("Failed to export credit management data");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "credit_management_export.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Credit management data has been exported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage > 100) return "bg-red-100 text-red-800 border-red-300";
    if (percentage >= 76) return "bg-purple-100 text-purple-800 border-purple-300";
    if (percentage >= 51) return "bg-orange-100 text-orange-800 border-orange-300";
    if (percentage >= 26) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (percentage >= 1) return "bg-green-100 text-green-800 border-green-300";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  const categoryColors = {
    Alpha: "bg-green-100 text-green-800 border-green-300",
    Beta: "bg-blue-100 text-blue-800 border-blue-300",
    Gamma: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Delta: "bg-red-100 text-red-800 border-red-300",
  };

  const handleWhatsAppClick = (credit: CreditManagementData) => {
    if (!credit.mobile) {
      toast({
        title: "Mobile number not available",
        description: "This customer doesn't have a mobile number on file.",
        variant: "destructive",
      });
      return;
    }

    const message = getWhatsAppMessageTemplate("credit_management", {
      customerName: credit.customerName,
      amount: credit.utilizedLimit,
    });

    openWhatsApp(credit.mobile, message);
  };

  const handleEmailClick = (credit: CreditManagementData) => {
    if (!credit.email) {
      toast({
        title: "Email not available",
        description: "This customer doesn't have an email address on file.",
        variant: "destructive",
      });
      return;
    }

    setSelectedEmailCustomer(credit);
    setIsEmailDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<CreditManagementData>[]>(
    () => [
      {
        accessorKey: "customerName",
        header: "Customer Name",
        cell: ({ row }) => (
          <div className="font-semibold text-gray-900" data-testid={`text-customerName-${row.original.customerId}`}>
            {row.original.customerName}
          </div>
        ),
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <Badge
            className={categoryColors[row.original.category as keyof typeof categoryColors]}
            data-testid={`badge-category-${row.original.customerId}`}
          >
            {row.original.category}
          </Badge>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "creditLimit",
        header: "Credit Limit",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-creditLimit-${row.original.customerId}`}>
            {formatCurrency(row.original.creditLimit)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "utilizedLimit",
        header: "Utilized Limit",
        cell: ({ row }) => (
          <span className="text-gray-700 font-medium" data-testid={`text-utilizedLimit-${row.original.customerId}`}>
            {formatCurrency(row.original.utilizedLimit)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "availableLimit",
        header: "Available Limit",
        cell: ({ row }) => (
          <span 
            className={row.original.availableLimit < 0 ? "text-red-600 font-semibold" : "text-green-600 font-medium"}
            data-testid={`text-availableLimit-${row.original.customerId}`}
          >
            {formatCurrency(row.original.availableLimit)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "utilizationPercentage",
        header: "Utilization %",
        cell: ({ row }) => (
          <Badge
            className={getUtilizationColor(row.original.utilizationPercentage)}
            data-testid={`badge-utilization-${row.original.customerId}`}
          >
            {row.original.utilizationPercentage.toFixed(2)}%
          </Badge>
        ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleWhatsAppClick(row.original)}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
              data-testid={`button-whatsapp-${row.original.customerId}`}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEmailClick(row.original)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              data-testid={`button-email-${row.original.customerId}`}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [categoryColors, handleWhatsAppClick, handleEmailClick]
  );

  const handleExportSelected = (rows: CreditManagementData[]) => {
    const exportData = rows.map((item) => ({
      "Customer Name": item.customerName,
      Category: item.category,
      "Credit Limit": item.creditLimit.toFixed(2),
      "Utilized Limit": item.utilizedLimit.toFixed(2),
      "Available Limit": item.availableLimit.toFixed(2),
      "Utilization %": item.utilizationPercentage.toFixed(2) + "%",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Credit Management");
    XLSX.writeFile(workbook, `credit_management_selected_${new Date().getTime()}.xlsx`);

    toast({
      title: "Export Successful",
      description: `${rows.length} record(s) exported successfully`,
    });
  };

  // Filter data based on utilization range
  const filteredCreditData = creditData.filter((item) => {
    if (!utilizationFilter) return true;
    
    const percentage = item.utilizationPercentage;
    switch (utilizationFilter) {
      case "not-utilized":
        return percentage === 0;
      case "over-utilized":
        return percentage > 100;
      case "1-25":
        return percentage >= 1 && percentage <= 25;
      case "26-50":
        return percentage >= 26 && percentage <= 50;
      case "51-75":
        return percentage >= 51 && percentage <= 75;
      case "76-100":
        return percentage >= 76 && percentage <= 100;
      default:
        return true;
    }
  });

  // Calculate dashboard statistics
  const totalClients = creditData.length;
  const notUtilized = creditData.filter((c) => c.utilizationPercentage === 0).length;
  const overUtilized = creditData.filter((c) => c.utilizationPercentage > 100).length;
  const range1to25 = creditData.filter((c) => c.utilizationPercentage >= 1 && c.utilizationPercentage <= 25).length;
  const range26to50 = creditData.filter((c) => c.utilizationPercentage >= 26 && c.utilizationPercentage <= 50).length;
  const range51to75 = creditData.filter((c) => c.utilizationPercentage >= 51 && c.utilizationPercentage <= 75).length;
  const range76to100 = creditData.filter((c) => c.utilizationPercentage >= 76 && c.utilizationPercentage <= 100).length;

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10 shadow-sm animate-in slide-in-from-top duration-500">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
                Credit Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Monitor credit limits and utilization</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => exportMutation.mutate()}
                variant="outline"
                className="shadow-md hover:shadow-lg transition-all duration-200"
                disabled={exportMutation.isPending}
                data-testid="button-export"
              >
                <Download className="mr-2 h-4 w-4" />
                {exportMutation.isPending ? "Exporting..." : "Export"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="bg-blue-50 border-0" data-testid="card-total-clients">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 p-3 rounded-xl flex-shrink-0">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Total Clients</p>
                    <p className="text-3xl font-bold text-blue-600">{totalClients}</p>
                    <p className="text-xs text-blue-500 mt-1">All debtor clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "not-utilized" 
                  ? "bg-gray-100" 
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "not-utilized" ? null : "not-utilized")}
              data-testid="card-not-utilized"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-500 p-3 rounded-xl flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Not Utilized</p>
                    <p className="text-3xl font-bold text-gray-600">{notUtilized}</p>
                    <p className="text-xs text-gray-500 mt-1">0% utilization</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "over-utilized" 
                  ? "bg-red-100" 
                  : "bg-red-50 hover:bg-red-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "over-utilized" ? null : "over-utilized")}
              data-testid="card-over-utilized"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-red-500 p-3 rounded-xl flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Over Utilized</p>
                    <p className="text-3xl font-bold text-red-600">{overUtilized}</p>
                    <p className="text-xs text-red-500 mt-1">Clients using &gt;100% credit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "1-25" 
                  ? "bg-green-100" 
                  : "bg-green-50 hover:bg-green-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "1-25" ? null : "1-25")}
              data-testid="card-1-25-utilized"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-green-500 p-3 rounded-xl flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">1-25% Utilized</p>
                    <p className="text-3xl font-bold text-green-600">{range1to25}</p>
                    <p className="text-xs text-green-500 mt-1">Low utilization</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "26-50" 
                  ? "bg-yellow-100" 
                  : "bg-yellow-50 hover:bg-yellow-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "26-50" ? null : "26-50")}
              data-testid="card-26-50-utilized"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-500 p-3 rounded-xl flex-shrink-0">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-1">26-50% Utilized</p>
                    <p className="text-3xl font-bold text-yellow-600">{range26to50}</p>
                    <p className="text-xs text-yellow-500 mt-1">Moderate utilization</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "51-75" 
                  ? "bg-orange-100" 
                  : "bg-orange-50 hover:bg-orange-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "51-75" ? null : "51-75")}
              data-testid="card-51-75-utilized"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-500 p-3 rounded-xl flex-shrink-0">
                    <BarChart className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">51-75% Utilized</p>
                    <p className="text-3xl font-bold text-orange-600">{range51to75}</p>
                    <p className="text-xs text-orange-500 mt-1">High utilization</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "76-100" 
                  ? "bg-purple-100" 
                  : "bg-purple-50 hover:bg-purple-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "76-100" ? null : "76-100")}
              data-testid="card-76-100-utilized"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500 p-3 rounded-xl flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">76-100% Utilized</p>
                    <p className="text-3xl font-bold text-purple-600">{range76to100}</p>
                    <p className="text-xs text-purple-500 mt-1">Near limit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
          <DataTable
            columns={columns}
            data={filteredCreditData}
            tableKey="credit-management"
            isLoading={isLoading}
            onExportSelected={handleExportSelected}
            enableRowSelection={true}
            enableBulkActions={true}
            enableGlobalFilter={true}
            enableColumnVisibility={true}
            enableSorting={true}
          />
        </div>
      </div>

      {/* Email Dialog */}
      <EmailDialog
        isOpen={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        moduleType="credit_management"
        recordData={{
          customerName: selectedEmailCustomer?.customerName,
          customerEmail: selectedEmailCustomer?.email,
          creditLimit: selectedEmailCustomer?.creditLimit,
          balance: selectedEmailCustomer?.utilizedLimit,
        }}
      />
    </div>
  );
}
