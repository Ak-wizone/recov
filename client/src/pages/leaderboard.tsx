import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award, TrendingUp, Phone, Mail, CheckCircle2, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Leaderboard() {
  const [period, setPeriod] = useState("today");

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["/api/leaderboard", period],
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-slate-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-slate-600">#{rank}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-white">🏆 Champion</Badge>;
    if (rank === 2) return <Badge className="bg-slate-400 text-white">🥈 Runner-up</Badge>;
    if (rank === 3) return <Badge className="bg-amber-600 text-white">🥉 3rd Place</Badge>;
    if (rank <= 5) return <Badge variant="default">Top 5</Badge>;
    return <Badge variant="outline">Rank #{rank}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const topPerformer = leaderboard[0];

  return (
    <div className="p-8 space-y-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 min-h-screen" data-testid="page-leaderboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Team Leaderboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Performance rankings and team statistics
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48" data-testid="select-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {topPerformer && (
        <Card className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white border-0 shadow-xl" data-testid="card-top-performer">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3">
              <Trophy className="h-8 w-8" />
              Top Performer - {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
            </CardTitle>
            <CardDescription className="text-yellow-100">
              Leading the team with outstanding performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">{topPerformer.userName}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                  <div>
                    <p className="text-yellow-100 text-sm">Efficiency Score</p>
                    <p className="text-3xl font-bold">{topPerformer.efficiencyScore}</p>
                  </div>
                  <div>
                    <p className="text-yellow-100 text-sm">Tasks Completed</p>
                    <p className="text-3xl font-bold">{topPerformer.tasksCompleted}</p>
                  </div>
                  <div>
                    <p className="text-yellow-100 text-sm">Calls Made</p>
                    <p className="text-3xl font-bold">{topPerformer.callsMade}</p>
                  </div>
                  <div>
                    <p className="text-yellow-100 text-sm">Collections</p>
                    <p className="text-3xl font-bold">{formatCurrency(topPerformer.paymentsCollected)}</p>
                  </div>
                </div>
              </div>
              <Trophy className="h-32 w-32 opacity-20" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0" data-testid="card-total-tasks">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {leaderboard.reduce((sum: number, u: any) => sum + u.tasksCompleted, 0)}
            </div>
            <p className="text-blue-100 text-sm mt-1">Completed by team</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0" data-testid="card-total-calls">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {leaderboard.reduce((sum: number, u: any) => sum + u.callsMade, 0)}
            </div>
            <p className="text-purple-100 text-sm mt-1">Customer outreach</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0" data-testid="card-total-emails">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Total Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {leaderboard.reduce((sum: number, u: any) => sum + u.emailsSent, 0)}
            </div>
            <p className="text-green-100 text-sm mt-1">Sent by team</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0" data-testid="card-total-collection">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {formatCurrency(leaderboard.reduce((sum: number, u: any) => sum + u.paymentsCollected, 0))}
            </div>
            <p className="text-orange-100 text-sm mt-1">Total recovered</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-leaderboard-table">
        <CardHeader>
          <CardTitle>Team Rankings</CardTitle>
          <CardDescription>Performance metrics for all team members</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Team Member</TableHead>
                <TableHead className="text-right">Efficiency Score</TableHead>
                <TableHead className="text-right">Tasks</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Emails</TableHead>
                <TableHead className="text-right">Collections</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((user: any) => (
                <TableRow 
                  key={user.userId} 
                  className={user.rank <= 3 ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}
                  data-testid={`row-user-${user.userId}`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-center">
                      {getRankIcon(user.rank)}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-2">
                      {user.userName}
                      {user.rank <= 3 && <span className="text-xl">🌟</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    {user.efficiencyScore}
                  </TableCell>
                  <TableCell className="text-right">{user.tasksCompleted}</TableCell>
                  <TableCell className="text-right">{user.callsMade}</TableCell>
                  <TableCell className="text-right">{user.emailsSent}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(user.paymentsCollected)}
                  </TableCell>
                  <TableCell>{getRankBadge(user.rank)}</TableCell>
                </TableRow>
              ))}
              {leaderboard.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No performance data available for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
