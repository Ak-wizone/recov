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
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Download,
  Users,
  Settings2,
  Search,
  Pencil,
  Check,
  X as XIcon,
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import type { SubscriptionPlan } from "@shared/schema";
import { ColumnChooser } from "@/components/ui/column-chooser";

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
  mobileNumber?: string | null;
  businessAddress: string;
  city: string;
  state?: string | null;
  pincode: string;
  panNumber?: string | null;
  gstNumber?: string | null;
  industryType?: string | null;
  existingAccountingSoftware?: string | null;
  planType: string;
  subscriptionPlanId?: string | null;
  status: "pending" | "approved" | "rejected" | "active" | "inactive";
  isActive?: boolean;
  createdAt: string;
  isRegistrationRequest: boolean;
  statistics?: TenantStatistics;
  paymentStatus?: string | null;
  paymentTimestamp?: string | null;
}

export default function TenantRegistrations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnChooserOpen, setColumnChooserOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<TenantRow | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<TenantRow | null>(null);
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "at-risk" | "inactive" | "never-used">("all");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState<TenantRow | null>(null);
  const [selectedPlanForApproval, setSelectedPlanForApproval] = useState<string>("");
  const [changePlanDialogOpen, setChangePlanDialogOpen] = useState(false);
  const [tenantToChangePlan, setTenantToChangePlan] = useState<TenantRow | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>("");
  
  // Bulk actions state
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<string>>(new Set());
  const [bulkPlanChangeDialogOpen, setBulkPlanChangeDialogOpen] = useState(false);
  const [selectedBulkPlan, setSelectedBulkPlan] = useState<string>("");
  
  // Mobile editing state
  const [editingMobileId, setEditingMobileId] = useState<string | null>(null);
  const [editingMobileValue, setEditingMobileValue] = useState<string>("");

  // Load column visibility and page size from localStorage
  useEffect(() => {
    const savedVisibility = localStorage.getItem("platform_admin_visible_columns");
    if (savedVisibility) {
      try {
        setColumnVisibility(JSON.parse(savedVisibility));
      } catch (e) {
        console.error("Failed to parse saved column visibility", e);
      }
    }
  }, []);

  // Save column visibility to localStorage
  useEffect(() => {
    localStorage.setItem("platform_admin_visible_columns", JSON.stringify(columnVisibility));
  }, [columnVisibility]);

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

  const updateMobileMutation = useMutation({
    mutationFn: async ({ tenantId, mobileNumber, isRequest }: { tenantId: string; mobileNumber: string; isRequest: boolean }) => {
      const endpoint = isRequest 
        ? `/api/platform-admin/registration-requests/${tenantId}/mobile`
        : `/api/platform-admin/tenants/${tenantId}/mobile`;
      return await apiRequest("PUT", endpoint, { mobileNumber });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Mobile number updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      setEditingMobileId(null);
      setEditingMobileValue("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update mobile",
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

  // Mobile editing handlers
  const handleStartEditMobile = useCallback((tenant: TenantRow) => {
    setEditingMobileId(tenant.id);
    setEditingMobileValue(tenant.mobileNumber || "");
  }, []);

  const handleCancelEditMobile = useCallback(() => {
    setEditingMobileId(null);
    setEditingMobileValue("");
  }, []);

  const handleSaveMobile = useCallback((tenant: TenantRow) => {
    const mobileNumber = editingMobileValue.trim();
    
    if (!mobileNumber) {
      toast({
        title: "Validation Error",
        description: "Mobile number cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      toast({
        title: "Validation Error",
        description: "Mobile number must be exactly 10 digits",
        variant: "destructive",
      });
      return;
    }

    updateMobileMutation.mutate({ 
      tenantId: tenant.id, 
      mobileNumber,
      isRequest: tenant.isRegistrationRequest 
    });
  }, [editingMobileValue, updateMobileMutation]);

  // Bulk actions handlers
  const handleOpenBulkPlanChange = () => {
    setBulkPlanChangeDialogOpen(true);
    setSelectedBulkPlan("");
  };

  const handleBulkPlanChange = () => {
    if (!selectedBulkPlan) {
      toast({
        title: "Validation Error",
        description: "Please select a subscription plan",
        variant: "destructive",
      });
      return;
    }
    changePlanMutation.mutate({ 
      planId: selectedBulkPlan, 
      tenantIds: Array.from(selectedTenantIds) 
    }, {
      onSuccess: () => {
        // Clear selections and close dialog only on success
        setBulkPlanChangeDialogOpen(false);
        setSelectedBulkPlan("");
        setSelectedTenantIds(new Set());
      }
    });
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    if (!tenants || tenants.length === 0) {
      toast({
        title: "No Data",
        description: "No tenants to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = tenants.map((tenant, index) => {
      const stats = tenantStats[tenant.id];
      const plan = subscriptionPlans.find(p => p.id === tenant.subscriptionPlanId);
      
      return {
        "Sr. No.": index + 1,
        "Business Name": tenant.businessName,
        "Email": tenant.email,
        "City": tenant.city,
        "Subscription Plan": plan ? plan.name : "No Plan",
        "Status": tenant.isActive ? "Active" : "Inactive",
        "Customers": stats?.customers || 0,
        "Total Invoices": stats?.invoices.count || 0,
        "Invoice Amount": stats?.invoices.total || 0,
        "Total Receipts": stats?.receipts.count || 0,
        "Receipt Amount": stats?.receipts.total || 0,
        "Created Date": format(new Date(tenant.createdAt), "dd MMM yyyy"),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tenants");

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(
        Math.max(
          key.length,
          ...exportData.map(row => String(row[key as keyof typeof row] || "").length)
        ),
        maxWidth
      )
    }));
    worksheet['!cols'] = colWidths;

    const fileName = `tenants_export_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export Successful",
      description: `Exported ${tenants.length} tenants to ${fileName}`,
    });
  };

  // Combine requests and tenants into unified data - memoize to prevent re-renders
  const data = useMemo<TenantRow[]>(() => [
    ...(requests?.map(r => ({
      id: r.id,
      businessName: r.businessName,
      email: r.email,
      mobileNumber: r.mobileNumber,
      businessAddress: r.businessAddress,
      city: r.city,
      state: r.state,
      pincode: r.pincode,
      panNumber: r.panNumber,
      gstNumber: r.gstNumber,
      industryType: r.industryType,
      existingAccountingSoftware: r.existingAccountingSoftware,
      planType: r.planType,
      subscriptionPlanId: null,
      status: r.status,
      createdAt: r.createdAt,
      isRegistrationRequest: true,
      statistics: undefined,
      paymentStatus: r.paymentStatus,
      paymentTimestamp: r.paymentTimestamp,
    })) || []),
    ...(tenants?.map(t => ({
      id: t.id,
      businessName: t.businessName,
      email: t.email,
      mobileNumber: t.mobileNumber,
      businessAddress: t.businessAddress,
      city: t.city,
      state: t.state,
      pincode: t.pincode,
      panNumber: t.panNumber,
      gstNumber: t.gstNumber,
      industryType: t.industryType,
      existingAccountingSoftware: t.existingAccountingSoftware,
      planType: t.planType,
      subscriptionPlanId: t.subscriptionPlanId,
      status: (t.isActive ? 'active' : 'inactive') as "active" | "inactive",
      isActive: t.isActive,
      createdAt: t.createdAt,
      isRegistrationRequest: false,
      statistics: tenantStats[t.id],
      paymentStatus: null,
      paymentTimestamp: null,
    })) || []),
  ], [requests, tenants, tenantStats]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "active":
        return <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "inactive":
        return <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
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
      return <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700" data-testid="badge-no-plan">No Plan</Badge>;
    }

    const plan = subscriptionPlans.find(p => p.id === subscriptionPlanId);
    if (!plan) {
      return <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" data-testid="badge-custom-plan">Custom</Badge>;
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

  const getPaymentStatusBadge = (paymentStatus: string | null | undefined, paymentTimestamp: string | null | undefined, requestId: string) => {
    if (!paymentStatus) {
      return <span className="text-sm text-gray-400">—</span>;
    }

    const badge = (() => {
      switch (paymentStatus) {
        case "success":
          return (
            <Badge 
              variant="outline" 
              className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
              data-testid={`payment-status-${requestId}`}
            >
              Paid
            </Badge>
          );
        case "pending":
          return (
            <Badge 
              variant="outline" 
              className="bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"
              data-testid={`payment-status-${requestId}`}
            >
              Pending
            </Badge>
          );
        case "failed":
          return (
            <Badge 
              variant="outline" 
              className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
              data-testid={`payment-status-${requestId}`}
            >
              Failed
            </Badge>
          );
        default:
          return (
            <Badge 
              variant="outline"
              data-testid={`payment-status-${requestId}`}
            >
              {paymentStatus}
            </Badge>
          );
      }
    })();

    if (paymentTimestamp) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {badge}
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Payment: {format(new Date(paymentTimestamp), "PPpp")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badge;
  };

  // Selection handlers
  const toggleSelectTenant = useCallback((tenantId: string) => {
    setSelectedTenantIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tenantId)) {
        newSet.delete(tenantId);
      } else {
        newSet.add(tenantId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback((checked: boolean, filteredRows: any[]) => {
    if (checked) {
      // Select only visible tenants on current filtered/paginated view
      const visibleTenantIds = new Set(
        filteredRows
          .filter(row => !row.original.isRegistrationRequest)
          .map(row => row.original.id)
      );
      setSelectedTenantIds(visibleTenantIds);
    } else {
      setSelectedTenantIds(new Set());
    }
  }, []);

  const selectedCount = selectedTenantIds.size;

  // Wrap columns in useMemo to prevent re-creation on every render
  const columns = useMemo<ColumnDef<TenantRow>[]>(() => [
    {
      id: "select",
      header: ({ table }) => {
        // Get only visible rows on current page
        const visibleRows = table.getRowModel().rows;
        const visibleTenants = visibleRows.filter(r => !r.original.isRegistrationRequest);
        const allSelected = visibleTenants.length > 0 && visibleTenants.every(r => selectedTenantIds.has(r.original.id));
        
        return (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => toggleSelectAll(!!checked, visibleRows)}
              aria-label="Select all"
              data-testid="checkbox-select-all"
            />
          </div>
        );
      },
      cell: ({ row }) => {
        // Don't show checkbox for registration requests
        if (row.original.isRegistrationRequest) {
          return null;
        }
        return (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={selectedTenantIds.has(row.original.id)}
              onCheckedChange={() => toggleSelectTenant(row.original.id)}
              aria-label="Select row"
              data-testid={`checkbox-select-${row.index}`}
            />
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
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
      accessorKey: "mobileNumber",
      header: "Mobile Number",
      cell: ({ row }) => {
        const tenant = row.original;
        const isEditing = editingMobileId === tenant.id;
        
        if (isEditing) {
          return (
            <div className="flex items-center gap-1" data-testid={`edit-mobile-${tenant.id}`}>
              <Input
                value={editingMobileValue}
                onChange={(e) => setEditingMobileValue(e.target.value)}
                placeholder="10 digits"
                className="h-8 w-32"
                maxLength={10}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveMobile(tenant);
                  } else if (e.key === "Escape") {
                    handleCancelEditMobile();
                  }
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => handleSaveMobile(tenant)}
                disabled={updateMobileMutation.isPending}
                data-testid={`button-save-mobile-${tenant.id}`}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={handleCancelEditMobile}
                disabled={updateMobileMutation.isPending}
                data-testid={`button-cancel-mobile-${tenant.id}`}
              >
                <XIcon className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          );
        }
        
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{tenant.mobileNumber || "—"}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleStartEditMobile(tenant)}
              data-testid={`button-edit-mobile-${tenant.id}`}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "businessAddress",
      header: "Business Address",
      cell: ({ row }) => (
        <div className="text-sm max-w-[200px] truncate" title={row.original.businessAddress}>
          {row.original.businessAddress}
        </div>
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
      accessorKey: "state",
      header: "State",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.state || "—"}</div>
      ),
    },
    {
      accessorKey: "pincode",
      header: "Pincode",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.pincode}</div>
      ),
    },
    {
      accessorKey: "panNumber",
      header: "PAN Number",
      cell: ({ row }) => (
        <div className="text-sm font-mono">{row.original.panNumber || "—"}</div>
      ),
    },
    {
      accessorKey: "gstNumber",
      header: "GST Number",
      cell: ({ row }) => (
        <div className="text-sm font-mono">{row.original.gstNumber || "—"}</div>
      ),
    },
    {
      accessorKey: "industryType",
      header: "Industry Type",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.industryType || "—"}</div>
      ),
    },
    {
      accessorKey: "existingAccountingSoftware",
      header: "Existing Software",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.existingAccountingSoftware || "—"}</div>
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
      id: "paymentStatus",
      header: "Payment Status",
      cell: ({ row }) => {
        const tenant = row.original;
        if (!tenant.isRegistrationRequest) {
          return <span className="text-sm text-gray-400">—</span>;
        }
        return getPaymentStatusBadge(tenant.paymentStatus, tenant.paymentTimestamp, tenant.id);
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
  ], [handleOpenApproveDialog, handleToggleStatus, handleResetPassword, handleSendCredentials, handleOpenDeleteDialog, handleOpenRejectDialog, handleOpenChangePlanDialog, handleStartEditMobile, handleSaveMobile, handleCancelEditMobile, approveMutation.isPending, rejectRegistrationMutation.isPending, deleteRegistrationRequestMutation.isPending, deleteTenantMutation.isPending, toggleStatusMutation.isPending, resetPasswordMutation.isPending, sendCredentialsMutation.isPending, selectedTenantIds, toggleSelectTenant, toggleSelectAll, editingMobileId, editingMobileValue, updateMobileMutation.isPending]);

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

  // Load page size from localStorage
  const initialPageSize = useMemo(() => {
    const saved = localStorage.getItem("platform_admin_page_size");
    return saved ? parseInt(saved, 10) : 25;
  }, []);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: "includesString",
    initialState: {
      pagination: {
        pageSize: initialPageSize,
      },
    },
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
  });

  // Save page size to localStorage whenever it changes
  useEffect(() => {
    const pageSize = table.getState().pagination.pageSize;
    localStorage.setItem("platform_admin_page_size", String(pageSize));
  }, [table.getState().pagination.pageSize]);

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">Manage tenant registrations and access control</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {selectedCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  className="w-full sm:w-auto"
                  data-testid="button-bulk-actions"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Bulk Actions ({selectedCount})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={handleOpenBulkPlanChange}
                  data-testid="menu-bulk-change-plan"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Change Plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            onClick={handleExportToExcel}
            variant="outline"
            className="w-full sm:w-auto"
            data-testid="button-export-excel"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
          <Button
            onClick={() => setLocation("/email-config")}
            data-testid="button-email-config"
            className="w-full sm:w-auto"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email Configuration
          </Button>
        </div>
      </div>

      {/* Subscription Plan Statistics */}
      {subscriptionPlans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {subscriptionPlans.map((plan) => {
            const tenantCount = approvedTenants.filter(t => t.subscriptionPlanId === plan.id).length;
            return (
              <Card 
                key={plan.id}
                className="border-l-4 dark:bg-gray-900/50"
                style={{ borderLeftColor: plan.color || '#3b82f6' }}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" style={{ color: plan.color || '#3b82f6' }} />
                      {plan.name} Plan
                    </div>
                    <Badge 
                      style={{ 
                        backgroundColor: `${plan.color || '#3b82f6'}20`,
                        color: plan.color || '#3b82f6',
                        borderColor: plan.color || '#3b82f6'
                      }}
                      className="border"
                    >
                      ₹{plan.price}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" style={{ color: plan.color || '#3b82f6' }}>
                    {tenantCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tenantCount === 1 ? 'tenant' : 'tenants'} subscribed
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tenant Engagement Analytics - Clickable Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg dark:bg-gray-900 dark:border-gray-700 ${activityFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setActivityFilter("all")}
          data-testid="card-all-tenants"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground dark:text-gray-400">All Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold dark:text-gray-200">{approvedTenants.length}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Total registered</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg dark:bg-gray-900 dark:border-gray-700 ${activityFilter === "active" ? "ring-2 ring-green-500" : ""}`}
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
          className={`cursor-pointer transition-all hover:shadow-lg dark:bg-gray-900 dark:border-gray-700 ${activityFilter === "at-risk" ? "ring-2 ring-yellow-500" : ""}`}
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
          className={`cursor-pointer transition-all hover:shadow-lg dark:bg-gray-900 dark:border-gray-700 ${activityFilter === "inactive" ? "ring-2 ring-orange-500" : ""}`}
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
          className={`cursor-pointer transition-all hover:shadow-lg dark:bg-gray-900 dark:border-gray-700 ${activityFilter === "never-used" ? "ring-2 ring-red-500" : ""}`}
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

      <Card className="dark:bg-gray-900 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-gray-200">All Tenants</CardTitle>
          <CardDescription className="dark:text-gray-400">
            Registration requests and active tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search across all columns (business name, email, city, state, PAN, GST, etc.)..."
                  value={globalFilter ?? ""}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                  data-testid="input-global-search"
                />
              </div>
              <Button
                variant="outline"
                size="default"
                onClick={() => setColumnChooserOpen(true)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                data-testid="button-column-chooser"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const tenant = row.original;
                  return (
                    <Card 
                      key={tenant.id}
                      className="dark:bg-gray-800 dark:border-gray-700"
                      data-testid={`card-tenant-${tenant.id}`}
                    >
                      <CardContent className="p-4 dark:text-gray-200">
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
            <div className="hidden md:block rounded-md border dark:border-gray-700">
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
                        className="group"
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
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground dark:text-gray-400">
                  {table.getFilteredRowModel().rows.length} total records
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground dark:text-gray-400">Show</span>
                  <Select
                    value={String(table.getState().pagination.pageSize)}
                    onValueChange={(value) => table.setPageSize(Number(value))}
                  >
                    <SelectTrigger className="w-20 h-8 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" data-testid="select-page-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground dark:text-gray-400">rows</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Previous</span>
                </Button>
                <div className="text-sm whitespace-nowrap dark:text-gray-200">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
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

      {/* Bulk Change Plan Dialog */}
      <Dialog open={bulkPlanChangeDialogOpen} onOpenChange={setBulkPlanChangeDialogOpen}>
        <DialogContent data-testid="dialog-bulk-change-plan">
          <DialogHeader>
            <DialogTitle>Bulk Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Update the subscription plan for {selectedCount} selected tenant{selectedCount > 1 ? 's' : ''}. This will change their module access immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="plan-select-bulk">New Subscription Plan *</Label>
              <Select
                value={selectedBulkPlan}
                onValueChange={setSelectedBulkPlan}
                disabled={isLoadingPlans}
              >
                <SelectTrigger id="plan-select-bulk" data-testid="select-plan-bulk">
                  <SelectValue placeholder="Select a subscription plan" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id} data-testid={`option-plan-bulk-${plan.id}`}>
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
            {selectedBulkPlan && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-md">
                <div className="text-sm">
                  <strong>Selected Plan:</strong>{" "}
                  {subscriptionPlans.find(p => p.id === selectedBulkPlan)?.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  This plan will be applied to {selectedCount} tenant{selectedCount > 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkPlanChangeDialogOpen(false)}
              data-testid="button-cancel-bulk-change"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkPlanChange}
              disabled={changePlanMutation.isPending || !selectedBulkPlan}
              data-testid="button-confirm-bulk-change"
            >
              {changePlanMutation.isPending ? "Changing Plans..." : "Change Plans"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Chooser */}
      <ColumnChooser
        open={columnChooserOpen}
        onOpenChange={setColumnChooserOpen}
        columns={table.getAllColumns()}
        onApply={(visibility) => {
          setColumnVisibility(visibility);
        }}
        onReset={() => {
          setColumnVisibility({});
        }}
      />
    </div>
  );
}
