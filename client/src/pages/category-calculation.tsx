import { useState, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calculator, 
  Play, 
  CheckSquare, 
  Square, 
  TrendingUp, 
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MasterCustomer } from "@shared/schema";

const categoryColors = {
  Alpha: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  Beta: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
  Gamma: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
  Delta: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300"
};

interface CategoryRecommendation {
  customerId: string;
  customerName: string;
  currentCategory: string;
  recommendedCategory: string;
  maxDaysOverdue: number;
  totalOutstanding: number;
  oldestInvoiceDate: string | null;
  changeReason: string;
  willChange: boolean;
  invoiceDetails: any[];
}

interface CalculationResult {
  recommendations: CategoryRecommendation[];
  summary: {
    totalCustomers: number;
    willChange: number;
    noChange: number;
    byCategory: {
      alpha: number;
      beta: number;
      gamma: number;
      delta: number;
    };
  };
  rules: {
    alphaRange: string;
    betaRange: string;
    gammaRange: string;
    deltaRange: string;
    partialPaymentThreshold: string;
  };
}

export default function CategoryCalculationPage() {
  const { toast } = useToast();
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: customers = [] } = useQuery<MasterCustomer[]>({
    queryKey: ["/api/masters/customers"],
  });

  const calculateMutation = useMutation({
    mutationFn: async (filters: any) => {
      const response = await apiRequest("POST", "/api/recovery/calculate-categories", filters);
      return await response.json() as CalculationResult;
    },
    onSuccess: (data: CalculationResult) => {
      setCalculationResult(data);
      setSelectedCustomers(new Set());
      toast({
        title: "Calculation Complete",
        description: `Found ${data.summary.willChange} customer(s) recommended for category change.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Calculation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (changes: any[]) => {
      const response = await apiRequest("POST", "/api/recovery/apply-category-changes", { changes });
      return await response.json() as { message: string; appliedChanges: any[] };
    },
    onSuccess: (data: { message: string; appliedChanges: any[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/category-logs"] });
      toast({
        title: "Changes Applied",
        description: data.message,
      });
      setCalculationResult(null);
      setSelectedCustomers(new Set());
      setShowConfirmDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCalculate = () => {
    calculateMutation.mutate({
      filterCategories: filterCategories.length > 0 ? filterCategories : undefined
    });
  };

  const handleApplyChanges = () => {
    if (!calculationResult || selectedCustomers.size === 0) return;

    const changes = calculationResult.recommendations
      .filter(r => selectedCustomers.has(r.customerId))
      .map(r => ({
        customerId: r.customerId,
        newCategory: r.recommendedCategory,
        reason: r.changeReason,
        daysOverdue: r.maxDaysOverdue
      }));

    applyMutation.mutate(changes);
  };

  const handleSelectAll = () => {
    if (!calculationResult) return;
    const allIds = new Set(calculationResult.recommendations.map(r => r.customerId));
    setSelectedCustomers(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedCustomers(new Set());
  };

  const handleSelectUpgrades = () => {
    if (!calculationResult) return;
    const upgradeIds = new Set(
      calculationResult.recommendations
        .filter(r => r.willChange)
        .map(r => r.customerId)
    );
    setSelectedCustomers(upgradeIds);
  };

  const handleSelectByDays = (minDays: number) => {
    if (!calculationResult) return;
    const ids = new Set(
      calculationResult.recommendations
        .filter(r => r.maxDaysOverdue >= minDays)
        .map(r => r.customerId)
    );
    setSelectedCustomers(ids);
  };

  const toggleCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const toggleRowExpansion = (customerId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedRows(newExpanded);
  };

  const filteredRecommendations = calculationResult?.recommendations.filter(r =>
    r.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto p-6 space-y-6 bg-background dark:bg-background">
      <div className="flex items-center gap-3">
        <Calculator className="h-8 w-8 text-blue-600 dark:text-blue-400" data-testid="icon-calculator" />
        <h1 className="text-3xl font-bold text-foreground dark:text-foreground" data-testid="text-page-title">
          Category Calculation & Review
        </h1>
      </div>

      {/* Filter Panel */}
      <Card className="bg-card dark:bg-card border-border dark:border-border">
        <CardHeader>
          <CardTitle className="text-foreground dark:text-foreground">Calculation Filters</CardTitle>
          <CardDescription className="text-muted-foreground dark:text-muted-foreground">
            Select criteria to calculate recommended category changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filter-category" className="text-foreground dark:text-foreground">
                Filter by Category
              </Label>
              <Select
                value={filterCategories.length > 0 ? filterCategories.join(",") : "all"}
                onValueChange={(value) => setFilterCategories(value === "all" ? [] : value.split(","))}
              >
                <SelectTrigger id="filter-category" data-testid="select-filter-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Alpha">Alpha Only</SelectItem>
                  <SelectItem value="Beta">Beta Only</SelectItem>
                  <SelectItem value="Gamma">Gamma Only</SelectItem>
                  <SelectItem value="Delta">Delta Only</SelectItem>
                  <SelectItem value="Alpha,Beta">Alpha & Beta</SelectItem>
                  <SelectItem value="Gamma,Delta">Gamma & Delta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleCalculate}
                disabled={calculateMutation.isPending}
                className="w-full"
                data-testid="button-calculate"
              >
                <Play className="w-4 h-4 mr-2" />
                {calculateMutation.isPending ? "Calculating..." : "Calculate Categories"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      {calculationResult && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-border dark:border-border">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-foreground">Calculation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground dark:text-foreground">
                  {calculationResult.summary.totalCustomers}
                </div>
                <div className="text-sm text-muted-foreground dark:text-muted-foreground">Total Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {calculationResult.summary.willChange}
                </div>
                <div className="text-sm text-muted-foreground dark:text-muted-foreground">Will Change</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {calculationResult.summary.byCategory.alpha}
                </div>
                <div className="text-sm text-muted-foreground dark:text-muted-foreground">Alpha</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {calculationResult.summary.byCategory.beta}
                </div>
                <div className="text-sm text-muted-foreground dark:text-muted-foreground">Beta</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {calculationResult.summary.byCategory.gamma}
                </div>
                <div className="text-sm text-muted-foreground dark:text-muted-foreground">Gamma</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {calculationResult.summary.byCategory.delta}
                </div>
                <div className="text-sm text-muted-foreground dark:text-muted-foreground">Delta</div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                <strong>Category Ranges:</strong> Alpha: {calculationResult.rules.alphaRange} | 
                Beta: {calculationResult.rules.betaRange} | 
                Gamma: {calculationResult.rules.gammaRange} | 
                Delta: {calculationResult.rules.deltaRange} | 
                Partial Payment Threshold: {calculationResult.rules.partialPaymentThreshold}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {calculationResult && (
        <Card className="bg-card dark:bg-card border-border dark:border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground dark:text-foreground">
                  Recommendations ({filteredRecommendations.length})
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-muted-foreground">
                  Review and select customers for category update
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 bg-background dark:bg-background"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Bulk Actions */}
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                onClick={handleSelectAll}
                variant="outline"
                size="sm"
                data-testid="button-select-all"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Select All
              </Button>
              <Button
                onClick={handleDeselectAll}
                variant="outline"
                size="sm"
                data-testid="button-deselect-all"
              >
                <Square className="w-4 h-4 mr-2" />
                Deselect All
              </Button>
              <Button
                onClick={handleSelectUpgrades}
                variant="outline"
                size="sm"
                className="bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20"
                data-testid="button-select-upgrades"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Select All Upgrades
              </Button>
              <Button
                onClick={() => handleSelectByDays(90)}
                variant="outline"
                size="sm"
                data-testid="button-select-90-days"
              >
                <Calendar className="w-4 h-4 mr-2" />
                90+ Days
              </Button>
              <Button
                onClick={() => handleSelectByDays(60)}
                variant="outline"
                size="sm"
                data-testid="button-select-60-days"
              >
                <Calendar className="w-4 h-4 mr-2" />
                60+ Days
              </Button>
              <Button
                onClick={() => handleSelectByDays(30)}
                variant="outline"
                size="sm"
                data-testid="button-select-30-days"
              >
                <Calendar className="w-4 h-4 mr-2" />
                30+ Days
              </Button>
            </div>

            {/* Results Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead className="text-center">Current</TableHead>
                    <TableHead className="text-center">Recommended</TableHead>
                    <TableHead className="text-right">Max Days Overdue</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Oldest Invoice</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecommendations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        No recommendations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecommendations.map((rec) => (
                      <Fragment key={rec.customerId}>
                        <TableRow
                          className={selectedCustomers.has(rec.customerId) ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                        >
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(rec.customerId)}
                              data-testid={`button-expand-${rec.customerId}`}
                            >
                              {expandedRows.has(rec.customerId) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={selectedCustomers.has(rec.customerId)}
                              onCheckedChange={() => toggleCustomer(rec.customerId)}
                              data-testid={`checkbox-${rec.customerId}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{rec.customerName}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={categoryColors[rec.currentCategory as keyof typeof categoryColors]}>
                              {rec.currentCategory}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={categoryColors[rec.recommendedCategory as keyof typeof categoryColors]}>
                              {rec.recommendedCategory}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {rec.maxDaysOverdue > 0 ? rec.maxDaysOverdue : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{rec.totalOutstanding.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {rec.oldestInvoiceDate || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {rec.changeReason}
                          </TableCell>
                          <TableCell className="text-center">
                            {rec.willChange ? (
                              <AlertCircle className="w-5 h-5 text-orange-500 mx-auto" />
                            ) : (
                              <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expandable Invoice Details */}
                        {expandedRows.has(rec.customerId) && rec.invoiceDetails.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-gray-50 dark:bg-gray-900/20">
                              <div className="p-4">
                                <h4 className="font-semibold mb-2">Invoice Breakdown:</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Invoice #</TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Due Date</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                      <TableHead className="text-right">Allocated (FIFO)</TableHead>
                                      <TableHead className="text-right">Outstanding</TableHead>
                                      <TableHead className="text-right">Days Overdue</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Threshold</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {rec.invoiceDetails.map((inv, idx) => (
                                      <TableRow key={idx} className="text-sm">
                                        <TableCell>{inv.invoiceNumber}</TableCell>
                                        <TableCell>{inv.invoiceDate}</TableCell>
                                        <TableCell>{inv.dueDate}</TableCell>
                                        <TableCell className="text-right">₹{inv.amount.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">₹{inv.allocated.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-medium">
                                          ₹{inv.outstanding.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <span className={inv.daysOverdue > 0 ? "text-red-600 font-medium" : ""}>
                                            {inv.daysOverdue}
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className="text-xs">
                                            {inv.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {inv.excludedByThreshold ? (
                                            <Badge className="bg-green-100 text-green-800 text-xs">
                                              Excluded
                                            </Badge>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">Included</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Apply Changes Button */}
            {selectedCustomers.size > 0 && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  data-testid="button-apply-changes"
                >
                  Apply {selectedCustomers.size} Selected Change{selectedCustomers.size > 1 ? "s" : ""}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Category Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to update categories for {selectedCustomers.size} customer(s).
              This action will be logged in the category change history.
              Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-apply">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApplyChanges}
              disabled={applyMutation.isPending}
              data-testid="button-confirm-apply"
            >
              {applyMutation.isPending ? "Applying..." : "Apply Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
