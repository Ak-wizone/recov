import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, UserPlus, AlertCircle } from "lucide-react";
import { getSalesPersons, addSalesPerson, deleteSalesPerson } from "@/lib/salesPersonStorage";
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
  const [salesPersons, setSalesPersons] = useState<string[]>([]);
  const [newSalesPerson, setNewSalesPerson] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["/api/masters/customers"],
  });

  useEffect(() => {
    setSalesPersons(getSalesPersons());
  }, []);

  const handleAdd = () => {
    const trimmedName = newSalesPerson.trim();
    
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Please enter a sales person name",
        variant: "destructive",
      });
      return;
    }

    if (salesPersons.some(sp => sp.toLowerCase() === trimmedName.toLowerCase())) {
      toast({
        title: "Error",
        description: "This sales person already exists",
        variant: "destructive",
      });
      return;
    }

    const success = addSalesPerson(trimmedName);
    if (success) {
      setSalesPersons(getSalesPersons());
      setNewSalesPerson("");
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
            <div className="flex gap-2">
              <Input
                placeholder="Enter sales person name"
                value={newSalesPerson}
                onChange={(e) => setNewSalesPerson(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAdd()}
                data-testid="input-new-salesperson"
              />
              <Button onClick={handleAdd} data-testid="button-add-salesperson">
                <UserPlus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

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
                    const associatedCount = customerArray.filter((c: any) => c.salesPerson === person).length;
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-background border rounded-md"
                        data-testid={`salesperson-item-${index}`}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{person}</span>
                          {associatedCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Assigned to {associatedCount} customer{associatedCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(person)}
                          disabled={isLoadingCustomers}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-salesperson-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
