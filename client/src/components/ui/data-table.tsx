import { useState, useMemo, useEffect } from "react";
import {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
  RowSelectionState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ColumnChooser } from "@/components/ui/column-chooser";
import {
  loadTablePreferences,
  saveTablePreferences,
  clearTablePreferences,
} from "@/lib/table-utils";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  tableKey: string;
  onDeleteSelected?: (rows: TData[]) => void | Promise<void>;
  onExportSelected?: (rows: TData[]) => void | Promise<void>;
  onFiltersChange?: (filters: { globalFilter: string; columnFilters: ColumnFiltersState }) => void;
  onRowSelectionChange?: (selectedRowIds: string[]) => void;
  customBulkActions?: (selectedRows: TData[]) => React.ReactNode;
  customToolbarActions?: React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  defaultPageSize?: number;
  defaultColumnVisibility?: Record<string, boolean>;
  enableRowSelection?: boolean;
  enableBulkActions?: boolean;
  enableGlobalFilter?: boolean;
  enableColumnVisibility?: boolean;
  enableSorting?: boolean;
  enablePagination?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  tableKey,
  onDeleteSelected,
  onExportSelected,
  onFiltersChange,
  onRowSelectionChange,
  customBulkActions,
  customToolbarActions,
  isLoading = false,
  emptyMessage = "No data available.",
  defaultPageSize = 10,
  defaultColumnVisibility = {},
  enableRowSelection = true,
  enableBulkActions = true,
  enableGlobalFilter = true,
  enableColumnVisibility = true,
  enableSorting = true,
  enablePagination = true,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  const [columnChooserOpen, setColumnChooserOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const preferences = loadTablePreferences(tableKey);
    if (preferences) {
      if (preferences.columnVisibility) {
        setColumnVisibility(preferences.columnVisibility);
      }
      if (preferences.columnOrder && preferences.columnOrder.length > 0) {
        setColumnOrder(preferences.columnOrder);
      }
      if (preferences.pageSize) {
        setPagination((prev) => ({ ...prev, pageSize: preferences.pageSize }));
      }
    } else if (Object.keys(defaultColumnVisibility).length > 0) {
      setColumnVisibility(defaultColumnVisibility);
    }
  }, [tableKey]);

  useEffect(() => {
    const preferences = {
      columnVisibility,
      columnOrder,
      pageSize: pagination.pageSize,
    };
    saveTablePreferences(tableKey, preferences);
  }, [columnVisibility, columnOrder, pagination.pageSize, tableKey]);

  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({ globalFilter, columnFilters });
    }
  }, [globalFilter, columnFilters, onFiltersChange]);

  const columnsWithSelection = useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!enableRowSelection) return columns;

    const selectionColumn: ColumnDef<TData, TValue> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all rows"
          data-testid="checkbox-select-all-rows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          data-testid={`checkbox-select-row-${row.index}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnOrder,
      pagination,
      globalFilter,
      columnFilters,
    },
    enableRowSelection,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  useEffect(() => {
    if (onRowSelectionChange) {
      const selectedIds = selectedRows.map(row => (row.original as any).id);
      onRowSelectionChange(selectedIds);
    }
  }, [rowSelection, onRowSelectionChange, selectedRows]);

  const handleDeleteSelected = async () => {
    if (!onDeleteSelected || !hasSelection) return;
    setIsDeleting(true);
    try {
      const selectedData = selectedRows.map((row) => row.original);
      await onDeleteSelected(selectedData);
      setRowSelection({});
    } catch (error) {
      console.error("Error deleting selected rows:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportSelected = async () => {
    if (!onExportSelected || !hasSelection) return;
    setIsExporting(true);
    try {
      const selectedData = selectedRows.map((row) => row.original);
      await onExportSelected(selectedData);
    } catch (error) {
      console.error("Error exporting selected rows:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleColumnVisibilityApply = (newVisibility: Record<string, boolean>) => {
    setColumnVisibility(newVisibility);
  };

  const handleColumnVisibilityReset = () => {
    clearTablePreferences(tableKey);
    setColumnVisibility(defaultColumnVisibility);
    setColumnOrder([]);
    setPagination({ pageIndex: 0, pageSize: defaultPageSize });
  };

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: pagination.pageSize }).map((_, index) => (
        <TableRow key={index} data-testid={`skeleton-row-${index}`}>
          {columnsWithSelection.map((_, cellIndex) => (
            <TableCell key={cellIndex}>
              <Skeleton className="h-6 w-full" data-testid={`skeleton-cell-${index}-${cellIndex}`} />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (table.getRowModel().rows?.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={columnsWithSelection.length}
            className="h-24 text-center"
            data-testid="text-empty-state"
          >
            {emptyMessage}
          </TableCell>
        </TableRow>
      );
    }

    return table.getRowModel().rows.map((row) => (
      <TableRow
        key={row.id}
        data-state={row.getIsSelected() && "selected"}
        data-testid={`row-${row.id}`}
        className="hover:bg-muted/50 transition-colors duration-150 cursor-pointer"
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id} data-testid={`cell-${row.id}-${cell.column.id}`}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {enableGlobalFilter && (
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search all columns..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 pr-9"
                data-testid="input-global-search"
                aria-label="Search table"
              />
              {globalFilter && (
                <button
                  onClick={() => setGlobalFilter("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {customToolbarActions && (
            <div className="flex flex-wrap gap-2">
              {customToolbarActions}
            </div>
          )}
          {enableColumnVisibility && (
            <Button
              variant="outline"
              onClick={() => setColumnChooserOpen(true)}
              className="flex-1 sm:flex-initial"
              data-testid="button-column-visibility"
              aria-label="Toggle column visibility"
            >
              <Eye className="h-4 w-4" />
              Columns
            </Button>
          )}
        </div>
      </div>
      {enableBulkActions && hasSelection && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-pastel-blue-icon/20 text-[#ffffff] bg-[#1ab7ff]">
          <span className="text-sm font-medium" data-testid="text-selected-count">
            {selectedRows.length} row(s) selected
          </span>
          <div className="flex gap-2 ml-auto">
            {customBulkActions && customBulkActions(selectedRows.map((row) => row.original))}
            {onExportSelected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSelected}
                disabled={isExporting}
                data-testid="button-export-selected"
                aria-label="Export selected rows"
              >
                <Download className="h-4 w-4" />
                {isExporting ? "Exporting..." : "Export"}
              </Button>
            )}
            {onDeleteSelected && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                data-testid="button-delete-selected"
                aria-label="Delete selected rows"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="rounded-md border bg-card">
        <style>{`
          .scrollbar-horizontal::-webkit-scrollbar,
          .scrollbar-vertical::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }
          .scrollbar-horizontal::-webkit-scrollbar-track,
          .scrollbar-vertical::-webkit-scrollbar-track {
            background: rgb(243 244 246);
            border-radius: 6px;
          }
          .scrollbar-horizontal::-webkit-scrollbar-thumb,
          .scrollbar-vertical::-webkit-scrollbar-thumb {
            background: rgb(156 163 175);
            border-radius: 6px;
            border: 2px solid rgb(243 244 246);
          }
          .scrollbar-horizontal::-webkit-scrollbar-thumb:hover,
          .scrollbar-vertical::-webkit-scrollbar-thumb:hover {
            background: rgb(107 114 128);
          }
          .dark .scrollbar-horizontal::-webkit-scrollbar-track,
          .dark .scrollbar-vertical::-webkit-scrollbar-track {
            background: rgb(31 41 55);
          }
          .dark .scrollbar-horizontal::-webkit-scrollbar-thumb,
          .dark .scrollbar-vertical::-webkit-scrollbar-thumb {
            background: rgb(75 85 99);
            border-color: rgb(31 41 55);
          }
          .dark .scrollbar-horizontal::-webkit-scrollbar-thumb:hover,
          .dark .scrollbar-vertical::-webkit-scrollbar-thumb:hover {
            background: rgb(107 114 128);
          }
        `}</style>
        {/* Outer container for horizontal scrolling - scrollbar stays at bottom of visible area */}
        <div 
          className="relative overflow-x-auto scrollbar-horizontal"
          style={{
            scrollbarWidth: "auto",
            scrollbarColor: "rgb(156 163 175) transparent"
          }}
        >
          {/* Inner container - no vertical scroll, table expands naturally */}
          <div 
            className="relative"
          >
            <Table className="min-w-max relative">
              <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b-2 border-gray-300 dark:border-gray-600">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();

                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          canSort && "cursor-pointer select-none",
                          "sticky top-0 z-20 whitespace-nowrap font-semibold py-2 bg-[#F1F5F9] dark:bg-gray-800"
                        )}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        data-testid={`header-${header.id}`}
                        aria-sort={
                          sortDirection === "asc"
                            ? "ascending"
                            : sortDirection === "desc"
                            ? "descending"
                            : "none"
                        }
                      >
                        <div className="flex items-center gap-2">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          {canSort && enableSorting && (
                            <ArrowUpDown
                              className={cn(
                                "h-4 w-4 transition-all",
                                sortDirection && "text-primary",
                                sortDirection === "desc" && "rotate-180"
                              )}
                              data-testid={`sort-icon-${header.id}`}
                            />
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
              {/* Column Filter Row */}
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={`filter-${headerGroup.id}`} className="border-b">
                  {headerGroup.headers.map((header) => {
                    const canFilter = header.column.getCanFilter();
                    const columnFilterValue = header.column.getFilterValue();

                    return (
                      <TableHead key={`filter-${header.id}`} className="sticky top-[48px] z-20 py-2 bg-white dark:bg-gray-900">
                        {canFilter && header.column.id !== "select" ? (
                          <Input
                            type="text"
                            placeholder={`Search ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header.toLowerCase() : ''}...`}
                            value={(columnFilterValue ?? "") as string}
                            onChange={(e) => header.column.setFilterValue(e.target.value)}
                            className="h-10"
                            data-testid={`input-filter-${header.id}`}
                          />
                        ) : null}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>{renderTableBody()}</TableBody>
          </Table>
          </div>
        </div>
      </div>
      {enablePagination && !isLoading && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground" data-testid="text-pagination-info">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[100px]" data-testid="select-page-size">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 25, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`} data-testid={`option-page-size-${pageSize}`}>
                    {pageSize} rows
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              data-testid="button-first-page"
              aria-label="Go to first page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              data-testid="button-previous-page"
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              data-testid="button-next-page"
              aria-label="Go to next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              data-testid="button-last-page"
              aria-label="Go to last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {enableColumnVisibility && (
        <ColumnChooser
          open={columnChooserOpen}
          onOpenChange={setColumnChooserOpen}
          columns={table.getAllColumns()}
          onApply={handleColumnVisibilityApply}
          onReset={handleColumnVisibilityReset}
          defaultColumnVisibility={defaultColumnVisibility}
        />
      )}
    </div>
  );
}
