import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Settings2, Calendar, MessageSquare, Mail, Phone, Settings, ArrowRight, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

const followupScheduleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  triggerType: z.enum(["days_before_due", "days_after_due", "fixed_weekly", "fixed_monthly"]),
  timingValue: z.coerce.number().min(1, "Value must be at least 1"),
  weeklyDay: z.coerce.number().min(0).max(6).optional(),
  enableWhatsapp: z.boolean(),
  enableEmail: z.boolean(),
  enableIvr: z.boolean(),
  whatsappTemplateId: z.string().optional(),
  emailTemplateId: z.string().optional(),
  ivrScriptId: z.string().optional(),
  categoryFilter: z.string().optional(),
  isActive: z.boolean(),
  displayOrder: z.coerce.number().optional(),
}).refine(
  (data) => {
    if (data.enableWhatsapp && !data.whatsappTemplateId) {
      return false;
    }
    return true;
  },
  {
    message: "WhatsApp template is required when WhatsApp is enabled",
    path: ["whatsappTemplateId"],
  }
).refine(
  (data) => {
    if (data.enableEmail && !data.emailTemplateId) {
      return false;
    }
    return true;
  },
  {
    message: "Email template is required when Email is enabled",
    path: ["emailTemplateId"],
  }
).refine(
  (data) => {
    if (data.enableIvr && !data.ivrScriptId) {
      return false;
    }
    return true;
  },
  {
    message: "IVR script is required when IVR is enabled",
    path: ["ivrScriptId"],
  }
);

type FollowupScheduleFormValues = z.infer<typeof followupScheduleSchema>;

interface FollowupSchedule {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  timingValue: number;
  weeklyDay?: number;
  enableWhatsapp: boolean;
  enableEmail: boolean;
  enableIvr: boolean;
  whatsappTemplateId?: string;
  emailTemplateId?: string;
  ivrScriptId?: string;
  categoryFilter?: string;
  isActive: boolean;
  displayOrder: number;
}

interface WhatsappTemplate {
  id: string;
  name: string;
  module: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  module: string;
}

interface IVRScript {
  id: string;
  scriptName: string;
  module: string;
}

export default function FollowupAutomationPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfigSheetOpen, setIsConfigSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FollowupSchedule | null>(null);

  const { data: schedules, isLoading } = useQuery<FollowupSchedule[]>({
    queryKey: ["/api/recovery/followup-schedules"],
  });

  const { data: whatsappTemplates } = useQuery<WhatsappTemplate[]>({
    queryKey: ["/api/whatsapp/templates"],
  });

  const { data: emailTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email/templates"],
  });

  const { data: ivrScripts } = useQuery<IVRScript[]>({
    queryKey: ["/api/ringg/script-mappings"],
  });

  const form = useForm<FollowupScheduleFormValues>({
    resolver: zodResolver(followupScheduleSchema),
    defaultValues: {
      name: "",
      description: "",
      triggerType: "days_before_due",
      timingValue: 7,
      weeklyDay: 1,
      enableWhatsapp: false,
      enableEmail: false,
      enableIvr: false,
      whatsappTemplateId: "",
      emailTemplateId: "",
      ivrScriptId: "",
      categoryFilter: "all",
      isActive: true,
      displayOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FollowupScheduleFormValues) => {
      await apiRequest("POST", "/api/recovery/followup-schedules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/followup-schedules"] });
      setIsDialogOpen(false);
      setEditingSchedule(null);
      form.reset();
      toast({
        title: "Success",
        description: "Follow-up schedule created successfully",
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

  const updateMutation = useMutation({
    mutationFn: async (data: FollowupScheduleFormValues & { id: string }) => {
      await apiRequest("PUT", `/api/recovery/followup-schedules/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/followup-schedules"] });
      setIsDialogOpen(false);
      setEditingSchedule(null);
      form.reset();
      toast({
        title: "Success",
        description: "Follow-up schedule updated successfully",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/recovery/followup-schedules/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recovery/followup-schedules"] });
      toast({
        title: "Success",
        description: "Follow-up schedule deleted successfully",
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

  const onSubmit = (data: FollowupScheduleFormValues) => {
    if (editingSchedule) {
      updateMutation.mutate({ ...data, id: editingSchedule.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (schedule: FollowupSchedule) => {
    setEditingSchedule(schedule);
    form.reset({
      name: schedule.name,
      description: schedule.description || "",
      triggerType: schedule.triggerType as any,
      timingValue: schedule.timingValue,
      weeklyDay: schedule.weeklyDay,
      enableWhatsapp: schedule.enableWhatsapp,
      enableEmail: schedule.enableEmail,
      enableIvr: schedule.enableIvr,
      whatsappTemplateId: schedule.whatsappTemplateId || "",
      emailTemplateId: schedule.emailTemplateId || "",
      ivrScriptId: schedule.ivrScriptId || "",
      categoryFilter: schedule.categoryFilter || "all",
      isActive: schedule.isActive,
      displayOrder: schedule.displayOrder,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingSchedule(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const getTriggerLabel = (schedule: FollowupSchedule) => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    switch (schedule.triggerType) {
      case "days_before_due":
        return `${schedule.timingValue} days before due`;
      case "days_after_due":
        return `${schedule.timingValue} days after due`;
      case "fixed_weekly":
        return `Every ${dayNames[schedule.weeklyDay || 0]}`;
      case "fixed_monthly":
        return `Day ${schedule.timingValue} of month`;
      default:
        return schedule.triggerType;
    }
  };

  const triggerType = form.watch("triggerType");
  const enableWhatsapp = form.watch("enableWhatsapp");
  const enableEmail = form.watch("enableEmail");
  const enableIvr = form.watch("enableIvr");

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6 bg-background dark:bg-background">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 bg-background dark:bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="h-8 w-8 text-purple-600 dark:text-purple-400" data-testid="icon-settings" />
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-foreground" data-testid="text-page-title">
              Follow-up Automation
            </h1>
            <p className="text-muted-foreground dark:text-muted-foreground mt-1">
              Configure multiple automated reminder schedules
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Sheet open={isConfigSheetOpen} onOpenChange={setIsConfigSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
                data-testid="button-configuration"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configuration
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-2xl">Communication Configuration</SheetTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfigSheetOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    data-testid="button-close-config"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <SheetDescription>
                  Manage email, WhatsApp, and calling integrations for automated follow-ups
                </SheetDescription>
              </SheetHeader>
              
              <Tabs defaultValue="email" className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Email</span>
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </TabsTrigger>
                  <TabsTrigger value="ringg" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Ringg.ai</span>
                  </TabsTrigger>
                  <TabsTrigger value="telecmi" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Telecmi</span>
                  </TabsTrigger>
                </TabsList>

                {/* Email Settings Tab */}
                <TabsContent value="email" className="space-y-4 mt-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Mail className="h-5 w-5 text-blue-600" />
                        Email Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure Gmail OAuth2 or SMTP settings for sending emails
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/email-config">
                        <Button variant="outline" className="w-full" data-testid="button-email-config">
                          Manage Email Settings
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Mail className="h-5 w-5 text-green-600" />
                        Email Templates
                      </CardTitle>
                      <CardDescription>
                        Create and manage email templates for different modules
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/email-templates">
                        <Button variant="outline" className="w-full" data-testid="button-email-templates">
                          Manage Templates
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* WhatsApp Settings Tab */}
                <TabsContent value="whatsapp" className="space-y-4 mt-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageSquare className="h-5 w-5 text-green-600" />
                        WhatsApp Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure WhatsApp API settings for automated messaging
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/whatsapp-config">
                        <Button variant="outline" className="w-full" data-testid="button-whatsapp-config">
                          Manage WhatsApp Settings
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageSquare className="h-5 w-5 text-emerald-600" />
                        WhatsApp Templates
                      </CardTitle>
                      <CardDescription>
                        Create and manage WhatsApp message templates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/whatsapp-templates">
                        <Button variant="outline" className="w-full" data-testid="button-whatsapp-templates">
                          Manage Templates
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Ringg.ai Settings Tab */}
                <TabsContent value="ringg" className="space-y-4 mt-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Phone className="h-5 w-5 text-purple-600" />
                        Ringg.ai Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure your Ringg.ai API key and settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/ringg-config">
                        <Button variant="outline" className="w-full" data-testid="button-ringg-config">
                          Manage API Settings
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Phone className="h-5 w-5 text-orange-600" />
                        Script Mappings
                      </CardTitle>
                      <CardDescription>
                        Map Ringg.ai call scripts to different modules
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/ringg-script-mappings">
                        <Button variant="outline" className="w-full" data-testid="button-ringg-scripts">
                          Manage Script Mappings
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Phone className="h-5 w-5 text-teal-600" />
                        Call History
                      </CardTitle>
                      <CardDescription>
                        View all call logs, recordings, and outcomes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/ringg-call-history">
                        <Button variant="outline" className="w-full" data-testid="button-call-history">
                          View Call History
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Telecmi Settings Tab */}
                <TabsContent value="telecmi" className="space-y-4 mt-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Phone className="h-5 w-5 text-blue-600" />
                        Telecmi PIOPIY Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure Telecmi PIOPIY for simple & AI-powered voice calls
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/telecmi-config">
                        <Button variant="outline" className="w-full" data-testid="button-telecmi-config">
                          Manage Telecmi Settings
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Phone className="h-5 w-5 text-cyan-600" />
                        Call Templates
                      </CardTitle>
                      <CardDescription>
                        Manage text-to-speech scripts in Hindi/English/Hinglish
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          12 default templates pre-configured for payment reminders
                        </p>
                        <Button variant="outline" className="w-full" disabled data-testid="button-call-templates">
                          Manage Templates (Coming Soon)
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </SheetContent>
          </Sheet>
          
          <Button
            onClick={handleAddNew}
            className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
            data-testid="button-add-schedule"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </Button>
        </div>
      </div>

      {/* Schedules Table */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-purple-900 dark:text-purple-100">Active Follow-up Schedules</CardTitle>
          <CardDescription className="text-purple-700 dark:text-purple-300">
            Manage your automated reminder configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schedules && schedules.length > 0 ? (
            <div className="rounded-md border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-900 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-purple-100 dark:bg-purple-900/20">
                    <TableHead className="text-purple-900 dark:text-purple-100 font-semibold">Name</TableHead>
                    <TableHead className="text-purple-900 dark:text-purple-100 font-semibold">Trigger</TableHead>
                    <TableHead className="text-purple-900 dark:text-purple-100 font-semibold">Channels</TableHead>
                    <TableHead className="text-purple-900 dark:text-purple-100 font-semibold">Category</TableHead>
                    <TableHead className="text-purple-900 dark:text-purple-100 font-semibold">Status</TableHead>
                    <TableHead className="text-purple-900 dark:text-purple-100 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id} data-testid={`row-schedule-${schedule.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground dark:text-foreground">{schedule.name}</p>
                          {schedule.description && (
                            <p className="text-sm text-muted-foreground dark:text-muted-foreground">{schedule.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-foreground dark:text-foreground">{getTriggerLabel(schedule)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {schedule.enableWhatsapp && (
                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded" title="WhatsApp">
                              <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                          )}
                          {schedule.enableEmail && (
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded" title="Email">
                              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                          )}
                          {schedule.enableIvr && (
                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded" title="IVR Call">
                              <Phone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-foreground dark:text-foreground capitalize">
                          {schedule.categoryFilter || "All"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            schedule.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {schedule.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(schedule)}
                            data-testid={`button-edit-${schedule.id}`}
                          >
                            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(schedule.id)}
                            data-testid={`button-delete-${schedule.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-purple-200 dark:border-purple-700">
              <Calendar className="h-12 w-12 text-purple-300 dark:text-purple-600 mx-auto mb-4" />
              <p className="text-muted-foreground dark:text-muted-foreground mb-4">
                No follow-up schedules configured yet
              </p>
              <Button onClick={handleAddNew} variant="outline" data-testid="button-add-first">
                <Plus className="h-4 w-4 mr-2" />
                Add First Schedule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground">
              {editingSchedule ? "Edit Follow-up Schedule" : "Add Follow-up Schedule"}
            </DialogTitle>
            <DialogDescription>
              Configure when and how to send automated reminders to customers
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground dark:text-foreground">Schedule Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 7 Days Before Due Reminder"
                          className="bg-white dark:bg-gray-800"
                          data-testid="input-schedule-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground dark:text-foreground">Description</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Optional description"
                          className="bg-white dark:bg-gray-800"
                          data-testid="input-schedule-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Trigger Settings */}
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Trigger Settings</h3>
                
                <FormField
                  control={form.control}
                  name="triggerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground dark:text-foreground">When to Send</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-gray-800" data-testid="select-trigger-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="days_before_due">Days Before Due Date</SelectItem>
                          <SelectItem value="days_after_due">Days After Due Date</SelectItem>
                          <SelectItem value="fixed_weekly">Fixed Weekly</SelectItem>
                          <SelectItem value="fixed_monthly">Fixed Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(triggerType === "days_before_due" || triggerType === "days_after_due") && (
                  <FormField
                    control={form.control}
                    name="timingValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground dark:text-foreground">Number of Days</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            className="bg-white dark:bg-gray-800"
                            data-testid="input-timing-value"
                          />
                        </FormControl>
                        <FormDescription>
                          {triggerType === "days_before_due" ? "Send reminder this many days before due date" : "Send reminder this many days after due date"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {triggerType === "fixed_weekly" && (
                  <FormField
                    control={form.control}
                    name="weeklyDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground dark:text-foreground">Day of Week</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-gray-800" data-testid="select-weekly-day">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {triggerType === "fixed_monthly" && (
                  <FormField
                    control={form.control}
                    name="timingValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground dark:text-foreground">Day of Month</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            {...field}
                            className="bg-white dark:bg-gray-800"
                            data-testid="input-monthly-day"
                          />
                        </FormControl>
                        <FormDescription>Send reminder on this day each month (1-31)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Communication Channels */}
              <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-900 dark:text-green-100">Communication Channels</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="enableWhatsapp"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 p-3 bg-white dark:bg-gray-800 rounded-md">
                        <FormLabel className="text-foreground dark:text-foreground font-medium flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          WhatsApp
                        </FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-whatsapp" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enableEmail"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 p-3 bg-white dark:bg-gray-800 rounded-md">
                        <FormLabel className="text-foreground dark:text-foreground font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-email" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enableIvr"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 p-3 bg-white dark:bg-gray-800 rounded-md">
                        <FormLabel className="text-foreground dark:text-foreground font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          IVR Call
                        </FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-ivr" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Template/Script Selection */}
              <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">Message Templates & Scripts</h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">Select which templates/scripts to use when sending reminders</p>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* WhatsApp Template */}
                  {enableWhatsapp && (
                    <FormField
                      control={form.control}
                      name="whatsappTemplateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-green-600" />
                            WhatsApp Template
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-gray-800" data-testid="select-whatsapp-template">
                                <SelectValue placeholder="Select WhatsApp template..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {whatsappTemplates && whatsappTemplates.length > 0 ? (
                                whatsappTemplates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name} ({template.module})
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>No templates available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>Choose the WhatsApp message template for this reminder</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Email Template */}
                  {enableEmail && (
                    <FormField
                      control={form.control}
                      name="emailTemplateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-600" />
                            Email Template
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-gray-800" data-testid="select-email-template">
                                <SelectValue placeholder="Select email template..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {emailTemplates && emailTemplates.length > 0 ? (
                                emailTemplates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name} ({template.module})
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>No templates available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>Choose the email template for this reminder</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* IVR Script */}
                  {enableIvr && (
                    <FormField
                      control={form.control}
                      name="ivrScriptId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground dark:text-foreground flex items-center gap-2">
                            <Phone className="h-4 w-4 text-purple-600" />
                            IVR Script
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-gray-800" data-testid="select-ivr-script">
                                <SelectValue placeholder="Select IVR script..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ivrScripts && ivrScripts.length > 0 ? (
                                ivrScripts.map((script) => (
                                  <SelectItem key={script.id} value={script.id}>
                                    {script.scriptName} ({script.module})
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>No scripts available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>Choose the IVR calling script for this reminder</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              {/* Category Filter */}
              <FormField
                control={form.control}
                name="categoryFilter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground dark:text-foreground">Category Filter</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-gray-800" data-testid="select-category-filter">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="alpha">Alpha Only</SelectItem>
                        <SelectItem value="beta">Beta Only</SelectItem>
                        <SelectItem value="gamma">Gamma Only</SelectItem>
                        <SelectItem value="delta">Delta Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Which customer categories should receive this reminder</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active Toggle */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-foreground dark:text-foreground">Active</FormLabel>
                      <FormDescription>Enable or disable this schedule</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Form Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingSchedule(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
                  data-testid="button-save"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingSchedule ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
