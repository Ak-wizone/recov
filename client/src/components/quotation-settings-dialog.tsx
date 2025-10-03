import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertQuotationSettingsSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface QuotationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuotationSettingsDialog({ open, onOpenChange }: QuotationSettingsDialogProps) {
  const { toast } = useToast();

  const { data: settings } = useQuery({
    queryKey: ["/api/quotation-settings"],
  });

  const form = useForm({
    resolver: zodResolver(insertQuotationSettingsSchema),
    defaultValues: {
      termsAndConditions: "",
    },
  });

  useEffect(() => {
    if (settings?.termsAndConditions) {
      form.reset({
        termsAndConditions: settings.termsAndConditions,
      });
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertQuotationSettingsSchema>) => {
      return await apiRequest("/api/quotation-settings", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-settings"] });
      toast({
        title: "Success",
        description: "Terms & Conditions updated successfully",
      });
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

  const onSubmit = (data: z.infer<typeof insertQuotationSettingsSchema>) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-quotation-settings">
        <DialogHeader>
          <DialogTitle>Quotation Terms & Conditions Settings</DialogTitle>
          <DialogDescription>
            Update the default terms and conditions that will be used for all new quotations
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="termsAndConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={12}
                      placeholder="Enter default terms and conditions for quotations..."
                      className="font-mono text-sm"
                      data-testid="input-terms-settings"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-settings">
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
                {updateMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
