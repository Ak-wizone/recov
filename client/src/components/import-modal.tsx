import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseImportFile, validateMasterCustomerRow, type ImportRow, type ValidationError } from "@/lib/import-utils";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module?: 'customers' | 'items';
}

export function ImportModal({ open, onOpenChange, module = 'customers' }: ImportModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/masters/${module}/import`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`Failed to import ${module}`);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/masters/${module}`] });
      toast({
        title: "Import Completed",
        description: `Successfully imported ${data.success} ${module}. ${data.errors > 0 ? `${data.errors} rows had errors.` : ''}`,
      });
      resetModal();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/masters/${module}/template`);
      if (!response.ok) throw new Error("Failed to download template");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `master_${module}_template.xlsx`;
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
    setIsProcessing(false);
    setUploadProgress(0);
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
      const rows = await parseImportFile(selectedFile);
      setUploadProgress(60);

      const errors: ValidationError[] = [];
      
      // Only validate for customers module, items validation is done on backend
      if (module === 'customers') {
        rows.forEach((row: ImportRow, index: number) => {
          const rowErrors = validateMasterCustomerRow(row, index + 2);
          errors.push(...rowErrors);
        });
      }

      setPreviewData(rows);
      setValidationErrors(errors);
      setUploadProgress(100);

      toast({
        title: "File Processed",
        description: module === 'customers' 
          ? `Found ${rows.length} rows. ${errors.length > 0 ? `${errors.length} validation errors detected.` : 'All rows are valid.'}`
          : `Found ${rows.length} rows ready to import.`,
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

  const handleImport = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    importMutation.mutate(formData);
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

              {validationErrors.length > 0 && (
                <Alert variant="destructive" data-testid="alert-errors">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
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

              {previewData.length > 0 && (
                <div className="border rounded-lg overflow-hidden" data-testid="preview-table">
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="header-row">Row</TableHead>
                          <TableHead data-testid="header-clientname">Client Name</TableHead>
                          <TableHead data-testid="header-category">Category</TableHead>
                          <TableHead data-testid="header-address">Address</TableHead>
                          <TableHead data-testid="header-city">City</TableHead>
                          <TableHead data-testid="header-state">State</TableHead>
                          <TableHead data-testid="header-gst">GST</TableHead>
                          <TableHead data-testid="header-pan">PAN</TableHead>
                          <TableHead data-testid="header-payment">Payment Terms</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 20).map((row: ImportRow, index: number) => {
                          const rowNumber = index + 2;
                          const hasError = validationErrors.some(err => err.row === rowNumber);
                          return (
                            <TableRow
                              key={index}
                              className={hasError ? "bg-red-50" : ""}
                              data-testid={`preview-row-${index}`}
                            >
                              <TableCell className="font-medium" data-testid={`cell-row-${index}`}>
                                {rowNumber}
                                {hasError && <AlertCircle className="h-3 w-3 text-red-600 inline ml-1" />}
                              </TableCell>
                              <TableCell data-testid={`cell-clientname-${index}`}>{row.clientName || "-"}</TableCell>
                              <TableCell data-testid={`cell-category-${index}`}>{row.category || "-"}</TableCell>
                              <TableCell data-testid={`cell-address-${index}`}>{row.billingAddress || "-"}</TableCell>
                              <TableCell data-testid={`cell-city-${index}`}>{row.city || "-"}</TableCell>
                              <TableCell data-testid={`cell-state-${index}`}>{row.state || "-"}</TableCell>
                              <TableCell data-testid={`cell-gst-${index}`}>{row.gstNumber || "-"}</TableCell>
                              <TableCell data-testid={`cell-pan-${index}`}>{row.panNumber || "-"}</TableCell>
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
            </>
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
            disabled={!file || validRows.length === 0 || importMutation.isPending}
            data-testid="button-import"
          >
            {importMutation.isPending ? "Importing..." : `Import ${validRows.length} Customers`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
