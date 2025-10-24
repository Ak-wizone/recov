import { useState, useEffect } from "react";
import { Quotation } from "@shared/schema";
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
import { Edit, Trash2, ChevronUp, ChevronDown, Settings2, Printer, Mail, Download, Phone } from "lucide-react";
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

interface QuotationTableProps {
  quotations: Quotation[];
  isLoading: boolean;
  onEdit: (quotation: Quotation) => void;
  onDelete: (quotation: Quotation) => void;
  onBulkDelete?: (ids: string[]) => void;
  onPrint?: (quotation: Quotation) => void;
  onDownloadPDF?: (quotation: Quotation) => void;
  onEmail?: (quotation: Quotation) => void;
  onWhatsApp?: (quotation: Quotation) => void;
  onCall?: (quotation: Quotation) => void;
}

export function QuotationTable({
  quotations,
  isLoading,
  onEdit,
  onDelete,
  onBulkDelete,
  onPrint,
  onDownloadPDF,
  onEmail,
  onWhatsApp,
  onCall,
}: QuotationTableProps) {
  const [sortField, setSortField] = useState<keyof Quotation | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('quotations-table-columns');
    return stored ? JSON.parse(stored) : {
      quotationNumber: true,
      quotationDate: true,
      validUntil: true,
      leadName: true,
      leadEmail: false,
      leadMobile: false,
      grandTotal: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('quotations-table-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const columns = [
    { id: 'quotationNumber', label: 'Quotation #' },
    { id: 'quotationDate', label: 'Date' },
    { id: 'validUntil', label: 'Valid Until' },
    { id: 'leadName', label: 'Lead Name' },
    { id: 'leadEmail', label: 'Email' },
    { id: 'leadMobile', label: 'Mobile' },
    { id: 'grandTotal', label: 'Grand Total (₹)' },
  ];
  
  const [quotationNumberSearch, setQuotationNumberSearch] = useState("");
  const [leadNameSearch, setLeadNameSearch] = useState("");

  const toggleSort = (field: keyof Quotation) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === quotations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(quotations.map(q => q.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  let filteredQuotations = [...quotations];

  if (quotationNumberSearch) {
    filteredQuotations = filteredQuotations.filter(q =>
      q.quotationNumber.toLowerCase().includes(quotationNumberSearch.toLowerCase())
    );
  }

  if (leadNameSearch) {
    filteredQuotations = filteredQuotations.filter(q =>
      q.leadName.toLowerCase().includes(leadNameSearch.toLowerCase())
    );
  }

  if (sortField) {
    filteredQuotations.sort((a, b) => {
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
  const paginatedQuotations = filteredQuotations.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredQuotations.length / pageSize);

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

      <div className="rounded-md border bg-white dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedIds.length === quotations.length && quotations.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              {visibleColumns.quotationNumber && (
                <TableHead>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort("quotationNumber")}
                      className="h-8 px-2 justify-start font-semibold hover:bg-transparent"
                    >
                      Quotation #
                      {sortField === "quotationNumber" && (
                        sortDirection === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                    <Input
                      placeholder="Search..."
                      value={quotationNumberSearch}
                      onChange={(e) => setQuotationNumberSearch(e.target.value)}
                      className="h-8"
                      data-testid="input-search-quotation-number"
                    />
                  </div>
                </TableHead>
              )}
              {visibleColumns.quotationDate && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("quotationDate")}
                    className="h-8 px-2 justify-start font-semibold hover:bg-transparent"
                  >
                    Date
                    {sortField === "quotationDate" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              )}
              {visibleColumns.validUntil && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("validUntil")}
                    className="h-8 px-2 justify-start font-semibold hover:bg-transparent"
                  >
                    Valid Until
                    {sortField === "validUntil" && (
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
                      Lead Name
                      {sortField === "leadName" && (
                        sortDirection === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                    <Input
                      placeholder="Search..."
                      value={leadNameSearch}
                      onChange={(e) => setLeadNameSearch(e.target.value)}
                      className="h-8"
                      data-testid="input-search-lead-name"
                    />
                  </div>
                </TableHead>
              )}
              {visibleColumns.leadEmail && <TableHead>Email</TableHead>}
              {visibleColumns.leadMobile && <TableHead>Mobile</TableHead>}
              {visibleColumns.grandTotal && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("grandTotal")}
                    className="h-8 px-2 justify-start font-semibold hover:bg-transparent"
                  >
                    Grand Total (₹)
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
            {paginatedQuotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="text-center py-8 text-muted-foreground">
                  No quotations found
                </TableCell>
              </TableRow>
            ) : (
              paginatedQuotations.map((quotation) => (
                <TableRow key={quotation.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-quotation-${quotation.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(quotation.id)}
                      onCheckedChange={() => toggleSelect(quotation.id)}
                      data-testid={`checkbox-select-${quotation.id}`}
                    />
                  </TableCell>
                  {visibleColumns.quotationNumber && (
                    <TableCell className="font-medium" data-testid={`text-quotation-number-${quotation.id}`}>
                      {quotation.quotationNumber}
                    </TableCell>
                  )}
                  {visibleColumns.quotationDate && (
                    <TableCell data-testid={`text-quotation-date-${quotation.id}`}>
                      {formatDate(quotation.quotationDate)}
                    </TableCell>
                  )}
                  {visibleColumns.validUntil && (
                    <TableCell data-testid={`text-valid-until-${quotation.id}`}>
                      {formatDate(quotation.validUntil)}
                    </TableCell>
                  )}
                  {visibleColumns.leadName && (
                    <TableCell data-testid={`text-lead-name-${quotation.id}`}>
                      {quotation.leadName}
                    </TableCell>
                  )}
                  {visibleColumns.leadEmail && <TableCell>{quotation.leadEmail}</TableCell>}
                  {visibleColumns.leadMobile && <TableCell>{quotation.leadMobile}</TableCell>}
                  {visibleColumns.grandTotal && (
                    <TableCell className="font-semibold" data-testid={`text-grand-total-${quotation.id}`}>
                      ₹{formatCurrency(quotation.grandTotal)}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onPrint && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPrint(quotation)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          data-testid={`button-print-${quotation.id}`}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      )}
                      {onDownloadPDF && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownloadPDF(quotation)}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          data-testid={`button-download-pdf-${quotation.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {onEmail && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEmail(quotation)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          data-testid={`button-email-${quotation.id}`}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      {onCall && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCall(quotation)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          data-testid={`button-call-${quotation.id}`}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                      {onWhatsApp && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onWhatsApp(quotation)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          data-testid={`button-whatsapp-${quotation.id}`}
                        >
                          <FaWhatsapp className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(quotation)}
                        data-testid={`button-edit-${quotation.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(quotation)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-${quotation.id}`}
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
