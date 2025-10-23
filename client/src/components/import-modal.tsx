import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, FileSpreadsheet, X, AlertCircle, CheckCircle2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  parseImportFile, 
  parseItemsFile,
  parseInvoicesFile,
  parseReceiptsFile,
  validateMasterCustomerRow,
  validateMasterCustomerRowFlexible,
  validateItemRow,
  validateInvoiceRow,
  validateReceiptRow,
  detectDuplicatesInBatch,
  type ImportRow,
  type ImportItemRow,
  type ImportInvoiceRow,
  type ImportReceiptRow,
  type ValidationError,
  type DuplicateInfo
} from "@/lib/import-utils";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module?: 'customers' | 'items' | 'invoices' | 'receipts';
}

export function ImportModal({ open, onOpenChange, module = 'customers' }: ImportModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [cellErrors, setCellErrors] = useState<Map<string, string>>(new Map());
  const [duplicates, setDuplicates] = useState<Map<number, DuplicateInfo>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [flexibleImport, setFlexibleImport] = useState(false);

  const getImportEndpoint = () => {
    if (module === 'invoices') {
      return `/api/invoices/import`;
    }
    if (module === 'receipts') {
      return `/api/receipts/import`;
    }
    return `/api/masters/${module}/import`;
  };

  const getQueryKey = () => {
    if (module === 'invoices') {
      return `/api/invoices`;
    }
    if (module === 'receipts') {
      return `/api/receipts`;
    }
    return `/api/masters/${module}`;
  };

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(getImportEndpoint(), {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`Failed to import ${module}`);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [getQueryKey()] });
      
      setImportResults(data);
      
      const hasErrors = data.errorDetails && data.errorDetails.length > 0;
      const hasDuplicates = data.duplicateDetails && data.duplicateDetails.length > 0;
      
      if (hasErrors || hasDuplicates) {
        toast({
          title: "Import Completed with Issues",
          description: `${data.success} ${module} imported successfully. Please review the errors below.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${data.success} ${module}.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTemplateEndpoint = () => {
    if (module === 'invoices') {
      return `/api/invoices/template`;
    }
    if (module === 'receipts') {
      return `/api/receipts/template`;
    }
    return `/api/masters/${module}/template`;
  };

  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(getTemplateEndpoint());
      if (!response.ok) throw new Error("Failed to download template");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (module === 'invoices' || module === 'receipts') ? `${module}_template.xlsx` : `master_${module}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Template Downloaded",
        description: "Sample template has been downloaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetModal = () => {
    setFile(null);
    setPreviewData([]);
    setValidationErrors([]);
    setCellErrors(new Map());
    setDuplicates(new Map());
    setIsProcessing(false);
    setUploadProgress(0);
    setImportResults(null);
    setIsEditMode(false);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
  }, []);

  const processFile = async (selectedFile: File) => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf("."));

    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid File Format",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setUploadProgress(30);

    try {
      let rows: any[] = [];
      
      // Use appropriate parser based on module type
      if (module === 'customers') {
        rows = await parseImportFile(selectedFile);
      } else if (module === 'items') {
        rows = await parseItemsFile(selectedFile);
      } else if (module === 'invoices') {
        rows = await parseInvoicesFile(selectedFile);
      } else if (module === 'receipts') {
        rows = await parseReceiptsFile(selectedFile);
      }
      
      setUploadProgress(60);

      const errors: ValidationError[] = [];
      
      // Validate based on module type
      if (module === 'customers') {
        rows.forEach((row: ImportRow, index: number) => {
          const rowErrors = flexibleImport 
            ? validateMasterCustomerRowFlexible(row, index + 2)
            : validateMasterCustomerRow(row, index + 2);
          errors.push(...rowErrors);
        });
      } else if (module === 'items') {
        rows.forEach((row: ImportItemRow, index: number) => {
          const rowErrors = validateItemRow(row, index + 2);
          errors.push(...rowErrors);
        });
      } else if (module === 'invoices') {
        rows.forEach((row: ImportInvoiceRow, index: number) => {
          const rowErrors = validateInvoiceRow(row, index + 2);
          errors.push(...rowErrors);
        });
      } else if (module === 'receipts') {
        rows.forEach((row: ImportReceiptRow, index: number) => {
          const rowErrors = validateReceiptRow(row, index + 2);
          errors.push(...rowErrors);
        });
      }

      // Detect duplicates for customers
      let duplicateMap = new Map<number, DuplicateInfo>();
      if (module === 'customers') {
        duplicateMap = detectDuplicatesInBatch(rows as ImportRow[]);
      }

      setPreviewData(rows);
      setValidationErrors(errors);
      setDuplicates(duplicateMap);
      setUploadProgress(100);

      const duplicateCount = duplicateMap.size;
      
      toast({
        title: "File Processed",
        description: errors.length > 0 || duplicateCount > 0
          ? `Found ${rows.length} rows. ${errors.length} validation errors, ${duplicateCount} potential duplicates detected.`
          : `Found ${rows.length} rows. All rows are valid.`,
      });
    } catch (error: any) {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCellEdit = (rowIndex: number, field: string, value: string) => {
    const updatedData = [...previewData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [field]: value };
    setPreviewData(updatedData);

    // Re-validate the row based on module type
    const rowNumber = rowIndex + 2;
    let rowErrors: ValidationError[] = [];
    
    if (module === 'customers') {
      rowErrors = flexibleImport
        ? validateMasterCustomerRowFlexible(updatedData[rowIndex], rowNumber)
        : validateMasterCustomerRow(updatedData[rowIndex], rowNumber);
    } else if (module === 'items') {
      rowErrors = validateItemRow(updatedData[rowIndex], rowNumber);
    } else if (module === 'invoices') {
      rowErrors = validateInvoiceRow(updatedData[rowIndex], rowNumber);
    } else if (module === 'receipts') {
      rowErrors = validateReceiptRow(updatedData[rowIndex], rowNumber);
    }
    
    // Update cell errors map
    const newCellErrors = new Map(cellErrors);
    
    // Remove old errors for this row
    Array.from(newCellErrors.keys()).forEach(key => {
      if (key.startsWith(`${rowNumber}-`)) {
        newCellErrors.delete(key);
      }
    });
    
    // Add new errors
    rowErrors.forEach(error => {
      if (error.field) {
        newCellErrors.set(`${rowNumber}-${error.field}`, error.message);
      }
    });
    
    setCellErrors(newCellErrors);
    
    // Update validation errors
    const otherRowErrors = validationErrors.filter(err => err.row !== rowNumber);
    setValidationErrors([...otherRowErrors, ...rowErrors]);
  };

  const enableEditMode = () => {
    if (previewData.length > 0) {
      // Build cell errors map from validation errors
      const newCellErrors = new Map<string, string>();
      validationErrors.forEach(error => {
        if (error.field) {
          newCellErrors.set(`${error.row}-${error.field}`, error.message);
        }
      });
      setCellErrors(newCellErrors);
      setIsEditMode(true);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    // If in edit mode, convert edited data back to Excel and import
    if (isEditMode) {
      try {
        const XLSX = await import('xlsx');
        let worksheet: any;
        let sheetName = "";
        
        if (module === 'customers') {
          worksheet = XLSX.utils.json_to_sheet(previewData.map(row => ({
            "CLIENT NAME": row.clientName || "",
            "CATEGORY": row.category || "",
            "PRIMARY CONTACT": row.primaryContactName || "",
            "PRIMARY MOBILE": row.primaryMobile || "",
            "PRIMARY EMAIL": row.primaryEmail || "",
            "SECONDARY CONTACT": row.secondaryContactName || "",
            "SECONDARY MOBILE": row.secondaryMobile || "",
            "SECONDARY EMAIL": row.secondaryEmail || "",
            "GSTIN": row.gstNumber || "",
            "BILLING ADDRESS": row.billingAddress || "",
            "CITY": row.city || "",
            "STATE": row.state || "",
            "PINCODE": row.pincode || "",
            "PAYMENT TERMS (DAYS)": row.paymentTermsDays || "",
            "CREDIT LIMIT": row.creditLimit || "",
            "OPENING BALANCE": row.openingBalance || "",
            "INTEREST APPLICABLE FROM": row.interestApplicableFrom || "",
            "INTEREST RATE": row.interestRate || "",
            "SALES PERSON": row.salesPerson || "",
            "STATUS": row.isActive || "Active",
          })));
          sheetName = "Customers";
        } else if (module === 'items') {
          worksheet = XLSX.utils.json_to_sheet(previewData.map(row => ({
            "Item Type": row.itemType || "",
            "Name": row.name || "",
            "Description": row.description || "",
            "Unit": row.unit || "",
            "Tax": row.tax || "",
            "SKU": row.sku || "",
            "Sale Unit Price": row.saleUnitPrice || "",
            "Buy Unit Price": row.buyUnitPrice || "",
            "Opening Quantity": row.openingQuantity || "",
            "HSN": row.hsn || "",
            "SAC": row.sac || "",
            "Is Active": row.isActive || "Active",
          })));
          sheetName = "Items";
        } else if (module === 'invoices') {
          worksheet = XLSX.utils.json_to_sheet(previewData.map(row => ({
            "Invoice Number": row.invoiceNumber || "",
            "Customer Name": row.customerName || "",
            "Invoice Date": row.invoiceDate || "",
            "Invoice Amount": row.invoiceAmount || "",
            "Gross Profit": row.grossProfit || "",
            "Status": row.status || "Unpaid",
            "Assigned User": row.assignedUser || "",
            "Remarks": row.remarks || "",
          })));
          sheetName = "Invoices";
        } else if (module === 'receipts') {
          worksheet = XLSX.utils.json_to_sheet(previewData.map(row => ({
            "Voucher Number": row.voucherNumber || "",
            "Voucher Type": row.voucherType || "",
            "Customer Name": row.customerName || "",
            "Date": row.date || "",
            "Amount": row.amount || "",
            "Remarks": row.remarks || "",
          })));
          sheetName = "Receipts";
        }
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        // Convert to blob and create new file
        const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const editedFile = new File([blob], file.name, { type: blob.type });
        
        const formData = new FormData();
        formData.append("file", editedFile);
        if (module === 'customers' && flexibleImport) {
          formData.append("flexibleImport", "true");
        }
        importMutation.mutate(formData);
      } catch (error: any) {
        toast({
          title: "Import Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      // Normal import without editing
      const formData = new FormData();
      formData.append("file", file);
      if (module === 'customers' && flexibleImport) {
        formData.append("flexibleImport", "true");
      }
      importMutation.mutate(formData);
    }
  };

  const validRows = previewData.filter((_, index) => {
    const rowNumber = index + 2;
    return !validationErrors.some(err => err.row === rowNumber);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="dialog-import">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-import-title">
            <FileSpreadsheet className="h-5 w-5" />
            Import Master {module.charAt(0).toUpperCase() + module.slice(1)}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to bulk import master {module}. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Flexible Import Toggle - Only for customers */}
          {module === 'customers' && !file && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg" data-testid="flexible-import-toggle">
              <div className="flex-1">
                <Label htmlFor="flexible-import" className="text-sm font-medium cursor-pointer">
                  Allow Incomplete Data (Flexible Import)
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  Enable this to import customers with missing fields. Only Client Name will be required. You can fill in other details later.
                </p>
              </div>
              <Switch
                id="flexible-import"
                checked={flexibleImport}
                onCheckedChange={setFlexibleImport}
                data-testid="switch-flexible-import"
              />
            </div>
          )}
          
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="dropzone-upload"
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supports CSV, XLSX, XLS files (max 5MB)
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
                data-testid="input-file"
              />
              <label htmlFor="file-upload">
                <Button type="button" variant="outline" asChild data-testid="button-browse">
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" data-testid="file-info">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium" data-testid="text-filename">{file.name}</p>
                    <p className="text-sm text-gray-500" data-testid="text-filesize">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetModal}
                  data-testid="button-remove-file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isProcessing && (
                <div className="space-y-2" data-testid="progress-container">
                  <Progress value={uploadProgress} className="h-2" data-testid="progress-bar" />
                  <p className="text-sm text-gray-500 text-center" data-testid="text-progress">
                    Processing file...
                  </p>
                </div>
              )}

              {validationErrors.length > 0 && !isEditMode && (
                <Alert variant="destructive" data-testid="alert-errors">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold mb-2" data-testid="text-error-count">
                          Found {validationErrors.length} validation errors:
                        </p>
                        <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto" data-testid="list-errors">
                          {validationErrors.slice(0, 10).map((error, idx) => (
                            <li key={idx} className="text-sm" data-testid={`error-item-${idx}`}>
                              Row {error.row}: {error.message}
                            </li>
                          ))}
                          {validationErrors.length > 10 && (
                            <li className="text-sm italic">
                              ...and {validationErrors.length - 10} more errors
                            </li>
                          )}
                        </ul>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={enableEditMode}
                        className="ml-4 bg-white hover:bg-gray-50"
                        data-testid="button-fix-errors"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Fix Errors
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {validationErrors.length > 0 && isEditMode && (
                <Alert variant="destructive" data-testid="alert-errors-edit">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold" data-testid="text-error-count-edit">
                      {validationErrors.length} validation errors remaining - Fix them below and click Import
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {validRows.length > 0 && (
                <Alert data-testid="alert-valid">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <p className="text-green-700 font-semibold" data-testid="text-valid-count">
                      {validRows.length} valid rows ready to import
                      {validationErrors.length > 0 && ` (${validationErrors.length} rows will be skipped)`}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {previewData.length > 0 && !isEditMode && (
                <div className="border rounded-lg overflow-hidden" data-testid="preview-table">
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="header-row">Row</TableHead>
                          <TableHead data-testid="header-clientname">Client Name</TableHead>
                          <TableHead data-testid="header-category">Category</TableHead>
                          <TableHead data-testid="header-mobile">Mobile</TableHead>
                          <TableHead data-testid="header-email">Email</TableHead>
                          <TableHead data-testid="header-gst">GST</TableHead>
                          <TableHead data-testid="header-city">City</TableHead>
                          <TableHead data-testid="header-pincode">Pincode</TableHead>
                          <TableHead data-testid="header-payment">Payment Terms</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 20).map((row: ImportRow, index: number) => {
                          const rowNumber = index + 2;
                          const hasError = validationErrors.some(err => err.row === rowNumber);
                          const isDuplicate = duplicates.has(index);
                          const duplicateInfo = duplicates.get(index);
                          
                          return (
                            <TableRow
                              key={index}
                              className={cn(
                                hasError && "bg-red-50",
                                !hasError && isDuplicate && "bg-amber-50"
                              )}
                              data-testid={`preview-row-${index}`}
                            >
                              <TableCell className="font-medium" data-testid={`cell-row-${index}`}>
                                {rowNumber}
                                {hasError && <AlertCircle className="h-3 w-3 text-red-600 inline ml-1" />}
                                {!hasError && isDuplicate && (
                                  <AlertCircle className="h-3 w-3 text-amber-600 inline ml-1" />
                                )}
                              </TableCell>
                              <TableCell data-testid={`cell-clientname-${index}`}>{row.clientName || "-"}</TableCell>
                              <TableCell data-testid={`cell-category-${index}`}>{row.category || "-"}</TableCell>
                              <TableCell data-testid={`cell-mobile-${index}`}>{row.primaryMobile || "-"}</TableCell>
                              <TableCell data-testid={`cell-email-${index}`}>{row.primaryEmail || "-"}</TableCell>
                              <TableCell data-testid={`cell-gst-${index}`}>{row.gstNumber || "-"}</TableCell>
                              <TableCell data-testid={`cell-city-${index}`}>{row.city || "-"}</TableCell>
                              <TableCell data-testid={`cell-pincode-${index}`}>{row.pincode || "-"}</TableCell>
                              <TableCell data-testid={`cell-payment-${index}`}>{row.paymentTermsDays || "-"}</TableCell>
                            </TableRow>
                          );
                        })}
                        {previewData.length > 20 && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-gray-500 italic">
                              ... and {previewData.length - 20} more rows
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {previewData.length > 0 && isEditMode && module === 'customers' && (
                <div className="border rounded-lg overflow-hidden" data-testid="edit-table">
                  <div className="bg-blue-50 px-4 py-2 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-blue-800">Edit Mode - Fix errors and click Import when ready</span>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Client Name *</TableHead>
                          <TableHead>Category *</TableHead>
                          <TableHead>Mobile * (10 digits)</TableHead>
                          <TableHead>Email *</TableHead>
                          <TableHead>GST *</TableHead>
                          <TableHead>City *</TableHead>
                          <TableHead>Pincode *</TableHead>
                          <TableHead>Payment Terms *</TableHead>
                          <TableHead>Credit Limit *</TableHead>
                          <TableHead>Interest Rate *</TableHead>
                          <TableHead>Billing Address *</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row: ImportRow, index: number) => {
                          const rowNumber = index + 2;
                          const hasError = validationErrors.some(err => err.row === rowNumber);
                          const isDuplicate = duplicates.has(index);
                          
                          return (
                            <TableRow
                              key={index}
                              className={cn(
                                hasError && "bg-red-50",
                                !hasError && isDuplicate && "bg-amber-50"
                              )}
                              data-testid={`edit-row-${index}`}
                            >
                              <TableCell className="font-medium">
                                {rowNumber}
                                {hasError && <AlertCircle className="h-3 w-3 text-red-600 inline ml-1" />}
                                {!hasError && isDuplicate && (
                                  <AlertCircle className="h-3 w-3 text-amber-600 inline ml-1" />
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.clientName || ""}
                                  onChange={(e) => handleCellEdit(index, "clientName", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-clientName`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-clientname-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-clientName`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-clientName`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.category || ""}
                                  onChange={(e) => handleCellEdit(index, "category", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-category`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-category-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-category`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-category`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.primaryMobile || ""}
                                  onChange={(e) => handleCellEdit(index, "primaryMobile", e.target.value)}
                                  maxLength={10}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-primaryMobile`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-mobile-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-primaryMobile`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-primaryMobile`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.primaryEmail || ""}
                                  onChange={(e) => handleCellEdit(index, "primaryEmail", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-primaryEmail`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-email-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-primaryEmail`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-primaryEmail`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.gstNumber || ""}
                                  onChange={(e) => handleCellEdit(index, "gstNumber", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-gstNumber`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-gst-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-gstNumber`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-gstNumber`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.city || ""}
                                  onChange={(e) => handleCellEdit(index, "city", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-city`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-city-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-city`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-city`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.pincode || ""}
                                  onChange={(e) => handleCellEdit(index, "pincode", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-pincode`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-pincode-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-pincode`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-pincode`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.paymentTermsDays || ""}
                                  onChange={(e) => handleCellEdit(index, "paymentTermsDays", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-paymentTermsDays`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-payment-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-paymentTermsDays`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-paymentTermsDays`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.creditLimit || ""}
                                  onChange={(e) => handleCellEdit(index, "creditLimit", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-creditLimit`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-credit-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-creditLimit`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-creditLimit`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.interestRate || ""}
                                  onChange={(e) => handleCellEdit(index, "interestRate", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-interestRate`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-interest-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-interestRate`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-interestRate`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.billingAddress || ""}
                                  onChange={(e) => handleCellEdit(index, "billingAddress", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-billingAddress`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-address-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-billingAddress`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-billingAddress`)}</p>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {previewData.length > 0 && isEditMode && module === 'items' && (
                <div className="border rounded-lg overflow-hidden" data-testid="edit-table">
                  <div className="bg-blue-50 px-4 py-2 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-blue-800">Edit Mode - Fix errors and click Import when ready</span>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Item Type *</TableHead>
                          <TableHead>Name *</TableHead>
                          <TableHead>Unit *</TableHead>
                          <TableHead>Tax *</TableHead>
                          <TableHead>SKU *</TableHead>
                          <TableHead>Sale Unit Price *</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row: ImportItemRow, index: number) => {
                          const rowNumber = index + 2;
                          const hasError = validationErrors.some(err => err.row === rowNumber);
                          
                          return (
                            <TableRow
                              key={index}
                              className={hasError ? "bg-red-50" : ""}
                              data-testid={`edit-row-${index}`}
                            >
                              <TableCell className="font-medium">
                                {rowNumber}
                                {hasError && <AlertCircle className="h-3 w-3 text-red-600 inline ml-1" />}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.itemType || ""}
                                  onChange={(e) => handleCellEdit(index, "itemType", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-itemType`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-itemtype-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-itemType`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-itemType`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.name || ""}
                                  onChange={(e) => handleCellEdit(index, "name", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-name`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-name-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-name`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-name`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.unit || ""}
                                  onChange={(e) => handleCellEdit(index, "unit", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-unit`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-unit-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-unit`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-unit`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.tax || ""}
                                  onChange={(e) => handleCellEdit(index, "tax", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-tax`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-tax-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-tax`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-tax`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.sku || ""}
                                  onChange={(e) => handleCellEdit(index, "sku", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-sku`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-sku-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-sku`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-sku`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.saleUnitPrice || ""}
                                  onChange={(e) => handleCellEdit(index, "saleUnitPrice", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-saleUnitPrice`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-saleunitprice-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-saleUnitPrice`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-saleUnitPrice`)}</p>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {previewData.length > 0 && isEditMode && module === 'invoices' && (
                <div className="border rounded-lg overflow-hidden" data-testid="edit-table">
                  <div className="bg-blue-50 px-4 py-2 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-blue-800">Edit Mode - Fix errors and click Import when ready</span>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Invoice Number *</TableHead>
                          <TableHead>Customer Name *</TableHead>
                          <TableHead>Invoice Date *</TableHead>
                          <TableHead>Invoice Amount *</TableHead>
                          <TableHead>Gross Profit *</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row: ImportInvoiceRow, index: number) => {
                          const rowNumber = index + 2;
                          const hasError = validationErrors.some(err => err.row === rowNumber);
                          
                          return (
                            <TableRow
                              key={index}
                              className={hasError ? "bg-red-50" : ""}
                              data-testid={`edit-row-${index}`}
                            >
                              <TableCell className="font-medium">
                                {rowNumber}
                                {hasError && <AlertCircle className="h-3 w-3 text-red-600 inline ml-1" />}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.invoiceNumber || ""}
                                  onChange={(e) => handleCellEdit(index, "invoiceNumber", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-invoiceNumber`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-invoicenumber-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-invoiceNumber`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-invoiceNumber`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.customerName || ""}
                                  onChange={(e) => handleCellEdit(index, "customerName", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-customerName`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-customername-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-customerName`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-customerName`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.invoiceDate || ""}
                                  onChange={(e) => handleCellEdit(index, "invoiceDate", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-invoiceDate`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-invoicedate-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-invoiceDate`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-invoiceDate`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.invoiceAmount || ""}
                                  onChange={(e) => handleCellEdit(index, "invoiceAmount", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-invoiceAmount`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-invoiceamount-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-invoiceAmount`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-invoiceAmount`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.grossProfit || ""}
                                  onChange={(e) => handleCellEdit(index, "grossProfit", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-grossProfit`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-grossprofit-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-grossProfit`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-grossProfit`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.status || ""}
                                  onChange={(e) => handleCellEdit(index, "status", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-status`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-status-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-status`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-status`)}</p>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {previewData.length > 0 && isEditMode && module === 'receipts' && (
                <div className="border rounded-lg overflow-hidden" data-testid="edit-table">
                  <div className="bg-blue-50 px-4 py-2 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-blue-800">Edit Mode - Fix errors and click Import when ready</span>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Voucher Number *</TableHead>
                          <TableHead>Voucher Type *</TableHead>
                          <TableHead>Customer Name *</TableHead>
                          <TableHead>Date *</TableHead>
                          <TableHead>Amount *</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row: ImportReceiptRow, index: number) => {
                          const rowNumber = index + 2;
                          const hasError = validationErrors.some(err => err.row === rowNumber);
                          
                          return (
                            <TableRow
                              key={index}
                              className={hasError ? "bg-red-50" : ""}
                              data-testid={`edit-row-${index}`}
                            >
                              <TableCell className="font-medium">
                                {rowNumber}
                                {hasError && <AlertCircle className="h-3 w-3 text-red-600 inline ml-1" />}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.voucherNumber || ""}
                                  onChange={(e) => handleCellEdit(index, "voucherNumber", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-voucherNumber`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-vouchernumber-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-voucherNumber`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-voucherNumber`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.voucherType || ""}
                                  onChange={(e) => handleCellEdit(index, "voucherType", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-voucherType`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-vouchertype-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-voucherType`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-voucherType`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.customerName || ""}
                                  onChange={(e) => handleCellEdit(index, "customerName", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-customerName`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-customername-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-customerName`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-customerName`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.date || ""}
                                  onChange={(e) => handleCellEdit(index, "date", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-date`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-date-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-date`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-date`)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.amount || ""}
                                  onChange={(e) => handleCellEdit(index, "amount", e.target.value)}
                                  className={cn(
                                    "h-8 text-sm",
                                    cellErrors.has(`${rowNumber}-amount`) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                  data-testid={`input-amount-${index}`}
                                />
                                {cellErrors.has(`${rowNumber}-amount`) && (
                                  <p className="text-xs text-red-600 mt-1">{cellErrors.get(`${rowNumber}-amount`)}</p>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}

          {importResults && (importResults.errorDetails?.length > 0 || importResults.duplicateDetails?.length > 0) && (
            <div className="space-y-4" data-testid="import-results">
              <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Import Summary:</p>
                  <p className="text-sm">✓ {importResults.success} records imported successfully</p>
                  {importResults.errorDetails?.length > 0 && (
                    <p className="text-sm text-red-600">✗ {importResults.errorDetails.length} records failed validation</p>
                  )}
                  {importResults.duplicateDetails?.length > 0 && (
                    <p className="text-sm text-yellow-600">⚠ {importResults.duplicateDetails.length} duplicate records skipped</p>
                  )}
                </AlertDescription>
              </Alert>

              {importResults.errorDetails?.length > 0 && (
                <div className="border rounded-lg overflow-hidden" data-testid="error-details-table">
                  <div className="bg-red-50 px-4 py-2 border-b">
                    <h4 className="font-semibold text-red-800">Validation Errors</h4>
                    <p className="text-sm text-red-600">The following rows have errors and were not imported:</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Row Number</TableHead>
                          <TableHead>Error Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResults.errorDetails.map((error: any, idx: number) => (
                          <TableRow key={idx} data-testid={`error-row-${idx}`}>
                            <TableCell className="font-medium" data-testid={`error-row-number-${idx}`}>
                              Row {error.row}
                            </TableCell>
                            <TableCell className="text-sm text-red-600" data-testid={`error-message-${idx}`}>
                              {error.error}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {importResults.duplicateDetails?.length > 0 && (
                <div className="border rounded-lg overflow-hidden" data-testid="duplicate-details-table">
                  <div className="bg-yellow-50 px-4 py-2 border-b">
                    <h4 className="font-semibold text-yellow-800">Duplicate Records</h4>
                    <p className="text-sm text-yellow-600">The following rows were skipped because they already exist:</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Row Number</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResults.duplicateDetails.map((duplicate: any, idx: number) => (
                          <TableRow key={idx} data-testid={`duplicate-row-${idx}`}>
                            <TableCell className="font-medium" data-testid={`duplicate-row-number-${idx}`}>
                              Row {duplicate.row}
                            </TableCell>
                            <TableCell className="text-sm text-yellow-600" data-testid={`duplicate-message-${idx}`}>
                              {duplicate.error}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => downloadTemplateMutation.mutate()}
              disabled={downloadTemplateMutation.isPending}
              data-testid="button-download-template"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Sample Template
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetModal();
              onOpenChange(false);
            }}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || (isEditMode && validationErrors.length > 0) || (!isEditMode && validRows.length === 0) || importMutation.isPending}
            data-testid="button-import"
          >
            {importMutation.isPending 
              ? "Importing..." 
              : isEditMode 
                ? `Import ${previewData.length} ${module.charAt(0).toUpperCase() + module.slice(1)}` 
                : `Import ${validRows.length} ${module.charAt(0).toUpperCase() + module.slice(1)}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
