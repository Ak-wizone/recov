import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Invoice } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2, Search, Calendar } from "lucide-react";
import { Link } from "wouter";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UpdateGP() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editedGPValues, setEditedGPValues] = useState<Record<string, string>>({});
  const [editedPTValues, setEditedPTValues] = useState<Record<string, string>>({});
  const [savingGPIds, setSavingGPIds] = useState<Set<string>>(new Set());
  const [savingPTIds, setSavingPTIds] = useState<Set<string>>(new Set());
  const [dateFilterMode, setDateFilterMode] = useState<"month" | "allTime" | "dateRange">("allTime");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [dateRangeFrom, setDateRangeFrom] = useState("");
  const [dateRangeTo, setDateRangeTo] = useState("");

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  // GP Update Mutation
  const updateGPMutation = useMutation({
    mutationFn: async ({ id, gp }: { id: string; gp: string }) => {
      const response = await apiRequest("PUT", `/api/invoices/${id}`, { gp });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setSavingGPIds(prev => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
      setEditedGPValues(prev => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      toast({
        title: "Saved",
        description: "GP value updated successfully",
      });
    },
    onError: (error: Error, variables) => {
      setSavingGPIds(prev => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Payment Terms Update Mutation
  const updatePTMutation = useMutation({
    mutationFn: async ({ id, paymentTermsOverride }: { id: string; paymentTermsOverride: number | null }) => {
      const response = await apiRequest("PUT", `/api/invoices/${id}`, { paymentTermsOverride });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setSavingPTIds(prev => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
      setEditedPTValues(prev => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      toast({
        title: "Saved",
        description: "Payment Terms updated (will not change on sync)",
      });
    },
    onError: (error: Error, variables) => {
      setSavingPTIds(prev => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGPChange = (id: string, value: string) => {
    setEditedGPValues(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const handlePTChange = (id: string, value: string) => {
    setEditedPTValues(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSaveGP = (id: string, originalGP: string | null) => {
    const gpValue = editedGPValues[id];
    if (gpValue === undefined) return;
    
    const originalValue = originalGP ?? "";
    const trimmedValue = gpValue.trim();
    
    if (trimmedValue === originalValue || trimmedValue === "") {
      setEditedGPValues(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (trimmedValue === "" && originalValue !== "") {
        toast({
          title: "GP value cannot be empty",
          description: "The original value has been restored",
          variant: "destructive",
        });
      }
      return;
    }
    
    setSavingGPIds(prev => new Set(prev).add(id));
    updateGPMutation.mutate({ id, gp: trimmedValue });
  };

  const handleSavePT = (id: string, originalPT: number | null, overridePT: number | null) => {
    const ptValue = editedPTValues[id];
    if (ptValue === undefined) return;
    
    const currentValue = overridePT ?? originalPT;
    const trimmedValue = ptValue.trim();
    
    // If empty, restore original
    if (trimmedValue === "") {
      setEditedPTValues(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    
    const newValue = parseInt(trimmedValue, 10);
    if (isNaN(newValue) || newValue < 0) {
      toast({
        title: "Invalid value",
        description: "Payment terms must be a valid positive number",
        variant: "destructive",
      });
      setEditedPTValues(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    
    if (newValue === currentValue) {
      setEditedPTValues(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    
    setSavingPTIds(prev => new Set(prev).add(id));
    updatePTMutation.mutate({ id, paymentTermsOverride: newValue });
  };

  const handleGPKeyDown = (e: React.KeyboardEvent, id: string, originalGP: string | null) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveGP(id, originalGP);
    }
  };

  const handlePTKeyDown = (e: React.KeyboardEvent, id: string, originalPT: number | null, overridePT: number | null) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSavePT(id, originalPT, overridePT);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    // Date filter
    let passesDateFilter = true;
    const invoiceDate = new Date(invoice.invoiceDate);
    
    if (!isNaN(invoiceDate.getTime())) {
      if (dateFilterMode === "month") {
        // Ensure valid year and month values
        const year = !isNaN(selectedYear) && selectedYear > 0 ? selectedYear : new Date().getFullYear();
        const month = !isNaN(selectedMonth) && selectedMonth >= 0 && selectedMonth <= 11 ? selectedMonth : new Date().getMonth();
        
        const monthStart = startOfMonth(new Date(year, month));
        const monthEnd = endOfMonth(new Date(year, month));
        if (invoiceDate < monthStart || invoiceDate > monthEnd) passesDateFilter = false;
      } else if (dateFilterMode === "dateRange") {
        if (dateRangeFrom || dateRangeTo) {
          const fromDate = dateRangeFrom ? new Date(dateRangeFrom) : new Date(0);
          const toDate = dateRangeTo ? new Date(dateRangeTo) : new Date();
          toDate.setHours(23, 59, 59, 999);
          
          // If from > to (inverted range), don't apply date filter but still apply search
          const isValidRange = !(dateRangeFrom && dateRangeTo && fromDate > toDate);
          if (isValidRange && (invoiceDate < fromDate || invoiceDate > toDate)) {
            passesDateFilter = false;
          }
        }
      }
      // allTime mode: passesDateFilter remains true
    }
    
    if (!passesDateFilter) return false;
    
    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(query) ||
      invoice.customerName.toLowerCase().includes(query) ||
      (invoice.remarks && invoice.remarks.toLowerCase().includes(query))
    );
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(num || 0);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Helper to get effective payment terms (override takes priority)
  const getEffectivePaymentTerms = (invoice: Invoice) => {
    return (invoice as any).paymentTermsOverride ?? invoice.paymentTerms;
  };

  const hasPaymentTermsOverride = (invoice: Invoice) => {
    return (invoice as any).paymentTermsOverride !== null && (invoice as any).paymentTermsOverride !== undefined;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="outline" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number, customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-[350px]"
              data-testid="input-search"
            />
          </div>
          
          {/* Date Filter Dropdown */}
          <Select
            value={dateFilterMode}
            onValueChange={(value: "month" | "allTime" | "dateRange") => {
              setDateFilterMode(value);
              // Reset date range when switching modes to avoid stale filtering
              if (value !== "dateRange") {
                setDateRangeFrom("");
                setDateRangeTo("");
              }
              // Reset to current month/year when switching to month mode
              if (value === "month") {
                setSelectedYear(new Date().getFullYear());
                setSelectedMonth(new Date().getMonth());
              }
            }}
          >
            <SelectTrigger className="w-[140px]" data-testid="select-date-filter">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allTime">All Time</SelectItem>
              <SelectItem value="month">By Month</SelectItem>
              <SelectItem value="dateRange">Date Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Month/Year selectors - Show only when dateFilterMode is "month" */}
          {dateFilterMode === "month" && (
            <>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => {
                  const parsed = parseInt(value, 10);
                  if (!isNaN(parsed) && parsed >= 0 && parsed <= 11) {
                    setSelectedMonth(parsed);
                  }
                }}
              >
                <SelectTrigger className="w-[130px]" data-testid="select-month">
                  <SelectValue placeholder={months[selectedMonth]} />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={month} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => {
                  const parsed = parseInt(value, 10);
                  if (!isNaN(parsed) && parsed > 0) {
                    setSelectedYear(parsed);
                  }
                }}
              >
                <SelectTrigger className="w-[100px]" data-testid="select-year">
                  <SelectValue placeholder={selectedYear.toString()} />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {/* Date Range Inputs - Show only when dateFilterMode is "dateRange" */}
          {dateFilterMode === "dateRange" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRangeFrom}
                onChange={(e) => setDateRangeFrom(e.target.value)}
                className="w-[150px]"
                data-testid="input-date-from"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateRangeTo}
                onChange={(e) => setDateRangeTo(e.target.value)}
                className="w-[150px]"
                data-testid="input-date-to"
              />
            </div>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Invoice No</TableHead>
                  <TableHead className="font-semibold">Customer Name</TableHead>
                  <TableHead className="font-semibold">Invoice Date</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-center w-[120px]">G.P.</TableHead>
                  <TableHead className="font-semibold text-center w-[140px]">Payment Terms</TableHead>
                  <TableHead className="font-semibold w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="mt-2 text-muted-foreground">Loading invoices...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const currentGP = editedGPValues[invoice.id] ?? invoice.gp ?? "";
                    const hasGPChanges = editedGPValues[invoice.id] !== undefined && editedGPValues[invoice.id] !== (invoice.gp ?? "");
                    const isSavingGP = savingGPIds.has(invoice.id);
                    
                    const effectivePT = getEffectivePaymentTerms(invoice);
                    const currentPT = editedPTValues[invoice.id] ?? (effectivePT?.toString() ?? "");
                    const hasPTChanges = editedPTValues[invoice.id] !== undefined && editedPTValues[invoice.id] !== (effectivePT?.toString() ?? "");
                    const isSavingPT = savingPTIds.has(invoice.id);
                    const hasOverride = hasPaymentTermsOverride(invoice);
                    
                    const hasAnyChanges = hasGPChanges || hasPTChanges;
                    const isSavingAny = isSavingGP || isSavingPT;
                    
                    // Row highlight class:
                    // - Unsaved changes: mint green
                    // - Saved manual override: light orange/peach
                    let rowClassName = "";
                    if (hasAnyChanges) {
                      rowClassName = "bg-emerald-50 dark:bg-emerald-900/20 transition-colors duration-300";
                    } else if (hasOverride) {
                      rowClassName = "bg-amber-50 dark:bg-amber-900/20";  // Saved manual override
                    }
                    
                    return (
                      <TableRow key={invoice.id} className={rowClassName} data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell className="font-medium" data-testid={`text-invoice-no-${invoice.id}`}>
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell data-testid={`text-customer-name-${invoice.id}`}>
                          {invoice.customerName}
                        </TableCell>
                        <TableCell data-testid={`text-invoice-date-${invoice.id}`}>
                          {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right font-medium" data-testid={`text-amount-${invoice.id}`}>
                          {formatCurrency(invoice.invoiceAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="text"
                            value={currentGP}
                            onChange={(e) => handleGPChange(invoice.id, e.target.value)}
                            onKeyDown={(e) => handleGPKeyDown(e, invoice.id, invoice.gp)}
                            onBlur={() => {
                              if (hasGPChanges) {
                                handleSaveGP(invoice.id, invoice.gp);
                              }
                            }}
                            className="w-[100px] text-center mx-auto"
                            placeholder="GP"
                            disabled={isSavingGP}
                            data-testid={`input-gp-${invoice.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-1">
                              <Input
                                type="text"
                                value={currentPT}
                                onChange={(e) => handlePTChange(invoice.id, e.target.value)}
                                onKeyDown={(e) => handlePTKeyDown(e, invoice.id, invoice.paymentTerms, (invoice as any).paymentTermsOverride)}
                                onBlur={() => {
                                  if (hasPTChanges) {
                                    handleSavePT(invoice.id, invoice.paymentTerms, (invoice as any).paymentTermsOverride);
                                  }
                                }}
                                className={`w-[70px] text-center ${hasOverride ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : ''}`}
                                placeholder="Days"
                                disabled={isSavingPT}
                                data-testid={`input-pt-${invoice.id}`}
                              />
                              <span className="text-xs text-muted-foreground">days</span>
                            </div>
                            {hasOverride && (
                              <span className="text-[10px] text-orange-600 dark:text-orange-400">Manual</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasAnyChanges && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (hasGPChanges) handleSaveGP(invoice.id, invoice.gp);
                                if (hasPTChanges) handleSavePT(invoice.id, invoice.paymentTerms, (invoice as any).paymentTermsOverride);
                              }}
                              disabled={isSavingAny}
                              data-testid={`button-save-${invoice.id}`}
                            >
                              {isSavingAny ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
