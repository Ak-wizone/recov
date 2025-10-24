import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Settings2, Calendar, Clock, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const followupAutomationFormSchema = z.object({
  schedulingMode: z.enum(["fixed_frequency", "before_due", "after_due", "weekly", "monthly"]),
  alphaWhatsapp: z.boolean(),
  alphaEmail: z.boolean(),
  alphaIvr: z.boolean(),
  betaWhatsapp: z.boolean(),
  betaEmail: z.boolean(),
  betaIvr: z.boolean(),
  gammaWhatsapp: z.boolean(),
  gammaEmail: z.boolean(),
  gammaIvr: z.boolean(),
  deltaWhatsapp: z.boolean(),
  deltaEmail: z.boolean(),
  deltaIvr: z.boolean(),
  weeklyDay: z.coerce.number().min(0).max(6).optional(),
  monthlyDate: z.coerce.number().min(1).max(31).optional(),
  daysBeforeDue: z.coerce.number().min(1).max(30).optional(),
  enableIvrCalling: z.boolean(),
  callingHoursStart: z.string(),
  callingHoursEnd: z.string(),
  maxRetriesPerDay: z.coerce.number().min(1).max(10),
});

type FollowupAutomationFormValues = z.infer<typeof followupAutomationFormSchema>;

interface FollowupAutomationSettings {
  schedulingMode: string;
  categoryActions: string;
  weeklyDay?: number;
  monthlyDate?: number;
  daysBeforeDue?: number;
  enableIvrCalling: boolean;
  callingHoursStart: string;
  callingHoursEnd: string;
  maxRetriesPerDay: number;
}

export default function FollowupAutomationPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<FollowupAutomationSettings | null>({
    queryKey: ["/api/recovery/followup-automation"],
  });

  const form = useForm<FollowupAutomationFormValues>({
    resolver: zodResolver(followupAutomationFormSchema),
    defaultValues: {
      schedulingMode: "after_due",
      alphaWhatsapp: false,
      alphaEmail: false,
      alphaIvr: false,
      betaWhatsapp: true,
      betaEmail: true,
      betaIvr: false,
      gammaWhatsapp: true,
      gammaEmail: true,
      gammaIvr: true,
      deltaWhatsapp: true,
      deltaEmail: true,
      deltaIvr: true,
      enableIvrCalling: false,
      callingHoursStart: "09:00",
      callingHoursEnd: "18:00",
      maxRetriesPerDay: 3,
    },
  });

  // Update form when data loads
  useQuery({
    queryKey: ["followup-automation-loaded"],
    enabled: !!settings,
    queryFn: () => {
      if (settings) {
        const actions = JSON.parse(settings.categoryActions);
        form.reset({
          schedulingMode: settings.schedulingMode as any,
          alphaWhatsapp: actions.alpha?.whatsapp || false,
          alphaEmail: actions.alpha?.email || false,
          alphaIvr: actions.alpha?.ivr || false,
          betaWhatsapp: actions.beta?.whatsapp || false,
          betaEmail: actions.beta?.email || false,
          betaIvr: actions.beta?.ivr || false,
          gammaWhatsapp: actions.gamma?.whatsapp || false,
          gammaEmail: actions.gamma?.email || false,
          gammaIvr: actions.gamma?.ivr || false,
          deltaWhatsapp: actions.delta?.whatsapp || false,
          deltaEmail: actions.delta?.email || false,
          deltaIvr: actions.delta?.ivr || false,
          weeklyDay: settings.weeklyDay,
          monthlyDate: settings.monthlyDate,
          daysBeforeDue: settings.daysBeforeDue,
          enableIvrCalling: settings.enableIvrCalling,
          callingHoursStart: settings.callingHoursStart,
          callingHoursEnd: settings.callingHoursEnd,
          maxRetriesPerDay: settings.maxRetriesPerDay,
        });
      }
      return null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FollowupAutomationFormValues) => {
      const categoryActions = {
        alpha: { whatsapp: data.alphaWhatsapp, email: data.alphaEmail, ivr: data.alphaIvr },
        beta: { whatsapp: data.betaWhatsapp, email: data.betaEmail, ivr: data.betaIvr },
        gamma: { whatsapp: data.gammaWhatsapp, email: data.gammaEmail, ivr: data.gammaIvr },
        delta: { whatsapp: data.deltaWhatsapp, email: data.deltaEmail, ivr: data.deltaIvr },
      };

      await apiRequest("PUT", "/api/recovery/followup-automation", {
        schedulingMode: data.schedulingMode,
        categoryActions: JSON.stringify(categoryActions),
        weeklyDay: data.weeklyDay,
        monthlyDate: data.monthlyDate,
        daysBeforeDue: data.daysBeforeDue,
        enableIvrCalling: data.enableIvrCalling,
        callingHoursStart: data.callingHoursStart,
        callingHoursEnd: data.callingHoursEnd,
        maxRetriesPerDay: data.maxRetriesPerDay,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/followup-automation"] });
      toast({
        title: "Success",
        description: "Follow-up automation settings saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FollowupAutomationFormValues) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6 bg-background dark:bg-background">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const schedulingMode = form.watch("schedulingMode");

  return (
    <div className="container mx-auto p-6 space-y-6 bg-background dark:bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="h-8 w-8 text-purple-600 dark:text-purple-400" data-testid="icon-settings" />
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-foreground" data-testid="text-page-title">
              Follow-up Automation Settings
            </h1>
            <p className="text-muted-foreground dark:text-muted-foreground mt-1">
              Configure automated reminders for overdue customers
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Scheduling Mode */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Calendar className="h-5 w-5" />
                Scheduling Mode
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Choose when follow-ups should be triggered
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="schedulingMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground dark:text-foreground">Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-gray-900" data-testid="select-scheduling-mode">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="after_due">After Due Date (based on follow-up rules)</SelectItem>
                        <SelectItem value="before_due">Before Due Date</SelectItem>
                        <SelectItem value="fixed_frequency">Fixed Frequency</SelectItem>
                        <SelectItem value="weekly">Weekly on Specific Day</SelectItem>
                        <SelectItem value="monthly">Monthly on Specific Date</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {schedulingMode === "after_due" && "Follow-ups trigger based on category rules (Alpha: every 7 days, Beta: every 4 days, etc.)"}
                      {schedulingMode === "before_due" && "Send reminders before invoice due date"}
                      {schedulingMode === "weekly" && "Send follow-ups on a specific day of the week"}
                      {schedulingMode === "monthly" && "Send follow-ups on a specific date each month"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {schedulingMode === "before_due" && (
                <FormField
                  control={form.control}
                  name="daysBeforeDue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground dark:text-foreground">Days Before Due</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="bg-white dark:bg-gray-900"
                          data-testid="input-days-before-due"
                        />
                      </FormControl>
                      <FormDescription>Send reminders this many days before the due date</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {schedulingMode === "weekly" && (
                <FormField
                  control={form.control}
                  name="weeklyDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground dark:text-foreground">Day of Week</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-gray-900" data-testid="select-weekly-day">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {schedulingMode === "monthly" && (
                <FormField
                  control={form.control}
                  name="monthlyDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground dark:text-foreground">Date of Month</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          {...field}
                          className="bg-white dark:bg-gray-900"
                          data-testid="input-monthly-date"
                        />
                      </FormControl>
                      <FormDescription>Day of the month (1-31) to send follow-ups</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Category-wise Actions */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="text-purple-900 dark:text-purple-100">Category-wise Actions</CardTitle>
              <CardDescription className="text-purple-700 dark:text-purple-300">
                Enable/disable communication channels per category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alpha Category */}
              <div className="p-4 bg-green-100 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">Alpha Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="alphaWhatsapp"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">WhatsApp</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-alpha-whatsapp" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alphaEmail"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">Email</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-alpha-email" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alphaIvr"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">IVR Call</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-alpha-ivr" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Beta Category */}
              <div className="p-4 bg-yellow-100 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3">Beta Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="betaWhatsapp"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">WhatsApp</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-beta-whatsapp" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="betaEmail"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">Email</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-beta-email" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="betaIvr"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">IVR Call</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-beta-ivr" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Gamma Category */}
              <div className="p-4 bg-orange-100 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-3">Gamma Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="gammaWhatsapp"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">WhatsApp</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-gamma-whatsapp" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gammaEmail"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">Email</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-gamma-email" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gammaIvr"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">IVR Call</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-gamma-ivr" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Delta Category */}
              <div className="p-4 bg-red-100 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-3">Delta Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="deltaWhatsapp"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">WhatsApp</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-delta-whatsapp" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deltaEmail"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">Email</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-delta-email" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deltaIvr"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 space-y-0">
                        <FormLabel className="text-foreground dark:text-foreground">IVR Call</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-delta-ivr" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IVR Settings */}
          <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-900/20 border-indigo-200 dark:border-indigo-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                <Phone className="h-5 w-5" />
                IVR Calling Settings
              </CardTitle>
              <CardDescription className="text-indigo-700 dark:text-indigo-300">
                Configure automated calling parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="enableIvrCalling"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <div>
                      <FormLabel className="text-foreground dark:text-foreground">Enable IVR Calling</FormLabel>
                      <FormDescription>Allow system to make automated calls to customers</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-enable-ivr" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="callingHoursStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground dark:text-foreground">Calling Hours Start</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="bg-white dark:bg-gray-900" data-testid="input-calling-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="callingHoursEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground dark:text-foreground">Calling Hours End</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="bg-white dark:bg-gray-900" data-testid="input-calling-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="maxRetriesPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground dark:text-foreground">Max Retries Per Day</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-white dark:bg-gray-900" data-testid="input-max-retries" />
                    </FormControl>
                    <FormDescription>Maximum number of call attempts per customer per day</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
              data-testid="button-save-settings"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
