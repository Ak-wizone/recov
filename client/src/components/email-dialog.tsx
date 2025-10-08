import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EmailTemplate } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";

interface EmailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  moduleType: "leads" | "quotations" | "proforma_invoices" | "invoices" | "receipts" | "debtors" | "credit_management";
  recordData: {
    customerName?: string;
    customerEmail?: string;
    amount?: string | number;
    invoiceNumber?: string;
    invoiceId?: string;
    quotationNumber?: string;
    quotationId?: string;
    voucherNumber?: string;
    voucherType?: string;
    receiptId?: string;
    [key: string]: any;
  };
}

export function EmailDialog({
  isOpen,
  onOpenChange,
  moduleType,
  recordData,
}: EmailDialogProps) {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: templates, isLoading: isLoadingTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates", { module: moduleType }],
    queryFn: async () => {
      const response = await fetch(`/api/email-templates?module=${moduleType}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      return await response.json();
    },
    enabled: isOpen,
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string; quotationId?: string; invoiceId?: string; receiptId?: string }) => {
      const response = await apiRequest("POST", "/api/send-email", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email sent successfully",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const replaceVariables = (text: string, data: Record<string, any>): string => {
    let result = text;
    Object.keys(data).forEach((key) => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`\\{${key}\\}`, "g");
        result = result.replace(regex, String(value));
      }
    });
    return result;
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      setSubject(replaceVariables(template.subject, recordData));
      setBody(replaceVariables(template.body, recordData));
    }
  };

  const handleSendEmail = () => {
    if (!to.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }
    if (!subject.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subject",
        variant: "destructive",
      });
      return;
    }
    if (!body.trim()) {
      toast({
        title: "Error",
        description: "Please enter email body",
        variant: "destructive",
      });
      return;
    }

    const emailData: { to: string; subject: string; body: string; quotationId?: string; invoiceId?: string; receiptId?: string } = {
      to,
      subject,
      body
    };

    // Include quotationId if available for enriched quotation emails
    if (recordData.quotationId) {
      emailData.quotationId = recordData.quotationId;
    }

    // Include invoiceId if available for enriched invoice emails
    if (recordData.invoiceId) {
      emailData.invoiceId = recordData.invoiceId;
    }

    // Include receiptId if available for enriched receipt emails
    if (recordData.receiptId) {
      emailData.receiptId = recordData.receiptId;
    }

    sendEmailMutation.mutate(emailData);
  };

  const resetForm = () => {
    setSelectedTemplateId("");
    setTo("");
    setSubject("");
    setBody("");
  };

  useEffect(() => {
    if (isOpen) {
      setTo(recordData.customerEmail || "");
      setSelectedTemplateId("");
      setSubject("");
      setBody("");
    }
  }, [isOpen, recordData.customerEmail]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="email-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoadingTemplates ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-templates">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="template-select">Select Email Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger id="template-select" data-testid="select-template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id}
                      data-testid={`template-option-${template.id}`}
                    >
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Alert data-testid="no-templates-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No email templates found for this module.{" "}
                <Link href="/email-templates" className="underline font-medium">
                  Create a template
                </Link>{" "}
                to get started.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email-to">To</Label>
            <Input
              id="email-to"
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              data-testid="input-to"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              type="text"
              placeholder="Enter email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data-testid="input-subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-body">Body</Label>
            <Textarea
              id="email-body"
              placeholder="Enter email body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              data-testid="textarea-body"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={sendEmailMutation.isPending || !to || !subject || !body}
            data-testid="button-send"
          >
            {sendEmailMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
