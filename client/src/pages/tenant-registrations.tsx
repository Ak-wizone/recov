import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  Mail,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { TenantSummary } from "@/components/TenantSummary";
import type { SubscriptionPlan } from "@shared/schema";

interface TenantStatistics {
  customers: number;
  invoices: {
    count: number;
    total: number;
  };
  receipts: {
    count: number;
    total: number;
    breakdown: Array<{
      type: string;
      count: number;
      total: number;
    }>;
  };
  activity: {
    lastCustomerAdded: string | null;
    lastInvoiceCreated: string | null;
    lastReceiptRecorded: string | null;
    lastLogin: string | null;
    lastActivityAt: string | null;
    userCount: number;
  };
}

interface TenantRow {
  id: string;
  businessName: string;
  email: string;
  city: string;
  planType: string;
  subscriptionPlanId?: string | null;
  status: "pending" | "approved" | "rejected" | "active" | "inactive";
  isActive?: boolean;
  createdAt: string;
  isRegistrationRequest: boolean;
  statistics?: TenantStatistics;
}

export default function TenantRegistrations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<TenantRow | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<TenantRow | null>(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [selectedTenantForSummary, setSelectedTenantForSummary] = useState<TenantRow | null>(null);
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "at-risk" | "inactive" | "never-used">("all");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState<TenantRow | null>(null);
  const [selectedPlanForApproval, setSelectedPlanForApproval] = useState<string>("");
  const [changePlanDialogOpen, setChangePlanDialogOpen] = useState(false);
  const [tenantToChangePlan, setTenantToChangePlan] = useState<TenantRow | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>("");

  // Redirect tenant users to dashboard - only platform admins can access this page
  useEffect(() => {
    if (user && user.tenantId) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Fetch registration requests
  const { data: requests } = useQuery<any[]>({
    queryKey: ['/api/registration-requests'],
  });

  // Fetch approved tenants
  const { data: tenants } = useQuery<any[]>({
    queryKey: ['/api/tenants'],
  });

  // Fetch active subscription plans
  const { data: subscriptionPlans = [], isLoading: isLoadingPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans/active'],
  });

  // State for tenant statistics
  const [tenantStats, setTenantStats] = useState<Record<string, TenantStatistics>>({});

  // Fetch statistics for all tenants
  useEffect(() => {
    if (!tenants || tenants.length === 0) return;

    // Fetch stats for each tenant in parallel
    const fetchStats = async () => {
      const statsPromises = tenants.map(async (tenant) => {
        try {
          const response = await fetch(`/api/tenants/${tenant.id}/statistics`, {
            credentials: "include",
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const stats = await response.json();
          return { tenantId: tenant.id, stats };
        } catch (error) {
          console.error(`Failed to fetch stats for tenant ${tenant.id}:`, error);
          return { tenantId: tenant.id, stats: null };
        }
      });

      const results = await Promise.all(statsPromises);
      const statsMap: Record<string, TenantStatistics> = {};
      
      results.forEach(({ tenantId, stats }) => {
        if (stats) {
          statsMap[tenantId] = stats;
        }
      });

      setTenantStats(statsMap);
    };

    fetchStats();
  }, [tenants]);

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, planId }: { requestId: string; planId: string }) => {
      return await apiRequest("POST", `/api/registration-requests/${requestId}/approve`, { planId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tenant approved and welcome email sent",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      setApproveDialogOpen(false);
      setRequestToApprove(null);
      setSelectedPlanForApproval("");
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ planId, tenantIds }: { planId: string; tenantIds: string[] }) => {
      return await apiRequest("POST", `/api/subscription-plans/${planId}/assign-tenants`, { tenantIds });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription plan changed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      setChangePlanDialogOpen(false);
      setTenantToChangePlan(null);
      setSelectedNewPlan("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to change plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return await apiRequest("POST", `/api/tenants/${tenantId}/toggle-status`);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to toggle status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return await apiRequest("POST", `/api/tenants/${tenantId}/reset-password`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset to default successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendCredentialsMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return await apiRequest("POST", `/api/tenants/${tenantId}/send-credentials`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credentials email sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send credentials",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return await apiRequest("DELETE", `/api/tenants/${tenantId}`);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      setDeleteDialogOpen(false);
      setTenantToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRegistrationRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("DELETE", `/api/registration-requests/${requestId}`);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/registration-requests'] });
      setDeleteDialogOpen(false);
      setTenantToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete registration request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectRegistrationMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("DELETE", `/api/registration-requests/${requestId}`);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Request Rejected",
        description: "Registration request has been rejected and removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/registration-requests'] });
      setRejectDialogOpen(false);
      setRequestToReject(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteTenant = () => {
    if (tenantToDelete) {
      if (tenantToDelete.isRegistrationRequest) {
        deleteRegistrationRequestMutation.mutate(tenantToDelete.id);
      } else {
        deleteTenantMutation.mutate(tenantToDelete.id);
      }
    }
  };

  // Create stable handler functions to prevent re-renders
  const handleOpenApproveDialog = useCallback((request: TenantRow) => {
    setRequestToApprove(request);
    setSelectedPlanForApproval("");
    setApproveDialogOpen(true);
  }, []);

  const handleApprove = () => {
    if (!requestToApprove || !selectedPlanForApproval) {
      toast({
        title: "Validation Error",
        description: "Please select a subscription plan",
        variant: "destructive",
      });
      return;
    }
    approveMutation.mutate({ requestId: requestToApprove.id, planId: selectedPlanForApproval });
  };

  const handleOpenChangePlanDialog = useCallback((tenant: TenantRow) => {
    setTenantToChangePlan(tenant);
    setSelectedNewPlan(tenant.subscriptionPlanId || "");
    setChangePlanDialogOpen(true);
  }, []);

  const handleChangePlan = () => {
    if (!tenantToChangePlan || !selectedNewPlan) {
      toast({
        title: "Validation Error",
        description: "Please select a subscription plan",
        variant: "destructive",
      });
      return;
    }
    changePlanMutation.mutate({ planId: selectedNewPlan, tenantIds: [tenantToChangePlan.id] });
  };

  const handleToggleStatus = useCallback((tenantId: string) => {
    toggleStatusMutation.mutate(tenantId);
  }, []);

  const handleResetPassword = useCallback((tenantId: string) => {
    resetPasswordMutation.mutate(tenantId);
  }, []);

  const handleSendCredentials = useCallback((tenantId: string) => {
    sendCredentialsMutation.mutate(tenantId);
  }, []);

  const handleOpenDeleteDialog = useCallback((tenant: TenantRow) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  }, []);

  const handleOpenRejectDialog = useCallback((request: TenantRow) => {
    setRequestToReject(request);
    setRejectDialogOpen(true);
  }, []);

  const handleRejectRequest = () => {
    if (requestToReject) {
      rejectRegistrationMutation.mutate(requestToReject.id);
    }
  };

  const handleOpenSummary = useCallback((tenant: TenantRow) => {
    // Only open summary for approved tenants (not pending registration requests)
    if (!tenant.isRegistrationRequest) {
      setSelectedTenantForSummary(tenant);
      setSummaryDialogOpen(true);
    }
  }, []);

  // Combine requests and tenants into unified data - memoize to prevent re-renders
  const data = useMemo<TenantRow[]>(() => [
    ...(requests?.map(r => ({
      id: r.id,
      businessName: r.businessName,
      email: r.email,
      city: r.city,
      planType: r.planType,
      subscriptionPlanId: null,
      status: r.status,
      createdAt: r.createdAt,
      isRegistrationRequest: true,
      statistics: undefined,
    })) || []),
    ...(tenants?.map(t => ({
      id: t.id,
      businessName: t.businessName,
      email: t.email,
      city: t.city,
      planType: t.planType,
      subscriptionPlanId: t.subscriptionPlanId,
      status: t.isActive ? 'active' : 'inactive',
      isActive: t.isActive,
      createdAt: t.createdAt,
      isRegistrationRequest: false,
      statistics: tenantStats[t.id],
    })) || []),
  ], [requests, tenants, tenantStats]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "active":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "inactive":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanTypeLabel = (planType: string) => {
    const planLabels: Record<string, string> = {
      "6_months_demo": "6 Months Demo",
      "annual_subscription": "Annual Subscription",
      "lifetime": "Lifetime",
    };
    return planLabels[planType] || planType;
  };

  const getSubscriptionPlanBadge = (subscriptionPlanId: string | null | undefined) => {
    if (!subscriptionPlanId) {
      return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200" data-testid="badge-no-plan">No Plan</Badge>;
    }

    const plan = subscriptionPlans.find(p => p.id === subscriptionPlanId);
    if (!plan) {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200" data-testid="badge-custom-plan">Custom</Badge>;
    }

    return (
      <Badge
        variant="outline"
        style={{
          backgroundColor: `${plan.color}15`,
          color: plan.color,
          borderColor: `${plan.color}40`,
        }}
        data-testid={`badge-plan-${plan.id}`}
      >
        <Package className="w-3 h-3 mr-1" />
        {plan.name}
      </Badge>
    );
  };

  // Wrap columns in useMemo to prevent re-creation on every render
  const columns = useMemo<ColumnDef<TenantRow>[]>(() => [
    {
      accessorKey: "businessName",
      header: ({ column }) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Business Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.original.businessName}</div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.email}</div>
      ),
    },
    {
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.city}</div>
      ),
    },
    {
      accessorKey: "subscriptionPlanId",
      header: "Subscription Plan",
      cell: ({ row }) => (
        <div data-testid={`cell-plan-${row.index}`}>
          {getSubscriptionPlanBadge(row.original.subscriptionPlanId)}
        </div>
      ),
    },
    {
      accessorKey: "planType",
      header: "Plan Type",
      cell: ({ row }) => (
        <Badge variant="secondary">{getPlanTypeLabel(row.original.planType)}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm">{format(new Date(row.original.createdAt), "PP")}</div>
      ),
    },
    {
      id: "customers",
      header: "Customers",
      cell: ({ row }) => {
        const stats = row.original.statistics;
        if (!stats || row.original.isRegistrationRequest) {
          return <div className="text-sm text-gray-400">—</div>;
        }
        return <div className="text-sm font-medium">{stats.customers}</div>;
      },
    },
    {
      id: "invoices",
      header: "Invoices",
      cell: ({ row }) => {
        const stats = row.original.statistics;
        if (!stats || row.original.isRegistrationRequest) {
          return <div className="text-sm text-gray-400">—</div>;
        }
        return (
          <div className="text-sm">
            <div className="font-medium">{stats.invoices.count}</div>
            <div className="text-xs text-muted-foreground">
              ₹{stats.invoices.total.toLocaleString("en-IN")}
            </div>
          </div>
        );
      },
    },
    {
      id: "receipts",
      header: "Receipts",
      cell: ({ row }) => {
        const stats = row.original.statistics;
        if (!stats || row.original.isRegistrationRequest) {
          return <div className="text-sm text-gray-400">—</div>;
        }
        
        const breakdown = stats.receipts.breakdown;
        const tdsEntry = breakdown.find(b => b.type === "TDS");
        const cnEntry = breakdown.find(b => b.type === "CN");
        
        return (
          <div className="text-sm">
            <div className="font-medium">{stats.receipts.count} total</div>
            {(tdsEntry || cnEntry) && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                {cnEntry && <div>CN: {cnEntry.count}</div>}
                {tdsEntry && <div>TDS: {tdsEntry.count}</div>}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const tenant = row.original;
        
        return (
          <div className="flex gap-2">
            {/* Pending registration request - show Approve and Reject buttons */}
            {tenant.isRegistrationRequest && tenant.status === "pending" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleOpenApproveDialog(tenant)}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid={`button-approve-${tenant.id}`}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleOpenRejectDialog(tenant)}
                  disabled={rejectRegistrationMutation.isPending}
                  data-testid={`button-reject-${tenant.id}`}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {/* Approved/Rejected registration request - show Delete button */}
            {tenant.isRegistrationRequest && tenant.status !== "pending" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleOpenDeleteDialog(tenant)}
                disabled={deleteRegistrationRequestMutation.isPending}
                data-testid={`button-delete-request-${tenant.id}`}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete Request
              </Button>
            )}
            
            {/* Active/Inactive tenants - show management dropdown */}
            {!tenant.isRegistrationRequest && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    data-testid={`button-menu-${tenant.id}`}
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleToggleStatus(tenant.id)}
                    disabled={toggleStatusMutation.isPending}
                    data-testid={`menu-toggle-${tenant.id}`}
                  >
                    {tenant.isActive ? (
                      <>
                        <ToggleRight className="w-4 h-4 mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 mr-2" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenChangePlanDialog(tenant)}
                    data-testid={`menu-change-plan-${tenant.id}`}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Change Plan
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleResetPassword(tenant.id)}
                    disabled={resetPasswordMutation.isPending}
                    data-testid={`menu-reset-${tenant.id}`}
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    Reset Password
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSendCredentials(tenant.id)}
                    disabled={sendCredentialsMutation.isPending}
                    data-testid={`menu-send-${tenant.id}`}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Credentials
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleOpenDeleteDialog(tenant)}
                    disabled={deleteTenantMutation.isPending}
                    className="text-red-600"
                    data-testid={`menu-delete-${tenant.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Tenant
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      },
    },
  ], [handleOpenApproveDialog, handleToggleStatus, handleResetPassword, handleSendCredentials, handleOpenDeleteDialog, handleOpenRejectDialog, handleOpenChangePlanDialog, approveMutation.isPending, rejectRegistrationMutation.isPending, deleteRegistrationRequestMutation.isPending, deleteTenantMutation.isPending, toggleStatusMutation.isPending, resetPasswordMutation.isPending, sendCredentialsMutation.isPending]);

  // Helper function to calculate activity status
  const getActivityStatus = (tenant: TenantRow): "active" | "at-risk" | "inactive" | "never-used" => {
    if (tenant.isRegistrationRequest) return "never-used";
    if (!tenant.statistics?.activity?.lastActivityAt) return "never-used";
    
    const lastActivity = new Date(tenant.statistics.activity.lastActivityAt);
    const now = new Date();
    const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceActivity <= 7) return "active";
    if (daysSinceActivity <= 30) return "at-risk";
    return "inactive";
  };

  // Filter data based on activity filter
  const filteredData = useMemo(() => {
    if (activityFilter === "all") return data;
    
    return data.filter(tenant => {
      const status = getActivityStatus(tenant);
      return status === activityFilter;
    });
  }, [data, activityFilter]);

  // Calculate engagement metrics
  const approvedTenants = data.filter(d => !d.isRegistrationRequest);
  const activeTenantsCount = approvedTenants.filter(t => getActivityStatus(t) === "active").length;
  const atRiskCount = approvedTenants.filter(t => getActivityStatus(t) === "at-risk").length;
  const inactiveTenantsCount = approvedTenants.filter(t => getActivityStatus(t) === "inactive").length;
  const neverUsedCount = approvedTenants.filter(t => getActivityStatus(t) === "never-used").length;
  const pendingCount = data.filter(d => d.status === "pending").length;

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
    },
  });

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">Manage tenant registrations and access control</p>
        </div>
        <Button
          onClick={() => setLocation("/email-config")}
          data-testid="button-email-config"
          className="w-full md:w-auto"
        >
          <Mail className="w-4 h-4 mr-2" />
          Email Configuration
        </Button>
      </div>

      {/* Tenant Engagement Analytics - Clickable Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${activityFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setActivityFilter("all")}
          data-testid="card-all-tenants"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">All Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{approvedTenants.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total registered</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${activityFilter === "active" ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setActivityFilter("active")}
          data-testid="card-active-tenants"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-green-700 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Active (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-green-600">{activeTenantsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Using regularly</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${activityFilter === "at-risk" ? "ring-2 ring-yellow-500" : ""}`}
          onClick={() => setActivityFilter("at-risk")}
          data-testid="card-at-risk-tenants"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-yellow-700 flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              At Risk (7-30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-yellow-600">{atRiskCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Need follow-up</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${activityFilter === "inactive" ? "ring-2 ring-orange-500" : ""}`}
          onClick={() => setActivityFilter("inactive")}
          data-testid="card-inactive-tenants"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-orange-700 flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              Inactive (30d+)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-orange-600">{inactiveTenantsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Not using</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${activityFilter === "never-used" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => setActivityFilter("never-used")}
          data-testid="card-never-used-tenants"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-red-700 flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Never Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-red-600">{neverUsedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Need onboarding</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Filter Indicator */}
      {activityFilter !== "all" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
          <span className="text-sm font-medium">
            Showing: {activityFilter === "active" ? "Active Tenants (Last 7 days)" :
                      activityFilter === "at-risk" ? "At-Risk Tenants (7-30 days)" :
                      activityFilter === "inactive" ? "Inactive Tenants (30+ days)" :
                      "Never Used Tenants"}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActivityFilter("all")}
            className="ml-auto"
          >
            Clear Filter
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            Registration requests and active tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <Input
                placeholder="Filter by business name..."
                value={(table.getColumn("businessName")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("businessName")?.setFilterValue(event.target.value)
                }
                className="w-full md:max-w-sm"
                data-testid="input-filter-name"
              />
              <Input
                placeholder="Filter by email..."
                value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("email")?.setFilterValue(event.target.value)
                }
                className="w-full md:max-w-sm"
                data-testid="input-filter-email"
              />
              <Input
                placeholder="Filter by city..."
                value={(table.getColumn("city")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("city")?.setFilterValue(event.target.value)
                }
                className="w-full md:max-w-sm"
                data-testid="input-filter-city"
              />
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const tenant = row.original;
                  return (
                    <Card 
                      key={tenant.id} 
                      data-testid={`card-tenant-${tenant.id}`}
                      onClick={() => handleOpenSummary(tenant)}
                      className={!tenant.isRegistrationRequest ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{tenant.businessName}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{tenant.email}</p>
                            </div>
                            {getStatusBadge(tenant.status)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">City:</span> {tenant.city}
                            </div>
                            <div>
                              <Badge variant="secondary" className="text-xs">
                                {getPlanTypeLabel(tenant.planType)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(tenant.createdAt), "PP")}
                          </div>

                          {/* Statistics (only for approved tenants) */}
                          {!tenant.isRegistrationRequest && tenant.statistics && (
                            <div className="flex items-center gap-4 text-sm pt-2 border-t">
                              <div>
                                <span className="text-muted-foreground">Customers:</span>
                                <span className="ml-1 font-medium">{tenant.statistics.customers}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Invoices:</span>
                                <span className="ml-1 font-medium">{tenant.statistics.invoices.count}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Receipts:</span>
                                <span className="ml-1 font-medium">{tenant.statistics.receipts.count}</span>
                              </div>
                            </div>
                          )}

                          <div className="pt-2 border-t">
                            {/* Pending registration request - show Approve and Reject buttons */}
                            {tenant.isRegistrationRequest && tenant.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenApproveDialog(tenant)}
                                  disabled={approveMutation.isPending}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                  data-testid={`button-approve-${tenant.id}`}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleOpenRejectDialog(tenant)}
                                  disabled={rejectRegistrationMutation.isPending}
                                  className="flex-1"
                                  data-testid={`button-reject-${tenant.id}`}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}

                            {/* Approved/Rejected registration request - show Delete button */}
                            {tenant.isRegistrationRequest && tenant.status !== "pending" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleOpenDeleteDialog(tenant)}
                                disabled={deleteRegistrationRequestMutation.isPending}
                                className="w-full"
                                data-testid={`button-delete-request-${tenant.id}`}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete Request
                              </Button>
                            )}
                            
                            {/* Active/Inactive tenants - show management buttons in dropdown */}
                            {!tenant.isRegistrationRequest && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    className="w-full"
                                    data-testid={`button-actions-${tenant.id}`}
                                  >
                                    <MoreHorizontal className="h-4 w-4 mr-2" />
                                    Actions
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel>Tenant Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleToggleStatus(tenant.id)}
                                    disabled={toggleStatusMutation.isPending}
                                    data-testid={`menu-toggle-${tenant.id}`}
                                  >
                                    {tenant.isActive ? (
                                      <><ToggleRight className="w-4 h-4 mr-2" />Deactivate Tenant</>
                                    ) : (
                                      <><ToggleLeft className="w-4 h-4 mr-2" />Activate Tenant</>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleOpenChangePlanDialog(tenant)}
                                    data-testid={`menu-change-plan-${tenant.id}`}
                                  >
                                    <Package className="w-4 h-4 mr-2" />
                                    Change Plan
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleResetPassword(tenant.id)}
                                    disabled={resetPasswordMutation.isPending}
                                    data-testid={`menu-reset-${tenant.id}`}
                                  >
                                    <KeyRound className="w-4 h-4 mr-2" />
                                    Reset Password
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleSendCredentials(tenant.id)}
                                    disabled={sendCredentialsMutation.isPending}
                                    data-testid={`menu-send-${tenant.id}`}
                                  >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Send Credentials
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleOpenDeleteDialog(tenant)}
                                    disabled={deleteTenantMutation.isPending}
                                    className="text-red-600"
                                    data-testid={`menu-delete-${tenant.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Tenant
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No results.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        data-testid={`row-tenant-${row.original.id}`}
                        onClick={() => handleOpenSummary(row.original)}
                        className={!row.original.isRegistrationRequest ? "cursor-pointer hover:bg-muted/50" : ""}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {table.getFilteredRowModel().rows.length} total records
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Previous</span>
                </Button>
                <div className="text-sm whitespace-nowrap">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  data-testid="button-next-page"
                >
                  <span className="hidden md:inline">Next</span>
                  <ChevronRight className="h-4 w-4 md:ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {tenantToDelete?.isRegistrationRequest ? (
                <>
                  This will permanently delete the registration request from{" "}
                  <strong>{tenantToDelete?.businessName}</strong>. 
                  The email <strong>{tenantToDelete?.email}</strong> will become available for new registrations.
                  This action cannot be undone.
                </>
              ) : (
                <>
                  This will permanently delete tenant{" "}
                  <strong>{tenantToDelete?.businessName}</strong> and all their data
                  including users, customers, invoices, receipts, and all other records.
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTenant}
              className="bg-red-600 hover:bg-red-700"
            >
              {(deleteTenantMutation.isPending || deleteRegistrationRequestMutation.isPending) 
                ? "Deleting..." 
                : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Registration Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject and permanently delete the registration request from{" "}
              <strong>{requestToReject?.businessName}</strong>. 
              The email <strong>{requestToReject?.email}</strong> will become available for new registrations.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectRequest}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-reject"
            >
              {rejectRegistrationMutation.isPending 
                ? "Rejecting..." 
                : "Reject Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Request Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent data-testid="dialog-approve-request">
          <DialogHeader>
            <DialogTitle>Approve Registration Request</DialogTitle>
            <DialogDescription>
              Select a subscription plan for {requestToApprove?.businessName}. This plan will determine which modules and features they can access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="plan-select">Subscription Plan *</Label>
              <Select
                value={selectedPlanForApproval}
                onValueChange={setSelectedPlanForApproval}
                disabled={isLoadingPlans}
              >
                <SelectTrigger id="plan-select" data-testid="select-plan-approval">
                  <SelectValue placeholder="Select a subscription plan" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id} data-testid={`option-plan-${plan.id}`}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: plan.color }}
                        />
                        <span>{plan.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({plan.allowedModules.length} modules)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPlanForApproval && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm">
                  <strong>Selected Plan Details:</strong>
                  {subscriptionPlans.find(p => p.id === selectedPlanForApproval) && (
                    <div className="mt-2 space-y-1">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        {subscriptionPlans.find(p => p.id === selectedPlanForApproval)?.name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Modules:</span>{" "}
                        {subscriptionPlans.find(p => p.id === selectedPlanForApproval)?.allowedModules.length}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              data-testid="button-cancel-approve"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending || !selectedPlanForApproval}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving..." : "Approve & Send Welcome Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanDialogOpen} onOpenChange={setChangePlanDialogOpen}>
        <DialogContent data-testid="dialog-change-plan">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Update the subscription plan for {tenantToChangePlan?.businessName}. This will change their module access immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="plan-select-change">New Subscription Plan *</Label>
              <Select
                value={selectedNewPlan}
                onValueChange={setSelectedNewPlan}
                disabled={isLoadingPlans}
              >
                <SelectTrigger id="plan-select-change" data-testid="select-plan-change">
                  <SelectValue placeholder="Select a subscription plan" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id} data-testid={`option-plan-change-${plan.id}`}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: plan.color }}
                        />
                        <span>{plan.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({plan.allowedModules.length} modules)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tenantToChangePlan?.subscriptionPlanId && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-md">
                <div className="text-sm">
                  <strong>Current Plan:</strong>{" "}
                  {subscriptionPlans.find(p => p.id === tenantToChangePlan.subscriptionPlanId)?.name || "No Plan"}
                </div>
              </div>
            )}
            {selectedNewPlan && selectedNewPlan !== tenantToChangePlan?.subscriptionPlanId && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-md">
                <div className="text-sm">
                  <strong>New Plan:</strong>{" "}
                  {subscriptionPlans.find(p => p.id === selectedNewPlan)?.name}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangePlanDialogOpen(false)}
              data-testid="button-cancel-change-plan"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={changePlanMutation.isPending || !selectedNewPlan || selectedNewPlan === tenantToChangePlan?.subscriptionPlanId}
              data-testid="button-confirm-change-plan"
            >
              {changePlanMutation.isPending ? "Changing Plan..." : "Change Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tenant Summary Dialog */}
      {selectedTenantForSummary && (
        <TenantSummary
          tenantId={selectedTenantForSummary.id}
          tenantName={selectedTenantForSummary.businessName}
          open={summaryDialogOpen}
          onOpenChange={setSummaryDialogOpen}
        />
      )}
    </div>
  );
}
