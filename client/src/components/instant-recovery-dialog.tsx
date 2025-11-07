import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2, Upload } from "lucide-react";

const formSchema = z.object({
  debtorCompanyName: z.string().min(1, "Company name is required"),
  debtorMobile: z.string().min(10, "Valid mobile number is required"),
  totalAmountDue: z.string().min(1, "Amount is required"),
  daysDelayed: z.string().min(1, "Days delayed is required"),
  callFrequencyMinutes: z.string().min(1, "Call frequency is required"),
  language: z.enum(["hindi", "english"]),
});

type FormValues = z.infer<typeof formSchema>;

interface InstantRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InstantRecoveryDialog({ open, onOpenChange }: InstantRecoveryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      debtorCompanyName: "",
      debtorMobile: "",
      totalAmountDue: "",
      daysDelayed: "",
      callFrequencyMinutes: "",
      language: "hindi",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const formData = new FormData();
      
      formData.append("debtorCompanyName", values.debtorCompanyName);
      formData.append("debtorMobile", values.debtorMobile);
      formData.append("totalAmountDue", values.totalAmountDue);
      formData.append("daysDelayed", values.daysDelayed);
      formData.append("callFrequencyMinutes", values.callFrequencyMinutes);
      formData.append("language", values.language);
      
      if (uploadedFile) {
        formData.append("invoiceFile", uploadedFile);
      }

      const response = await fetch("/api/recovery-requests", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create recovery request");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recovery-requests"] });
      toast({
        title: "Recovery Request Created",
        description: "Instant payment recovery request has been created successfully.",
      });
      form.reset();
      setUploadedFile(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
            🚨 Instant Payment Recovery
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="debtorCompanyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Debtor Company Name *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter company name"
                        data-testid="input-debtor-company"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="debtorMobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="+91XXXXXXXXXX"
                        data-testid="input-debtor-mobile"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalAmountDue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount Due (₹) *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        data-testid="input-amount-due"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daysDelayed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days Delayed *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        placeholder="0"
                        data-testid="input-days-delayed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="callFrequencyMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call Frequency (Minutes) *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        placeholder="30"
                        data-testid="input-call-frequency"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-language">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hindi" data-testid="option-hindi">Hindi</SelectItem>
                        <SelectItem value="english" data-testid="option-english">English</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
              <FormLabel>Invoice Attachment (Optional)</FormLabel>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedFile(file);
                    }
                  }}
                  data-testid="input-invoice-file"
                  className="flex-1"
                />
                {uploadedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
                    data-testid="button-clear-file"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {uploadedFile && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-1">
                  <Upload className="h-4 w-4" />
                  {uploadedFile.name}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-create-recovery"
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Recovery Request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
