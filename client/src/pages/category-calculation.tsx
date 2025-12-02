import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Users,
  TrendingUp,
  TrendingDown,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  BarChart3,
  PieChart,
  ArrowRight,
  RefreshCw,
  Download,
  Eye,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface CustomerTrackRecord {
  id: string;
  customerName: string;
  customerCode: string;
  currentCategory: string;
  recommendedCategory: string;
  categoryScore: number;
  overrideApplied: boolean;
  overrideReason: string;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  // Amount fields (same as reports page)
  totalInvoiceAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  openingBalance: number;
  // Payment counts
  onTimeCount: number;
  lateCount: number;
  veryLateCount: number;
  onTimePercentage: number;
  paymentBreakdown: {
    alpha: number;
    beta: number;
    gamma: number;
    delta: number;
  };
  monthlyTrend: {
    month: string;
    monthName: string;
    onTime: number;
    late: number;
    unpaid: number;
    total: number;
  }[];
  invoices: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    paymentDate: string | null;
    delayDays: number;
    adjustedDelay: number;
    category: string;
    status: string;
    amount: number;
  }[];
  thresholds: {
    gracePeriod: number;
    alpha: string;
    beta: string;
    gamma: string;
    delta: string;
  };
}

interface TrackRecordResponse {
  customers: CustomerTrackRecord[];
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    byRecommendedCategory: {
      alpha: number;
      beta: number;
      gamma: number;
      delta: number;
    };
    byCurrentCategory: {
      alpha: number;
      beta: number;
      gamma: number;
      delta: number;
    };
    willChange: number;
    averageOnTimePercentage: number;
  };
  rules: {
    gracePeriod: number;
    categoryThresholds: {
      alpha: string;
      beta: string;
      gamma: string;
      delta: string;
    };
    overrideRules: string[];
  };
}

const categoryColors = {
  Alpha: { bg: "bg-green-500", text: "text-green-600", light: "bg-green-100 dark:bg-green-900/30", border: "border-green-500" },
  Beta: { bg: "bg-yellow-500", text: "text-yellow-600", light: "bg-yellow-100 dark:bg-yellow-900/30", border: "border-yellow-500" },
  Gamma: { bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-500" },
  Delta: { bg: "bg-red-500", text: "text-red-600", light: "bg-red-100 dark:bg-red-900/30", border: "border-red-500" },
  New: { bg: "bg-gray-500", text: "text-gray-600", light: "bg-gray-100 dark:bg-gray-900/30", border: "border-gray-500" },
};

const CHART_COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444"];

export default function CategoryCalculationPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "score" | "change">("change");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<CustomerTrackRecord | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data, isLoading, refetch } = useQuery<TrackRecordResponse>({
    queryKey: ["/api/credit-control/customers-track-record"],
  });

  const applyMutation = useMutation({
    mutationFn: async (changes: { customerId: string; newCategory: string; reason: string }[]) => {
      const response = await apiRequest("POST", "/api/recovery/apply-category-changes", { changes });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-control/customers-track-record"] });
      queryClient.invalidateQueries({ queryKey: ["/api/masters/customers"] });
      toast({
        title: "Categories Updated",
        description: `Successfully updated ${selectedCustomers.size} customer categories.`,
      });
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

  const filteredCustomers = useMemo(() => {
    if (!data?.customers) return [];
    
    let customers = [...data.customers];
    
    // Filter by search
    if (searchTerm) {
      customers = customers.filter(c => 
        c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customerCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by category
    if (filterCategory !== "all") {
      if (filterCategory === "change") {
        customers = customers.filter(c => c.currentCategory !== c.recommendedCategory);
      } else {
        customers = customers.filter(c => c.recommendedCategory === filterCategory);
      }
    }
    
    // Sort
    customers.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.customerName.localeCompare(b.customerName);
        case "score":
          return b.onTimePercentage - a.onTimePercentage;
        case "change":
          const aChange = a.currentCategory !== a.recommendedCategory ? 1 : 0;
          const bChange = b.currentCategory !== b.recommendedCategory ? 1 : 0;
          return bChange - aChange;
        default:
          return 0;
      }
    });
    
    return customers;
  }, [data?.customers, searchTerm, filterCategory, sortBy]);

  const handleSelectAll = () => {
    const changeable = filteredCustomers.filter(c => 
      c.currentCategory !== c.recommendedCategory && c.recommendedCategory !== 'New'
    );
    setSelectedCustomers(new Set(changeable.map(c => c.id)));
  };

  const handleApplyChanges = () => {
    if (!data?.customers || selectedCustomers.size === 0) return;
    
    const changes = data.customers
      .filter(c => selectedCustomers.has(c.id))
      .map(c => ({
        customerId: c.id,
        newCategory: c.recommendedCategory,
        reason: `Track record: ${c.onTimePercentage}% on-time payments${c.overrideApplied ? ` (${c.overrideReason})` : ''}`
      }));
    
    applyMutation.mutate(changes);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryBadge = (category: string) => {
    const colors = categoryColors[category as keyof typeof categoryColors] || categoryColors.New;
    return (
      <Badge className={cn("font-semibold", colors.light, colors.text, "border", colors.border)}>
        {category}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pieChartData = data?.summary ? [
    { name: "Alpha", value: data.summary.byRecommendedCategory.alpha, color: "#22c55e" },
    { name: "Beta", value: data.summary.byRecommendedCategory.beta, color: "#eab308" },
    { name: "Gamma", value: data.summary.byRecommendedCategory.gamma, color: "#f97316" },
    { name: "Delta", value: data.summary.byRecommendedCategory.delta, color: "#ef4444" },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-600">Total Customers</p>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2">
              {data?.summary.totalCustomers || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-600">Alpha</p>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2">
              {data?.summary.byRecommendedCategory.alpha || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-600">Beta</p>
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">
              {data?.summary.byRecommendedCategory.beta || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <p className="text-sm font-medium text-orange-600">Gamma</p>
            </div>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-2">
              {data?.summary.byRecommendedCategory.gamma || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 border-red-200 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-red-600">Delta</p>
            </div>
            <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-2">
              {data?.summary.byRecommendedCategory.delta || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <p className="text-sm font-medium text-purple-600">Will Change</p>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-2">
              {data?.summary.willChange || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 border-indigo-200 dark:border-indigo-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <p className="text-sm font-medium text-indigo-600">Avg On-Time</p>
            </div>
            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-2">
              {data?.summary.averageOnTimePercentage || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Category Distribution
            </CardTitle>
            <CardDescription>Based on payment track record</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Category Rules
            </CardTitle>
            <CardDescription>Percentage-based categorization with override rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="font-medium">Alpha</span>
                </div>
                <span className="text-sm text-muted-foreground">{data?.rules.categoryThresholds.alpha}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500" />
                  <span className="font-medium">Beta</span>
                </div>
                <span className="text-sm text-muted-foreground">{data?.rules.categoryThresholds.beta}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <span className="font-medium">Gamma</span>
                </div>
                <span className="text-sm text-muted-foreground">{data?.rules.categoryThresholds.gamma}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="font-medium">Delta</span>
                </div>
                <span className="text-sm text-muted-foreground">{data?.rules.categoryThresholds.delta}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Override Rules:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {data?.rules.overrideRules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm">
                <span className="font-medium">Grace Period:</span>{" "}
                <span className="text-muted-foreground">{data?.rules.gracePeriod} days</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="change">Will Change</SelectItem>
                  <SelectItem value="Alpha">Alpha</SelectItem>
                  <SelectItem value="Beta">Beta</SelectItem>
                  <SelectItem value="Gamma">Gamma</SelectItem>
                  <SelectItem value="Delta">Delta</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="change">Changes First</SelectItem>
                  <SelectItem value="score">By Score</SelectItem>
                  <SelectItem value="name">By Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSelectAll}>
                Select All Changes
              </Button>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {selectedCustomers.size > 0 && (
                <Button onClick={() => setShowConfirmDialog(true)}>
                  Apply {selectedCustomers.size} Changes
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Track Records ({filteredCustomers.length})</CardTitle>
          <CardDescription>Click on a customer to view detailed payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredCustomers.map((customer) => {
              const willChange = customer.currentCategory !== customer.recommendedCategory && customer.recommendedCategory !== 'New';
              const isExpanded = expandedCustomer === customer.id;
              const isSelected = selectedCustomers.has(customer.id);
              
              return (
                <div key={customer.id} className={cn(
                  "border rounded-lg overflow-hidden transition-all",
                  willChange && "border-amber-300 dark:border-amber-700",
                  isSelected && "ring-2 ring-primary"
                )}>
                  {/* Customer Header */}
                  <div className={cn(
                    "p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50",
                    willChange && "bg-amber-50/50 dark:bg-amber-950/20"
                  )}
                  onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                  >
                    {willChange && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {
                          const newSelected = new Set(selectedCustomers);
                          if (isSelected) {
                            newSelected.delete(customer.id);
                          } else {
                            newSelected.add(customer.id);
                          }
                          setSelectedCustomers(newSelected);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{customer.customerName}</h3>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {customer.customerCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span>{customer.totalInvoices} invoices</span>
                        <span>•</span>
                        <span className="text-green-600">{customer.paidInvoices} receipts</span>
                        <span>•</span>
                        <span className="text-red-600">{customer.unpaidInvoices} unpaid</span>
                        <span>•</span>
                        <span className="text-teal-600 font-medium">Paid: {formatCurrency(customer.totalPaidAmount || 0)}</span>
                        <span>•</span>
                        <span className="text-orange-600 font-medium">Pending: {formatCurrency(customer.totalPendingAmount || 0)}</span>
                      </div>
                    </div>
                    
                    {/* Score Progress */}
                    <div className="w-32 hidden md:block">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>On-time</span>
                        <span className="font-medium">{customer.onTimePercentage}%</span>
                      </div>
                      <Progress value={customer.onTimePercentage} className="h-2" />
                    </div>
                    
                    {/* Category Change */}
                    <div className="flex items-center gap-2">
                      {getCategoryBadge(customer.currentCategory)}
                      {willChange && (
                        <>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          {getCategoryBadge(customer.recommendedCategory)}
                        </>
                      )}
                    </div>
                    
                    {/* Override Badge */}
                    {customer.overrideApplied && (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        Override
                      </Badge>
                    )}
                    
                    {/* View Details Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailCustomer(customer);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30 p-4 space-y-4">
                      {/* Amount Summary (same as reports page) */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                          <p className="text-xs text-blue-600 dark:text-blue-400">Total Invoice</p>
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(customer.totalInvoiceAmount || 0)}</p>
                        </div>
                        <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg">
                          <p className="text-xs text-teal-600 dark:text-teal-400">Total Paid (Receipts)</p>
                          <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{formatCurrency(customer.totalPaidAmount || 0)}</p>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                          <p className="text-xs text-orange-600 dark:text-orange-400">Pending</p>
                          <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{formatCurrency(customer.totalPendingAmount || 0)}</p>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                          <p className="text-xs text-indigo-600 dark:text-indigo-400">Opening Balance</p>
                          <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(customer.openingBalance || 0)}</p>
                        </div>
                      </div>

                      {/* Payment Breakdown Bar */}
                      <div>
                        <p className="text-sm font-medium mb-2">Payment Breakdown</p>
                        <div className="flex h-8 rounded-lg overflow-hidden">
                          {customer.paymentBreakdown.alpha > 0 && (
                            <div 
                              className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${(customer.paymentBreakdown.alpha / customer.paidInvoices) * 100}%` }}
                            >
                              {customer.paymentBreakdown.alpha}
                            </div>
                          )}
                          {customer.paymentBreakdown.beta > 0 && (
                            <div 
                              className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${(customer.paymentBreakdown.beta / customer.paidInvoices) * 100}%` }}
                            >
                              {customer.paymentBreakdown.beta}
                            </div>
                          )}
                          {customer.paymentBreakdown.gamma > 0 && (
                            <div 
                              className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${(customer.paymentBreakdown.gamma / customer.paidInvoices) * 100}%` }}
                            >
                              {customer.paymentBreakdown.gamma}
                            </div>
                          )}
                          {customer.paymentBreakdown.delta > 0 && (
                            <div 
                              className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${(customer.paymentBreakdown.delta / customer.paidInvoices) * 100}%` }}
                            >
                              {customer.paymentBreakdown.delta}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-green-500" /> On-time ({customer.paymentBreakdown.alpha})
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" /> Late ({customer.paymentBreakdown.beta})
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-orange-500" /> Very Late ({customer.paymentBreakdown.gamma})
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500" /> Critical ({customer.paymentBreakdown.delta})
                          </span>
                        </div>
                      </div>
                      
                      {/* Calculation Logic */}
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Category Calculation</p>
                        <p className="text-sm text-muted-foreground">
                          On-time Receipts: <strong>{customer.onTimeCount}</strong> / {customer.paidInvoices} total receipts = <strong>{customer.onTimePercentage}%</strong>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Based on thresholds: {customer.onTimePercentage}% → <strong>{customer.recommendedCategory}</strong>
                        </p>
                        {customer.overrideApplied && (
                          <p className="text-sm text-amber-600 mt-1">
                            ⚠️ Override Applied: {customer.overrideReason}
                          </p>
                        )}
                      </div>
                      
                      {/* Recent Invoices Table */}
                      <div>
                        <p className="text-sm font-medium mb-2">Recent Payments & Invoices (Last 10)</p>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Invoice No</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Payment Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Delay</TableHead>
                                <TableHead className="text-center">Category</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {customer.invoices.slice(0, 10).map((inv, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                                  <TableCell>{inv.invoiceDate}</TableCell>
                                  <TableCell>{inv.dueDate}</TableCell>
                                  <TableCell>{inv.paymentDate || '-'}</TableCell>
                                  <TableCell className="text-right font-medium text-green-600">
                                    {formatCurrency(inv.amount)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className={cn(
                                      inv.delayDays > 0 && "text-red-600 font-medium"
                                    )}>
                                      {inv.delayDays > 0 ? `${inv.delayDays} days` : '-'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {getCategoryBadge(inv.category)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {inv.status === 'Paid' ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        <Check className="h-3 w-3 mr-1" /> Paid
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                        <X className="h-3 w-3 mr-1" /> Unpaid
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailCustomer} onOpenChange={() => setDetailCustomer(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>{detailCustomer.customerName}</span>
                  {getCategoryBadge(detailCustomer.recommendedCategory)}
                </DialogTitle>
                <DialogDescription>
                  Complete payment track record and category analysis
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{detailCustomer.totalInvoices}</p>
                    <p className="text-sm text-muted-foreground">Total Invoices</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{detailCustomer.onTimeCount}</p>
                    <p className="text-sm text-muted-foreground">On-Time</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{detailCustomer.lateCount}</p>
                    <p className="text-sm text-muted-foreground">Late</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{detailCustomer.veryLateCount}</p>
                    <p className="text-sm text-muted-foreground">Very Late</p>
                  </div>
                </div>
                
                {/* Score Gauge */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">On-Time Payment Score</span>
                    <span className="text-2xl font-bold">{detailCustomer.onTimePercentage}%</span>
                  </div>
                  <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "absolute left-0 top-0 h-full transition-all",
                        detailCustomer.onTimePercentage >= 90 ? "bg-green-500" :
                        detailCustomer.onTimePercentage >= 75 ? "bg-yellow-500" :
                        detailCustomer.onTimePercentage >= 50 ? "bg-orange-500" : "bg-red-500"
                      )}
                      style={{ width: `${detailCustomer.onTimePercentage}%` }}
                    />
                    {/* Threshold markers */}
                    <div className="absolute top-0 left-[50%] w-0.5 h-full bg-gray-400" />
                    <div className="absolute top-0 left-[75%] w-0.5 h-full bg-gray-400" />
                    <div className="absolute top-0 left-[90%] w-0.5 h-full bg-gray-400" />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Delta (&lt;50%)</span>
                    <span>Gamma</span>
                    <span>Beta</span>
                    <span>Alpha (90%+)</span>
                  </div>
                </div>
                
                {/* Monthly Trend Chart */}
                <div>
                  <p className="font-medium mb-3">Monthly Payment Trend (Financial Year: Apr - Mar)</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={detailCustomer.monthlyTrend}>
                        <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="onTime" name="On-Time" fill="#22c55e" stackId="a" />
                        <Bar dataKey="late" name="Late" fill="#f97316" stackId="a" />
                        <Bar dataKey="unpaid" name="Unpaid" fill="#ef4444" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Category Change Decision */}
                {detailCustomer.currentCategory !== detailCustomer.recommendedCategory && (
                  <div className="p-4 border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                      Category Change Recommended
                    </p>
                    <div className="flex items-center gap-3">
                      {getCategoryBadge(detailCustomer.currentCategory)}
                      <ArrowRight className="h-5 w-5" />
                      {getCategoryBadge(detailCustomer.recommendedCategory)}
                    </div>
                    {detailCustomer.overrideApplied && (
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                        ⚠️ {detailCustomer.overrideReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Category Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to update categories for {selectedCustomers.size} customer(s) based on their payment track record.
              This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyChanges} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? "Applying..." : "Apply Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
