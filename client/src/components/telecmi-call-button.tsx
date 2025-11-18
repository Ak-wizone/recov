import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Phone, Loader2, Radio, Zap } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { CallTemplate } from "@shared/schema";

interface TelecmiCallButtonProps {
  customerPhone: string;
  customerName: string;
  module: "invoices" | "debtors" | "quotations" | "leads" | "receipts" | "proforma_invoices" | "credit_management";
  invoiceNumber?: string;
  amount?: number;
  daysOverdue?: number;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "destructive";
  icon?: React.ReactNode;
}

export function TelecmiCallButton({
  customerPhone,
  customerName,
  module,
  invoiceNumber,
  amount,
  daysOverdue,
  buttonText = "Call Customer",
  buttonVariant = "outline",
  icon = <Phone className="h-4 w-4" />,
}: TelecmiCallButtonProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [language, setLanguage] = useState<"hindi" | "english" | "hinglish">("english");
  const [callMode, setCallMode] = useState<"simple" | "ai">("simple");

  // Fetch available call templates for this module
  const { data: templates, isLoading: templatesLoading } = useQuery<CallTemplate[]>({
    queryKey: ["/api/call-templates", module],
    enabled: dialogOpen,
  });

  const makeCallMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/telecmi/make-call", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-logs"] });
      toast({
        title: "Call Initiated",
        description: `Calling ${customerName} at ${customerPhone}`,
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedTemplate("");
    setLanguage("english");
    setCallMode("simple");
  };

  const handleMakeCall = () => {
    if (!selectedTemplate) {
      toast({
        title: "Template Required",
        description: "Please select a call template",
        variant: "destructive",
      });
      return;
    }

    const selectedTemplateData = templates?.find(t => t.id === selectedTemplate);
    if (!selectedTemplateData) {
      toast({
        title: "Invalid Template",
        description: "Selected template not found",
        variant: "destructive",
      });
      return;
    }

    makeCallMutation.mutate({
      toNumber: customerPhone,
      templateId: selectedTemplate,
      language,
      callMode,
      module,
      variables: {
        customerName,
        invoiceNumber: invoiceNumber || "",
        amount: amount?.toString() || "0",
        daysOverdue: daysOverdue?.toString() || "0",
        companyName: "RECOV",
      },
    });
  };

  // Get template suggestions based on days overdue
  const getSuggestedTemplate = () => {
    if (!templates || templates.length === 0) return null;
    
    if (!daysOverdue || daysOverdue === 0) {
      return templates.find(t => t.name === "Payment Due Reminder" && t.language === language);
    } else if (daysOverdue <= 7) {
      return templates.find(t => t.name === "7 Days Overdue Notice" && t.language === language);
    } else if (daysOverdue <= 15) {
      return templates.find(t => t.name === "15 Days Overdue - Urgent" && t.language === language);
    } else {
      return templates.find(t => t.name === "30 Days Overdue - Final Notice" && t.language === language);
    }
  };

  // Auto-select suggested template when language changes
  const handleLanguageChange = (newLanguage: "hindi" | "english" | "hinglish") => {
    setLanguage(newLanguage);
    const suggested = getSuggestedTemplate();
    if (suggested) {
      setSelectedTemplate(suggested.id);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm" data-testid="button-telecmi-call">
          {icon}
          <span className="ml-2">{buttonText}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Initiate Call via Telecmi
          </DialogTitle>
          <DialogDescription>
            Call {customerName} at {customerPhone}
            {daysOverdue !== undefined && daysOverdue > 0 && (
              <span className="text-red-600 font-medium"> ({daysOverdue} days overdue)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Language Selection */}
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hindi">Hindi (हिंदी)</SelectItem>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hinglish">Hinglish (हिंग्लिश)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Call Template Selection */}
          <div className="space-y-2">
            <Label>Call Template</Label>
            {templatesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates
                    ?.filter(t => t.language === language)
                    .map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.isDefault === "Yes" && " (Default)"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            {selectedTemplate && templates && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md text-sm">
                <p className="font-medium mb-1">Script Preview:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {templates.find(t => t.id === selectedTemplate)?.scriptText}
                </p>
              </div>
            )}
          </div>

          {/* Call Mode Selection */}
          <div className="space-y-2">
            <Label>Call Mode</Label>
            <RadioGroup value={callMode} onValueChange={(value: "simple" | "ai") => setCallMode(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-900">
                <RadioGroupItem value="simple" id="simple" data-testid="radio-simple" />
                <Label htmlFor="simple" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Radio className="h-4 w-4 text-gray-600" />
                  <div>
                    <div className="font-medium">Simple TTS Call</div>
                    <div className="text-xs text-gray-500">Pre-recorded text-to-speech message</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-900">
                <RadioGroupItem value="ai" id="ai" data-testid="radio-ai" />
                <Label htmlFor="ai" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="font-medium">AI Conversation</div>
                    <div className="text-xs text-gray-500">Interactive AI-powered conversation (Coming Soon)</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={makeCallMutation.isPending}
            data-testid="button-cancel-call"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMakeCall}
            disabled={makeCallMutation.isPending || !selectedTemplate}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-confirm-call"
          >
            {makeCallMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calling...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Make Call
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
