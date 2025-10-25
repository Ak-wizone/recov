import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCallScriptMappingSchema, type CallScriptMapping, type InsertCallScriptMapping } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Pencil, Trash2, Phone } from "lucide-react";

const moduleColors: Record<string, string> = {
  leads: "bg-green-500",
  quotations: "bg-purple-500",
  proforma_invoices: "bg-indigo-500",
  invoices: "bg-blue-500",
  receipts: "bg-yellow-500",
  debtors: "bg-red-500",
  credit_management: "bg-orange-500",
  followup_automation: "bg-pink-500",
};

const moduleLabels: Record<string, string> = {
  leads: "Leads",
  quotations: "Quotations",
  proforma_invoices: "Proforma Invoices",
  invoices: "Invoices",
  receipts: "Receipts",
  debtors: "Debtors",
  credit_management: "Credit Management",
  followup_automation: "Follow-up Automation",
};

export default function RinggScriptMappings() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CallScriptMapping | null>(null);
  const [deletingMapping, setDeletingMapping] = useState<CallScriptMapping | null>(null);

  const { data: mappings, isLoading } = useQuery<CallScriptMapping[]>({
    queryKey: ["/api/ringg-scripts"],
  });

  const form = useForm<InsertCallScriptMapping>({
    resolver: zodResolver(insertCallScriptMappingSchema),
    defaultValues: {
      module: "leads",
      scriptName: "",
      ringgScriptId: "",
      description: "",
      isActive: "Active",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCallScriptMapping) => {
      const response = await apiRequest("POST", "/api/ringg-scripts", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ringg-scripts"] });
      toast({
        title: "Success",
        description: "Script mapping created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCallScriptMapping> }) => {
      const response = await apiRequest("PUT", `/api/ringg-scripts/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ringg-scripts"] });
      toast({
        title: "Success",
        description: "Script mapping updated successfully",
      });
      setEditingMapping(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ringg-scripts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ringg-scripts"] });
      toast({
        title: "Success",
        description: "Script mapping deleted successfully",
      });
      setDeletingMapping(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    form.reset({
      module: "leads",
      scriptName: "",
      ringgScriptId: "",
      description: "",
      isActive: "Active",
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (mapping: CallScriptMapping) => {
    form.reset({
      module: mapping.module as any,
      scriptName: mapping.scriptName,
      ringgScriptId: mapping.ringgScriptId,
      description: mapping.description || "",
      isActive: mapping.isActive as "Active" | "Inactive",
    });
    setEditingMapping(mapping);
  };

  const handleDelete = (mapping: CallScriptMapping) => {
    setDeletingMapping(mapping);
  };

  const onSubmit = (data: InsertCallScriptMapping) => {
    if (editingMapping) {
      updateMutation.mutate({ id: editingMapping.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setEditingMapping(null);
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Script Mappings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Manage Ringg.ai script mappings for different modules
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-add-mapping">
          <Plus className="h-4 w-4 mr-2" />
          Add Script Mapping
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Script Name</TableHead>
              <TableHead>Ringg.ai Script ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings && mappings.length > 0 ? (
              mappings.map((mapping) => (
                <TableRow key={mapping.id} data-testid={`row-mapping-${mapping.id}`}>
                  <TableCell>
                    <Badge
                      className={`${moduleColors[mapping.module]} text-white`}
                      data-testid={`badge-module-${mapping.id}`}
                    >
                      {moduleLabels[mapping.module]}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-script-name-${mapping.id}`}>{mapping.scriptName}</TableCell>
                  <TableCell data-testid={`text-script-id-${mapping.id}`}>{mapping.ringgScriptId}</TableCell>
                  <TableCell data-testid={`text-description-${mapping.id}`}>
                    {mapping.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={mapping.isActive === "Active" ? "default" : "outline"}
                      data-testid={`badge-status-${mapping.id}`}
                    >
                      {mapping.isActive}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(mapping)}
                        data-testid={`button-edit-${mapping.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(mapping)}
                        data-testid={`button-delete-${mapping.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  No script mappings found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateDialogOpen || !!editingMapping} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {editingMapping ? "Edit Script Mapping" : "Add Script Mapping"}
            </DialogTitle>
            <DialogDescription>
              Configure Ringg.ai script mapping for automated calling
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="module"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-module">
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="leads">Leads</SelectItem>
                        <SelectItem value="quotations">Quotations</SelectItem>
                        <SelectItem value="proforma_invoices">Proforma Invoices</SelectItem>
                        <SelectItem value="invoices">Invoices</SelectItem>
                        <SelectItem value="receipts">Receipts</SelectItem>
                        <SelectItem value="debtors">Debtors</SelectItem>
                        <SelectItem value="credit_management">Credit Management</SelectItem>
                        <SelectItem value="followup_automation">Follow-up Automation</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scriptName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Script Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Payment Reminder Script"
                        data-testid="input-script-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ringgScriptId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ringg.ai Script ID *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., script_abc123"
                        data-testid="input-ringg-script-id"
                      />
                    </FormControl>
                    <FormDescription>Find this in your Ringg.ai dashboard</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe when this script should be used..."
                        rows={3}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Mapping"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingMapping} onOpenChange={() => setDeletingMapping(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Script Mapping</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the mapping "{deletingMapping?.scriptName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMapping && deleteMutation.mutate(deletingMapping.id)}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
