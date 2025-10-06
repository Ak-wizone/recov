import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2, Phone, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";

interface CallDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  moduleType: "leads" | "quotations" | "proforma_invoices" | "invoices" | "receipts" | "debtors" | "credit_management";
  recordData: {
    customerName?: string;
    phoneNumber?: string;
    customerId?: string;
    amount?: string | number;
    invoiceNumber?: string;
    quotationNumber?: string;
    piNumber?: string;
    voucherNumber?: string;
    voucherType?: string;
    dueDate?: string;
    balance?: string | number;
    overdueAmount?: string | number;
    creditLimit?: string | number;
    contactPerson?: string;
    [key: string]: any;
  };
}

interface RinggScript {
  id: string;
  scriptName: string;
  scriptId: string;
}

export function CallDialog({
  isOpen,
  onOpenChange,
  moduleType,
  recordData,
}: CallDialogProps) {
  const { toast } = useToast();
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");

  const { data: scripts, isLoading: isLoadingScripts } = useQuery<RinggScript[]>({
    queryKey: ["/api/ringg-scripts/module", moduleType],
    queryFn: async () => {
      const response = await fetch(`/api/ringg-scripts/module/${moduleType}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch scripts");
      }
      return await response.json();
    },
    enabled: isOpen,
  });

  const makeCallMutation = useMutation({
    mutationFn: async (data: {
      phoneNumber: string;
      scriptId: string;
      customerName: string;
      module: string;
      callContext: string;
      notes?: string;
    }) => {
      const response = await apiRequest("POST", "/api/calls", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Call initiated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      });
    },
  });

  const normalizePhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith("91")) {
      return `+${cleaned}`;
    }
    return phone;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith("91"));
  };

  const handleMakeCall = () => {
    if (!selectedScriptId) {
      toast({
        title: "Error",
        description: "Please select a call script",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Error",
        description: "Phone number must be exactly 10 digits",
        variant: "destructive",
      });
      return;
    }

    const callContext = {
      customerName: recordData.customerName || "",
      customerId: recordData.customerId || "",
      amount: recordData.amount || "",
      invoiceNumber: recordData.invoiceNumber || "",
      quotationNumber: recordData.quotationNumber || "",
      piNumber: recordData.piNumber || "",
      voucherNumber: recordData.voucherNumber || "",
      voucherType: recordData.voucherType || "",
      dueDate: recordData.dueDate || "",
      balance: recordData.balance || "",
      overdueAmount: recordData.overdueAmount || "",
      creditLimit: recordData.creditLimit || "",
      contactPerson: recordData.contactPerson || "",
    };

    const selectedScript = scripts?.find(s => s.id === selectedScriptId);

    makeCallMutation.mutate({
      phoneNumber: normalizePhoneNumber(phoneNumber),
      scriptId: selectedScript?.scriptId || selectedScriptId,
      customerName: recordData.customerName || "",
      module: moduleType,
      callContext: JSON.stringify(callContext),
      notes: notes.trim() || undefined,
    });
  };

  const resetForm = () => {
    setSelectedScriptId("");
    setPhoneNumber("");
    setNotes("");
  };

  useEffect(() => {
    if (isOpen) {
      const phone = recordData.phoneNumber || "";
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length === 10 && !phone.startsWith("+91")) {
        setPhoneNumber(`+91${cleaned}`);
      } else {
        setPhoneNumber(phone);
      }
      setSelectedScriptId("");
      setNotes("");
    }
  }, [isOpen, recordData.phoneNumber]);

  const getContextVariables = () => {
    const variables: { [key: string]: any } = {};
    
    if (recordData.customerName) variables.customerName = recordData.customerName;
    if (recordData.contactPerson) variables.contactPerson = recordData.contactPerson;
    if (recordData.customerId) variables.customerId = recordData.customerId;
    if (recordData.amount) variables.amount = recordData.amount;
    if (recordData.invoiceNumber) variables.invoiceNumber = recordData.invoiceNumber;
    if (recordData.quotationNumber) variables.quotationNumber = recordData.quotationNumber;
    if (recordData.piNumber) variables.piNumber = recordData.piNumber;
    if (recordData.voucherNumber) variables.voucherNumber = recordData.voucherNumber;
    if (recordData.voucherType) variables.voucherType = recordData.voucherType;
    if (recordData.dueDate) variables.dueDate = recordData.dueDate;
    if (recordData.balance) variables.balance = recordData.balance;
    if (recordData.overdueAmount) variables.overdueAmount = recordData.overdueAmount;
    if (recordData.creditLimit) variables.creditLimit = recordData.creditLimit;

    return variables;
  };

  const contextVariables = getContextVariables();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="call-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Make Call
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoadingScripts ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-scripts">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : scripts && scripts.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="script-select">Select Call Script</Label>
              <Select
                value={selectedScriptId}
                onValueChange={setSelectedScriptId}
              >
                <SelectTrigger id="script-select" data-testid="select-script">
                  <SelectValue placeholder="Choose a script..." />
                </SelectTrigger>
                <SelectContent>
                  {scripts.map((script) => (
                    <SelectItem
                      key={script.id}
                      value={script.id}
                      data-testid={`script-option-${script.id}`}
                    >
                      {script.scriptName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Alert data-testid="no-scripts-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No scripts found for this module.{" "}
                <Link href="/ringg-script-mappings" className="underline font-medium">
                  Create a script mapping
                </Link>{" "}
                to get started.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              type="text"
              value={recordData.customerName || ""}
              readOnly
              className="bg-gray-50"
              data-testid="input-customer-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone Number</Label>
            <Input
              id="phone-number"
              type="tel"
              placeholder="+91 XXXXXXXXXX (India)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              data-testid="input-phone"
            />
            {phoneNumber && !validatePhoneNumber(phoneNumber) && (
              <p className="text-sm text-red-500">Phone number must be 10 digits (India format: +91XXXXXXXXXX)</p>
            )}
            <p className="text-xs text-gray-500">+91 will be added automatically for Indian numbers</p>
          </div>

          {Object.keys(contextVariables).length > 0 && (
            <div className="space-y-2">
              <Label>Call Context (Variables to be sent)</Label>
              <div className="bg-gray-50 p-3 rounded-md border space-y-1 max-h-40 overflow-y-auto">
                {Object.entries(contextVariables).map(([key, value]) => (
                  <div key={key} className="text-sm flex justify-between">
                    <span className="font-medium text-gray-600">{key}:</span>
                    <span className="text-gray-800">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this call..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              data-testid="textarea-notes"
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
            onClick={handleMakeCall}
            disabled={makeCallMutation.isPending || !selectedScriptId || !phoneNumber || !validatePhoneNumber(phoneNumber)}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-make-call"
          >
            {makeCallMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Initiating...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Make Call
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
