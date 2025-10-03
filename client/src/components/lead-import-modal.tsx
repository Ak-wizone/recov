import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUp, AlertCircle, CheckCircle } from "lucide-react";

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
      setFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selectedFile.type === "application/vnd.ms-excel"
      ) {
        setFile(selectedFile);
        setImportResult(null);
      } else {
        toast({
          title: "Invalid File",
          description: "Please select an Excel file (.xlsx or .xls)",
          variant: "destructive",
        });
      }
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Leads from Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Excel file should contain columns: Company Name, Contact Person, Mobile, Email, Lead Source, Lead Status, etc.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="lead-excel-file">Select Excel File</Label>
            <Input
              id="lead-excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="mt-2"
              data-testid="input-lead-excel-file"
            />
          </div>

          {file && (
            <div className="bg-[#F1F5F9] p-3 rounded-lg">
              <p className="text-sm text-[#1E293B]">
                <FileUp className="inline h-4 w-4 mr-2" />
                {file.name}
              </p>
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
            <div className="max-h-40 overflow-y-auto bg-red-50 p-3 rounded-lg" data-testid="container-error-details">
              <p className="text-sm font-semibold text-red-800 mb-2">Errors:</p>
              {importResult.errors.map((error, index) => (
                <p key={index} className="text-xs text-red-700" data-testid={`text-error-detail-${index}`}>
                  Row {error.rowNumber}, Field: {error.field}, Error: {error.message}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-3">
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
              className="bg-[#059669] hover:bg-[#047857]"
              data-testid="button-start-lead-import"
            >
              Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
