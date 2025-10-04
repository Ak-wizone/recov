import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMasterItemSchema, type InsertMasterItem, type MasterItem } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface MasterItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: MasterItem;
}

const DEFAULT_UNITS = [
  "NOS", "KGS", "MTR", "SQM", "LTR", "ML", "CTN", "BTL", "BAG", "BOX", 
  "ROL", "SET", "PRS", "DOZ", "QTL", "TNE", "CBM", "CFT", "HRS", "DAY", "TRIP"
];

const GST_RATES = ["0%", "5%", "12%", "18%", "28%"];

export default function MasterItemFormDialog({ open, onOpenChange, item }: MasterItemFormDialogProps) {
  const { toast } = useToast();
  const [itemType, setItemType] = useState<"product" | "service">((item?.itemType as "product" | "service") || "product");
  const [customUnits, setCustomUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('customUnits');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [newUnit, setNewUnit] = useState("");
  
  const allUnits = [...DEFAULT_UNITS, ...customUnits].sort();

  const form = useForm<InsertMasterItem>({
    resolver: zodResolver(insertMasterItemSchema),
    defaultValues: {
      itemType: (item?.itemType as "product" | "service") || "product",
      name: item?.name || "",
      description: item?.description || "",
      unit: item?.unit || "",
      tax: item?.tax || "",
      sku: "",
      saleUnitPrice: item?.saleUnitPrice || "",
      buyUnitPrice: item?.buyUnitPrice || "",
      openingQuantity: item?.openingQuantity || "",
      hsn: item?.hsn || "",
      sac: item?.sac || "",
      isActive: (item?.isActive as "Active" | "Inactive") || "Active",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertMasterItem) => 
      apiRequest("POST", "/api/masters/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/items"] });
      toast({
        title: "Success",
        description: "Item created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create item",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertMasterItem) =>
      apiRequest("PUT", `/api/masters/items/${item?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/items"] });
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (open && item) {
      setItemType(item.itemType as "product" | "service");
      form.reset({
        itemType: item.itemType as "product" | "service",
        name: item.name,
        description: item.description || "",
        unit: item.unit,
        tax: item.tax,
        sku: "",
        saleUnitPrice: item.saleUnitPrice || "",
        buyUnitPrice: item.buyUnitPrice || "",
        openingQuantity: item.openingQuantity || "",
        hsn: item.hsn || "",
        sac: item.sac || "",
        isActive: item.isActive as "Active" | "Inactive",
      });
    } else if (open && !item) {
      setItemType("product");
      form.reset({
        itemType: "product",
        name: "",
        description: "",
        unit: "",
        tax: "",
        sku: "",
        saleUnitPrice: "",
        buyUnitPrice: "",
        openingQuantity: "",
        hsn: "",
        sac: "",
        isActive: "Active",
      });
    }
  }, [open, item, form]);

  const handleAddCustomUnit = () => {
    if (newUnit.trim() && !allUnits.includes(newUnit.trim().toUpperCase())) {
      const unitToAdd = newUnit.trim().toUpperCase();
      const updatedCustomUnits = [...customUnits, unitToAdd];
      setCustomUnits(updatedCustomUnits);
      localStorage.setItem('customUnits', JSON.stringify(updatedCustomUnits));
      form.setValue('unit', unitToAdd);
      setNewUnit("");
      setIsAddUnitOpen(false);
      toast({
        title: "Success",
        description: `Custom UOM "${unitToAdd}" added successfully`,
      });
    } else if (allUnits.includes(newUnit.trim().toUpperCase())) {
      toast({
        title: "Error",
        description: "This UOM already exists",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: InsertMasterItem) => {
    if (item) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Item Type Toggle */}
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <FormField
                control={form.control}
                name="itemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Item Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setItemType(value as "product" | "service");
                        }}
                        className="flex gap-6"
                        data-testid="radio-item-type"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="product" id="product" data-testid="radio-product" />
                          <Label htmlFor="product" className="cursor-pointer font-medium">Product</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="service" id="service" data-testid="radio-service" />
                          <Label htmlFor="service" className="cursor-pointer font-medium">Service</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Basic Information */}
            <div className="p-4 bg-mint-50 dark:bg-mint-950/20 rounded-lg border border-mint-200 dark:border-mint-800 space-y-4">
              <h3 className="text-base font-semibold text-mint-900 dark:text-mint-100">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter item name" data-testid="input-name" />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Item description (max 1000 characters)" rows={3} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          if (value === "ADD_CUSTOM") {
                            setIsAddUnitOpen(true);
                          } else {
                            field.onChange(value);
                          }
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-unit">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allUnits.map((unit: string) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                          <SelectItem value="ADD_CUSTOM" className="text-blue-600 font-semibold">
                            + Add Custom UOM
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Rate *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tax">
                            <SelectValue placeholder="Select GST rate" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GST_RATES.map((rate) => (
                            <SelectItem key={rate} value={rate}>{rate}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Pricing Information */}
            <div className="p-4 bg-peach-50 dark:bg-peach-950/20 rounded-lg border border-peach-200 dark:border-peach-800 space-y-4">
              <h3 className="text-base font-semibold text-peach-900 dark:text-peach-100">Pricing Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="saleUnitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Unit Price (₹) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-sale-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buyUnitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buy Unit Price (₹)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-buy-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Product-specific fields */}
            {itemType === "product" && (
              <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg border border-cyan-200 dark:border-cyan-800 space-y-4">
                <h3 className="text-base font-semibold text-cyan-900 dark:text-cyan-100">Product Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="openingQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Quantity</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-opening-quantity" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hsn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HSN Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter HSN code" data-testid="input-hsn" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Service-specific fields */}
            {itemType === "service" && (
              <div className="p-4 bg-lavender-50 dark:bg-lavender-950/20 rounded-lg border border-lavender-200 dark:border-lavender-800 space-y-4">
                <h3 className="text-base font-semibold text-lavender-900 dark:text-lavender-100">Service Details</h3>
                
                <FormField
                  control={form.control}
                  name="sac"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SAC Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter SAC code" data-testid="input-sac" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Status */}
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {item ? "Update Item" : "Create Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom UOM</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="custom-unit">Unit of Measurement</Label>
            <Input
              id="custom-unit"
              placeholder="Enter custom UOM (e.g., PKT, GMS)"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomUnit();
                }
              }}
              data-testid="input-custom-unit"
            />
            <p className="text-sm text-gray-500">
              Custom UOM will be saved and available for future use
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setIsAddUnitOpen(false);
              setNewUnit("");
            }}
            data-testid="button-cancel-unit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddCustomUnit}
            disabled={!newUnit.trim()}
            data-testid="button-add-unit"
          >
            Add UOM
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
