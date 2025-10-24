import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Phone, Mail, FileText, UserCheck, Clock } from "lucide-react";
import { useLocation } from "wouter";

interface UrgentAction {
  customerId: string;
  customerName: string;
  category: "Alpha" | "Beta" | "Gamma" | "Delta";
  invoiceNumber: string;
  invoiceId: string;
  daysOverdue: number;
  amountDue: number;
  recommendedAction: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  "Send reminder email": <Mail className="h-4 w-4" />,
  "Send reminder WhatsApp": <Mail className="h-4 w-4" />,
  "Manager visit required": <UserCheck className="h-4 w-4" />,
  "Send legal notice": <FileText className="h-4 w-4" />,
  "Immediate follow-up call": <Phone className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  Alpha: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Beta: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Gamma: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Delta: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function UrgentActionsPage() {
  const [, setLocation] = useLocation();

  const { data: actions, isLoading } = useQuery<UrgentAction[]>({
    queryKey: ["/api/recovery/urgent-actions"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6 bg-background dark:bg-background">
        <Skeleton className="h-16 w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const urgentActions = actions || [];

  return (
    <div className="container mx-auto p-6 space-y-6 bg-background dark:bg-background">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 p-6 rounded-lg border-l-4 border-red-500">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" data-testid="icon-alert" />
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-foreground" data-testid="text-page-title">
              Urgent Actions Required
            </h1>
            <p className="text-muted-foreground dark:text-muted-foreground mt-1">
              {urgentActions.length} customer{urgentActions.length !== 1 ? "s" : ""} need immediate attention
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-red-600 dark:text-red-400" data-testid="text-action-count">
            {urgentActions.length}
          </div>
          <div className="text-sm text-muted-foreground dark:text-muted-foreground">Actions</div>
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        {urgentActions.length === 0 ? (
          <Card className="bg-card dark:bg-card border-border dark:border-border">
            <CardContent className="p-12 text-center">
              <Clock className="h-16 w-16 mx-auto text-muted-foreground dark:text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground dark:text-foreground mb-2">
                No Urgent Actions
              </h3>
              <p className="text-muted-foreground dark:text-muted-foreground">
                All invoices are up to date. Great job!
              </p>
            </CardContent>
          </Card>
        ) : (
          urgentActions.map((action, index) => (
            <Card
              key={`${action.customerId}-${action.invoiceId}-${index}`}
              className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow cursor-pointer bg-card dark:bg-card border-border dark:border-border"
              onClick={() => setLocation(`/invoices`)}
              data-testid={`card-action-${index}`}
            >
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Customer Info */}
                  <div className="md:col-span-3">
                    <h3 className="font-semibold text-lg text-foreground dark:text-foreground" data-testid={`text-customer-name-${index}`}>
                      {action.customerName}
                    </h3>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                      Invoice: {action.invoiceNumber}
                    </p>
                  </div>

                  {/* Category Badge */}
                  <div className="md:col-span-2">
                    <Badge
                      className={`${categoryColors[action.category]} font-semibold`}
                      data-testid={`badge-category-${index}`}
                    >
                      {action.category}
                    </Badge>
                  </div>

                  {/* Days Overdue */}
                  <div className="md:col-span-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid={`text-days-overdue-${index}`}>
                        {action.daysOverdue}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground">Days Overdue</div>
                    </div>
                  </div>

                  {/* Amount Due */}
                  <div className="md:col-span-2">
                    <div className="text-center">
                      <div className="text-xl font-semibold text-foreground dark:text-foreground" data-testid={`text-amount-due-${index}`}>
                        ₹{action.amountDue.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground">Amount Due</div>
                    </div>
                  </div>

                  {/* Recommended Action */}
                  <div className="md:col-span-3">
                    <div className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 p-3 rounded-md border border-purple-200 dark:border-purple-800">
                      <div className="text-purple-600 dark:text-purple-400">
                        {actionIcons[action.recommendedAction] || <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground dark:text-muted-foreground">Recommended</div>
                        <div className="font-medium text-sm text-foreground dark:text-foreground" data-testid={`text-action-${index}`}>
                          {action.recommendedAction}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
