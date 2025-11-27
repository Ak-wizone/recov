import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar, Clock, Mail, Phone, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import type { CommunicationSchedule } from "@shared/schema";

export default function CommunicationSchedules() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CommunicationSchedule | null>(null);
  const [formData, setFormData] = useState({
    scheduleName: "",
    description: "",
    module: "invoices",
    communicationType: "email",
    triggerType: "specific_datetime",
    scheduledDateTime: "",
    daysOffset: 7,
    frequency: "once",
    dayOfWeek: 1,
    dayOfMonth: 1,
    timeOfDay: "10:00",
    filterCondition: "",
    categoryFilter: [] as string[],
    scriptId: "",
    emailTemplateId: "",
    message: "",
    isActive: "Active",
  });

  const { data: schedules, isLoading } = useQuery<CommunicationSchedule[]>({
    queryKey: ["/api/schedules"],
  });

  const { data: callScripts } = useQuery<any[]>({
    queryKey: ["/api/call-templates/invoices"],
  });

  const { data: emailTemplates } = useQuery<any[]>({
    queryKey: ["/api/email-templates"],
  });

  const { data: whatsappTemplates } = useQuery<any[]>({
    queryKey: ["/api/whatsapp/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/schedules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "Schedule created successfully" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/schedules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "Schedule updated successfully" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/schedules/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "Schedule deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      scheduleName: "",
      description: "",
      module: "invoices",
      communicationType: "email",
      triggerType: "specific_datetime",
      scheduledDateTime: "",
      daysOffset: 7,
      frequency: "once",
      dayOfWeek: 1,
      dayOfMonth: 1,
      timeOfDay: "10:00",
      filterCondition: "",
      categoryFilter: [],
      scriptId: "",
      emailTemplateId: "",
      message: "",
      isActive: "Active",
    });
    setEditingSchedule(null);
  };

  const handleEdit = (schedule: CommunicationSchedule) => {
    setEditingSchedule(schedule);
    
    // Parse category filter from both formats: (Alpha|Beta) or (category='alpha' OR category='beta')
    let categoryFilter: string[] = [];
    if (schedule.filterCondition) {
      // Extract content inside parentheses
      const match = schedule.filterCondition.match(/\((.*?)\)/);
      if (match) {
        const content = match[1];
        
        // New pipe-delimited format: (Alpha|Beta)
        if (content.includes('|')) {
          categoryFilter = content.split('|').map(c => c.toLowerCase());
        }
        // Legacy SQL-style format: (category='alpha' OR category='beta')
        else if (content.includes('category=')) {
          const categoryMatches = content.matchAll(/category='(\w+)'/g);
          categoryFilter = Array.from(categoryMatches).map(m => m[1].toLowerCase());
        }
        // Simple string checks for backward compatibility
        else {
          categoryFilter = [];
          if (schedule.filterCondition.includes("Alpha")) categoryFilter.push("alpha");
          if (schedule.filterCondition.includes("Beta")) categoryFilter.push("beta");
          if (schedule.filterCondition.includes("Gamma")) categoryFilter.push("gamma");
          if (schedule.filterCondition.includes("Delta")) categoryFilter.push("delta");
        }
      }
    }
    
    setFormData({
      scheduleName: schedule.scheduleName || "",
      description: schedule.description || "",
      module: schedule.module,
      communicationType: schedule.communicationType,
      triggerType: schedule.triggerType || "specific_datetime",
      scheduledDateTime: schedule.scheduledDateTime ? 
        new Date(schedule.scheduledDateTime).toISOString().slice(0, 16) : "",
      daysOffset: schedule.daysOffset ?? 7,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek || 1,
      dayOfMonth: schedule.dayOfMonth || 1,
      timeOfDay: schedule.timeOfDay || "10:00",
      filterCondition: schedule.filterCondition || "",
      categoryFilter,
      scriptId: schedule.scriptId || "",
      emailTemplateId: schedule.emailTemplateId || "",
      message: schedule.message || "",
      isActive: schedule.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.scheduleName.trim()) {
      toast({ title: "Error", description: "Schedule name is required", variant: "destructive" });
      return;
    }

    const submitData: any = {
      scheduleName: formData.scheduleName,
      description: formData.description,
      module: formData.module,
      communicationType: formData.communicationType,
      triggerType: formData.triggerType,
      frequency: formData.frequency,
      isActive: formData.isActive,
    };

    if (formData.triggerType === "specific_datetime") {
      if (!formData.scheduledDateTime) {
        toast({ title: "Error", description: "Please select date and time", variant: "destructive" });
        return;
      }
      submitData.scheduledDateTime = new Date(formData.scheduledDateTime).toISOString();
    } else {
      submitData.daysOffset = Number(formData.daysOffset);
    }

    if (formData.categoryFilter.length > 0) {
      // Format: (Alpha|Beta|Gamma) - pipe-delimited categories with proper capitalization
      const categories = formData.categoryFilter.map(c => 
        c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()
      );
      submitData.filterCondition = `(${categories.join('|')})`;
    } else if (formData.filterCondition) {
      submitData.filterCondition = formData.filterCondition;
    }

    if (formData.communicationType === "call") {
      if (!formData.scriptId) {
        toast({ title: "Error", description: "Please select a call script", variant: "destructive" });
        return;
      }
      submitData.scriptId = formData.scriptId;
    }
    
    if (formData.communicationType === "email") {
      if (!formData.emailTemplateId) {
        toast({ title: "Error", description: "Please select an email template", variant: "destructive" });
        return;
      }
      submitData.emailTemplateId = formData.emailTemplateId;
    }
    
    if (formData.communicationType === "whatsapp") {
      if (!formData.message) {
        toast({ title: "Error", description: "Please enter WhatsApp message", variant: "destructive" });
        return;
      }
      submitData.message = formData.message;
    }

    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categoryFilter: prev.categoryFilter.includes(category)
        ? prev.categoryFilter.filter(c => c !== category)
        : [...prev.categoryFilter, category]
    }));
  };

  const getModuleName = (module: string) => {
    const names: Record<string, string> = {
      leads: "Leads",
      quotations: "Quotations",
      proforma_invoices: "Proforma Invoices",
      invoices: "Invoices",
      receipts: "Receipts",
      debtors: "Debtors",
      credit_management: "Credit Management",
    };
    return names[module] || module;
  };

  const getTriggerDisplay = (schedule: CommunicationSchedule) => {
    if (schedule.triggerType === "specific_datetime" && schedule.scheduledDateTime) {
      return new Date(schedule.scheduledDateTime).toLocaleString();
    }
    if (schedule.triggerType === "days_before_due") {
      return `${schedule.daysOffset} days before due`;
    }
    if (schedule.triggerType === "days_after_due") {
      return `${schedule.daysOffset} days after due`;
    }
    return "Not configured";
  };

  const getCommunicationIcon = (type: string) => {
    if (type === "call") return <Phone className="h-4 w-4" />;
    if (type === "email") return <Mail className="h-4 w-4" />;
    if (type === "whatsapp") return <MessageSquare className="h-4 w-4" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6 overflow-auto">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto">
      <div className="flex items-center justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} data-testid="button-add-schedule">
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? "Edit Communication Schedule" : "Create Communication Schedule"}
              </DialogTitle>
              <DialogDescription>
                Configure when and how to send automated communications
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="scheduleName">Schedule Name *</Label>
                  <Input
                    id="scheduleName"
                    value={formData.scheduleName}
                    onChange={(e) => setFormData({ ...formData, scheduleName: e.target.value })}
                    placeholder="e.g., Payment Reminder"
                    data-testid="input-schedule-name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    data-testid="input-description"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Communication Settings</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Module</Label>
                      <Select
                        value={formData.module}
                        onValueChange={(value) => setFormData({ ...formData, module: value })}
                      >
                        <SelectTrigger data-testid="select-module">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leads">Leads</SelectItem>
                          <SelectItem value="quotations">Quotations</SelectItem>
                          <SelectItem value="proforma_invoices">Proforma Invoices</SelectItem>
                          <SelectItem value="invoices">Invoices</SelectItem>
                          <SelectItem value="receipts">Receipts</SelectItem>
                          <SelectItem value="debtors">Debtors</SelectItem>
                          <SelectItem value="credit_management">Credit Management</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Communication Type *</Label>
                      <Select
                        value={formData.communicationType}
                        onValueChange={(value) => setFormData({ ...formData, communicationType: value, scriptId: "", emailTemplateId: "", message: "" })}
                      >
                        <SelectTrigger data-testid="select-communication-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="call">IVR Call</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.communicationType === "email" && (
                    <div>
                      <Label>Email Template *</Label>
                      <Select
                        value={formData.emailTemplateId}
                        onValueChange={(value) => setFormData({ ...formData, emailTemplateId: value })}
                      >
                        <SelectTrigger data-testid="select-email-template">
                          <SelectValue placeholder="Select an email template" />
                        </SelectTrigger>
                        <SelectContent>
                          {emailTemplates
                            ?.filter((t) => t.module === formData.module)
                            .map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.communicationType === "whatsapp" && (
                    <div>
                      <Label>WhatsApp Template *</Label>
                      <Select
                        value={formData.message}
                        onValueChange={(value) => setFormData({ ...formData, message: value })}
                      >
                        <SelectTrigger data-testid="select-whatsapp-template">
                          <SelectValue placeholder="Select a WhatsApp template" />
                        </SelectTrigger>
                        <SelectContent>
                          {whatsappTemplates
                            ?.filter((t) => t.isActive)
                            .map((template) => (
                              <SelectItem key={template.id} value={template.templateContent}>
                                {template.templateName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.communicationType === "call" && (
                    <div>
                      <Label>Call Script *</Label>
                      <Select
                        value={formData.scriptId}
                        onValueChange={(value) => setFormData({ ...formData, scriptId: value })}
                      >
                        <SelectTrigger data-testid="select-call-script">
                          <SelectValue placeholder="Select a call script" />
                        </SelectTrigger>
                        <SelectContent>
                          {callScripts?.map((script) => (
                            <SelectItem key={script.id} value={script.id}>
                              {script.scriptName || script.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">When to Send</h3>
                <RadioGroup 
                  value={formData.triggerType} 
                  onValueChange={(value) => setFormData({ ...formData, triggerType: value })}
                  className="space-y-4"
                >
                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="specific_datetime" id="specific" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="specific" className="text-base font-semibold cursor-pointer">
                        Specific Date & Time
                      </Label>
                      {formData.triggerType === "specific_datetime" && (
                        <div className="mt-3">
                          <Input
                            type="datetime-local"
                            value={formData.scheduledDateTime}
                            onChange={(e) => setFormData({ ...formData, scheduledDateTime: e.target.value })}
                            data-testid="input-datetime"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="days_before_due" id="before-due" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="before-due" className="text-base font-semibold cursor-pointer">
                        Days Before Due Date
                      </Label>
                      {formData.triggerType === "days_before_due" && (
                        <div className="mt-3 flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="365"
                            value={formData.daysOffset}
                            onChange={(e) => setFormData({ ...formData, daysOffset: Number(e.target.value) })}
                            className="w-24"
                            data-testid="input-days-before"
                          />
                          <span className="text-sm text-gray-600">days before due date (0 = on due date)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="days_after_due" id="after-due" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="after-due" className="text-base font-semibold cursor-pointer">
                        Days After Due Date
                      </Label>
                      {formData.triggerType === "days_after_due" && (
                        <div className="mt-3 flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="365"
                            value={formData.daysOffset}
                            onChange={(e) => setFormData({ ...formData, daysOffset: Number(e.target.value) })}
                            className="w-24"
                            data-testid="input-days-after"
                          />
                          <span className="text-sm text-gray-600">days after due date (0 = on due date)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Category Filter</h3>
                <div className="flex flex-wrap gap-4">
                  {["alpha", "beta", "gamma", "delta"].map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={category}
                        checked={formData.categoryFilter.includes(category)}
                        onCheckedChange={() => toggleCategory(category)}
                        data-testid={`checkbox-${category}`}
                      />
                      <Label htmlFor={category} className="capitalize cursor-pointer">
                        {category}
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-categories"
                      checked={formData.categoryFilter.length === 0}
                      onCheckedChange={() => setFormData({ ...formData, categoryFilter: [], filterCondition: "" })}
                      data-testid="checkbox-all"
                    />
                    <Label htmlFor="all-categories" className="cursor-pointer font-medium">
                      All Categories
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive === "Active"}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked ? "Active" : "Inactive" })
                  }
                  data-testid="switch-active"
                />
                <Label>Active</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {editingSchedule ? "Update" : "Create"} Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {!schedules || schedules.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No communication schedules configured yet</p>
              <p className="text-sm mt-2">Click "Add Schedule" to automate your communications</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Schedule Name</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id} data-testid={`row-schedule-${schedule.id}`}>
                      <TableCell className="font-medium">
                        {schedule.scheduleName}
                        {schedule.description && (
                          <div className="text-sm text-gray-500">{schedule.description}</div>
                        )}
                      </TableCell>
                      <TableCell>{getModuleName(schedule.module)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCommunicationIcon(schedule.communicationType)}
                          <span className="capitalize">{schedule.communicationType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {getTriggerDisplay(schedule)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={schedule.isActive === "Active" ? "default" : "secondary"}>
                          {schedule.isActive}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {schedule.lastRunAt
                          ? new Date(schedule.lastRunAt).toLocaleString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(schedule)}
                            data-testid={`button-edit-${schedule.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(schedule.id)}
                            data-testid={`button-delete-${schedule.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
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
    </div>
  );
}
