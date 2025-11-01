import { useState, useEffect } from "react";
import { ProformaInvoice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Trash2, ChevronUp, ChevronDown, Settings2, Printer, Mail, Download } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";

interface ProformaInvoiceTableProps {
  invoices: ProformaInvoice[];
  isLoading: boolean;
  onDelete: (invoice: ProformaInvoice) => void;
  onBulkDelete?: (ids: string[]) => void;
  onPrint?: (invoice: ProformaInvoice) => void;
  onDownloadPDF?: (invoice: ProformaInvoice) => void;
  onEmail?: (invoice: ProformaInvoice) => void;
  onWhatsApp?: (invoice: ProformaInvoice) => void;
  onCall?: (invoice: ProformaInvoice) => void;
}

export function ProformaInvoiceTable({
  invoices,
  isLoading,
  onDelete,
  onBulkDelete,
  onPrint,
  onDownloadPDF,
  onEmail,
  onWhatsApp,
  onCall,
}: ProformaInvoiceTableProps) {
  const { canPerformAction } = useAuth();
  const [sortField, setSortField] = useState<keyof ProformaInvoice | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('proforma-invoices-table-columns');
    return stored ? JSON.parse(stored) : {
      invoiceNumber: true,
      invoiceDate: true,
      dueDate: true,
      leadName: true,
      grandTotal: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('proforma-invoices-table-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const columns = [
    { id: 'invoiceNumber', label: 'PI Number' },
    { id: 'invoiceDate', label: 'Invoice Date' },
    { id: 'dueDate', label: 'Due Date' },
    { id: 'leadName', label: 'Customer Name' },
    { id: 'grandTotal', label: 'Amount (₹)' },
  ];
  
  const [invoiceNumberSearch, setInvoiceNumberSearch] = useState("");
  const [customerNameSearch, setCustomerNameSearch] = useState("");

  const toggleSort = (field: keyof ProformaInvoice) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map(inv => inv.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  let filteredInvoices = [...invoices];

  if (invoiceNumberSearch) {
    filteredInvoices = filteredInvoices.filter(inv =>
      inv.invoiceNumber.toLowerCase().includes(invoiceNumberSearch.toLowerCase())
    );
  }

  if (customerNameSearch) {
    filteredInvoices = filteredInvoices.filter(inv =>
      inv.leadName.toLowerCase().includes(customerNameSearch.toLowerCase())
    );
  }

  if (sortField) {
    filteredInvoices.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredInvoices.length / pageSize);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: string | number) => {
    return parseFloat(amount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          {selectedIds.length > 0 && onBulkDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onBulkDelete(selectedIds);
                setSelectedIds([]);
              }}
              data-testid="button-bulk-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedIds.length})
            </Button>
          )}
        </div>
        
        <DropdownMenu open={isColumnChooserOpen} onOpenChange={setIsColumnChooserOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-column-chooser">
              <Settings2 className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={visibleColumns[column.id]}
                onCheckedChange={(checked) => 
                  setVisibleColumns(prev => ({ ...prev, [column.id]: checked }))
                }
                data-testid={`column-${column.id}`}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="bg-[#F1F5F9] dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedIds.length === invoices.length && invoices.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              {visibleColumns.invoiceNumber && (
                <TableHead>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort("invoiceNumber")}
                      className="h-8 px-2 justify-start font-semibold hover:bg-transparent"
                    >
                      PI Number
                      {sortField === "invoiceNumber" && (
                        sortDirection === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                    <Input
                      placeholder="Search..."
                      value={invoiceNumberSearch}
                      onChange={(e) => setInvoiceNumberSearch(e.target.value)}
                      className="h-8"
                      data-testid="input-search-invoice-number"
                    />
                  </div>
                </TableHead>
              )}
              {visibleColumns.invoiceDate && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("invoiceDate")}
                    className="h-8 px-2 justify-start font-semibold hover:bg-transparent"
                  >
                    Invoice Date
                    {sortField === "invoiceDate" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              )}
              {visibleColumns.dueDate && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("dueDate")}
                    className="h-8 px-2 justify-start font-semibold hover:bg-transparent"
                  >
                    Due Date
                    {sortField === "dueDate" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              )}
              {visibleColumns.leadName && (
                <TableHead>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort("leadName")}
                      className="h-8 px-2 justify-start font-semibold hover:bg-transparent"
                    >
                      Customer Name
                      {sortField === "leadName" && (
                        sortDirection === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                    <Input
                      placeholder="Search..."
                      value={customerNameSearch}
                      onChange={(e) => setCustomerNameSearch(e.target.value)}
                      className="h-8"
                      data-testid="input-search-customer-name"
                    />
                  </div>
                </TableHead>
              )}
              {visibleColumns.grandTotal && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("grandTotal")}
                    className="h-8 px-2 justify-start font-semibold hover:bg-transparent"
                  >
                    Amount (₹)
                    {sortField === "grandTotal" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              )}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="text-center py-8 text-muted-foreground">
                  No proforma invoices found
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-invoice-${invoice.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(invoice.id)}
                      onCheckedChange={() => toggleSelect(invoice.id)}
                      data-testid={`checkbox-select-${invoice.id}`}
                    />
                  </TableCell>
                  {visibleColumns.invoiceNumber && (
                    <TableCell className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>
                      {invoice.invoiceNumber}
                    </TableCell>
                  )}
                  {visibleColumns.invoiceDate && (
                    <TableCell data-testid={`text-invoice-date-${invoice.id}`}>
                      {formatDate(invoice.invoiceDate)}
                    </TableCell>
                  )}
                  {visibleColumns.dueDate && (
                    <TableCell data-testid={`text-due-date-${invoice.id}`}>
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                  )}
                  {visibleColumns.leadName && (
                    <TableCell data-testid={`text-customer-name-${invoice.id}`}>
                      {invoice.leadName}
                    </TableCell>
                  )}
                  {visibleColumns.grandTotal && (
                    <TableCell className="font-semibold" data-testid={`text-grand-total-${invoice.id}`}>
                      ₹{formatCurrency(invoice.grandTotal)}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onPrint && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPrint(invoice)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          data-testid={`button-print-${invoice.id}`}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      )}
                      {onDownloadPDF && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownloadPDF(invoice)}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          data-testid={`button-download-pdf-${invoice.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {onEmail && canPerformAction("canEmail") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEmail(invoice)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          data-testid={`button-email-${invoice.id}`}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      {onWhatsApp && canPerformAction("canWhatsApp") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onWhatsApp(invoice)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          data-testid={`button-whatsapp-${invoice.id}`}
                        >
                          <FaWhatsapp className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(invoice)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-${invoice.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={pageSize.toString()} onValueChange={(value) => {
            setPageSize(parseInt(value));
            setCurrentPage(0);
          }}>
            <SelectTrigger className="w-[100px]" data-testid="select-page-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
