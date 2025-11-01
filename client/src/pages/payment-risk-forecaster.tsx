import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, Calendar, AlertCircle, BarChart3 } from "lucide-react";
import { RiskThermometer } from "@/components/risk-thermometer";
import { useAuth } from "@/lib/auth";

interface ForecastData {
  forecasts: Array<{
    customerId: string;
    customerName: string;
    category: string;
    stuckProbability: string;
    expectedPaymentDate: Date | null;
    metrics: {
      onTimeRate: string;
      avgDelayDays: string;
      unpaidInvoices: number;
      unpaidAmount: string;
    };
  }>;
  summary: {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

const shouldShowCard = (cardName: string, allowedCards: string[] | undefined, isPlatformAdmin: boolean): boolean => {
  if (isPlatformAdmin) return true;
  if (!allowedCards || allowedCards.length === 0) return true;
  return allowedCards.includes(cardName);
};

export default function PaymentRiskForecaster() {
  const { user } = useAuth();
  const isPlatformAdmin = !!(user && !user.tenantId);

  const { data: forecastData, isLoading } = useQuery<ForecastData>({
    queryKey: ['/api/risk/payment-forecaster'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!forecastData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const getRiskLevel = (probability: string) => {
    const prob = parseFloat(probability);
    if (prob >= 70) return { level: 'High', color: 'text-red-600 bg-red-50 border-red-200' };
    if (prob >= 30) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    return { level: 'Low', color: 'text-green-600 bg-green-50 border-green-200' };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Risk Forecaster</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Predict payment delays and stuck transactions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {shouldShowCard("High Risk", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card className="border-l-4 border-l-red-500" data-testid="card-forecast-high-risk">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">High Risk (≥70%)</CardTitle>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{forecastData.summary.highRisk}</div>
              <p className="text-xs text-gray-500 mt-1">Likely to get stuck</p>
            </CardContent>
          </Card>
        )}

        {shouldShowCard("Medium Risk", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card className="border-l-4 border-l-yellow-500" data-testid="card-forecast-medium-risk">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Medium Risk (30-70%)</CardTitle>
              <TrendingDown className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{forecastData.summary.mediumRisk}</div>
              <p className="text-xs text-gray-500 mt-1">Moderate delay expected</p>
            </CardContent>
          </Card>
        )}

        {shouldShowCard("Low Risk", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card className="border-l-4 border-l-green-500" data-testid="card-forecast-low-risk">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Risk (&lt;30%)</CardTitle>
              <BarChart3 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{forecastData.summary.lowRisk}</div>
              <p className="text-xs text-gray-500 mt-1">Low delay probability</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Forecast List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Stuck Probability Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {forecastData.forecasts.length > 0 ? (
              forecastData.forecasts.map((forecast) => {
                const risk = getRiskLevel(forecast.stuckProbability);
                return (
                  <div
                    key={forecast.customerId}
                    className={`p-4 rounded-lg border-2 ${risk.color}`}
                    data-testid={`forecast-${forecast.customerId}`}
                  >
                    <div className="flex gap-6">
                      {/* Thermometer Visual */}
                      <div className="flex-shrink-0">
                        <RiskThermometer riskScore={parseFloat(forecast.stuckProbability)} size="md" showLabel={false} />
                      </div>

                      {/* Forecast Details */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-lg">{forecast.customerName}</h3>
                            <p className="text-sm opacity-75">{forecast.category}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold">{forecast.stuckProbability}%</span>
                            <p className="text-sm font-medium">{risk.level} Risk</p>
                          </div>
                        </div>

                        {/* Expected Payment Date */}
                        {forecast.expectedPaymentDate && (
                          <div className="mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Expected Payment: {new Date(forecast.expectedPaymentDate).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                        )}

                        {/* Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="opacity-75">On-Time Rate</p>
                            <p className="font-semibold">{forecast.metrics.onTimeRate}%</p>
                          </div>
                          <div>
                            <p className="opacity-75">Avg Delay</p>
                            <p className="font-semibold">{forecast.metrics.avgDelayDays} days</p>
                          </div>
                          <div>
                            <p className="opacity-75">Unpaid Invoices</p>
                            <p className="font-semibold">{forecast.metrics.unpaidInvoices}</p>
                          </div>
                          <div>
                            <p className="opacity-75">Unpaid Amount</p>
                            <p className="font-semibold">₹{parseFloat(forecast.metrics.unpaidAmount).toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-500 py-8">No payment risks detected</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
