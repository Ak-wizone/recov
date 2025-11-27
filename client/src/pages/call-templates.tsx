import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCallTemplateSchema, type CallTemplate, type InsertCallTemplate } from "@shared/schema";
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
import { Loader2, Plus, Pencil, Trash2, PhoneCall, ArrowLeft, Volume2, Filter } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";

const moduleColors: Record<string, string> = {
  leads: "bg-blue-500",
  quotations: "bg-purple-500",
  proforma_invoices: "bg-indigo-500",
  invoices: "bg-green-500",
  receipts: "bg-yellow-500",
  debtors: "bg-orange-500",
  credit_management: "bg-red-500",
};

const moduleLabels: Record<string, string> = {
  leads: "Leads",
  quotations: "Quotations",
  proforma_invoices: "Proforma Invoices",
  invoices: "Invoices",
  receipts: "Receipts",
  debtors: "Debtors",
  credit_management: "Credit Management",
};

const languageLabels: Record<string, string> = {
  hindi: "Hindi",
  english: "English",
  hinglish: "Hinglish",
};

const languageColors: Record<string, string> = {
  hindi: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  english: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  hinglish: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function CallTemplates() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CallTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<CallTemplate | null>(null);
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [filterModule, setFilterModule] = useState<string>("all");

  const { data: templates, isLoading } = useQuery<CallTemplate[]>({
    queryKey: ["/api/call-templates"],
  });

  const form = useForm<InsertCallTemplate>({
    resolver: zodResolver(insertCallTemplateSchema),
    defaultValues: {
      module: "invoices",
      name: "",
      language: "english",
      scriptText: "",
      variables: [],
      isDefault: "No",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCallTemplate) => {
      const response = await apiRequest("POST", "/api/call-templates", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-templates"] });
      toast({
        title: "Success",
        description: "Call template created successfully",
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCallTemplate> }) => {
      const response = await apiRequest("PUT", `/api/call-templates/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-templates"] });
      toast({
        title: "Success",
        description: "Call template updated successfully",
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
      await apiRequest("DELETE", `/api/call-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-templates"] });
      toast({
        title: "Success",
        description: "Call template deleted successfully",
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

  const handleEdit = (template: CallTemplate) => {
    setEditingTemplate(template);
    form.reset({
      module: template.module as any,
      name: template.name,
      language: template.language as any,
      scriptText: template.scriptText,
      variables: template.variables || [],
      isDefault: template.isDefault as any,
    });
  };

  const handleSubmit = (data: InsertCallTemplate) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredTemplates = templates?.filter((template) => {
    if (filterLanguage !== "all" && template.language !== filterLanguage) return false;
    if (filterModule !== "all" && template.module !== filterModule) return false;
    return true;
  });

  const defaultTemplates = filteredTemplates?.filter(t => t.isDefault === "Yes") || [];
  const customTemplates = filteredTemplates?.filter(t => t.isDefault === "No") || [];

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/credit-control/followup-automation">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Follow-up Automation
          </Button>
        </Link>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            form.reset({
              module: "invoices",
              name: "",
              language: "english",
              scriptText: "",
              variables: [],
              isDefault: "No",
            });
            setIsCreateDialogOpen(true);
          }}
          className="bg-green-600 hover:bg-green-700"
          data-testid="button-create-template"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Templates</div>
          <div className="text-2xl font-bold">{templates?.length || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-sm text-gray-500 dark:text-gray-400">Default Templates</div>
          <div className="text-2xl font-bold">{defaultTemplates.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-sm text-gray-500 dark:text-gray-400">Custom Templates</div>
          <div className="text-2xl font-bold">{customTemplates.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <Select value={filterLanguage} onValueChange={setFilterLanguage}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-language">
              <SelectValue placeholder="All Languages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="hindi">Hindi</SelectItem>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="hinglish">Hinglish</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-module">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="invoices">Invoices</SelectItem>
              <SelectItem value="debtors">Debtors</SelectItem>
              <SelectItem value="credit_management">Credit Management</SelectItem>
            </SelectContent>
          </Select>
          {(filterLanguage !== "all" || filterModule !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterLanguage("all");
                setFilterModule("all");
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Default Templates Section */}
      {!isLoading && defaultTemplates.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Default Templates</h2>
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20">
              {defaultTemplates.length} templates
            </Badge>
          </div>
          <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <Volume2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Default templates are pre-configured and cannot be edited or deleted. You can create custom templates based on these.
            </AlertDescription>
          </Alert>
          <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Name</TableHead>
                  <TableHead className="w-[15%]">Language</TableHead>
                  <TableHead className="w-[15%]">Module</TableHead>
                  <TableHead>Script Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaultTemplates.map((template) => (
                  <TableRow key={template.id} data-testid={`row-default-template-${template.id}`}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge className={languageColors[template.language as keyof typeof languageColors]}>
                        {languageLabels[template.language as keyof typeof languageLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${moduleColors[template.module]} text-white`}>
                        {moduleLabels[template.module]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {template.scriptText.substring(0, 80)}...
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Custom Templates Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">Custom Templates</h2>
          <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">
            {customTemplates.length} templates
          </Badge>
        </div>
        
        {customTemplates.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center">
            <PhoneCall className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Custom Templates Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first custom call script to get started
            </p>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                form.reset({
                  module: "invoices",
                  name: "",
                  language: "english",
                  scriptText: "",
                  variables: [],
                  isDefault: "No",
                });
                setIsCreateDialogOpen(true);
              }}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-create-first-template"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Script Preview</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customTemplates.map((template) => (
                  <TableRow key={template.id} data-testid={`row-custom-template-${template.id}`}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge className={languageColors[template.language as keyof typeof languageColors]}>
                        {languageLabels[template.language as keyof typeof languageLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${moduleColors[template.module]} text-white`}>
                        {moduleLabels[template.module]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {template.scriptText.substring(0, 80)}...
                      </p>
                    </TableCell>
                    <TableCell className="text-right w-[100px]">
                      {template.isDefault === "No" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                            data-testid={`button-edit-${template.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingTemplate(template)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            data-testid={`button-delete-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={isCreateDialogOpen || editingTemplate !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingTemplate(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-green-600" />
              {editingTemplate ? "Edit Call Template" : "Create Call Template"}
            </DialogTitle>
            <DialogDescription>
              Define a text-to-speech script for automated payment reminder calls
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Payment Reminder - Professional Tone"
                        {...field}
                        data-testid="input-template-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-language">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hindi">Hindi</SelectItem>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="hinglish">Hinglish</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="module"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-module">
                            <SelectValue placeholder="Select module" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="invoices">Invoices</SelectItem>
                          <SelectItem value="debtors">Debtors</SelectItem>
                          <SelectItem value="credit_management">Credit Management</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="scriptText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Script Text *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the text that Telecmi will speak during the call..."
                        className="min-h-[150px] font-mono text-sm"
                        {...field}
                        data-testid="textarea-script"
                      />
                    </FormControl>
                    <FormDescription>
                      This text will be converted to speech using Telecmi's TTS engine
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Alert>
                <Volume2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>TTS Tips:</strong> Use clear, simple language. Spell out numbers and abbreviations. 
                  Add pauses with commas and periods for natural speech flow.
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingTemplate(null);
                    form.reset();
                  }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-submit"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingTemplate ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingTemplate ? "Update Template" : "Create Template"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingTemplate !== null} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Call Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTemplate && deleteMutation.mutate(deletingTemplate.id)}
              className="bg-red-600 hover:bg-red-700"
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
