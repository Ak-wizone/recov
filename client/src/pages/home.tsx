import { useQuery, useMutation } from "@tanstack/react-query";
import { DebtorSummary } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const { toast } = useToast();

  const { data: debtors = [], isLoading } = useQuery<DebtorSummary[]>({
    queryKey: ["/api/debtors"],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/debtors/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "debtors.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Debtors exported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount);
    return `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10 shadow-sm animate-in slide-in-from-top duration-500">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Debtors Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Track and manage customer debts</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => exportMutation.mutate()}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-5"
                disabled={exportMutation.isPending}
                data-testid="button-export-excel"
              >
                <FileDown className="mr-2 h-4 w-4" />
                {exportMutation.isPending ? "Exporting..." : "Export"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Loading debtors...</div>
              </div>
            ) : debtors.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">No debtors found</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">Customer Name</TableHead>
                      <TableHead className="font-bold text-right">Total Invoices (₹)</TableHead>
                      <TableHead className="font-bold text-right">Total Receipts (₹)</TableHead>
                      <TableHead className="font-bold text-right">Outstanding Balance (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debtors.map((debtor, index) => (
                      <TableRow key={index} data-testid={`row-debtor-${index}`}>
                        <TableCell className="font-medium" data-testid={`text-customer-name-${index}`}>
                          {debtor.customerName}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-total-invoices-${index}`}>
                          {formatCurrency(debtor.totalInvoices)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-total-receipts-${index}`}>
                          {formatCurrency(debtor.totalReceipts)}
                        </TableCell>
                        <TableCell 
                          className={`text-right font-semibold ${
                            parseFloat(debtor.outstandingBalance) > 0 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}
                          data-testid={`text-outstanding-balance-${index}`}
                        >
                          {formatCurrency(debtor.outstandingBalance)}
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
