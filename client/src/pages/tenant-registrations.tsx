import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  Mail,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  FileText,
  Users,
  UserCheck,
  UserX,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface TenantRow {
  id: string;
  businessName: string;
  email: string;
  city: string;
  planType: string;
  status: "pending" | "approved" | "rejected" | "active" | "inactive";
  isActive?: boolean;
  createdAt: string;
  reviewedAt?: string;
  isRegistrationRequest: boolean;
}

interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  active: number;
  inactive: number;
}

export default function TenantRegistrations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Individual column filters
  const [businessNameFilter, setBusinessNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Redirect tenant users to dashboard - only platform admins can access this page
  useEffect(() => {
    if (user && user.tenantId) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Fetch registration requests
  const { data: requests, isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ['/api/registration-requests'],
  });

  // Fetch approved tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery<any[]>({
    queryKey: ['/api/tenants'],
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("POST", `/api/registration-requests/${requestId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tenant approved and welcome email sent",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
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

  // Combine requests and tenants into unified data
  const data: TenantRow[] = [
    ...(requests?.map(r => ({
      id: r.id,
      businessName: r.businessName,
      email: r.email,
      city: r.city,
      planType: r.planType,
      status: r.status as "pending" | "approved" | "rejected",
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      isRegistrationRequest: true,
    })) || []),
    ...(tenants?.map(t => ({
      id: t.id,
      businessName: t.businessName,
      email: t.email,
      city: t.city,
      planType: t.planType,
      status: (t.isActive ? 'active' : 'inactive') as "active" | "inactive",
      isActive: t.isActive,
      createdAt: t.createdAt,
      isRegistrationRequest: false,
    })) || []),
  ];

  // Calculate dashboard stats
  const stats: DashboardStats = {
    total: data.length,
    pending: data.filter(d => d.status === 'pending').length,
    approved: data.filter(d => d.status === 'approved').length,
    rejected: data.filter(d => d.status === 'rejected').length,
    active: data.filter(d => d.status === 'active').length,
    inactive: data.filter(d => d.status === 'inactive').length,
  };

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

  // Export to Excel
  const handleExport = () => {
    const exportData = data.map(row => ({
      "Business Name": row.businessName,
      "Email": row.email,
      "City": row.city,
      "Plan Type": getPlanTypeLabel(row.planType),
      "Status": row.status,
      "Created Date": format(new Date(row.createdAt), "PPpp"),
      "Reviewed Date": row.reviewedAt ? format(new Date(row.reviewedAt), "PPpp") : "N/A",
      "Type": row.isRegistrationRequest ? "Registration Request" : "Active Tenant",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, `tenant-registrations-${format(new Date(), "yyyy-MM-dd")}.xlsx`);

    toast({
      title: "Export Successful",
      description: "Tenant registrations exported to Excel",
    });
  };

  // Download sample template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Business Name": "Example Company Ltd",
        "Email": "example@company.com",
        "Business Address": "123 Main Street",
        "City": "Mumbai",
        "State": "Maharashtra",
        "Pincode": "400001",
        "PAN Number": "ABCDE1234F",
        "GST Number": "27ABCDE1234F1Z5",
        "Industry Type": "IT Services",
        "Plan Type": "6_months_demo",
        "Existing Accounting Software": "Tally",
        "Payment Method": "qr_code",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "tenant-registration-template.xlsx");

    toast({
      title: "Template Downloaded",
      description: "Fill the template and upload to import registrations",
    });
  };

  // Handle Excel import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/registration-requests/bulk-import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Import failed");
      }

      // Show detailed results
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.successCount} of ${result.totalRows} registrations. ${result.errorCount} errors.`,
        variant: result.errorCount > 0 ? "destructive" : "default",
      });

      // If there are errors, show them in a detailed toast
      if (result.errorCount > 0) {
        const errorDetails = result.errors.slice(0, 5).map((e: any) => 
          `Row ${e.row} (${e.email}): ${e.error}`
        ).join("\n");
        
        toast({
          title: "Import Errors",
          description: errorDetails + (result.errors.length > 5 ? `\n...and ${result.errors.length - 5} more errors` : ""),
          variant: "destructive",
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const columns: ColumnDef<TenantRow>[] = [
    {
      accessorKey: "businessName",
      header: ({ column }) => (
        <div className="flex flex-col space-y-2">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
            data-testid="sort-business-name"
          >
            Business Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
          <Input
            placeholder="Filter by business name..."
            value={businessNameFilter}
            onChange={(e) => {
              setBusinessNameFilter(e.target.value);
              column.setFilterValue(e.target.value);
            }}
            className="h-8 text-xs"
            data-testid="filter-business-name"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.original.businessName}</div>
      ),
    },
    {
      accessorKey: "email",
      header: () => (
        <div className="flex flex-col space-y-2">
          <div className="font-medium">Email</div>
          <Input
            placeholder="Filter by email..."
            value={emailFilter}
            onChange={(e) => {
              setEmailFilter(e.target.value);
              table.getColumn("email")?.setFilterValue(e.target.value);
            }}
            className="h-8 text-xs"
            data-testid="filter-email"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.email}</div>
      ),
    },
    {
      accessorKey: "city",
      header: () => (
        <div className="flex flex-col space-y-2">
          <div className="font-medium">City</div>
          <Input
            placeholder="Filter by city..."
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              table.getColumn("city")?.setFilterValue(e.target.value);
            }}
            className="h-8 text-xs"
            data-testid="filter-city"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.city}</div>
      ),
    },
    {
      accessorKey: "planType",
      header: () => (
        <div className="flex flex-col space-y-2">
          <div className="font-medium">Plan Type</div>
          <Input
            placeholder="Filter by plan..."
            onChange={(e) => {
              table.getColumn("planType")?.setFilterValue(e.target.value);
            }}
            className="h-8 text-xs"
            data-testid="filter-plan-type"
          />
        </div>
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">{getPlanTypeLabel(row.original.planType)}</Badge>
      ),
      filterFn: (row, id, value) => {
        if (!value) return true;
        const planLabel = getPlanTypeLabel(String(row.getValue(id))).toLowerCase();
        return planLabel.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "status",
      header: () => (
        <div className="flex flex-col space-y-2">
          <div className="font-medium">Status</div>
          <Input
            placeholder="Filter by status..."
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              table.getColumn("status")?.setFilterValue(e.target.value);
            }}
            className="h-8 text-xs"
            data-testid="filter-status"
          />
        </div>
      ),
      cell: ({ row }) => getStatusBadge(row.original.status),
      filterFn: (row, id, value) => {
        if (!value) return true;
        const status = String(row.getValue(id)).toLowerCase();
        return status.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
          data-testid="sort-created-date"
        >
          Created Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{format(new Date(row.original.createdAt), "PPp")}</div>
        </div>
      ),
    },
    {
      accessorKey: "reviewedAt",
      header: "Reviewed Date",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.reviewedAt ? (
            <div>{format(new Date(row.original.reviewedAt), "PPp")}</div>
          ) : (
            <span className="text-gray-400">Not reviewed</span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const tenant = row.original;
        
        if (tenant.isRegistrationRequest && tenant.status === "pending") {
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  approveMutation.mutate(tenant.id);
                }}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid={`button-approve-${tenant.id}`}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Approve
              </Button>
            </div>
          );
        }
        
        if (!tenant.isRegistrationRequest) {
          return (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStatusMutation.mutate(tenant.id);
                }}
                disabled={toggleStatusMutation.isPending}
                data-testid={`button-toggle-${tenant.id}`}
                title={tenant.isActive ? "Deactivate" : "Activate"}
              >
                {tenant.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  resetPasswordMutation.mutate(tenant.id);
                }}
                disabled={resetPasswordMutation.isPending}
                data-testid={`button-reset-${tenant.id}`}
                title="Reset Password"
              >
                <KeyRound className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  sendCredentialsMutation.mutate(tenant.id);
                }}
                disabled={sendCredentialsMutation.isPending}
                data-testid={`button-send-${tenant.id}`}
                title="Send Credentials Email"
              >
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          );
        }
        
        return null;
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (requestsLoading || tenantsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-sm text-gray-600">Loading tenant registrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Registrations</h1>
          <p className="text-gray-500 mt-1">Manage registration requests and active tenants</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            data-testid="button-download-template"
          >
            <FileText className="w-4 h-4 mr-2" />
            Download Template
          </Button>
          <Button
            variant="outline"
            onClick={() => document.getElementById('import-file-input')?.click()}
            disabled={isImporting}
            data-testid="button-import"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? "Importing..." : "Import from Excel"}
          </Button>
          <input
            id="import-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card data-testid="card-total">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All registrations</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card data-testid="card-approved">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Approved requests</p>
          </CardContent>
        </Card>

        <Card data-testid="card-rejected">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Rejected requests</p>
          </CardContent>
        </Card>

        <Card data-testid="card-active">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Active tenants</p>
          </CardContent>
        </Card>

        <Card data-testid="card-inactive">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">Inactive tenants</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Registrations</CardTitle>
          <CardDescription>
            {table.getFilteredRowModel().rows.length} registration{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
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
                      data-testid={`row-registration-${row.original.id}`}
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
                      No registrations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
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
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
