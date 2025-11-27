import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWhatsappTemplateSchema, type WhatsappTemplate, type InsertWhatsappTemplate } from "@shared/schema";
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
import { Loader2, Plus, Pencil, Trash2, MessageSquare, Info, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";

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

export default function WhatsAppTemplates() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsappTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<WhatsappTemplate | null>(null);

  const { data: templates, isLoading } = useQuery<WhatsappTemplate[]>({
    queryKey: ["/api/whatsapp-templates"],
  });

  const form = useForm<InsertWhatsappTemplate>({
    resolver: zodResolver(insertWhatsappTemplateSchema),
    defaultValues: {
      module: "leads",
      name: "",
      message: "",
      variables: [],
      isDefault: "No",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertWhatsappTemplate) => {
      const response = await apiRequest("POST", "/api/whatsapp-templates", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-templates"] });
      toast({
        title: "Success",
        description: "WhatsApp template created successfully",
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertWhatsappTemplate> }) => {
      const response = await apiRequest("PUT", `/api/whatsapp-templates/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-templates"] });
      toast({
        title: "Success",
        description: "WhatsApp template updated successfully",
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
      await apiRequest("DELETE", `/api/whatsapp-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-templates"] });
      toast({
        title: "Success",
        description: "WhatsApp template deleted successfully",
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

  const handleCreate = () => {
    form.reset({
      module: "leads",
      name: "",
      message: "",
      variables: [],
      isDefault: "No",
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (template: WhatsappTemplate) => {
    form.reset({
      module: template.module as any,
      name: template.name,
      message: template.message,
      variables: template.variables || [],
      isDefault: template.isDefault as "Yes" | "No",
    });
    setEditingTemplate(template);
  };

  const handleDelete = (template: WhatsappTemplate) => {
    setDeletingTemplate(template);
  };

  const onSubmit = (data: InsertWhatsappTemplate) => {
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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-end gap-2 mb-6">
        <Link href="/credit-control/followup-automation">
          <Button variant="outline" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Configuration
          </Button>
        </Link>
        <Button onClick={handleCreate} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Alert className="mb-6 bg-green-50 border-green-200">
        <Info className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Meta WhatsApp Business API Format:</strong> Use numbered placeholders like {`{{1}}, {{2}}, {{3}}`} for variables. 
          These will be automatically replaced with actual data when sending messages.
        </AlertDescription>
      </Alert>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Template Name</TableHead>
              <TableHead>Message Preview</TableHead>
              <TableHead>Variables</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates && templates.length > 0 ? (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <Badge className={`${moduleColors[template.module]} text-white`}>
                      {moduleLabels[template.module]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-sm text-gray-600 truncate whitespace-pre-wrap line-clamp-2">
                      {template.message}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.variables && template.variables.length > 0 ? (
                        template.variables.map((variable, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.isDefault === "Yes" && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                        data-testid={`button-edit-${template.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template)}
                        data-testid={`button-delete-${template.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No WhatsApp templates found. Create your first template to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateDialogOpen || !!editingTemplate} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit WhatsApp Template" : "Create WhatsApp Template"}
            </DialogTitle>
            <DialogDescription>
              Use numbered placeholders like {`{{1}}, {{2}}, {{3}}`} in your message. They will be replaced with actual variable values.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="module"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Invoice Notification" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`Dear {{1}},\n\nYour invoice {{2}} has been generated.\n\nAmount: ₹{{3}}\n\nThank you!`}
                        className="min-h-[200px] font-mono text-sm"
                        {...field}
                        data-testid="textarea-message"
                      />
                    </FormControl>
                    <FormDescription>
                      Use {`{{1}}, {{2}}, {{3}}`}, etc. for variables. Use *text* for bold formatting.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="variables"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variables (comma-separated)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., customerName, invoiceNumber, amount"
                        value={field.value?.join(", ") || ""}
                        onChange={(e) => {
                          const variables = e.target.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter((v) => v);
                          field.onChange(variables);
                        }}
                        data-testid="input-variables"
                      />
                    </FormControl>
                    <FormDescription>
                      List the variable names that correspond to {`{{1}}, {{2}}, {{3}}`}, etc. in order.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value === "Yes"}
                        onCheckedChange={(checked) => field.onChange(checked ? "Yes" : "No")}
                        data-testid="checkbox-default"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">Set as default template for this module</FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete WhatsApp Template</AlertDialogTitle>
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
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
