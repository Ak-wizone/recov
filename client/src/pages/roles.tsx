import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Role } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  FileDown,
  FileUp,
  Edit,
  Trash2,
  Shield,
  CheckSquare,
  Printer,
  ChevronDown,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import html2pdf from "html2pdf.js";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";

// Categorized dashboard cards for better organization
const DASHBOARD_CARD_CATEGORIES = [
  {
    category: "Business Overview",
    cards: [
      "Total Revenue",
      "Total Collections",
      "Total Outstanding",
      "Total Opening Balance",
      "Upcoming Invoices",
      "Due Today",
      "In Grace",
      "Overdue",
      "Paid On Time",
      "Paid Late",
      "Outstanding by Category",
      "Top 5 Customers by Revenue",
      "Top 5 Customers by Outstanding",
      "Overdue Invoices",
      "Recent Invoices",
      "Recent Receipts",
      "Customer Analytics",
    ]
  },
  {
    category: "Payment Tracking",
    cards: [
      "Alpha",
      "Beta",
      "Gamma",
      "Delta",
    ]
  },
  {
    category: "Risk & Recovery",
    cards: [
      "High Risk",
      "Medium Risk",
      "Low Risk",
    ]
  },
  {
    category: "Action Center",
    cards: [
      "Pending Tasks",
      "Overdue Tasks",
      "Priority Customers",
      "Collection Progress",
    ]
  }
];

const ACTION_PERMISSIONS = [
  { key: "canEmail", label: "Email" },
  { key: "canWhatsApp", label: "WhatsApp" },
  { key: "canSMS", label: "SMS" },
  { key: "canCall", label: "Call" },
  { key: "canReminder", label: "Reminder" },
  { key: "canShare", label: "Share" },
];

// Categorized modules for better organization and quick selection
const MODULE_CATEGORIES = [
  {
    category: "Dashboard & Analytics",
    modules: [
      {
        module: "Business Overview",
        operations: ["View"]
      },
      {
        module: "Customer Analytics",
        operations: ["View"]
      },
    ]
  },
  {
    category: "Sales & Quotations",
    modules: [
      {
        module: "Leads",
        operations: ["View", "Create", "Edit", "Delete", "Export", "Import", "Print"]
      },
      {
        module: "Quotations",
        operations: ["View", "Create", "Edit", "Delete", "Export", "Import", "Print"]
      },
      {
        module: "Proforma Invoices",
        operations: ["View", "Create", "Edit", "Delete", "Export", "Import", "Print"]
      },
    ]
  },
  {
    category: "Financial Management",
    modules: [
      {
        module: "Invoices",
        operations: ["View", "Create", "Edit", "Delete", "Export", "Import", "Print"]
      },
      {
        module: "Receipts",
        operations: ["View", "Create", "Edit", "Delete", "Export", "Import", "Print"]
      },
    ]
  },
  {
    category: "Payment Tracking",
    modules: [
      {
        module: "Debtors",
        operations: ["View", "Export", "Print"]
      },
      {
        module: "Ledger",
        operations: ["View", "Export", "Print"]
      },
      {
        module: "Credit Management",
        operations: ["View", "Export", "Print"]
      },
      {
        module: "Payment Analytics",
        operations: ["View", "Export", "Print"]
      },
    ]
  },
  {
    category: "Action Center & Team",
    modules: [
      {
        module: "Action Center",
        operations: ["View", "Create", "Edit", "Delete"]
      },
      {
        module: "Team Performance",
        operations: ["View", "Create", "Edit", "Delete"]
      },
    ]
  },
  {
    category: "Risk & Recovery",
    modules: [
      {
        module: "Risk Management - Client Risk Thermometer",
        operations: ["View"]
      },
      {
        module: "Risk Management - Payment Risk Forecaster",
        operations: ["View"]
      },
      {
        module: "Risk Management - Recovery Health Test",
        operations: ["View"]
      },
    ]
  },
  {
    category: "Credit Control",
    modules: [
      {
        module: "Credit Control",
        operations: ["View", "Create", "Edit", "Delete", "Export", "Import", "Print"]
      },
    ]
  },
  {
    category: "Masters",
    modules: [
      {
        module: "Masters - Customers",
        operations: ["View", "Create", "Edit", "Delete", "Export", "Import", "Print"]
      },
      {
        module: "Masters - Items",
        operations: ["View", "Create", "Edit", "Delete", "Export", "Import", "Print"]
      },
    ]
  },
  {
    category: "Settings & Administration",
    modules: [
      {
        module: "Company Profile",
        operations: ["View", "Edit"]
      },
      {
        module: "Settings",
        operations: ["View", "Edit"]
      },
      {
        module: "User Management",
        operations: ["View", "Create", "Edit", "Delete", "Export", "Import", "Print"]
      },
      {
        module: "Roles Management",
        operations: ["View", "Create", "Edit", "Delete", "Export", "Import", "Print"]
      },
      {
        module: "Communication Schedules",
        operations: ["View", "Create", "Edit", "Delete"]
      },
      {
        module: "Backup & Restore",
        operations: ["View", "Create", "Delete"]
      },
      {
        module: "Audit Logs",
        operations: ["View", "Export", "Print"]
      },
    ]
  },
  {
    category: "Integrations",
    modules: [
      {
        module: "Email/WhatsApp/Call Integrations",
        operations: ["View", "Edit"]
      },
    ]
  },
  {
    category: "Reports",
    modules: [
      {
        module: "Reports",
        operations: ["View", "Export", "Print"]
      },
    ]
  }
];

// Flatten for backward compatibility
const MODULES_WITH_PERMISSIONS = MODULE_CATEGORIES.flatMap(cat => cat.modules);

const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
  canViewGP: z.boolean().optional().default(true),
  allowedDashboardCards: z.array(z.string()).optional().default([]),
  actionPermissions: z.object({
    canEmail: z.boolean().optional().default(true),
    canWhatsApp: z.boolean().optional().default(true),
    canSMS: z.boolean().optional().default(true),
    canCall: z.boolean().optional().default(true),
    canReminder: z.boolean().optional().default(true),
    canShare: z.boolean().optional().default(true),
  }).optional().default({
    canEmail: true,
    canWhatsApp: true,
    canSMS: true,
    canCall: true,
    canReminder: true,
    canShare: true,
  }),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

export default function Roles() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  // Fetch allowed modules for current tenant
  const { data: allowedModules = [] } = useQuery<string[]>({
    queryKey: ["/api/tenants/allowed-modules"],
  });

  // Filter MODULE_CATEGORIES based on tenant's subscription
  const filteredModuleCategories = MODULE_CATEGORIES.map(category => ({
    ...category,
    modules: category.modules.filter(moduleConfig => {
      // If no modules loaded yet or tenant has all modules, show all
      if (allowedModules.length === 0) return true;
      
      // Check if the module is in the allowed list
      // Handle variations like "Masters - Customers" vs "Masters", "Risk Management - X" vs "Risk & Recovery"
      return allowedModules.some(allowedModule => {
        if (moduleConfig.module === allowedModule) return true;
        if (moduleConfig.module.startsWith("Masters") && allowedModule === "Masters") return true;
        if (moduleConfig.module.startsWith("Risk Management") && allowedModule === "Risk & Recovery") return true;
        return false;
      });
    })
  })).filter(category => category.modules.length > 0);

  // Flatten for backward compatibility
  const filteredModules = filteredModuleCategories.flatMap(cat => cat.modules);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: [],
      canViewGP: true,
      allowedDashboardCards: [],
      actionPermissions: {
        canEmail: true,
        canWhatsApp: true,
        canSMS: true,
        canCall: true,
        canReminder: true,
        canShare: true,
      },
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RoleFormValues) => {
      return await apiRequest("POST", "/api/roles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Success", description: "Role created successfully" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoleFormValues }) => {
      return await apiRequest("PUT", `/api/roles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Success", description: "Role updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Success", description: "Role deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await apiRequest("POST", "/api/roles/bulk-delete", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Success", description: "Roles deleted successfully" });
      setIsBulkDeleteDialogOpen(false);
      setBulkDeleteIds([]);
      setRowSelection({});
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/roles/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "roles.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Roles exported successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/roles/template");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "roles_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Template downloaded successfully" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/roles/import", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Success", description: "Roles imported successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    form.reset({
      name: "",
      description: "",
      permissions: [],
      canViewGP: true,
      allowedDashboardCards: [],
      actionPermissions: {
        canEmail: true,
        canWhatsApp: true,
        canSMS: true,
        canCall: true,
        canReminder: true,
        canShare: true,
      },
    });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    form.reset({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions,
      canViewGP: role.canViewGP !== undefined ? role.canViewGP : true,
      allowedDashboardCards: role.allowedDashboardCards || [],
      actionPermissions: {
        canEmail: role.canSendEmail !== undefined ? role.canSendEmail : true,
        canWhatsApp: role.canSendWhatsApp !== undefined ? role.canSendWhatsApp : true,
        canSMS: role.canSendSMS !== undefined ? role.canSendSMS : true,
        canCall: role.canTriggerCall !== undefined ? role.canTriggerCall : true,
        canReminder: role.canSendReminder !== undefined ? role.canSendReminder : true,
        canShare: role.canShareDocuments !== undefined ? role.canShareDocuments : true,
      },
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDelete = () => {
    const selectedIds = Object.keys(rowSelection);
    setBulkDeleteIds(selectedIds);
    setIsBulkDeleteDialogOpen(true);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
    event.target.value = "";
  };

  const handlePrint = () => {
    const printContent = document.createElement("div");
    printContent.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="text-align: center; margin-bottom: 20px;">Roles Report</h1>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Role Name</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Permissions</th>
            </tr>
          </thead>
          <tbody>
            ${roles
              .map(
                (role) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${role.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${role.description || ""}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${role.permissions.join(", ")}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    const opt = {
      margin: 10,
      filename: "roles_report.pdf",
      image: { type: "jpeg" as "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as "portrait" },
    };

    html2pdf().set(opt).from(printContent).save();
  };

  const totalRoles = roles.length;
  const totalPermissions = roles.reduce((acc, role) => acc + role.permissions.length, 0);

  const columns: ColumnDef<Role>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          data-testid="checkbox-select-all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          data-testid={`checkbox-select-${row.index}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Role Name",
      cell: ({ row }) => <div data-testid={`text-role-name-${row.index}`}>{row.original.name}</div>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <div data-testid={`text-description-${row.index}`}>{row.original.description || "-"}</div>,
    },
    {
      id: "permissionsCount",
      header: "Permissions",
      cell: ({ row }) => (
        <div data-testid={`text-permissions-count-${row.index}`}>
          {row.original.permissions.length} permissions
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          {hasPermission("Roles Management", "edit") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row.original)}
              data-testid={`button-edit-${row.index}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {hasPermission("Roles Management", "delete") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(row.original)}
              data-testid={`button-delete-${row.index}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: roles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      globalFilter,
      rowSelection,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const onSubmit = (data: RoleFormValues) => {
    if (isEditDialogOpen && selectedRole) {
      updateMutation.mutate({ id: selectedRole.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const selectedPermissions = form.watch("permissions") || [];
  const canViewGP = form.watch("canViewGP");
  const allowedDashboardCards = form.watch("allowedDashboardCards") || [];
  const actionPermissions = form.watch("actionPermissions") || {
    canEmail: true,
    canWhatsApp: true,
    canSMS: true,
    canCall: true,
    canReminder: true,
    canShare: true,
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Roles Management
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Roles</p>
                <p className="text-3xl font-bold" data-testid="text-total-roles">
                  {totalRoles}
                </p>
              </div>
              <Shield className="h-12 w-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Permissions</p>
                <p className="text-3xl font-bold" data-testid="text-total-permissions">
                  {totalPermissions}
                </p>
              </div>
              <CheckSquare className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4">
        {hasPermission("Roles Management", "create") && (
          <Button onClick={handleAdd} data-testid="button-add-role">
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        )}
        {hasPermission("Roles Management", "export") && (
          <Button variant="outline" onClick={() => exportMutation.mutate()} data-testid="button-export">
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
        {hasPermission("Roles Management", "import") && (
          <>
            <Button variant="outline" onClick={() => downloadTemplateMutation.mutate()} data-testid="button-download-template">
              <FileDown className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button variant="outline" onClick={() => document.getElementById("import-file-roles")?.click()} data-testid="button-import">
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Button>
            <input id="import-file-roles" type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          </>
        )}
        {hasPermission("Roles Management", "print") && (
          <Button variant="outline" onClick={handlePrint} data-testid="button-print">
            <Printer className="mr-2 h-4 w-4" />
            Print PDF
          </Button>
        )}
        {hasPermission("Roles Management", "delete") && Object.keys(rowSelection).length > 0 && (
          <Button variant="destructive" onClick={handleBulkDelete} data-testid="button-bulk-delete">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({Object.keys(rowSelection).length})
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <Input
          placeholder="Search roles..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
          data-testid="input-search"
        />

        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-muted/50">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="p-4 text-left font-medium">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b" data-testid={`row-role-${row.index}`}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center">
                    No roles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
            selected.
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              data-testid="button-previous-page"
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
      </div>

      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedRole(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {isEditDialogOpen ? "Edit Role" : "Add New Role"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Role Name *</Label>
              <Input id="name" {...form.register("name")} data-testid="input-name" />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...form.register("description")} data-testid="input-description" />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-base font-semibold">Permissions *</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select module operations, dashboard cards, and communication actions
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="grant-all" className="cursor-pointer text-sm font-medium">
                    Grant All Permissions
                  </Label>
                  <Switch
                    id="grant-all"
                    checked={
                      selectedPermissions.length === filteredModules.flatMap(m => m.operations.map(op => `${m.module} - ${op}`)).length &&
                      allowedDashboardCards.length === DASHBOARD_CARD_CATEGORIES.flatMap(c => c.cards).length &&
                      Object.values(actionPermissions).every(v => v === true)
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const allModulePermissions = filteredModules.flatMap(m => 
                          m.operations.map(op => `${m.module} - ${op}`)
                        );
                        const allDashboardCards = DASHBOARD_CARD_CATEGORIES.flatMap(c => c.cards);
                        form.setValue("permissions", allModulePermissions);
                        form.setValue("allowedDashboardCards", allDashboardCards);
                        form.setValue("actionPermissions", {
                          canEmail: true,
                          canWhatsApp: true,
                          canSMS: true,
                          canCall: true,
                          canReminder: true,
                          canShare: true,
                        });
                      } else {
                        form.setValue("permissions", []);
                        form.setValue("allowedDashboardCards", []);
                        form.setValue("actionPermissions", {
                          canEmail: false,
                          canWhatsApp: false,
                          canSMS: false,
                          canCall: false,
                          canReminder: false,
                          canShare: false,
                        });
                      }
                    }}
                    data-testid="switch-grant-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Module Permissions</h4>
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <Accordion type="multiple" className="w-full" defaultValue={filteredModuleCategories.map((_, i) => `category-${i}`)}>
                      {filteredModuleCategories.map((category, categoryIndex) => {
                        const categoryPermissions = category.modules.flatMap(m => 
                          m.operations.map(op => `${m.module} - ${op}`)
                        );
                        const allCategorySelected = categoryPermissions.every(p => selectedPermissions.includes(p));
                        
                        return (
                          <AccordionItem key={categoryIndex} value={`category-${categoryIndex}`}>
                            <AccordionTrigger className="px-4 hover:bg-muted/50">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-blue-500" />
                                  <span className="font-semibold text-sm">{category.category}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({category.modules.length} modules)
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant={allCategorySelected ? "secondary" : "outline"}
                                  size="sm"
                                  className="h-7 text-xs mr-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const current = selectedPermissions;
                                    if (allCategorySelected) {
                                      const updated = current.filter(p => !categoryPermissions.includes(p));
                                      form.setValue("permissions", updated);
                                    } else {
                                      const updated = Array.from(new Set([...current, ...categoryPermissions]));
                                      form.setValue("permissions", updated);
                                    }
                                  }}
                                  data-testid={`button-select-category-${category.category.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  {allCategorySelected ? "Deselect All" : "Select All"}
                                </Button>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="space-y-4">
                                {category.modules.map((moduleItem) => {
                                  const modulePermissions = moduleItem.operations.map(op => `${moduleItem.module} - ${op}`);
                                  const allModuleSelected = modulePermissions.every(p => selectedPermissions.includes(p));
                                  
                                  return (
                                    <div key={moduleItem.module} className="space-y-2 pl-2">
                                      <div className="flex items-center justify-between">
                                        <h5 className="font-medium text-sm">{moduleItem.module}</h5>
                                        <Button
                                          type="button"
                                          variant={allModuleSelected ? "secondary" : "ghost"}
                                          size="sm"
                                          className="h-6 text-xs"
                                          onClick={() => {
                                            const current = selectedPermissions;
                                            if (allModuleSelected) {
                                              const updated = current.filter(p => !modulePermissions.includes(p));
                                              form.setValue("permissions", updated);
                                            } else {
                                              const updated = Array.from(new Set([...current, ...modulePermissions]));
                                              form.setValue("permissions", updated);
                                            }
                                          }}
                                          data-testid={`button-select-module-${moduleItem.module.toLowerCase().replace(/\s+/g, "-")}`}
                                        >
                                          {allModuleSelected ? "Deselect All" : "Select All"}
                                        </Button>
                                      </div>
                                      <div className="grid grid-cols-4 gap-2 ml-4">
                                        {moduleItem.operations.map((operation) => {
                                          const permissionKey = `${moduleItem.module} - ${operation}`;
                                          return (
                                            <div key={operation} className="flex items-center space-x-2">
                                              <Checkbox
                                                id={`permission-${moduleItem.module}-${operation}`}
                                                checked={selectedPermissions.includes(permissionKey)}
                                                onCheckedChange={(checked) => {
                                                  const current = selectedPermissions;
                                                  const updated = checked
                                                    ? [...current, permissionKey]
                                                    : current.filter((p) => p !== permissionKey);
                                                  form.setValue("permissions", updated);
                                                }}
                                                data-testid={`checkbox-permission-${moduleItem.module.toLowerCase().replace(/\s+/g, "-")}-${operation.toLowerCase()}`}
                                              />
                                              <Label 
                                                htmlFor={`permission-${moduleItem.module}-${operation}`} 
                                                className="cursor-pointer text-xs"
                                              >
                                                {operation}
                                              </Label>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                  {form.formState.errors.permissions && (
                    <p className="text-sm text-red-500 mt-2">{form.formState.errors.permissions.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold">Field-Level Access Control</Label>
              <div className="mt-3 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewGP"
                    checked={canViewGP}
                    onCheckedChange={(checked) => {
                      form.setValue("canViewGP", !!checked);
                    }}
                    data-testid="checkbox-can-view-gp"
                  />
                  <Label htmlFor="canViewGP" className="cursor-pointer font-normal">
                    Can View Gross Profit (G.P.) in Invoices
                  </Label>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold">Dashboard Card Access</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Select which dashboard cards this role can view on Business Overview
              </p>
              <div className="space-y-4 max-h-64 overflow-y-auto border rounded-lg p-4">
                {DASHBOARD_CARD_CATEGORIES.map((cardCategory, index) => {
                  const allCategoryCardsSelected = cardCategory.cards.every(c => allowedDashboardCards.includes(c));
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-sm text-blue-600">{cardCategory.category}</h5>
                        <Button
                          type="button"
                          variant={allCategoryCardsSelected ? "secondary" : "ghost"}
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            const current = allowedDashboardCards;
                            if (allCategoryCardsSelected) {
                              const updated = current.filter(c => !cardCategory.cards.includes(c));
                              form.setValue("allowedDashboardCards", updated);
                            } else {
                              const updated = Array.from(new Set([...current, ...cardCategory.cards]));
                              form.setValue("allowedDashboardCards", updated);
                            }
                          }}
                          data-testid={`button-select-dashboard-category-${cardCategory.category.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {allCategoryCardsSelected ? "Deselect All" : "Select All"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 ml-4">
                        {cardCategory.cards.map((card) => (
                          <div key={card} className="flex items-center space-x-2">
                            <Checkbox
                              id={`dashboard-${card}`}
                              checked={allowedDashboardCards.includes(card)}
                              onCheckedChange={(checked) => {
                                const current = allowedDashboardCards;
                                const updated = checked
                                  ? [...current, card]
                                  : current.filter((c) => c !== card);
                                form.setValue("allowedDashboardCards", updated);
                              }}
                              data-testid={`checkbox-dashboard-${card.toLowerCase().replace(/\s+/g, "-")}`}
                            />
                            <Label htmlFor={`dashboard-${card}`} className="cursor-pointer text-xs font-normal">
                              {card}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold">Communication & Action Permissions</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Control which communication actions this role can perform
              </p>
              <div className="grid grid-cols-3 gap-3">
                {ACTION_PERMISSIONS.map((action) => (
                  <div key={action.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`action-${action.key}`}
                      checked={actionPermissions[action.key as keyof typeof actionPermissions]}
                      onCheckedChange={(checked) => {
                        form.setValue("actionPermissions", {
                          ...actionPermissions,
                          [action.key]: !!checked,
                        });
                      }}
                      data-testid={`checkbox-action-${action.key.toLowerCase()}`}
                    />
                    <Label htmlFor={`action-${action.key}`} className="cursor-pointer text-sm font-normal">
                      {action.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setSelectedRole(null);
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
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the role "{selectedRole?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRole && deleteMutation.mutate(selectedRole.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Roles?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {bulkDeleteIds.length} selected role(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(bulkDeleteIds)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-bulk-delete"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
