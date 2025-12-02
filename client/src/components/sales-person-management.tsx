import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, UserPlus, AlertCircle, Mail, Phone, User, Building2, Save, Edit2, X, Check } from "lucide-react";
import { getSalesPersons, addSalesPerson, deleteSalesPerson, updateSalesPerson, getBusinessOwner, saveBusinessOwner, type SalesPerson, type BusinessOwner } from "@/lib/salesPersonStorage";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";

export function SalesPersonManagement() {
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [newSalesPerson, setNewSalesPerson] = useState<SalesPerson>({ name: "", email: "", phone: "" });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingPerson, setEditingPerson] = useState<string | null>(null);
  const [editData, setEditData] = useState<SalesPerson>({ name: "", email: "", phone: "" });
  const [businessOwner, setBusinessOwner] = useState<BusinessOwner>({ name: "", email: "", phone: "" });
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const { toast } = useToast();

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["/api/masters/customers"],
  });

  useEffect(() => {
    setSalesPersons(getSalesPersons());
    const owner = getBusinessOwner();
    if (owner) {
      setBusinessOwner(owner);
      setIsEditingOwner(false); // Owner exists, show read-only
    } else {
      setIsEditingOwner(true); // No owner, show edit form
    }
  }, []);

  const handleAdd = () => {
    const trimmedName = newSalesPerson.name.trim();
    
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Please enter a sales person name",
        variant: "destructive",
      });
      return;
    }

    if (salesPersons.some(sp => sp.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({
        title: "Error",
        description: "This sales person already exists",
        variant: "destructive",
      });
      return;
    }

    const success = addSalesPerson(newSalesPerson);
    if (success) {
      setSalesPersons(getSalesPersons());
      setNewSalesPerson({ name: "", email: "", phone: "" });
      toast({
        title: "Success",
        description: "Sales person added successfully",
      });
    }
  };

  const handleDeleteClick = (name: string) => {
    const customerArray = Array.isArray(customers) ? customers : [];
    const associatedCustomers = customerArray.filter((c: any) => c.salesPerson === name);
    
    if (associatedCustomers.length > 0) {
      toast({
        title: "Cannot Delete",
        description: `This sales person is assigned to ${associatedCustomers.length} customer(s). Please reassign them first.`,
        variant: "destructive",
      });
      return;
    }
    
    setDeleteTarget(name);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      const success = deleteSalesPerson(deleteTarget);
      if (success) {
        setSalesPersons(getSalesPersons());
        toast({
          title: "Success",
          description: "Sales person deleted successfully",
        });
      }
      setDeleteTarget(null);
    }
  };

  const startEdit = (person: SalesPerson) => {
    setEditingPerson(person.name);
    setEditData({ ...person });
  };

  const cancelEdit = () => {
    setEditingPerson(null);
    setEditData({ name: "", email: "", phone: "" });
  };

  const saveEdit = () => {
    if (!editData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    const success = updateSalesPerson(editingPerson!, editData);
    if (success) {
      setSalesPersons(getSalesPersons());
      setEditingPerson(null);
      setEditData({ name: "", email: "", phone: "" });
      toast({
        title: "Success",
        description: "Sales person updated successfully",
      });
    }
  };

  const handleSaveBusinessOwner = () => {
    if (!businessOwner.name.trim()) {
      toast({
        title: "Error",
        description: "Business owner name is required",
        variant: "destructive",
      });
      return;
    }

    saveBusinessOwner(businessOwner);
    setIsEditingOwner(false);
    toast({
      title: "Success",
      description: "Business owner details saved successfully",
    });
  };

  return (
    <>
      <Card data-testid="card-sales-person-management">
        <CardHeader>
          <CardTitle>Sales Person Management</CardTitle>
          <CardDescription>
            Manage your sales team members. These names will appear in the sales person dropdown across the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add New Sales Person Form */}
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <h4 className="font-semibold text-sm">Add New Sales Person</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter name"
                      value={newSalesPerson.name}
                      onChange={(e) => setNewSalesPerson({ ...newSalesPerson, name: e.target.value })}
                      className="pl-9"
                      data-testid="input-new-salesperson-name"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Enter email"
                      value={newSalesPerson.email}
                      onChange={(e) => setNewSalesPerson({ ...newSalesPerson, email: e.target.value })}
                      className="pl-9"
                      data-testid="input-new-salesperson-email"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="Enter phone"
                      value={newSalesPerson.phone}
                      onChange={(e) => setNewSalesPerson({ ...newSalesPerson, phone: e.target.value })}
                      className="pl-9"
                      data-testid="input-new-salesperson-phone"
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full md:w-auto" data-testid="button-add-salesperson">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Sales Person
              </Button>
            </div>

            {/* Current Sales Persons List */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-semibold mb-3 text-sm text-muted-foreground">
                Current Sales Persons ({salesPersons.length})
              </h4>
              {salesPersons.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <AlertCircle className="h-4 w-4" />
                  <span>No sales persons configured</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {salesPersons.map((person, index) => {
                    const customerArray = Array.isArray(customers) ? customers : [];
                    const associatedCount = customerArray.filter((c: any) => c.salesPerson === person.name).length;
                    const isEditing = editingPerson === person.name;
                    
                    return (
                      <div
                        key={index}
                        className="p-3 bg-background border rounded-md"
                        data-testid={`salesperson-item-${index}`}
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Name *</Label>
                                <Input
                                  value={editData.name}
                                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                  placeholder="Name"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Email</Label>
                                <Input
                                  value={editData.email}
                                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                  placeholder="Email"
                                  type="email"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Phone</Label>
                                <Input
                                  value={editData.phone}
                                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                  placeholder="Phone"
                                  type="tel"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveEdit}>
                                <Check className="h-4 w-4 mr-1" /> Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit}>
                                <X className="h-4 w-4 mr-1" /> Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{person.name}</span>
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                {person.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> {person.email}
                                  </span>
                                )}
                                {person.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {person.phone}
                                  </span>
                                )}
                                {associatedCount > 0 && (
                                  <span>
                                    Assigned to {associatedCount} customer{associatedCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(person)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(person.name)}
                                disabled={isLoadingCustomers}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-delete-salesperson-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Owner Details Section */}
      <Card data-testid="card-business-owner" className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Owner Details
              </CardTitle>
              <CardDescription>
                Add business owner information for company communications.
              </CardDescription>
            </div>
            {!isEditingOwner && businessOwner.name && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingOwner(true)}
                data-testid="button-edit-owner"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingOwner ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner-name">Owner Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="owner-name"
                      placeholder="Enter owner name"
                      value={businessOwner.name}
                      onChange={(e) => setBusinessOwner({ ...businessOwner, name: e.target.value })}
                      className="pl-9"
                      data-testid="input-owner-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-email">Owner Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="owner-email"
                      type="email"
                      placeholder="Enter owner email"
                      value={businessOwner.email}
                      onChange={(e) => setBusinessOwner({ ...businessOwner, email: e.target.value })}
                      className="pl-9"
                      data-testid="input-owner-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-phone">Owner Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="owner-phone"
                      type="tel"
                      placeholder="Enter owner phone"
                      value={businessOwner.phone}
                      onChange={(e) => setBusinessOwner({ ...businessOwner, phone: e.target.value })}
                      className="pl-9"
                      data-testid="input-owner-phone"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveBusinessOwner} data-testid="button-save-owner">
                  <Save className="h-4 w-4 mr-2" />
                  Save Business Owner Details
                </Button>
                {businessOwner.name && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const owner = getBusinessOwner();
                      if (owner) setBusinessOwner(owner);
                      setIsEditingOwner(false);
                    }}
                    data-testid="button-cancel-owner-edit"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">Owner Name</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{businessOwner.name}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">Owner Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{businessOwner.email || "-"}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">Owner Phone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{businessOwner.phone || "-"}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
