import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertCustomerSchema, type InsertCustomer, type Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  customer?: Customer;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  mode,
  customer,
}: CustomerFormDialogProps) {
  const { toast } = useToast();

  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      amountOwed: "0",
      category: "Alpha",
      assignedUser: undefined,
      mobile: "",
      email: "",
    },
  });

  useEffect(() => {
    if (customer && mode === "edit") {
      form.reset({
        name: customer.name,
        amountOwed: customer.amountOwed,
        category: customer.category as "Alpha" | "Beta" | "Gamma" | "Delta",
        assignedUser: customer.assignedUser as "Manpreet Bedi" | "Bilal Ahamad" | "Anjali Dhiman" | "Princi Soni" | undefined,
        mobile: customer.mobile,
        email: customer.email,
      });
    } else if (mode === "add") {
      form.reset({
        name: "",
        amountOwed: "0",
        category: "Alpha",
        assignedUser: undefined,
        mobile: "",
        email: "",
      });
    }
  }, [customer, mode, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertCustomer) => apiRequest("POST", "/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
      onOpenChange(false);
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
    mutationFn: (data: InsertCustomer) =>
      apiRequest("PATCH", `/api/customers/${customer?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Customer updated successfully",
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

  const onSubmit = (data: InsertCustomer) => {
    if (mode === "add") {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add New Customer" : "Edit Customer"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter customer name"
                      {...field}
                      data-testid="input-customer-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountOwed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Owed *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      data-testid="input-amount-owed"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Alpha">Alpha</SelectItem>
                      <SelectItem value="Beta">Beta</SelectItem>
                      <SelectItem value="Gamma">Gamma</SelectItem>
                      <SelectItem value="Delta">Delta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned User</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-assigned-user">
                        <SelectValue placeholder="Select assigned user (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Manpreet Bedi">Manpreet Bedi</SelectItem>
                      <SelectItem value="Bilal Ahamad">Bilal Ahamad</SelectItem>
                      <SelectItem value="Anjali Dhiman">Anjali Dhiman</SelectItem>
                      <SelectItem value="Princi Soni">Princi Soni</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number *</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      {...field}
                      data-testid="input-mobile"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="customer@email.com"
                      {...field}
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2563EB] hover:bg-[#1D4ED8]"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {mode === "add" ? "Add Customer" : "Update Customer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
