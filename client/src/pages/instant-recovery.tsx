import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { RecoveryRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { openWhatsApp } from "@/lib/whatsapp";
import InstantRecoveryDialog from "@/components/instant-recovery-dialog";
import { EmailDialog } from "@/components/email-dialog";
import { CallDialog } from "@/components/call-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Mail, MessageSquare, Phone } from "lucide-react";

export default function InstantRecoveryPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecoveryRequest, setSelectedRecoveryRequest] = useState<RecoveryRequest | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);

  const { data: recoveryRequests = [], isLoading } = useQuery<RecoveryRequest[]>({
    queryKey: ["/api/recovery-requests"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/recovery-requests/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete recovery request");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recovery-requests"] });
      toast({
        title: "Success",
        description: "Recovery request deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedRecoveryRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const triggerCallMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/recovery-requests/${id}/trigger-call`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Call Triggered",
        description: "Recovery call has been initiated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recovery-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger call",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (request: RecoveryRequest) => {
    setSelectedRecoveryRequest(request);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (request: RecoveryRequest) => {
    setSelectedRecoveryRequest(request);
    setIsDeleteDialogOpen(true);
  };

  const handleEmail = (request: RecoveryRequest) => {
    setSelectedRecoveryRequest(request);
    setIsEmailDialogOpen(true);
  };

  const handleWhatsApp = (request: RecoveryRequest) => {
    const message = `Dear ${request.debtorCompanyName},\n\nThis is a reminder regarding your pending payment of ${formatCurrency(parseFloat(request.totalAmountDue))} which is delayed by ${request.daysDelayed} days. Please arrange for immediate payment.\n\nThank you.`;
    openWhatsApp(request.debtorMobile, message);
  };

  const handleCall = (request: RecoveryRequest) => {
    setSelectedRecoveryRequest(request);
    setIsCallDialogOpen(true);
  };

  const handleTriggerCall = (request: RecoveryRequest) => {
    triggerCallMutation.mutate(request.id);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", className: "bg-gray-500 dark:bg-gray-600" },
      active: { label: "Active", className: "bg-blue-500 dark:bg-blue-600" },
      completed: { label: "Completed", className: "bg-green-500 dark:bg-green-600" },
      cancelled: { label: "Cancelled", className: "bg-red-500 dark:bg-red-600" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <Badge className={config.className} data-testid={`badge-status-${status}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-page-title">
            🚨 Instant Payment Recovery
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage urgent payment recovery requests with automated follow-ups
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white"
          data-testid="button-create-recovery"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Recovery Request
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-900">
              <TableHead className="font-semibold">Debtor Company Name</TableHead>
              <TableHead className="font-semibold">Mobile Number</TableHead>
              <TableHead className="font-semibold">Amount Due</TableHead>
              <TableHead className="font-semibold">Days Delayed</TableHead>
              <TableHead className="font-semibold">Language</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton loader
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-48" /></TableCell>
                </TableRow>
              ))
            ) : recoveryRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No recovery requests found. Create your first recovery request to get started.
                </TableCell>
              </TableRow>
            ) : (
              recoveryRequests.map((request) => (
                <TableRow key={request.id} data-testid={`row-recovery-${request.id}`}>
                  <TableCell className="font-medium" data-testid={`text-company-${request.id}`}>
                    {request.debtorCompanyName}
                  </TableCell>
                  <TableCell data-testid={`text-mobile-${request.id}`}>
                    {request.debtorMobile}
                  </TableCell>
                  <TableCell className="font-semibold text-red-600 dark:text-red-400" data-testid={`text-amount-${request.id}`}>
                    {formatCurrency(parseFloat(request.totalAmountDue))}
                  </TableCell>
                  <TableCell data-testid={`text-days-${request.id}`}>
                    {request.daysDelayed} days
                  </TableCell>
                  <TableCell data-testid={`text-language-${request.id}`}>
                    {request.language === "hindi" ? "Hindi" : "English"}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(request.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(request)}
                        data-testid={`button-edit-${request.id}`}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(request)}
                        data-testid={`button-delete-${request.id}`}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEmail(request)}
                        data-testid={`button-email-${request.id}`}
                        title="Send Email"
                      >
                        <Mail className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleWhatsApp(request)}
                        data-testid={`button-whatsapp-${request.id}`}
                        title="Send WhatsApp"
                      >
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTriggerCall(request)}
                        disabled={triggerCallMutation.isPending}
                        data-testid={`button-trigger-call-${request.id}`}
                        title="Trigger Call"
                      >
                        <Phone className="h-4 w-4 text-purple-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <InstantRecoveryDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Edit Dialog - TODO: Update InstantRecoveryDialog to support edit mode */}
      {isEditDialogOpen && selectedRecoveryRequest && (
        <InstantRecoveryDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the recovery request for{" "}
              <strong>{selectedRecoveryRequest?.debtorCompanyName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRecoveryRequest && deleteMutation.mutate(selectedRecoveryRequest.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Dialog */}
      {isEmailDialogOpen && selectedRecoveryRequest && (
        <EmailDialog
          isOpen={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          moduleType="debtors"
          recordData={{
            customerName: selectedRecoveryRequest.debtorCompanyName,
            mobile: selectedRecoveryRequest.debtorMobile,
            amountDue: selectedRecoveryRequest.totalAmountDue,
          }}
        />
      )}

      {/* Call Dialog */}
      {isCallDialogOpen && selectedRecoveryRequest && (
        <CallDialog
          isOpen={isCallDialogOpen}
          onOpenChange={setIsCallDialogOpen}
          moduleType="debtors"
          recordData={{
            customerName: selectedRecoveryRequest.debtorCompanyName,
            mobile: selectedRecoveryRequest.debtorMobile,
            amountDue: selectedRecoveryRequest.totalAmountDue,
          }}
        />
      )}
    </div>
  );
}
