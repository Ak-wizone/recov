import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SubscriptionPlan, InsertSubscriptionPlan } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Plus,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Users,
  Shield,
  RefreshCw,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Module hierarchy with parent-child relationships
const MODULE_HIERARCHY = {
  "Core": {
    color: "text-blue-600 dark:text-blue-400",
    modules: [
      { name: "Business Overview", isParent: false },
      { name: "Customer Analytics", isParent: false },
    ]
  },
  "Sales": {
    color: "text-green-600 dark:text-green-400",
    modules: [
      { name: "Leads", isParent: false },
      { name: "Quotations", isParent: false },
      { name: "Proforma Invoices", isParent: false },
      { name: "Invoices", isParent: false },
      { name: "Receipts", isParent: false },
    ]
  },
  "Payment Tracking": {
    color: "text-purple-600 dark:text-purple-400",
    modules: [
      { name: "Payment Tracking", isParent: true, children: ["Debtors", "Credit Management", "Ledger", "Payment Analytics"] },
      { name: "Debtors", isParent: false, parent: "Payment Tracking" },
      { name: "Credit Management", isParent: false, parent: "Payment Tracking" },
      { name: "Ledger", isParent: false, parent: "Payment Tracking" },
      { name: "Payment Analytics", isParent: false, parent: "Payment Tracking" },
    ]
  },
  "Action Center": {
    color: "text-orange-600 dark:text-orange-400",
    modules: [
      { name: "Action Center", isParent: true, children: ["Daily Dashboard", "Task Manager", "Call Queue", "Activity Logs"] },
      { name: "Daily Dashboard", isParent: false, parent: "Action Center" },
      { name: "Task Manager", isParent: false, parent: "Action Center" },
      { name: "Call Queue", isParent: false, parent: "Action Center" },
      { name: "Activity Logs", isParent: false, parent: "Action Center" },
    ]
  },
  "Team Performance": {
    color: "text-pink-600 dark:text-pink-400",
    modules: [
      { name: "Team Performance", isParent: true, children: ["Leaderboard", "Daily Targets", "Notification Center"] },
      { name: "Leaderboard", isParent: false, parent: "Team Performance" },
      { name: "Daily Targets", isParent: false, parent: "Team Performance" },
      { name: "Notification Center", isParent: false, parent: "Team Performance" },
    ]
  },
  "Risk & Recovery": {
    color: "text-red-600 dark:text-red-400",
    modules: [
      { name: "Risk & Recovery", isParent: true, children: ["Client Risk Thermometer", "Payment Risk Forecaster", "Recovery Health Test"] },
      { name: "Client Risk Thermometer", isParent: false, parent: "Risk & Recovery" },
      { name: "Payment Risk Forecaster", isParent: false, parent: "Risk & Recovery" },
      { name: "Recovery Health Test", isParent: false, parent: "Risk & Recovery" },
    ]
  },
  "Credit Control": {
    color: "text-indigo-600 dark:text-indigo-400",
    modules: [
      { name: "Credit Control", isParent: true, children: ["Category Management", "Follow-up Rules", "Category Calculation", "Urgent Actions", "Follow-up Automation"] },
      { name: "Category Management", isParent: false, parent: "Credit Control" },
      { name: "Follow-up Rules", isParent: false, parent: "Credit Control" },
      { name: "Category Calculation", isParent: false, parent: "Credit Control" },
      { name: "Urgent Actions", isParent: false, parent: "Credit Control" },
      { name: "Follow-up Automation", isParent: false, parent: "Credit Control" },
    ]
  },
  "Masters": {
    color: "text-cyan-600 dark:text-cyan-400",
    modules: [
      { name: "Masters", isParent: true, children: ["Customers", "Items", "Banks", "Voucher Types"] },
      { name: "Customers", isParent: false, parent: "Masters" },
      { name: "Items", isParent: false, parent: "Masters" },
      { name: "Banks", isParent: false, parent: "Masters" },
      { name: "Voucher Types", isParent: false, parent: "Masters" },
    ]
  },
  "Settings": {
    color: "text-gray-600 dark:text-gray-400",
    modules: [
      { name: "Settings", isParent: true, children: ["Company Profile", "User Management", "Roles Management", "Backup & Restore", "Smart Collection Scheduler", "Audit Logs"] },
      { name: "Company Profile", isParent: false, parent: "Settings" },
      { name: "User Management", isParent: false, parent: "Settings" },
      { name: "Roles Management", isParent: false, parent: "Settings" },
      { name: "Backup & Restore", isParent: false, parent: "Settings" },
      { name: "Smart Collection Scheduler", isParent: false, parent: "Settings" },
      { name: "Audit Logs", isParent: false, parent: "Settings" },
    ]
  },
  "Communication": {
    color: "text-teal-600 dark:text-teal-400",
    modules: [
      { name: "Email/WhatsApp/Call Integrations", isParent: false },
    ]
  },
  "AI Features": {
    color: "text-violet-600 dark:text-violet-400",
    modules: [
      { name: "RECOV Voice Assistant", isParent: false },
    ]
  },
};

// Flatten module hierarchy for validation
const AVAILABLE_MODULES = Object.values(MODULE_HIERARCHY).flatMap(
  category => category.modules.map(m => m.name)
);

const planFormSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format (e.g., 99.99)"),
  billingCycle: z.enum(["monthly", "annual", "lifetime"]),
  allowedModules: z.array(z.string()).min(1, "At least one module is required"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  isActive: z.boolean(),
  displayOrder: z.number().int(),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

interface PlanWithStats extends SubscriptionPlan {
  tenantCount?: number;
}

export default function SubscriptionPlans() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PlanWithStats | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const { data: planStats = [] } = useQuery<Array<{ planId: string; tenantCount: number }>>({
    queryKey: ["/api/subscription-plans/stats"],
  });

  // Combine plans with tenant counts
  const plansWithStats = useMemo<PlanWithStats[]>(() => {
    return plans.map(plan => ({
      ...plan,
      tenantCount: planStats.find(s => s.planId === plan.id)?.tenantCount || 0,
    }));
  }, [plans, planStats]);

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "0.00",
      billingCycle: "monthly",
      allowedModules: [],
      color: "#3B82F6",
      isActive: true,
      displayOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PlanFormValues) => {
      return await apiRequest("POST", "/api/subscription-plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans/stats"] });
      toast({ title: "Success", description: "Subscription plan created successfully" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PlanFormValues> }) => {
      return await apiRequest("PUT", `/api/subscription-plans/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans/stats"] });
      toast({ title: "Success", description: "Subscription plan updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedPlan(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/subscription-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans/stats"] });
      toast({ title: "Success", description: "Subscription plan deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSelectedPlan(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const backfillMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/subscription-plans/backfill-admin-permissions");
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Backfill Complete", 
        description: `Updated ${data.updatedCount} Admin role(s) with full permissions`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    form.reset({
      name: "",
      description: "",
      price: "0.00",
      billingCycle: "monthly",
      allowedModules: [],
      color: "#3B82F6",
      isActive: true,
      displayOrder: 0,
    });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (plan: PlanWithStats) => {
    setSelectedPlan(plan);
    form.reset({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      billingCycle: plan.billingCycle as "monthly" | "annual" | "lifetime",
      allowedModules: plan.allowedModules,
      color: plan.color,
      isActive: plan.isActive,
      displayOrder: plan.displayOrder,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (plan: PlanWithStats) => {
    setSelectedPlan(plan);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: PlanFormValues) => {
    console.log("📋 Subscription Plan Form Submission:");
    console.log("  - Plan Name:", data.name);
    console.log("  - Allowed Modules:", data.allowedModules);
    console.log("  - Total Modules:", data.allowedModules.length);
    
    if (selectedPlan) {
      updateMutation.mutate({ id: selectedPlan.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatBillingCycle = (cycle: string) => {
    switch (cycle) {
      case "monthly":
        return "Monthly";
      case "annual":
        return "Annual";
      case "lifetime":
        return "Lifetime";
      default:
        return cycle;
    }
  };

  const columns: ColumnDef<PlanWithStats>[] = [
    {
      accessorKey: "name",
      header: "Plan Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: row.original.color }}
            data-testid={`color-badge-${row.index}`}
          />
          <span className="font-semibold" data-testid={`text-plan-name-${row.index}`}>
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400" data-testid={`text-description-${row.index}`}>
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <span className="font-medium" data-testid={`text-price-${row.index}`}>
          {formatPrice(row.original.price)}
        </span>
      ),
    },
    {
      accessorKey: "billingCycle",
      header: "Billing Cycle",
      cell: ({ row }) => (
        <Badge variant="outline" data-testid={`badge-billing-${row.index}`}>
          {formatBillingCycle(row.original.billingCycle)}
        </Badge>
      ),
    },
    {
      accessorKey: "allowedModules",
      header: "Modules",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Package className="w-4 h-4 text-gray-500" />
          <span className="text-sm" data-testid={`text-module-count-${row.index}`}>
            {row.original.allowedModules.length} modules
          </span>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? "default" : "secondary"}
          data-testid={`badge-status-${row.index}`}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "tenantCount",
      header: "Tenants",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm" data-testid={`text-tenant-count-${row.index}`}>
            {row.original.tenantCount || 0}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row.original)}
            data-testid={`button-edit-${row.index}`}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original)}
            data-testid={`button-delete-${row.index}`}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: plansWithStats,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const totalPlans = plansWithStats.length;
  const activePlans = plansWithStats.filter(p => p.isActive).length;
  const totalTenants = plansWithStats.reduce((sum, p) => sum + (p.tenantCount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Subscription Plans</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage subscription plans and module access for tenants
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Plans</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="stat-total-plans">
                  {totalPlans}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Plans</p>
                <p className="text-2xl font-bold text-green-600" data-testid="stat-active-plans">
                  {activePlans}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tenants</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="stat-total-tenants">
                  {totalTenants}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <Input
          placeholder="Search plans..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
          data-testid="input-search"
        />
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => backfillMutation.mutate()}
            disabled={backfillMutation.isPending}
            data-testid="button-backfill-admin"
          >
            {backfillMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Fix Admin Permissions
          </Button>
          <Button onClick={handleAdd} data-testid="button-add-plan">
            <Plus className="w-4 h-4 mr-2" />
            Add Plan
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading plans...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} data-testid={`row-plan-${row.index}`}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No subscription plans found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-gray-500">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedPlan(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">
              {selectedPlan ? "Edit Subscription Plan" : "Add Subscription Plan"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="e.g., Professional Plan"
                data-testid="input-name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Brief description of the plan..."
                rows={3}
                data-testid="input-description"
              />
            </div>

            {/* Price and Billing Cycle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  {...form.register("price")}
                  placeholder="0.00"
                  type="text"
                  data-testid="input-price"
                />
                {form.formState.errors.price && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.price.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="billingCycle">Billing Cycle *</Label>
                <Select
                  value={form.watch("billingCycle")}
                  onValueChange={(value) => form.setValue("billingCycle", value as any)}
                >
                  <SelectTrigger id="billingCycle" data-testid="select-billing-cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Color and Display Order */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color">Badge Color *</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="color"
                    {...form.register("color")}
                    type="color"
                    className="w-20 h-10"
                    data-testid="input-color"
                  />
                  <Input
                    {...form.register("color")}
                    placeholder="#3B82F6"
                    className="flex-1"
                    data-testid="input-color-text"
                  />
                </div>
                {form.formState.errors.color && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.color.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  {...form.register("displayOrder", { valueAsNumber: true })}
                  type="number"
                  placeholder="0"
                  data-testid="input-display-order"
                />
              </div>
            </div>

            {/* Is Active */}
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={form.watch("isActive")}
                onCheckedChange={(checked) => form.setValue("isActive", checked)}
                data-testid="switch-is-active"
              />
              <Label htmlFor="isActive">Plan is Active</Label>
            </div>

            {/* Allowed Modules */}
            <div>
              <Label className="mb-2 block">Allowed Modules *</Label>
              <div className="border rounded-md p-4 max-h-96 overflow-y-auto space-y-4">
                {Object.entries(MODULE_HIERARCHY).map(([categoryName, categoryData]) => (
                  <div key={categoryName}>
                    {/* Category Header */}
                    <h3 className={`text-lg font-bold mb-3 ${categoryData.color}`}>
                      {categoryName}
                    </h3>
                    
                    {/* Modules in this category */}
                    <div className="space-y-2">
                      {categoryData.modules.map((moduleInfo) => (
                        <div 
                          key={moduleInfo.name} 
                          className={'parent' in moduleInfo ? "ml-6" : ""}
                        >
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`module-${moduleInfo.name}`}
                              checked={form.watch("allowedModules").includes(moduleInfo.name)}
                              onCheckedChange={(checked) => {
                                const current = form.watch("allowedModules");
                                let updated = [...current];
                                
                                if (checked) {
                                  // Add the module
                                  if (!updated.includes(moduleInfo.name)) {
                                    updated.push(moduleInfo.name);
                                  }
                                  
                                  // If this is a parent module, automatically add all children
                                  if ('children' in moduleInfo && moduleInfo.children) {
                                    console.log(`✅ Checking parent "${moduleInfo.name}", adding children:`, moduleInfo.children);
                                    moduleInfo.children.forEach((childName: string) => {
                                      if (!updated.includes(childName)) {
                                        updated.push(childName);
                                        console.log(`   ➕ Added child: ${childName}`);
                                      }
                                    });
                                  }
                                  
                                  // Auto-select parent if this is a sub-module
                                  if ('parent' in moduleInfo && moduleInfo.parent && !updated.includes(moduleInfo.parent)) {
                                    updated.push(moduleInfo.parent);
                                    console.log(`   ➕ Added parent: ${moduleInfo.parent}`);
                                  }
                                } else {
                                  // Remove the module
                                  updated = updated.filter(m => m !== moduleInfo.name);
                                  
                                  // If this is a parent module, remove all children too
                                  if ('children' in moduleInfo && moduleInfo.children) {
                                    console.log(`❌ Unchecking parent "${moduleInfo.name}", removing children:`, moduleInfo.children);
                                    updated = updated.filter(m => !moduleInfo.children!.includes(m));
                                  }
                                }
                                
                                console.log(`📦 Updated modules (${updated.length}):`, updated);
                                form.setValue("allowedModules", updated);
                              }}
                              data-testid={`checkbox-module-${moduleInfo.name.toLowerCase().replace(/\s+/g, "-")}`}
                            />
                            <Label 
                              htmlFor={`module-${moduleInfo.name}`} 
                              className={`cursor-pointer ${moduleInfo.isParent ? 'font-semibold text-base' : 'text-sm font-normal'}`}
                            >
                              {moduleInfo.name}
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {form.formState.errors.allowedModules && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.allowedModules.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setSelectedPlan(null);
                  form.reset();
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : selectedPlan
                  ? "Update Plan"
                  : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedPlan?.name}</strong>?
              {selectedPlan && selectedPlan.tenantCount && selectedPlan.tenantCount > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-yellow-800 dark:text-yellow-200 font-semibold">
                    ⚠️ Warning: {selectedPlan.tenantCount} tenant{selectedPlan.tenantCount > 1 ? 's are' : ' is'} currently using this plan.
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Deleting this plan will affect these tenants' access to modules.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPlan && deleteMutation.mutate(selectedPlan.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
