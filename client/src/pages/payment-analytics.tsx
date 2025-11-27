import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  CircleCheck,
  AlertCircle,
  XCircle,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  RefreshCw,
  FileText,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface SegmentData {
  classification: string;
  customerCount: number;
  totalOutstanding: string;
  avgPaymentScore: number;
}

interface DashboardData {
  segments: SegmentData[];
  summary: {
    totalCustomers: number;
    avgOnTimeRate: number;
    totalOutstanding: string;
    avgPaymentScore: number;
  };
}

const getClassificationConfig = (classification: string) => {
  switch (classification) {
    case "Star":
      return {
        icon: <Star className="h-6 w-6" />,
        color: "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white",
        badgeColor: "bg-yellow-500 text-white",
        description: "≥80% on-time payments",
      };
    case "Regular":
      return {
        icon: <CircleCheck className="h-6 w-6" />,
        color: "bg-gradient-to-br from-green-400 to-green-500 text-white",
        badgeColor: "bg-green-500 text-white",
        description: "50-79% on-time payments",
      };
    case "Risky":
      return {
        icon: <AlertCircle className="h-6 w-6" />,
        color: "bg-gradient-to-br from-orange-400 to-orange-500 text-white",
        badgeColor: "bg-orange-500 text-white",
        description: "30-49% on-time payments",
      };
    case "Critical":
      return {
        icon: <XCircle className="h-6 w-6" />,
        color: "bg-gradient-to-br from-red-400 to-red-500 text-white",
        badgeColor: "bg-red-500 text-white",
        description: "<30% on-time payments",
      };
    default:
      return {
        icon: <Users className="h-6 w-6" />,
        color: "bg-gradient-to-br from-gray-400 to-gray-500 text-white",
        badgeColor: "bg-gray-500 text-white",
        description: "Unknown classification",
      };
  }
};

export default function PaymentAnalytics() {
  const { toast } = useToast();
  const [isRecalculating, setIsRecalculating] = useState(false);

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/payment-analytics/dashboard"],
  });

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await apiRequest("POST", "/api/payment-analytics/recalculate", {});
      
      await queryClient.invalidateQueries({ queryKey: ["/api/payment-analytics/dashboard"] });
      
      toast({
        title: "Recalculation Complete",
        description: "Payment patterns have been recalculated for all customers",
      });
    } catch (error: any) {
      toast({
        title: "Recalculation Failed",
        description: error.message || "Failed to recalculate payment patterns",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-6 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Customers
              </CardTitle>
              <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-total-customers">
                {dashboardData?.summary.totalCustomers || 0}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Active payment accounts
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
              <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-avg-ontime-rate">
                {dashboardData?.summary.avgOnTimeRate.toFixed(1) || 0}%
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Overall payment performance
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Outstanding
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-total-outstanding">
                ₹{parseFloat(dashboardData?.summary.totalOutstanding || "0").toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Across all customers
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Payment Score
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-avg-payment-score">
                {dashboardData?.summary.avgPaymentScore.toFixed(0) || 0}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Out of 100 points
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Classification Segments */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Customer Segments by Payment Behavior
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                variant="outline"
                data-testid="button-recalculate"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
                {isRecalculating ? 'Recalculating...' : 'Recalculate'}
              </Button>
              <Link href="/payment-analytics/reliable-customers" data-testid="link-view-report-header">
                <Button data-testid="button-view-report">
                  <FileText className="h-4 w-4 mr-2" />
                  Reliable Customers Report
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardData?.segments.map((segment) => {
              const config = getClassificationConfig(segment.classification);
              return (
                <Link
                  key={segment.classification}
                  href={`/payment-analytics/scorecard?classification=${segment.classification}`}
                  data-testid={`link-segment-${segment.classification.toLowerCase()}`}
                >
                  <Card
                    className={`border-0 shadow-lg cursor-pointer transition-transform hover:scale-105 ${config.color}`}
                    data-testid={`card-segment-${segment.classification.toLowerCase()}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        {config.icon}
                        <Badge className={config.badgeColor} data-testid={`badge-${segment.classification.toLowerCase()}`}>
                          {segment.classification}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-semibold mt-2">
                        {config.description}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="text-4xl font-bold" data-testid={`text-count-${segment.classification.toLowerCase()}`}>
                            {segment.customerCount}
                          </div>
                          <div className="text-sm opacity-90 mt-1">Customers</div>
                        </div>
                        <div className="pt-3 border-t border-white/20">
                          <div className="text-2xl font-semibold" data-testid={`text-outstanding-${segment.classification.toLowerCase()}`}>
                            ₹{parseFloat(segment.totalOutstanding).toLocaleString()}
                          </div>
                          <div className="text-sm opacity-90 mt-1">Total Outstanding</div>
                        </div>
                        <div className="pt-3 border-t border-white/20">
                          <div className="text-xl font-semibold" data-testid={`text-score-${segment.classification.toLowerCase()}`}>
                            {segment.avgPaymentScore.toFixed(0)} pts
                          </div>
                          <div className="text-sm opacity-90 mt-1">Avg Payment Score</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/payment-analytics/scorecard" data-testid="link-view-scorecard">
              <Button variant="outline" data-testid="button-view-scorecard">
                <Activity className="h-4 w-4 mr-2" />
                View Customer Scorecards
              </Button>
            </Link>
            <Link href="/payment-analytics/reliable-customers" data-testid="link-reliable-report">
              <Button variant="outline" data-testid="button-reliable-report">
                <Star className="h-4 w-4 mr-2" />
                Reliable Customers Report
              </Button>
            </Link>
            <Link href="/debtors" data-testid="link-view-debtors">
              <Button variant="outline" data-testid="button-view-debtors">
                <Users className="h-4 w-4 mr-2" />
                View All Debtors
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
