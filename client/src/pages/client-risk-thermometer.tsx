import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { RiskThermometer } from "@/components/risk-thermometer";

interface RiskData {
  customers: Array<{
    customerId: string;
    customerName: string;
    category: string;
    riskScore: number;
    riskLevel: string;
    factors: {
      creditUtilization: string;
      avgPaymentDelay: string;
      overdueInvoices: number;
      outstanding: string;
      creditLimit: string;
    };
  }>;
  summary: {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    totalCustomers: number;
  };
}

export default function ClientRiskThermometer() {
  const { data: riskData, isLoading } = useQuery<RiskData>({
    queryKey: ['/api/risk/client-thermometer'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!riskData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const getRiskColor = (level: string) => {
    if (level === 'High') return 'text-red-600 bg-red-50 border-red-200';
    if (level === 'Medium') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-red-500" data-testid="card-high-risk">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{riskData.summary.highRisk}</div>
            <p className="text-xs text-gray-500 mt-1">Clients with risk ≥70%</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500" data-testid="card-medium-risk">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <TrendingUp className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{riskData.summary.mediumRisk}</div>
            <p className="text-xs text-gray-500 mt-1">Clients with risk 30-70%</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500" data-testid="card-low-risk">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <Gauge className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{riskData.summary.lowRisk}</div>
            <p className="text-xs text-gray-500 mt-1">Clients with risk &lt;30%</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500" data-testid="card-total-customers">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{riskData.summary.totalCustomers}</div>
            <p className="text-xs text-gray-500 mt-1">Being analyzed</p>
          </CardContent>
        </Card>
      </div>

      {/* Client Risk List */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {riskData.customers.map((customer) => (
              <div
                key={customer.customerId}
                className={`p-4 rounded-lg border-2 ${getRiskColor(customer.riskLevel)}`}
                data-testid={`risk-customer-${customer.customerId}`}
              >
                <div className="flex gap-6">
                  {/* Thermometer Visual */}
                  <div className="flex-shrink-0">
                    <RiskThermometer riskScore={customer.riskScore} size="md" showLabel={false} />
                  </div>

                  {/* Customer Details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{customer.customerName}</h3>
                        <p className="text-sm opacity-75">{customer.category}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold">{customer.riskScore}%</span>
                        <p className="text-sm font-medium">{customer.riskLevel} Risk</p>
                      </div>
                    </div>

                    {/* Risk Factors */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mt-4">
                      <div>
                        <p className="opacity-75">Credit Utilization</p>
                        <p className="font-semibold">{parseFloat(customer.factors.creditUtilization).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="opacity-75">Avg Delay</p>
                        <p className="font-semibold">{customer.factors.avgPaymentDelay} days</p>
                      </div>
                      <div>
                        <p className="opacity-75">Overdue Invoices</p>
                        <p className="font-semibold">{customer.factors.overdueInvoices}</p>
                      </div>
                      <div>
                        <p className="opacity-75">Outstanding</p>
                        <p className="font-semibold">₹{parseFloat(customer.factors.outstanding).toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="opacity-75">Credit Limit</p>
                        <p className="font-semibold">₹{parseFloat(customer.factors.creditLimit).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
