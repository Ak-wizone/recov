import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Invoice } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2, Search } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UpdateGP() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, gp }: { id: string; gp: string }) => {
      const response = await apiRequest("PUT", `/api/invoices/${id}`, { gp });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
      setEditedValues(prev => {
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
      setSavingIds(prev => {
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
    setEditedValues(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSaveGP = (id: string, originalGP: string | null) => {
    const gpValue = editedValues[id];
    if (gpValue === undefined) return;
    
    const originalValue = originalGP ?? "";
    const trimmedValue = gpValue.trim();
    
    if (trimmedValue === originalValue || trimmedValue === "") {
      setEditedValues(prev => {
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
    
    setSavingIds(prev => new Set(prev).add(id));
    updateMutation.mutate({ id, gp: trimmedValue });
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, originalGP: string | null) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveGP(id, originalGP);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
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
                  <TableHead className="font-semibold text-center w-[150px]">G.P.</TableHead>
                  <TableHead className="font-semibold">Remarks</TableHead>
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
                    const currentGP = editedValues[invoice.id] ?? invoice.gp ?? "";
                    const hasChanges = editedValues[invoice.id] !== undefined && editedValues[invoice.id] !== (invoice.gp ?? "");
                    const isSaving = savingIds.has(invoice.id);
                    
                    return (
                      <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
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
                            onKeyDown={(e) => handleKeyDown(e, invoice.id, invoice.gp)}
                            onBlur={() => {
                              if (hasChanges) {
                                handleSaveGP(invoice.id, invoice.gp);
                              }
                            }}
                            className="w-[120px] text-center mx-auto"
                            placeholder="Enter GP"
                            disabled={isSaving}
                            data-testid={`input-gp-${invoice.id}`}
                          />
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" data-testid={`text-remarks-${invoice.id}`}>
                          {invoice.remarks || "-"}
                        </TableCell>
                        <TableCell>
                          {hasChanges && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveGP(invoice.id, invoice.gp)}
                              disabled={isSaving}
                              data-testid={`button-save-${invoice.id}`}
                            >
                              {isSaving ? (
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
