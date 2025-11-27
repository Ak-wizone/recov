import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RecoveryHealthData {
  healthScore: number;
  healthLevel: string;
  metrics: {
    avgCollectionDays: string;
    overallRecoveryRate: string;
    recentRecoveryRate: string;
    totalInvoices: number;
    recoveredInvoices: number;
    pendingInvoices: number;
  };
  recoveryRates: Array<{
    ageBucket: string;
    total: number;
    recovered: number;
    rate: string;
  }>;
  recommendations: string[];
}

export default function RecoveryHealthTest() {
  const { data: healthData, isLoading } = useQuery<RecoveryHealthData>({
    queryKey: ['/api/risk/recovery-health'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const getHealthColor = (level: string) => {
    if (level === 'Strong') return { color: 'text-green-600', bg: 'bg-green-500', border: 'border-green-500' };
    if (level === 'Moderate') return { color: 'text-yellow-600', bg: 'bg-yellow-500', border: 'border-yellow-500' };
    return { color: 'text-red-600', bg: 'bg-red-500', border: 'border-red-500' };
  };

  const healthStyle = getHealthColor(healthData.healthLevel);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Health Score Card */}
      <Card className={`border-l-4 ${healthStyle.border}`} data-testid="card-health-score">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className={`h-6 w-6 ${healthStyle.color}`} />
            Recovery System Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-5xl font-bold ${healthStyle.color}">{healthData.healthScore}/100</div>
              <p className="text-xl font-medium mt-2 ${healthStyle.color}">{healthData.healthLevel}</p>
            </div>
            <div className="w-32 h-32">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  className={healthStyle.bg.replace('bg-', 'stroke-')}
                  strokeWidth="8"
                  strokeDasharray={`${(healthData.healthScore / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <Progress value={healthData.healthScore} className="h-3" />
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-collection-time">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Collection Time</CardTitle>
            <Clock className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{healthData.metrics.avgCollectionDays}</div>
            <p className="text-xs text-gray-500 mt-1">Days from invoice to payment</p>
          </CardContent>
        </Card>

        <Card data-testid="card-recovery-rate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overall Recovery Rate</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{healthData.metrics.overallRecoveryRate}%</div>
            <p className="text-xs text-gray-500 mt-1">{healthData.metrics.recoveredInvoices} of {healthData.metrics.totalInvoices} invoices</p>
          </CardContent>
        </Card>

        <Card data-testid="card-recent-recovery">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Recovery Trend</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{healthData.metrics.recentRecoveryRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Last 60 days performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Recovery Rate by Age Bucket Chart */}
      <Card data-testid="card-recovery-chart">
        <CardHeader>
          <CardTitle>Recovery Rate by Invoice Age</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={healthData.recoveryRates}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ageBucket" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'Recovery Rate (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'rate') return `${value}%`;
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="total" fill="#94a3b8" name="Total Invoices" />
              <Bar dataKey="recovered" fill="#10b981" name="Recovered" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-l-4 border-l-blue-500" data-testid="card-recommendations">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Recommendations for Improvement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthData.recommendations.length > 0 ? (
            <ul className="space-y-3">
              {healthData.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-3" data-testid={`recommendation-${index}`}>
                  <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{recommendation}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-green-600 font-medium">
              ✓ Your recovery system is performing optimally. Keep up the good work!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recovery Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Invoices</span>
                <span className="font-bold">{healthData.metrics.totalInvoices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recovered Invoices</span>
                <span className="font-bold text-green-600">{healthData.metrics.recoveredInvoices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending Invoices</span>
                <span className="font-bold text-orange-600">{healthData.metrics.pendingInvoices}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Age Bucket Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthData.recoveryRates.map((bucket) => (
                <div key={bucket.ageBucket} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{bucket.ageBucket} days</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{bucket.recovered}/{bucket.total}</span>
                    <span className="text-sm font-bold text-blue-600">({bucket.rate}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
