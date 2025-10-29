import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";
import NotificationCenter from "./notification-center";
import { formatCurrency } from "@/lib/utils";

export default function Header() {
  const { user } = useAuth();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 17 ? "Good Afternoon" : "Good Evening";

  const { data: todaysTargets = [] } = useQuery({
    queryKey: ["/api/daily-targets/today"],
  });

  const { data: dashboardData } = useQuery({
    queryKey: ["/api/dashboard/daily-actions", user?.id],
    enabled: !!user
  });

  const collectionTarget = todaysTargets.find((t: any) => t.targetType === 'collection');
  const collectionProgress = dashboardData?.summary?.collectionProgress || 0;
  const todaysCollection = dashboardData?.todaysCollection || 0;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-3 sticky top-0 z-10" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white" data-testid="text-header-greeting">
              {greeting}, {user?.name}! 👋
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          {collectionTarget && (
            <div className="hidden lg:flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-700" data-testid="mini-target-bar">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Today's Target</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(todaysCollection)} / {formatCurrency(parseFloat(collectionTarget.targetAmount))}
                  </p>
                </div>
              </div>
              <div className="w-32">
                <Progress value={collectionProgress} className="h-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{Math.round(collectionProgress)}%</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
}
