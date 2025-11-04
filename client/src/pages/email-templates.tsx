import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmailTemplateSchema, type EmailTemplate, type InsertEmailTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Pencil, Trash2, Mail, Info, ArrowLeft, Eye, Download } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VariablePicker } from "@/components/variable-picker";

const moduleColors: Record<string, string> = {
  leads: "bg-blue-500",
  quotations: "bg-purple-500",
  proforma_invoices: "bg-indigo-500",
  invoices: "bg-green-500",
  receipts: "bg-yellow-500",
  debtors: "bg-orange-500",
  credit_management: "bg-red-500",
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

export default function EmailTemplates() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState<EmailTemplate | null>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const form = useForm<InsertEmailTemplate>({
    resolver: zodResolver(insertEmailTemplateSchema),
    defaultValues: {
      module: "leads",
      name: "",
      subject: "",
      body: "",
      variables: [],
      isDefault: "No",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEmailTemplate) => {
      const response = await apiRequest("POST", "/api/email-templates", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Success",
        description: "Email template created successfully",
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEmailTemplate> }) => {
      const response = await apiRequest("PUT", `/api/email-templates/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Success",
        description: "Email template updated successfully",
      });
      setEditingTemplate(null);
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
      await apiRequest("DELETE", `/api/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Success",
        description: "Email template deleted successfully",
      });
      setDeletingTemplate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/email-templates/seed-defaults", {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Success",
        description: "Default email templates loaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Insert variable at cursor position
  const insertVariableAtCursor = (fieldName: "subject" | "body", variable: string) => {
    const currentValue = form.getValues(fieldName);
    const ref = fieldName === "subject" ? subjectInputRef : bodyTextareaRef;
    
    if (ref.current) {
      const start = ref.current.selectionStart || 0;
      const end = ref.current.selectionEnd || 0;
      const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
      form.setValue(fieldName, newValue);
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        ref.current?.focus();
        ref.current?.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      // If no cursor position, append to end
      form.setValue(fieldName, currentValue + variable);
    }
  };

  // Handle variable insertion from picker
  const handleInsertVariable = (variable: string) => {
    // Determine which field is currently focused
    if (document.activeElement === subjectInputRef.current) {
      insertVariableAtCursor("subject", variable);
    } else if (document.activeElement === bodyTextareaRef.current) {
      insertVariableAtCursor("body", variable);
    } else {
      // Default to body if nothing is focused
      insertVariableAtCursor("body", variable);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent, fieldName: "subject" | "body") => {
    e.preventDefault();
    const variable = e.dataTransfer.getData("text/plain");
    insertVariableAtCursor(fieldName, variable);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCreate = () => {
    form.reset({
      module: "leads",
      name: "",
      subject: "",
      body: "",
      variables: [],
      isDefault: "No",
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    form.reset({
      module: template.module as any,
      name: template.name,
      subject: template.subject,
      body: template.body,
      variables: template.variables || [],
      isDefault: template.isDefault as "Yes" | "No",
    });
    setEditingTemplate(template);
  };

  const handleDelete = (template: EmailTemplate) => {
    setDeletingTemplate(template);
  };

  const onSubmit = (data: InsertEmailTemplate) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setEditingTemplate(null);
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
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Manage email templates for different modules
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/credit-control/followup-automation">
            <Button variant="outline" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Configuration
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => seedDefaultsMutation.mutate()}
            disabled={seedDefaultsMutation.isPending}
            data-testid="button-load-defaults"
          >
            {seedDefaultsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Load Default Templates
          </Button>
          <Button onClick={handleCreate} data-testid="button-create-template">
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Template Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates && templates.length > 0 ? (
              templates.map((template) => (
                <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                  <TableCell>
                    <Badge
                      className={`${moduleColors[template.module]} text-white`}
                      data-testid={`badge-module-${template.id}`}
                    >
                      {moduleLabels[template.module]}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-name-${template.id}`}>{template.name}</TableCell>
                  <TableCell data-testid={`text-subject-${template.id}`}>{template.subject}</TableCell>
                  <TableCell>
                    <Badge
                      variant={template.isDefault === "Yes" ? "default" : "outline"}
                      data-testid={`badge-default-${template.id}`}
                    >
                      {template.isDefault}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewingTemplate(template)}
                        data-testid={`button-preview-${template.id}`}
                        title="Preview Template"
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        data-testid={`button-edit-${template.id}`}
                        title="Edit Template"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template)}
                        data-testid={`button-delete-${template.id}`}
                        title="Delete Template"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  No email templates found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateDialogOpen || !!editingTemplate} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {editingTemplate ? "Edit Email Template" : "Create Email Template"}
            </DialogTitle>
            <DialogDescription>
              Configure email template for automated communications. Click or drag variables from the right panel into your template.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Welcome Email"
                        data-testid="input-template-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        ref={subjectInputRef}
                        onDrop={(e) => handleDrop(e, "subject")}
                        onDragOver={handleDragOver}
                        placeholder="Welcome to {companyName}"
                        data-testid="input-subject"
                      />
                    </FormControl>
                    <FormDescription>
                      Drag variables here or click to insert
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Body * (HTML Supported)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        ref={bodyTextareaRef}
                        onDrop={(e) => handleDrop(e, "body")}
                        onDragOver={handleDragOver}
                        rows={12}
                        placeholder="<p>Dear {customerName},</p>&#10;<p>Thank you for your business...</p>"
                        className="font-mono text-sm"
                        data-testid="textarea-body"
                      />
                    </FormControl>
                    <FormDescription>
                      Supports HTML formatting. Drag variables here or click to insert
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value === "Yes"}
                        onCheckedChange={(checked) => field.onChange(checked ? "Yes" : "No")}
                        data-testid="checkbox-is-default"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Set as Default Template</FormLabel>
                      <FormDescription>
                        This template will be used by default for this module
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <div className="flex justify-between w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPreviewOpen(true)}
                    data-testid="button-preview"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <div className="flex gap-2">
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
                      data-testid="button-submit"
                    >
                      {(createMutation.isPending || updateMutation.isPending) ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {editingTemplate ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        editingTemplate ? "Update Template" : "Create Template"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
        
        <div className="hidden lg:block">
          <VariablePicker
            module={form.watch("module") || "leads"}
            onInsertVariable={handleInsertVariable}
          />
        </div>
      </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template "{deletingTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTemplate && deleteMutation.mutate(deletingTemplate.id)}
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

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Preview
            </DialogTitle>
            <DialogDescription>
              Preview of how your email will appear
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg p-4 bg-white dark:bg-gray-950">
            <div className="space-y-4">
              <div className="border-b pb-3">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Subject:</div>
                <div className="font-semibold text-lg" data-testid="preview-subject">
                  {form.watch("subject") || "No subject"}
                </div>
              </div>
              <div className="border rounded p-4 bg-gray-50 dark:bg-gray-900">
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: form.watch("body") || "<p>No content</p>" }}
                  data-testid="preview-body"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              data-testid="button-close-preview"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewingTemplate} onOpenChange={() => setPreviewingTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Preview
            </DialogTitle>
            <DialogDescription>
              {previewingTemplate?.name} - {moduleLabels[previewingTemplate?.module || "leads"]}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg p-4 bg-white dark:bg-gray-950">
            <div className="space-y-4">
              <div className="border-b pb-3">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Subject:</div>
                <div className="font-semibold text-lg" data-testid="preview-grid-subject">
                  {previewingTemplate?.subject || "No subject"}
                </div>
              </div>
              <div className="border rounded p-4 bg-gray-50 dark:bg-gray-900">
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewingTemplate?.body || "<p>No content</p>" }}
                  data-testid="preview-grid-body"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setPreviewingTemplate(null)}
              data-testid="button-close-grid-preview"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
