import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, AlertCircle, Users, Target, TrendingUp, Phone } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";

export default function DailyDashboard() {
  const { user } = useAuth();
  const currentHour = new Date().getHours();
  
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 17 ? "Good Afternoon" : "Good Evening";

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/daily-actions", user?.id],
    enabled: !!user
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const summary = dashboardData?.summary || {};
  const todaysTasks = dashboardData?.todaysTasks || [];
  const overdueTasks = dashboardData?.overdueTasks || [];
  const priorityCustomers = dashboardData?.priorityCustomers || [];
  const todaysTargets = dashboardData?.todaysTargets || [];
  const collectionTarget = todaysTargets.find((t: any) => t.targetType === 'collection');

  return (
    <div className="p-8 space-y-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 min-h-screen" data-testid="page-daily-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white" data-testid="text-greeting">
            {greeting}, {user?.name}! 👋
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Here's your action plan for today</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600 dark:text-slate-400">Today's Date</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg" data-testid="card-pending-tasks">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{summary.pendingTasks || 0}</div>
            <p className="text-blue-100 text-sm mt-1">Tasks to complete today</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg" data-testid="card-overdue-tasks">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{summary.overdueTasks || 0}</div>
            <p className="text-red-100 text-sm mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg" data-testid="card-priority-customers">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Priority Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{summary.priorityCustomers || 0}</div>
            <p className="text-orange-100 text-sm mt-1">Overdue &gt; 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg" data-testid="card-collection-progress">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Collection Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{Math.round(summary.collectionProgress || 0)}%</div>
            <p className="text-green-100 text-sm mt-1">of daily target</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-todays-tasks">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Today's Tasks
              </CardTitle>
              <Link href="/action-center/tasks">
                <Button variant="outline" size="sm" data-testid="button-view-all-tasks">
                  View All
                </Button>
              </Link>
            </div>
            <CardDescription>Your top priority tasks for today</CardDescription>
          </CardHeader>
          <CardContent>
            {todaysTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tasks scheduled for today!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysTasks.slice(0, 5).map((task: any) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" data-testid={`task-${task.id}`}>
                    <input type="checkbox" className="mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{task.customerName}</span>
                        <Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'default' : 'secondary'} className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-priority-customers-list">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Phone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                Priority Customers
              </CardTitle>
              <Link href="/action-center/call-queue">
                <Button variant="outline" size="sm" data-testid="button-view-call-queue">
                  Call Queue
                </Button>
              </Link>
            </div>
            <CardDescription>High-value customers needing attention</CardDescription>
          </CardHeader>
          <CardContent>
            {priorityCustomers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>All customers are up to date!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {priorityCustomers.slice(0, 5).map((customer: any) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" data-testid={`customer-${customer.id}`}>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{customer.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{customer.mobile}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(customer.outstandingAmount)}</p>
                      <Badge variant="outline" className="text-xs">{customer.category}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {collectionTarget && (
        <Card data-testid="card-collection-target">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
              Today's Collection Target
            </CardTitle>
            <CardDescription>Track your daily collection progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(dashboardData?.todaysCollection || 0)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Collected Today</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(parseFloat(collectionTarget.targetAmount))}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Target Amount</p>
              </div>
            </div>
            <Progress value={summary.collectionProgress || 0} className="h-3" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Remaining: <span className="font-semibold">{formatCurrency(Math.max(0, parseFloat(collectionTarget.targetAmount) - (dashboardData?.todaysCollection || 0)))}</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
