import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import {
  Download,
  Upload,
  History,
  AlertCircle,
  CheckCircle,
  Loader2,
  Database,
  FileJson,
  Calendar,
  User,
  HardDrive,
  Building2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface BackupHistoryItem {
  id: string;
  operationType: string;
  fileName: string;
  fileSize: number | null;
  status: string;
  recordsCount: number | null;
  errorMessage: string | null;
  performedBy: string;
  performedByName: string | null;
  createdAt: string;
}

interface BackupPreview {
  totalRecords: number;
  createdAt: string;
  createdBy: string;
  tenantId: string;
  tenantName: string;
  tables: { name: string; records: number }[];
}

export default function BackupRestorePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const { data: backupHistory = [], isLoading } = useQuery<BackupHistoryItem[]>({
    queryKey: ["/api/backup/history"],
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/backup/create");
      const blob = await response.blob();
      const fileName = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "backup.json";
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { fileName };
    },
    onSuccess: (data) => {
      toast({
        title: "Backup Created",
        description: `${data.fileName} has been downloaded successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backup/history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/backup/restore", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Restore Preview",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backup/history"] });
      setShowRestoreDialog(false);
      setBackupPreview(null);
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast({
        title: "Invalid File",
        description: "Please select a valid JSON backup file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);

        // Validate backup structure
        if (!backupData.metadata || !backupData.data) {
          throw new Error("Invalid backup file format");
        }

        // Validate tenant ownership - prevent cross-tenant restores
        if (backupData.metadata.tenantId !== user?.tenantId) {
          toast({
            title: "Tenant Mismatch",
            description: "This backup belongs to a different tenant. You can only restore backups from your own account.",
            variant: "destructive",
          });
          return;
        }

        setSelectedFile(backupData);
        setBackupPreview({
          totalRecords: backupData.metadata.totalRecords,
          createdAt: backupData.metadata.createdAt,
          createdBy: backupData.metadata.createdBy,
          tenantId: backupData.metadata.tenantId,
          tenantName: backupData.metadata.tenantName || "Unknown",
          tables: Object.keys(backupData.data).map(key => ({
            name: key,
            records: Array.isArray(backupData.data[key]) ? backupData.data[key].length : 0
          }))
        });
        setShowRestoreDialog(true);
      } catch (error) {
        toast({
          title: "Invalid File",
          description: "Could not parse backup file. Please ensure it's a valid backup.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRestore = () => {
    if (!selectedFile) return;
    
    restoreMutation.mutate({
      backupData: selectedFile,
      restoreOptions: {
        customers: true,
        invoices: true,
        receipts: true,
        leads: true,
        quotations: true,
        proformaInvoices: true,
        settings: true,
        templates: true,
        users: true,
        roles: true,
      }
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return "—";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Backup & Restore
          </h1>
          <p className="text-muted-foreground mt-1">
            Create backups of your data and restore from previous backups
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-create-backup" className="border-2 border-dashed hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle>Create Backup</CardTitle>
            </div>
            <CardDescription>
              Download a complete backup of all your business data in JSON format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm text-muted-foreground dark:text-gray-400">
                <Database className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  Includes all customers, invoices, receipts, leads, quotations, settings, templates, and user data
                </div>
              </div>
              <Button
                onClick={() => createBackupMutation.mutate()}
                disabled={createBackupMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-create-backup"
              >
                {createBackupMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Create & Download Backup
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-restore-backup" className="border-2 border-dashed hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Restore Backup</CardTitle>
            </div>
            <CardDescription>
              Upload a backup file to restore your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Warning:</strong> Restoring will review your backup file. Always verify the backup before proceeding.
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-backup-file"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
                size="lg"
                data-testid="button-select-backup"
              >
                <FileJson className="h-4 w-4 mr-2" />
                Select Backup File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-backup-history">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Backup History</CardTitle>
          </div>
          <CardDescription>
            View all backup and restore operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backupHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground dark:text-gray-400">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No backup history found</p>
              <p className="text-sm">Create your first backup to get started</p>
            </div>
          ) : (
            <div className="rounded-md border dark:border-gray-700">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-700">
                    <TableHead className="dark:text-gray-300">Operation</TableHead>
                    <TableHead className="dark:text-gray-300">File Name</TableHead>
                    <TableHead className="dark:text-gray-300">Records</TableHead>
                    <TableHead className="dark:text-gray-300">Size</TableHead>
                    <TableHead className="dark:text-gray-300">Status</TableHead>
                    <TableHead className="dark:text-gray-300">Performed By</TableHead>
                    <TableHead className="dark:text-gray-300">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupHistory.map((item) => (
                    <TableRow key={item.id} data-testid={`row-history-${item.id}`} className="dark:border-gray-700">
                      <TableCell className="dark:text-gray-200">
                        <Badge variant={item.operationType === "backup" ? "default" : "secondary"}>
                          {item.operationType === "backup" ? (
                            <Download className="h-3 w-3 mr-1" />
                          ) : (
                            <Upload className="h-3 w-3 mr-1" />
                          )}
                          {item.operationType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm dark:text-gray-300">{item.fileName}</TableCell>
                      <TableCell className="dark:text-gray-300">
                        {item.recordsCount ? item.recordsCount.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{formatFileSize(item.fileSize)}</TableCell>
                      <TableCell>
                        {item.status === "success" ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.performedByName || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell className="dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.createdAt)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent className="max-w-2xl dark:bg-gray-900 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Restore Backup Preview</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              Review the backup details before proceeding with restore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {backupPreview && (
            <div className="space-y-4 my-4">
              <div className="bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-md border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-sm text-muted-foreground dark:text-gray-400">Tenant</div>
                </div>
                <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                  {backupPreview.tenantName}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground dark:text-gray-400">Total Records</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {backupPreview.totalRecords.toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground dark:text-gray-400">Created By</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400 truncate">
                    {backupPreview.createdBy}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground dark:text-gray-400">Created At</div>
                  <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {formatDate(backupPreview.createdAt)}
                  </div>
                </div>
              </div>

              <div className="border dark:border-gray-700 rounded-md p-4 max-h-64 overflow-y-auto">
                <h4 className="font-semibold mb-3 dark:text-white">Data Tables</h4>
                <div className="grid grid-cols-2 gap-2">
                  {backupPreview.tables.map((table) => (
                    <div key={table.name} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm font-medium dark:text-gray-300">{table.name}</span>
                      <Badge variant="secondary">{table.records} records</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Note:</strong> Restore is currently in preview mode. This will validate your backup file structure but not modify your data. Full restore functionality will be available in the next update.
                  </div>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreMutation.isPending} data-testid="button-cancel-restore">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoreMutation.isPending}
              className="bg-primary"
              data-testid="button-confirm-restore"
            >
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                "Preview Restore"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
