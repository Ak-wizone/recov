import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Users, CheckCircle, AlertTriangle, TrendingUp, Target, BarChart, AlertCircle, MessageSquare, Mail, Phone } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { EmailDialog } from "@/components/email-dialog";
import { CallDialog } from "@/components/call-dialog";
import { openWhatsApp, getWhatsAppMessageTemplate } from "@/lib/whatsapp";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TelecmiCallButton } from "@/components/telecmi-call-button";
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
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedCreditForCall, setSelectedCreditForCall] = useState<CreditManagementData | null>(null);

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

  const handleCallClick = (credit: CreditManagementData) => {
    if (!credit.mobile) {
      toast({
        title: "Mobile number not available",
        description: "This customer doesn't have a mobile number on file.",
        variant: "destructive",
      });
      return;
    }

    setSelectedCreditForCall(credit);
    setIsCallDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<CreditManagementData>[]>(
    () => [
      {
        accessorKey: "customerName",
        header: "Customer Name",
        cell: ({ row }) => (
          <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`text-customerName-${row.original.customerId}`}>
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
          <span className="text-gray-700 dark:text-gray-300" data-testid={`text-creditLimit-${row.original.customerId}`}>
            {formatCurrency(row.original.creditLimit)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "utilizedLimit",
        header: "Utilized Limit",
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300 font-medium" data-testid={`text-utilizedLimit-${row.original.customerId}`}>
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
    ],
    [categoryColors]
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
    <div className="h-screen flex flex-col">
      {/* Fixed Top Section - Cards */}
      <div className="flex-shrink-0 bg-background shadow-sm border-b z-20">
        <div className="w-full px-4 lg:px-6 py-2">
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
            <Card className="bg-blue-50 border-0" data-testid="card-total-clients">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="bg-blue-500 p-2 rounded-lg">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{totalClients}</p>
                  <p className="text-[10px] font-medium text-blue-600 uppercase">Total Clients</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "not-utilized" 
                  ? "bg-gray-100 ring-2 ring-gray-400" 
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "not-utilized" ? null : "not-utilized")}
              data-testid="card-not-utilized"
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="bg-gray-500 p-2 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-gray-600">{notUtilized}</p>
                  <p className="text-[10px] font-medium text-gray-600 uppercase">Not Utilized</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "over-utilized" 
                  ? "bg-red-100 ring-2 ring-red-400" 
                  : "bg-red-50 hover:bg-red-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "over-utilized" ? null : "over-utilized")}
              data-testid="card-over-utilized"
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="bg-red-500 p-2 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-red-600">{overUtilized}</p>
                  <p className="text-[10px] font-medium text-red-600 uppercase">Over Utilized</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "1-25" 
                  ? "bg-green-100 ring-2 ring-green-400" 
                  : "bg-green-50 hover:bg-green-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "1-25" ? null : "1-25")}
              data-testid="card-1-25-utilized"
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="bg-green-500 p-2 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{range1to25}</p>
                  <p className="text-[10px] font-medium text-green-600 uppercase">1-25%</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "26-50" 
                  ? "bg-yellow-100 ring-2 ring-yellow-400" 
                  : "bg-yellow-50 hover:bg-yellow-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "26-50" ? null : "26-50")}
              data-testid="card-26-50-utilized"
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="bg-yellow-500 p-2 rounded-lg">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{range26to50}</p>
                  <p className="text-[10px] font-medium text-yellow-600 uppercase">26-50%</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "51-75" 
                  ? "bg-orange-100 ring-2 ring-orange-400" 
                  : "bg-orange-50 hover:bg-orange-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "51-75" ? null : "51-75")}
              data-testid="card-51-75-utilized"
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="bg-orange-500 p-2 rounded-lg">
                    <BarChart className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{range51to75}</p>
                  <p className="text-[10px] font-medium text-orange-600 uppercase">51-75%</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all border-0 ${
                utilizationFilter === "76-100" 
                  ? "bg-purple-100 ring-2 ring-purple-400" 
                  : "bg-purple-50 hover:bg-purple-100"
              }`}
              onClick={() => setUtilizationFilter(utilizationFilter === "76-100" ? null : "76-100")}
              data-testid="card-76-100-utilized"
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="bg-purple-500 p-2 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{range76to100}</p>
                  <p className="text-[10px] font-medium text-purple-600 uppercase">76-100%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 min-h-0 overflow-auto px-4 lg:px-6 py-4">
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
            customToolbarActions={
              <Button
                onClick={() => exportMutation.mutate()}
                variant="outline"
                size="sm"
                disabled={exportMutation.isPending}
                data-testid="button-export"
              >
                <Download className="mr-2 h-4 w-4" />
                {exportMutation.isPending ? "Exporting..." : "Export"}
              </Button>
            }
            customBulkActions={(selectedRows) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedRows.length === 1) {
                      const customer = selectedRows[0] as CreditManagementData;
                      const message = getWhatsAppMessageTemplate("credit_management", {
                        customerName: customer.customerName,
                        creditLimit: customer.creditLimit,
                        balance: customer.utilizedLimit,
                      });
                      openWhatsApp(customer.mobile || "", message);
                    } else {
                      selectedRows.forEach((row) => {
                        const customer = row as CreditManagementData;
                        const message = getWhatsAppMessageTemplate("credit_management", {
                          customerName: customer.customerName,
                          creditLimit: customer.creditLimit,
                          balance: customer.utilizedLimit,
                        });
                        openWhatsApp(customer.mobile || "", message);
                      });
                    }
                  }}
                  className="bg-green-100 hover:bg-green-200 border-green-300 text-green-800 hover:text-green-800 dark:bg-green-900 dark:hover:bg-green-800 dark:border-green-700 dark:text-green-200 dark:hover:text-green-200 transition-transform duration-200 hover:scale-105"
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedRows.length === 1) {
                      const customer = selectedRows[0] as CreditManagementData;
                      setSelectedEmailCustomer(customer);
                      setIsEmailDialogOpen(true);
                    }
                  }}
                  disabled={selectedRows.length !== 1}
                  className="bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800 hover:text-blue-800 dark:bg-blue-900 dark:hover:bg-blue-800 dark:border-blue-700 dark:text-blue-200 dark:hover:text-blue-200 transition-transform duration-200 hover:scale-105"
                >
                  <Mail className="h-4 w-4 mr-1.5" />
                  Email
                </Button>
              </div>
            )}
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

      <CallDialog
        isOpen={isCallDialogOpen}
        onOpenChange={setIsCallDialogOpen}
        moduleType="credit_management"
        recordData={{
          customerName: selectedCreditForCall?.customerName || "",
          phoneNumber: selectedCreditForCall?.mobile || "",
          creditLimit: selectedCreditForCall?.creditLimit || "",
          balance: selectedCreditForCall?.utilizedLimit || "",
          customerId: selectedCreditForCall?.customerId || "",
        }}
      />
    </div>
  );
}
