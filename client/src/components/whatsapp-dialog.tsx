import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WhatsappTemplate } from "@shared/schema";
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
import { Loader2, MessageCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";

interface WhatsAppDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  moduleType: "leads" | "quotations" | "proforma_invoices" | "invoices" | "receipts" | "debtors" | "credit_management";
  recordData: {
    customerName?: string;
    customerMobile?: string;
    amount?: string | number;
    invoiceNumber?: string;
    invoiceId?: string;
    quotationNumber?: string;
    quotationId?: string;
    voucherNumber?: string;
    voucherType?: string;
    receiptId?: string;
    date?: string;
    dueDate?: string;
    validUntil?: string;
    [key: string]: any;
  };
}

export function WhatsAppDialog({
  isOpen,
  onOpenChange,
  moduleType,
  recordData,
}: WhatsAppDialogProps) {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");

  const { data: templates, isLoading: isLoadingTemplates } = useQuery<WhatsappTemplate[]>({
    queryKey: ["/api/whatsapp-templates", { module: moduleType }],
    queryFn: async () => {
      const response = await fetch(`/api/whatsapp-templates?module=${moduleType}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      return await response.json();
    },
    enabled: isOpen,
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; message: string; quotationId?: string; invoiceId?: string; receiptId?: string }) => {
      const response = await apiRequest("POST", "/api/send-whatsapp", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "WhatsApp message sent successfully",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send WhatsApp message",
        variant: "destructive",
      });
    },
  });

  const replaceVariables = (text: string, template: WhatsappTemplate, data: Record<string, any>): string => {
    let result = text;
    
    // Replace numbered placeholders {{1}}, {{2}}, {{3}} with actual values
    template.variables.forEach((variable, index) => {
      const placeholderNum = index + 1;
      const value = data[variable];
      
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`\\{\\{${placeholderNum}\\}\\}`, "g");
        result = result.replace(regex, String(value));
      }
    });
    
    return result;
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      setMessage(replaceVariables(template.message, template, recordData));
    }
  };

  const handleSendWhatsApp = () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    const whatsappData: { to: string; message: string; quotationId?: string; invoiceId?: string; receiptId?: string } = {
      to: phoneNumber,
      message
    };

    // Include quotationId if available for enriched quotation messages
    if (recordData.quotationId) {
      whatsappData.quotationId = recordData.quotationId;
    }

    // Include invoiceId if available for enriched invoice messages
    if (recordData.invoiceId) {
      whatsappData.invoiceId = recordData.invoiceId;
    }

    // Include receiptId if available for enriched receipt messages
    if (recordData.receiptId) {
      whatsappData.receiptId = recordData.receiptId;
    }

    sendWhatsAppMutation.mutate(whatsappData);
  };

  const resetForm = () => {
    setSelectedTemplateId("");
    setPhoneNumber("");
    setMessage("");
  };

  useEffect(() => {
    if (isOpen) {
      setPhoneNumber(recordData.customerMobile || "");
      setSelectedTemplateId("");
      setMessage("");
    }
  }, [isOpen, recordData.customerMobile]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="whatsapp-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Send WhatsApp Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoadingTemplates ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-templates">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="template-select">Select WhatsApp Template</Label>
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
                No WhatsApp templates found for this module.{" "}
                <Link href="/whatsapp-templates" className="underline font-medium">
                  Create a template
                </Link>{" "}
                to get started.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone Number</Label>
            <Input
              id="phone-number"
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              data-testid="input-phone"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-message">Message</Label>
            <Textarea
              id="whatsapp-message"
              placeholder="Enter your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              data-testid="textarea-message"
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
            onClick={handleSendWhatsApp}
            disabled={sendWhatsAppMutation.isPending || !phoneNumber || !message}
            data-testid="button-send"
          >
            {sendWhatsAppMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 mr-2" />
                Send WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
