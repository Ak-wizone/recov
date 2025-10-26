import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  FileText,
  Receipt,
  AlertCircle,
  TrendingUp,
  IndianRupee,
} from "lucide-react";

interface TenantSummaryProps {
  tenantId: string;
  tenantName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TenantSummary {
  openingBalance: number;
  invoiceTotal: number;
  receiptTotal: number;
  outstandingBalance: number;
  customerCount: number;
  categoryBreakdown: Array<{
    category: string;
    count: number;
  }>;
  receiptBreakdown: Array<{
    type: string;
    count: number;
    total: number;
  }>;
  avgInvoiceValue: number;
  avgReceiptValue: number;
}

export function TenantSummary({ tenantId, tenantName, open, onOpenChange }: TenantSummaryProps) {
  const { data: summary, isLoading } = useQuery<TenantSummary>({
    queryKey: ['/api/tenants', tenantId, 'summary'],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/summary`);
      if (!response.ok) throw new Error('Failed to fetch summary');
      return response.json();
    },
    enabled: open && !!tenantId,
  });

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Alpha: "bg-green-100 text-green-800 border-green-200",
      Beta: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Gamma: "bg-orange-100 text-orange-800 border-orange-200",
      Delta: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[category] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tenant Analytics: {tenantName}
          </DialogTitle>
          <DialogDescription>
            Comprehensive overview of tenant's business metrics and customer data
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <IndianRupee className="h-4 w-4" />
                    Opening Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary.openingBalance)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Invoice Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.invoiceTotal)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Receipt Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.receiptTotal)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Outstanding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.outstandingBalance)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Customer Insights and Receipt Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Customer Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Customers</span>
                      <span className="text-lg font-bold">{summary.customerCount}</span>
                    </div>
                    {summary.categoryBreakdown.length > 0 ? (
                      <div className="space-y-2 pt-2 border-t">
                        {summary.categoryBreakdown.map((cat) => (
                          <div key={cat.category} className="flex items-center justify-between">
                            <Badge variant="outline" className={getCategoryColor(cat.category)}>
                              {cat.category}
                            </Badge>
                            <span className="text-sm font-medium">{cat.count} customers</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pt-2">No category data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Receipt Type Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Receipt Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.receiptBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {summary.receiptBreakdown.map((receipt) => (
                        <div key={receipt.type} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{receipt.type}</span>
                            <Badge variant="secondary">{receipt.count}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total: {formatCurrency(receipt.total)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No receipt data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Average Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Average Invoice Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatCurrency(summary.avgInvoiceValue)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Average Receipt Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatCurrency(summary.avgReceiptValue)}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No data available for this tenant
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
