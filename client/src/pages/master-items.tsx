import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type MasterItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, Upload, FileDown, Pencil, Trash2 } from "lucide-react";
import MasterItemFormDialog from "@/components/master-item-form-dialog";
import { ImportModal } from "@/components/import-modal";
import { DataTable } from "@/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";

export default function MasterItems() {
  const { toast } = useToast();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MasterItem | undefined>(undefined);
  const [globalFilter, setGlobalFilter] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: items = [], isLoading } = useQuery<MasterItem[]>({
    queryKey: ["/api/masters/items"],
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/masters/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/items"] });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: MasterItem) => {
    setSelectedItem(item);
    setFormDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteItemMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setSelectedItem(undefined);
    setFormDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/masters/items/export");
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "master_items_export.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Items exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export items",
        variant: "destructive",
      });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/masters/items/template");
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "master_items_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Template downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesType = itemTypeFilter === "all" || item.itemType === itemTypeFilter;
    const matchesStatus = statusFilter === "all" || item.isActive === statusFilter;
    const matchesSearch = globalFilter === "" || 
      item.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
      item.description?.toLowerCase().includes(globalFilter.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const productCount = items.filter(item => item.itemType === "product").length;
  const serviceCount = items.filter(item => item.itemType === "service").length;
  const activeCount = items.filter(item => item.isActive === "Active").length;
  const inactiveCount = items.filter(item => item.isActive === "Inactive").length;

  const columns = useMemo<ColumnDef<MasterItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Item Name",
        cell: ({ row }) => (
          <div className="font-medium" data-testid={`text-name-${row.original.id}`}>
            {row.original.name}
          </div>
        ),
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: "itemType",
        header: "Type",
        cell: ({ row }) => (
          <span 
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              row.original.itemType === "product"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
            }`}
            data-testid={`badge-type-${row.original.id}`}
          >
            {row.original.itemType === "product" ? "Product" : "Service"}
          </span>
        ),
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: "unit",
        header: "Unit",
        cell: ({ row }) => row.original.unit,
        enableSorting: true,
      },
      {
        accessorKey: "tax",
        header: "GST",
        cell: ({ row }) => (
          <span className="font-medium" data-testid={`text-tax-${row.original.id}`}>
            {row.original.tax}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "saleUnitPrice",
        header: "Sale Price",
        cell: ({ row }) => (
          <div className="font-medium" data-testid={`text-sale-price-${row.original.id}`}>
            ₹ {parseFloat(row.original.saleUnitPrice || "0").toFixed(2)}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "buyUnitPrice",
        header: "Buy Price",
        cell: ({ row }) => {
          const value = row.original.buyUnitPrice;
          return value ? (
            <div data-testid={`text-buy-price-${row.original.id}`}>
              ₹ {parseFloat(value).toFixed(2)}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "openingQuantity",
        header: "Opening Qty",
        cell: ({ row }) => {
          const value = row.original.openingQuantity;
          const itemType = row.original.itemType;
          return itemType === "product" && value ? (
            <span data-testid={`text-opening-qty-${row.original.id}`}>
              {parseFloat(value).toFixed(2)}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "hsn",
        header: "HSN",
        cell: ({ row }) => {
          const value = row.original.hsn;
          return value || <span className="text-muted-foreground">-</span>;
        },
        enableSorting: true,
      },
      {
        accessorKey: "sac",
        header: "SAC",
        cell: ({ row }) => {
          const value = row.original.sac;
          return value || <span className="text-muted-foreground">-</span>;
        },
        enableSorting: true,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
          const desc = row.original.description;
          return desc ? (
            <span className="text-sm text-muted-foreground truncate max-w-xs block">
              {desc}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              row.original.isActive === "Active"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            }`}
            data-testid={`badge-status-${row.original.id}`}
          >
            {row.original.isActive}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row.original)}
              data-testid={`button-edit-${row.original.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(row.original.id)}
              data-testid={`button-delete-${row.original.id}`}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
        enableHiding: false,
      },
    ],
    []
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Master Items</h1>
          <p className="text-muted-foreground mt-1">Manage your products and services</p>
        </div>
        <Button onClick={handleAddNew} className="gap-2" data-testid="button-add-item">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Filter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setItemTypeFilter("all")}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            itemTypeFilter === "all"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
          }`}
          data-testid="filter-all-types"
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{items.length}</div>
          <div className="text-sm text-muted-foreground mt-1">All Items</div>
        </button>

        <button
          onClick={() => setItemTypeFilter("product")}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            itemTypeFilter === "product"
              ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30"
              : "border-gray-200 dark:border-gray-700 hover:border-cyan-300"
          }`}
          data-testid="filter-products"
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{productCount}</div>
          <div className="text-sm text-muted-foreground mt-1">Products</div>
        </button>

        <button
          onClick={() => setItemTypeFilter("service")}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            itemTypeFilter === "service"
              ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
              : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
          }`}
          data-testid="filter-services"
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{serviceCount}</div>
          <div className="text-sm text-muted-foreground mt-1">Services</div>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === "Active" ? "all" : "Active")}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            statusFilter === "Active"
              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
              : "border-gray-200 dark:border-gray-700 hover:border-green-300"
          }`}
          data-testid="filter-active"
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeCount}</div>
          <div className="text-sm text-muted-foreground mt-1">Active</div>
        </button>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search items by name or description..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="gap-2"
            data-testid="button-download-template"
          >
            <FileDown className="h-4 w-4" />
            Template
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="gap-2"
            data-testid="button-import"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2"
            data-testid="button-export"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-hidden border rounded-lg">
        <DataTable
          columns={columns}
          data={filteredItems}
          isLoading={isLoading}
          tableKey="master-items"
          enableRowSelection={true}
          enableBulkActions={true}
          enableGlobalFilter={true}
          enableColumnVisibility={true}
        />
      </div>

      <MasterItemFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        item={selectedItem}
      />

      <ImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        module="items"
      />
    </div>
  );
}
