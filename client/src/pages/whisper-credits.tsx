import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Mic, Plus, Package, TrendingUp, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

export function WhisperCredits() {
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<{ minutes: number; price: number } | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["/api/whisper/credits"],
  });

  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ["/api/whisper/addon-packages"],
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ["/api/whisper/usage"],
  });

  const { data: statsData } = useQuery({
    queryKey: ["/api/whisper/usage/stats"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageData: { packageMinutes: number; packagePrice: number }) => {
      return apiRequest("/api/whisper/purchase-addon", {
        method: "POST",
        body: JSON.stringify(packageData),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Purchase Successful",
        description: data.message || "Addon credits added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whisper/credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whisper/usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whisper/usage/stats"] });
      setShowPurchaseDialog(false);
      setSelectedPackage(null);
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase addon package",
        variant: "destructive",
      });
    },
  });

  const handlePurchaseClick = (pkg: { minutes: number; price: number }) => {
    setSelectedPackage(pkg);
    setShowPurchaseDialog(true);
  };

  const confirmPurchase = () => {
    if (!selectedPackage) return;
    purchaseMutation.mutate({
      packageMinutes: selectedPackage.minutes,
      packagePrice: selectedPackage.price,
    });
  };

  const planMinutes = credits?.planMinutesCurrent || 0;
  const addonMinutes = credits?.addonMinutesBalance || 0;
  const usedPlanMinutes = credits?.usedPlanMinutes || 0;
  const usedAddonMinutes = credits?.usedAddonMinutes || 0;
  const totalMinutes = planMinutes + addonMinutes;
  const usedMinutes = usedPlanMinutes + usedAddonMinutes;
  const remainingMinutes = credits?.remainingMinutes || 0;
  const usagePercentage = totalMinutes > 0 ? (usedMinutes / totalMinutes) * 100 : 0;

  const packages = packagesData?.packages || [];
  const usage = usageData?.usage || [];

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-whisper-credits">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-title">
            Whisper Voice AI Credits
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-description">
            Manage your voice transcription credits and usage
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-credits">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {creditsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-total-minutes">
                  {totalMinutes.toFixed(1)} min
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Plan: {planMinutes} min + Addon: {addonMinutes} min
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-remaining-credits">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {creditsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-remaining-minutes">
                  {remainingMinutes.toFixed(1)} min
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        usagePercentage > 90 ? "bg-red-500" : 
                        usagePercentage > 70 ? "bg-yellow-500" : 
                        "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{usagePercentage.toFixed(0)}%</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-used-credits">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used This Month</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {creditsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-used-minutes">
                  {usedMinutes.toFixed(1)} min
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {statsData?.totalCalls || 0} transcription{statsData?.totalCalls !== 1 ? 's' : ''}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-reset-date">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan Resets</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {creditsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-reset-date">
                  {credits?.nextResetAt ? new Date(credits.nextResetAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {credits?.nextResetAt ? formatDistanceToNow(new Date(credits.nextResetAt), { addSuffix: true }) : 'Not set'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {remainingMinutes < 50 && !creditsLoading && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" data-testid="alert-low-credits">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              <CardTitle className="text-base">Low Credits Warning</CardTitle>
            </div>
            <CardDescription>
              You have less than 50 minutes remaining. Purchase addon credits to continue using Whisper Voice AI.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card data-testid="card-addon-packages">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Purchase Addon Credits
          </CardTitle>
          <CardDescription>
            Add more minutes to your account. Addon credits never expire and carry over month-to-month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packagesLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {packages.map((pkg: { minutes: number; price: number }) => (
                <Card key={pkg.minutes} className="border-2 hover:border-primary transition-colors" data-testid={`package-${pkg.minutes}`}>
                  <CardHeader>
                    <CardTitle className="text-xl">{pkg.minutes} Minutes</CardTitle>
                    <CardDescription className="text-2xl font-bold text-primary">
                      ₹{pkg.price}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full" 
                      onClick={() => handlePurchaseClick(pkg)}
                      data-testid={`button-purchase-${pkg.minutes}`}
                    >
                      Purchase Now
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      ₹{(pkg.price / pkg.minutes).toFixed(2)} per minute
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-usage-history">
        <CardHeader>
          <CardTitle>Recent Transcriptions</CardTitle>
          <CardDescription>
            View your recent Whisper AI transcription history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usageLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : usage.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state-usage">
              <Mic className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mt-4">No transcriptions yet</p>
              <p className="text-sm text-muted-foreground">Start using Whisper AI to see your usage history</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.map((item: any) => (
                    <TableRow key={item.id} data-testid={`usage-row-${item.id}`}>
                      <TableCell className="font-medium">
                        {new Date(item.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-feature-${item.id}`}>
                          {item.feature || 'voice_command'}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-duration-${item.id}`}>
                        {item.audioLengthSeconds ? `${(item.audioLengthSeconds / 60).toFixed(1)} min` : 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`text-cost-${item.id}`}>
                        ₹{item.cost ? parseFloat(item.cost).toFixed(2) : '0.00'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-language-${item.id}`}>
                          {item.language || 'auto'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground text-sm" data-testid={`text-preview-${item.id}`}>
                        {item.transcript || 'No preview'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent data-testid="dialog-purchase-confirm">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase addon credits for your Whisper Voice AI account.
            </DialogDescription>
          </DialogHeader>

          {selectedPackage && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Package Details</p>
                  <p className="text-2xl font-bold text-primary mt-1">{selectedPackage.minutes} Minutes</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">₹{selectedPackage.price}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Credits never expire</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Carries over month-to-month</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Instant activation</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPurchaseDialog(false)}
              disabled={purchaseMutation.isPending}
              data-testid="button-cancel-purchase"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmPurchase}
              disabled={purchaseMutation.isPending}
              data-testid="button-confirm-purchase"
            >
              {purchaseMutation.isPending ? "Processing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
