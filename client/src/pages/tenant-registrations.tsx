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
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<TenantRow | null>(null);

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
  // Mutation.mutate functions are stable, so no dependencies needed
  const handleApprove = useCallback((tenantId: string) => {
    approveMutation.mutate(tenantId);
  }, []);

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

  // Combine requests and tenants into unified data - memoize to prevent re-renders
  const data = useMemo<TenantRow[]>(() => [
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
  ], [requests, tenants]);

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
        
        return (
          <div className="flex gap-2">
            {/* Pending registration request - show Approve and Reject buttons */}
            {tenant.isRegistrationRequest && tenant.status === "pending" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleApprove(tenant.id)}
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
            
            {/* Active/Inactive tenants - show full management buttons */}
            {!tenant.isRegistrationRequest && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleStatus(tenant.id)}
                  disabled={toggleStatusMutation.isPending}
                  data-testid={`button-toggle-${tenant.id}`}
                >
                  {tenant.isActive ? (
                    <><ToggleRight className="w-3 h-3 mr-1" />Deactivate</>
                  ) : (
                    <><ToggleLeft className="w-3 h-3 mr-1" />Activate</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResetPassword(tenant.id)}
                  disabled={resetPasswordMutation.isPending}
                  data-testid={`button-reset-${tenant.id}`}
                >
                  <KeyRound className="w-3 h-3 mr-1" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendCredentials(tenant.id)}
                  disabled={sendCredentialsMutation.isPending}
                  data-testid={`button-send-${tenant.id}`}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Send
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleOpenDeleteDialog(tenant)}
                  disabled={deleteTenantMutation.isPending}
                  data-testid={`button-delete-${tenant.id}`}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ], [handleApprove, handleToggleStatus, handleResetPassword, handleSendCredentials, handleOpenDeleteDialog, handleOpenRejectDialog]);

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
                    <Card key={tenant.id} data-testid={`card-tenant-${tenant.id}`}>
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

                          <div className="pt-2 border-t">
                            {/* Pending registration request - show Approve and Reject buttons */}
                            {tenant.isRegistrationRequest && tenant.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(tenant.id)}
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
    </div>
  );
}
