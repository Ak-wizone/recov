import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Save } from "lucide-react";
import type { CategoryRules, FollowupRules, RecoverySettings } from "@shared/schema";

const categoryRulesFormSchema = z.object({
  alphaDays: z.coerce.number().min(0, "Must be at least 0 days"),
  betaDays: z.coerce.number().min(1, "Must be at least 1 day"),
  gammaDays: z.coerce.number().min(1, "Must be at least 1 day"),
  deltaDays: z.coerce.number().min(1, "Must be at least 1 day"),
  partialPaymentThresholdPercent: z.coerce.number().min(0, "Must be 0-100%").max(100, "Must be 0-100%"),
  graceDays: z.coerce.number().min(0, "Must be at least 0 days").max(365, "Must be at most 365 days"),
  alphaFollowupDays: z.coerce.number().min(1, "Must be at least 1 day"),
  betaFollowupDays: z.coerce.number().min(1, "Must be at least 1 day"),
  gammaFollowupDays: z.coerce.number().min(1, "Must be at least 1 day"),
  deltaFollowupDays: z.coerce.number().min(1, "Must be at least 1 day"),
  autoUpgradeEnabled: z.boolean(),
});

type CategoryRulesFormValues = z.infer<typeof categoryRulesFormSchema>;

export default function CategoryRulesPage() {
  const { toast } = useToast();

  const { data: categoryRules, isLoading: rulesLoading } = useQuery<CategoryRules | null>({
    queryKey: ["/api/recovery/category-rules"],
  });

  const { data: followupRules, isLoading: followupLoading } = useQuery<FollowupRules | null>({
    queryKey: ["/api/recovery/followup-rules"],
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<RecoverySettings | null>({
    queryKey: ["/api/recovery/settings"],
  });

  const form = useForm<CategoryRulesFormValues>({
    resolver: zodResolver(categoryRulesFormSchema),
    defaultValues: {
      alphaDays: 5,
      betaDays: 20,
      gammaDays: 40,
      deltaDays: 100,
      partialPaymentThresholdPercent: 80,
      graceDays: 7,
      alphaFollowupDays: 7,
      betaFollowupDays: 4,
      gammaFollowupDays: 2,
      deltaFollowupDays: 1,
      autoUpgradeEnabled: false,
    },
  });

  // Update form when data loads
  useQuery({
    queryKey: ["category-rules-loaded"],
    enabled: !!categoryRules && !!followupRules && !!settings,
    queryFn: () => {
      if (categoryRules && followupRules && settings) {
        form.reset({
          alphaDays: categoryRules.alphaDays,
          betaDays: categoryRules.betaDays,
          gammaDays: categoryRules.gammaDays,
          deltaDays: categoryRules.deltaDays,
          partialPaymentThresholdPercent: categoryRules.partialPaymentThresholdPercent,
          graceDays: categoryRules.graceDays ?? 7,
          alphaFollowupDays: followupRules.alphaDays,
          betaFollowupDays: followupRules.betaDays,
          gammaFollowupDays: followupRules.gammaDays,
          deltaFollowupDays: followupRules.deltaDays,
          autoUpgradeEnabled: settings.autoUpgradeEnabled,
        });
      }
      return null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CategoryRulesFormValues) => {
      // Save all three configurations
      await Promise.all([
        apiRequest("PUT", "/api/recovery/category-rules", {
          alphaDays: data.alphaDays,
          betaDays: data.betaDays,
          gammaDays: data.gammaDays,
          deltaDays: data.deltaDays,
          partialPaymentThresholdPercent: data.partialPaymentThresholdPercent,
          graceDays: data.graceDays,
        }),
        apiRequest("PUT", "/api/recovery/followup-rules", {
          alphaDays: data.alphaFollowupDays,
          betaDays: data.betaFollowupDays,
          gammaDays: data.gammaFollowupDays,
          deltaDays: data.deltaFollowupDays,
        }),
        apiRequest("PUT", "/api/recovery/settings", {
          autoUpgradeEnabled: data.autoUpgradeEnabled,
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/category-rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/followup-rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/settings"] });
      // Invalidate dashboard cards to reflect grace period changes immediately
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/invoice-status-cards"] });
      toast({
        title: "Success",
        description: "Category rules saved successfully",
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

  const onSubmit = (data: CategoryRulesFormValues) => {
    saveMutation.mutate(data);
  };

  const isLoading = rulesLoading || followupLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 bg-background dark:bg-background">
      <Card className="bg-card dark:bg-card border-border dark:border-border">
        <CardHeader>
          <CardTitle className="text-foreground dark:text-foreground">Recovery Settings</CardTitle>
          <CardDescription className="text-muted-foreground dark:text-muted-foreground">
            Configure automatic category escalation based on payment delays
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Auto Mode Toggle */}
              <FormField
                control={form.control}
                name="autoUpgradeEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border dark:border-border p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-semibold text-foreground dark:text-foreground" data-testid="label-auto-mode">
                        Automatic Category Escalation
                      </FormLabel>
                      <FormMessage />
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                        Automatically upgrade customer categories based on payment delay thresholds
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-auto-mode"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Delay Thresholds */}
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
                  <CardHeader>
                    <CardTitle className="text-purple-900 dark:text-purple-100">Payment Delay Thresholds</CardTitle>
                    <CardDescription className="text-purple-700 dark:text-purple-300">
                      Days overdue before category upgrade
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="alphaDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground">Alpha Category Grace Period</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-900 text-foreground dark:text-foreground border-border dark:border-border"
                                data-testid="input-alpha-days"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground dark:text-muted-foreground">
                                days
                              </span>
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            0 to {field.value} days after due date = Alpha
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="betaDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground">Beta Category Grace Period</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-900 text-foreground dark:text-foreground border-border dark:border-border"
                                data-testid="input-beta-threshold"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground dark:text-muted-foreground">
                                days
                              </span>
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            {form.watch("alphaDays") + 1} to {form.watch("alphaDays") + field.value} days = Beta
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gammaDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground">Gamma Category Grace Period</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-900 text-foreground dark:text-foreground border-border dark:border-border"
                                data-testid="input-gamma-threshold"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground dark:text-muted-foreground">
                                days
                              </span>
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            {form.watch("alphaDays") + form.watch("betaDays") + 1} to {form.watch("alphaDays") + form.watch("betaDays") + field.value} days = Gamma
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deltaDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground">Delta Category Grace Period</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-900 text-foreground dark:text-foreground border-border dark:border-border"
                                data-testid="input-delta-threshold"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground dark:text-muted-foreground">
                                days
                              </span>
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            {form.watch("alphaDays") + form.watch("betaDays") + form.watch("gammaDays") + 1}+ days = Delta
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="partialPaymentThresholdPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground">Partial Payment Threshold</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-900 text-foreground dark:text-foreground border-border dark:border-border"
                                data-testid="input-partial-payment-threshold"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground dark:text-muted-foreground">
                                %
                              </span>
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            Exclude invoices with payment ≥ {field.value}% from delay calculations
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="graceDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground">Grace Days</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-900 text-foreground dark:text-foreground border-border dark:border-border"
                                data-testid="input-grace-days"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground dark:text-muted-foreground">
                                days
                              </span>
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            Days after invoice due date that counts as grace period (for Paid On Time / In Grace classification)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Follow-up Thresholds */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="text-blue-900 dark:text-blue-100">Follow-up Thresholds</CardTitle>
                    <CardDescription className="text-blue-700 dark:text-blue-300">
                      Days between follow-up reminders
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="alphaFollowupDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground">Alpha Category Follow-up</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-900 text-foreground dark:text-foreground border-border dark:border-border"
                                data-testid="input-alpha-followup"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground dark:text-muted-foreground">
                                days
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="betaFollowupDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground">Beta Category Follow-up</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-900 text-foreground dark:text-foreground border-border dark:border-border"
                                data-testid="input-beta-followup"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground dark:text-muted-foreground">
                                days
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gammaFollowupDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground">Gamma Category Follow-up</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-900 text-foreground dark:text-foreground border-border dark:border-border"
                                data-testid="input-gamma-followup"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground dark:text-muted-foreground">
                                days
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deltaFollowupDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground">Delta Category Follow-up</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-900 text-foreground dark:text-foreground border-border dark:border-border"
                                data-testid="input-delta-followup"
                              />
                              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground dark:text-muted-foreground">
                                days
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white"
                  data-testid="button-save"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
