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
import type { CommunicationSchedule } from "@shared/schema";

export default function CommunicationSchedules() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CommunicationSchedule | null>(null);
  const [formData, setFormData] = useState({
    module: "invoices",
    communicationType: "call",
    frequency: "weekly",
    dayOfWeek: 1,
    dayOfMonth: 1,
    timeOfDay: "10:00",
    filterCondition: "",
    scriptId: "",
    emailTemplateId: "",
    message: "",
    isActive: "Active",
  });

  const { data: schedules, isLoading } = useQuery<CommunicationSchedule[]>({
    queryKey: ["/api/schedules"],
  });

  const { data: callScripts } = useQuery<any[]>({
    queryKey: ["/api/ringg-scripts"],
  });

  const { data: emailTemplates } = useQuery<any[]>({
    queryKey: ["/api/email-templates"],
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
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/schedules/${id}`),
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
      module: "invoices",
      communicationType: "call",
      frequency: "weekly",
      dayOfWeek: 1,
      dayOfMonth: 1,
      timeOfDay: "10:00",
      filterCondition: "",
      scriptId: "",
      emailTemplateId: "",
      message: "",
      isActive: "Active",
    });
    setEditingSchedule(null);
  };

  const handleEdit = (schedule: CommunicationSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      module: schedule.module,
      communicationType: schedule.communicationType,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek || 1,
      dayOfMonth: schedule.dayOfMonth || 1,
      timeOfDay: schedule.timeOfDay || "10:00",
      filterCondition: schedule.filterCondition || "",
      scriptId: schedule.scriptId || "",
      emailTemplateId: schedule.emailTemplateId || "",
      message: schedule.message || "",
      isActive: schedule.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const submitData: any = {
      module: formData.module,
      communicationType: formData.communicationType,
      frequency: formData.frequency,
      timeOfDay: formData.timeOfDay,
      filterCondition: formData.filterCondition || null,
      isActive: formData.isActive,
    };

    if (formData.frequency === "weekly") {
      submitData.dayOfWeek = Number(formData.dayOfWeek);
    }
    if (formData.frequency === "monthly") {
      submitData.dayOfMonth = Number(formData.dayOfMonth);
    }

    if (formData.communicationType === "call") {
      submitData.scriptId = formData.scriptId || null;
    }
    if (formData.communicationType === "email") {
      submitData.emailTemplateId = formData.emailTemplateId || null;
    }
    if (formData.communicationType === "whatsapp") {
      submitData.message = formData.message;
    }

    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
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

  const getFrequencyDisplay = (schedule: CommunicationSchedule) => {
    if (schedule.frequency === "once") return "Once";
    if (schedule.frequency === "daily") return `Daily at ${schedule.timeOfDay}`;
    if (schedule.frequency === "weekly") {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `Weekly on ${days[schedule.dayOfWeek || 0]} at ${schedule.timeOfDay}`;
    }
    if (schedule.frequency === "monthly") {
      return `Monthly on day ${schedule.dayOfMonth} at ${schedule.timeOfDay}`;
    }
    return schedule.frequency;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communication Schedules</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Automate calls, emails, and WhatsApp messages for your modules
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} data-testid="button-add-schedule">
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? "Edit Schedule" : "Create New Schedule"}
              </DialogTitle>
              <DialogDescription>
                Set up automated communication for your business modules
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
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
                  <Label>Communication Type</Label>
                  <Select
                    value={formData.communicationType}
                    onValueChange={(value) => setFormData({ ...formData, communicationType: value })}
                  >
                    <SelectTrigger data-testid="select-communication-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger data-testid="select-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.frequency === "weekly" && (
                  <div>
                    <Label>Day of Week</Label>
                    <Select
                      value={String(formData.dayOfWeek)}
                      onValueChange={(value) =>
                        setFormData({ ...formData, dayOfWeek: Number(value) })
                      }
                    >
                      <SelectTrigger data-testid="select-day-of-week">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.frequency === "monthly" && (
                  <div>
                    <Label>Day of Month</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dayOfMonth}
                      onChange={(e) =>
                        setFormData({ ...formData, dayOfMonth: Number(e.target.value) })
                      }
                      data-testid="input-day-of-month"
                    />
                  </div>
                )}

                <div>
                  <Label>Time of Day</Label>
                  <Input
                    type="time"
                    value={formData.timeOfDay}
                    onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                    data-testid="input-time"
                  />
                </div>
              </div>

              {formData.communicationType === "call" && (
                <div>
                  <Label>Call Script</Label>
                  <Select
                    value={formData.scriptId}
                    onValueChange={(value) => setFormData({ ...formData, scriptId: value })}
                  >
                    <SelectTrigger data-testid="select-script">
                      <SelectValue placeholder="Select a script" />
                    </SelectTrigger>
                    <SelectContent>
                      {callScripts
                        ?.filter((s) => s.module === formData.module && s.isActive === "Active")
                        .map((script) => (
                          <SelectItem key={script.id} value={script.id}>
                            {script.scriptName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.communicationType === "email" && (
                <div>
                  <Label>Email Template</Label>
                  <Select
                    value={formData.emailTemplateId}
                    onValueChange={(value) => setFormData({ ...formData, emailTemplateId: value })}
                  >
                    <SelectTrigger data-testid="select-template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates
                        ?.filter((t) => t.module === formData.module && t.isActive === "Active")
                        .map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.templateName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.communicationType === "whatsapp" && (
                <div>
                  <Label>WhatsApp Message</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter your WhatsApp message with variables like {customerName}, {amount}, etc."
                    rows={4}
                    data-testid="textarea-message"
                  />
                </div>
              )}

              <div>
                <Label>Filter Condition (JSON)</Label>
                <Textarea
                  value={formData.filterCondition}
                  onChange={(e) => setFormData({ ...formData, filterCondition: e.target.value })}
                  placeholder='{"status": "pending", "daysOverdue": ">30"}'
                  rows={3}
                  data-testid="textarea-filter"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Define conditions to filter which records to communicate with
                </p>
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
                    <TableHead>Module</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id} data-testid={`row-schedule-${schedule.id}`}>
                      <TableCell className="font-medium">{getModuleName(schedule.module)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCommunicationIcon(schedule.communicationType)}
                          <span className="capitalize">{schedule.communicationType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {getFrequencyDisplay(schedule)}
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
                      <TableCell className="text-gray-500 text-sm">
                        {schedule.nextRunAt
                          ? new Date(schedule.nextRunAt).toLocaleString()
                          : "Not scheduled"}
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
