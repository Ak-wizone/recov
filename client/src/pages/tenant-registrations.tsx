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
} from "lucide-react";
import { format } from "date-fns";

interface TenantRow {
  id: string;
  businessName: string;
  email: string;
  city: string;
  planType: string;
  status: "pending" | "approved" | "rejected" | "active" | "inactive";
  isActive?: boolean;
  createdAt: string;
  isRegistrationRequest: boolean;
}

export default function TenantRegistrations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<TenantRow | null>(null);

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

  const handleDeleteTenant = () => {
    if (tenantToDelete) {
      deleteTenantMutation.mutate(tenantToDelete.id);
    }
  };

  // Combine requests and tenants into unified data
  const data: TenantRow[] = [
    ...(requests?.map(r => ({
      id: r.id,
      businessName: r.businessName,
      email: r.email,
      city: r.city,
      planType: r.planType,
      status: r.status,
      createdAt: r.createdAt,
      isRegistrationRequest: true,
    })) || []),
    ...(tenants?.map(t => ({
      id: t.id,
      businessName: t.businessName,
      email: t.email,
      city: t.city,
      planType: t.planType,
      status: t.isActive ? 'active' : 'inactive',
      isActive: t.isActive,
      createdAt: t.createdAt,
      isRegistrationRequest: false,
    })) || []),
  ];

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

  const columns: ColumnDef<TenantRow>[] = [
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
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const tenant = row.original;
        
        if (tenant.isRegistrationRequest && tenant.status === "pending") {
          return (
            <Button
              size="sm"
              onClick={() => approveMutation.mutate(tenant.id)}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid={`button-approve-${tenant.id}`}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve
            </Button>
          );
        }
        
        if (!tenant.isRegistrationRequest) {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  data-testid={`button-actions-${tenant.id}`}
                >
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => toggleStatusMutation.mutate(tenant.id)}
                  disabled={toggleStatusMutation.isPending}
                  data-testid={`menu-toggle-${tenant.id}`}
                >
                  {tenant.isActive ? (
                    <>
                      <ToggleRight className="mr-2 h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => resetPasswordMutation.mutate(tenant.id)}
                  disabled={resetPasswordMutation.isPending}
                  data-testid={`menu-reset-${tenant.id}`}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Reset Password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => sendCredentialsMutation.mutate(tenant.id)}
                  disabled={sendCredentialsMutation.isPending}
                  data-testid={`menu-send-${tenant.id}`}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send Credentials
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setTenantToDelete(tenant);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-red-600 focus:text-red-600"
                  data-testid={`menu-delete-${tenant.id}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Tenant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
    },
  });

  const pendingCount = data.filter(d => d.status === "pending").length;
  const activeCount = data.filter(d => d.status === "active").length;
  const inactiveCount = data.filter(d => d.status === "inactive").length;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Management</h1>
        <p className="text-muted-foreground mt-2">Manage tenant registrations and access control</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Inactive Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            Registration requests and active tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Filter by business name..."
                value={(table.getColumn("businessName")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("businessName")?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
                data-testid="input-filter-name"
              />
              <Input
                placeholder="Filter by email..."
                value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("email")?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
                data-testid="input-filter-email"
              />
              <Input
                placeholder="Filter by city..."
                value={(table.getColumn("city")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("city")?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
                data-testid="input-filter-city"
              />
            </div>

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
                        data-testid={`row-tenant-${row.original.id}`}
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

            <div className="flex items-center justify-between">
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
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm">
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
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
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
              This will permanently delete tenant{" "}
              <strong>{tenantToDelete?.businessName}</strong> and all their data
              including users, customers, invoices, receipts, and all other records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTenant}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteTenantMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
