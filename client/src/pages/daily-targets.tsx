import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDailyTargetSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Target, TrendingUp, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { z } from "zod";

const targetFormSchema = insertDailyTargetSchema.extend({
  targetDate: z.string().min(1, "Date is required"),
  targetAmount: z.string().min(1, "Target amount is required"),
});

type TargetFormData = z.infer<typeof targetFormSchema>;

export default function DailyTargets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ["/api/daily-targets"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      targetType: "collection",
      targetDate: new Date().toISOString().split('T')[0],
      targetAmount: "",
      achievedAmount: "0",
      userId: "",
      userName: "",
    },
  });

  const createTargetMutation = useMutation({
    mutationFn: async (data: TargetFormData) => {
      return await apiRequest("/api/daily-targets", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-targets"] });
      toast({ title: "Target created successfully" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/daily-targets/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-targets"] });
      toast({ title: "Target deleted successfully" });
    },
  });

  const onSubmit = (data: TargetFormData) => {
    const selectedUser = users.find((u: any) => u.id === data.userId);
    createTargetMutation.mutate({
      ...data,
      userName: selectedUser?.name || "",
    });
  };

  const todaysTargets = targets.filter((t: any) => {
    const targetDate = new Date(t.targetDate);
    const today = new Date();
    return targetDate.toDateString() === today.toDateString();
  });

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const calculateProgress = (target: any) => {
    const achieved = parseFloat(target.achievedAmount || "0");
    const total = parseFloat(target.targetAmount || "1");
    return Math.min(100, (achieved / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totalTarget = todaysTargets.reduce((sum: number, t: any) => sum + parseFloat(t.targetAmount || "0"), 0);
  const totalAchieved = todaysTargets.reduce((sum: number, t: any) => sum + parseFloat(t.achievedAmount || "0"), 0);
  const overallProgress = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  return (
    <div className="p-8 space-y-6" data-testid="page-daily-targets">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Target className="h-8 w-8 text-blue-600" />
            Daily Targets
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Set and track daily collection targets for your team
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-target">
              <Plus className="h-4 w-4 mr-2" />
              Add Target
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-target">
            <DialogHeader>
              <DialogTitle>Set Daily Target</DialogTitle>
              <DialogDescription>Create a new collection target for a team member</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-target-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="collection">Collection</SelectItem>
                            <SelectItem value="calls">Calls</SelectItem>
                            <SelectItem value="tasks">Tasks</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Team Target</SelectItem>
                            {users.map((u: any) => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-target-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Amount (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} placeholder="50000" data-testid="input-target-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createTargetMutation.isPending} data-testid="button-submit-target">
                    {createTargetMutation.isPending ? "Creating..." : "Create Target"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0" data-testid="card-total-target">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Today's Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatCurrency(totalTarget)}</div>
            <p className="text-blue-100 text-sm mt-1">Team collection goal</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0" data-testid="card-total-achieved">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Achieved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatCurrency(totalAchieved)}</div>
            <p className="text-green-100 text-sm mt-1">Collected so far</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0" data-testid="card-remaining">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatCurrency(Math.max(0, totalTarget - totalAchieved))}</div>
            <p className="text-purple-100 text-sm mt-1">{Math.round(overallProgress)}% complete</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-overall-progress">
        <CardHeader>
          <CardTitle>Overall Progress - Today</CardTitle>
          <CardDescription>Track your team's progress towards today's collection target</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={overallProgress} className="h-4" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {formatCurrency(totalAchieved)} / {formatCurrency(totalTarget)}
            </span>
            <span className={`font-semibold ${overallProgress >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
              {Math.round(overallProgress)}%
            </span>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-targets-table">
        <CardHeader>
          <CardTitle>All Targets ({targets.length})</CardTitle>
          <CardDescription>View and manage collection targets</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Achieved</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((target: any) => {
                const progress = calculateProgress(target);
                return (
                  <TableRow key={target.id} data-testid={`row-target-${target.id}`}>
                    <TableCell>{new Date(target.targetDate).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{target.targetType}</TableCell>
                    <TableCell>{target.userName || "Team"}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(parseFloat(target.targetAmount))}</TableCell>
                    <TableCell className="text-green-600 dark:text-green-400 font-semibold">
                      {formatCurrency(parseFloat(target.achievedAmount || "0"))}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Math.max(0, parseFloat(target.targetAmount) - parseFloat(target.achievedAmount || "0")))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-2 w-24" />
                        <span className="text-sm font-medium">{Math.round(progress)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTargetMutation.mutate(target.id)}
                        data-testid={`button-delete-${target.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {targets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No targets set yet. Create your first target to start tracking!
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
