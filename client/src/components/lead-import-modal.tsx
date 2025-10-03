import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, AlertCircle, CheckCircle, X } from "lucide-react";

interface LeadImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  imported: number;
  errors: Array<{ rowNumber: number; field: string; message: string }>;
}

export default function LeadImportModal({
  open,
  onOpenChange,
}: LeadImportModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/leads/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }

      return response.json();
    },
    onSuccess: (data: ImportResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setImportResult(data);
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.imported} leads${data.errors.length > 0 ? `, ${data.errors.length} errors` : ""}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateFile = (selectedFile: File): boolean => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV, XLSX, or XLS file",
        variant: "destructive",
      });
      return false;
    }
    
    if (selectedFile.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile);
      setImportResult(null);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/leads/template");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leads_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate(file);
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    onOpenChange(false);
  };

  const removeFile = () => {
    setFile(null);
    setImportResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Master Leads
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to bulk import master leads. Download the template to see the required format.
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
              data-testid="dropzone-lead-import"
            >
              <Upload className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Supports CSV, XLSX, XLS files (max 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-lead-excel-file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleBrowseClick}
                data-testid="button-browse-files"
              >
                Browse Files
              </Button>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded">
                    <Upload className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  data-testid="button-remove-file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {importResult && (
            <Alert className={importResult.errors.length > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}>
              {importResult.errors.length > 0 ? (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription>
                <p className="font-semibold">Import Summary:</p>
                <p className="text-sm mt-1" data-testid="text-imported-count">
                  ✓ {importResult.imported} leads imported successfully
                </p>
                {importResult.errors.length > 0 && (
                  <p className="text-sm text-yellow-800" data-testid="text-error-count">
                    ✗ {importResult.errors.length} rows had errors
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {importResult?.errors && importResult.errors.length > 0 && (
            <div className="max-h-40 overflow-y-auto bg-red-50 p-3 rounded-lg border border-red-200" data-testid="container-error-details">
              <p className="text-sm font-semibold text-red-800 mb-2">Errors:</p>
              {importResult.errors.map((error, index) => (
                <p key={index} className="text-xs text-red-700" data-testid={`text-error-detail-${index}`}>
                  Row {error.rowNumber}, Field: {error.field}, Error: {error.message}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="link"
              onClick={handleDownloadTemplate}
              className="text-blue-600 hover:text-blue-700 p-0"
              data-testid="button-download-template"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Sample Template
            </Button>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-lead-import"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || importMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-start-lead-import"
              >
                {importMutation.isPending ? "Importing..." : `Import ${file ? "Leads" : "0 Leads"}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
