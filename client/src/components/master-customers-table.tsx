import { useState } from "react";
import { MasterCustomer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Pencil, Trash2, X } from "lucide-react";

interface MasterCustomersTableProps {
  customers: MasterCustomer[];
  isLoading?: boolean;
  onEdit: (customer: MasterCustomer) => void;
  onDelete: (customer: MasterCustomer) => void;
}

interface ColumnVisibility {
  clientName: boolean;
  category: boolean;
  city: boolean;
  state: boolean;
  primaryContact: boolean;
  primaryMobile: boolean;
  primaryEmail: boolean;
  paymentTerms: boolean;
  creditLimit: boolean;
  openingBalance: boolean;
  salesPerson: boolean;
  status: boolean;
  actions: boolean;
}

export function MasterCustomersTable({
  customers,
  isLoading = false,
  onEdit,
  onDelete,
}: MasterCustomersTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    clientName: true,
    category: true,
    city: true,
    state: true,
    primaryContact: true,
    primaryMobile: true,
    primaryEmail: true,
    paymentTerms: true,
    creditLimit: true,
    openingBalance: true,
    salesPerson: true,
    status: true,
    actions: true,
  });

  const [searchValues, setSearchValues] = useState({
    clientName: "",
    category: "",
    city: "",
    state: "",
    primaryContact: "",
    primaryMobile: "",
    primaryEmail: "",
    paymentTerms: "",
    creditLimit: "",
    openingBalance: "",
    salesPerson: "",
    status: "",
  });

  const updateSearch = (field: keyof typeof searchValues, value: string) => {
    setSearchValues((prev) => ({ ...prev, [field]: value }));
  };

  const clearAllFilters = () => {
    setSearchValues({
      clientName: "",
      category: "",
      city: "",
      state: "",
      primaryContact: "",
      primaryMobile: "",
      primaryEmail: "",
      paymentTerms: "",
      creditLimit: "",
      openingBalance: "",
      salesPerson: "",
      status: "",
    });
  };

  const toggleColumnVisibility = (column: keyof ColumnVisibility) => {
    if (column === "clientName" || column === "category" || column === "actions") {
      return;
    }
    setColumnVisibility((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesClientName = customer.clientName
      .toLowerCase()
      .includes(searchValues.clientName.toLowerCase());
    const matchesCategory = customer.category
      .toLowerCase()
      .includes(searchValues.category.toLowerCase());
    const matchesCity = (customer.city || "")
      .toLowerCase()
      .includes(searchValues.city.toLowerCase());
    const matchesState = (customer.state || "")
      .toLowerCase()
      .includes(searchValues.state.toLowerCase());
    const matchesPrimaryContact = (customer.primaryContactName || "")
      .toLowerCase()
      .includes(searchValues.primaryContact.toLowerCase());
    const matchesPrimaryMobile = (customer.primaryMobile || "")
      .includes(searchValues.primaryMobile);
    const matchesPrimaryEmail = (customer.primaryEmail || "")
      .toLowerCase()
      .includes(searchValues.primaryEmail.toLowerCase());
    const matchesPaymentTerms = customer.paymentTermsDays
      .toLowerCase()
      .includes(searchValues.paymentTerms.toLowerCase());
    const matchesCreditLimit = (customer.creditLimit || "")
      .toString()
      .includes(searchValues.creditLimit);
    const matchesOpeningBalance = (customer.openingBalance || "")
      .toString()
      .includes(searchValues.openingBalance);
    const matchesSalesPerson = (customer.salesPerson || "")
      .toLowerCase()
      .includes(searchValues.salesPerson.toLowerCase());
    const matchesStatus = customer.isActive
      .toLowerCase()
      .includes(searchValues.status.toLowerCase());

    return (
      matchesClientName &&
      matchesCategory &&
      matchesCity &&
      matchesState &&
      matchesPrimaryContact &&
      matchesPrimaryMobile &&
      matchesPrimaryEmail &&
      matchesPaymentTerms &&
      matchesCreditLimit &&
      matchesOpeningBalance &&
      matchesSalesPerson &&
      matchesStatus
    );
  });

  const categoryColors = {
    Alpha: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-300",
    Beta: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-300",
    Gamma: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300",
    Delta: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-300",
  };

  const statusColors = {
    Active: "bg-green-100 text-green-800 border-green-300",
    Inactive: "bg-gray-100 text-gray-800 border-gray-300",
  };

  const formatCurrency = (amount: string | null | undefined) => {
    if (!amount) return "—";
    const num = parseFloat(amount);
    if (isNaN(num)) return "—";
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const hasActiveFilters = Object.values(searchValues).some((value) => value !== "");
  const visibleColumnsCount = Object.values(columnVisibility).filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-gray-300 hover:bg-gray-50"
                data-testid="button-column-visibility"
              >
                <Eye className="h-4 w-4" />
                Columns ({visibleColumnsCount})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={columnVisibility.clientName}
                onCheckedChange={() => toggleColumnVisibility("clientName")}
                disabled
                data-testid="checkbox-column-clientName"
              >
                Client Name (Required)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.category}
                onCheckedChange={() => toggleColumnVisibility("category")}
                disabled
                data-testid="checkbox-column-category"
              >
                Category (Required)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.city}
                onCheckedChange={() => toggleColumnVisibility("city")}
                data-testid="checkbox-column-city"
              >
                City
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.state}
                onCheckedChange={() => toggleColumnVisibility("state")}
                data-testid="checkbox-column-state"
              >
                State
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.primaryContact}
                onCheckedChange={() => toggleColumnVisibility("primaryContact")}
                data-testid="checkbox-column-primaryContact"
              >
                Primary Contact
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.primaryMobile}
                onCheckedChange={() => toggleColumnVisibility("primaryMobile")}
                data-testid="checkbox-column-primaryMobile"
              >
                Primary Mobile
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.primaryEmail}
                onCheckedChange={() => toggleColumnVisibility("primaryEmail")}
                data-testid="checkbox-column-primaryEmail"
              >
                Primary Email
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.paymentTerms}
                onCheckedChange={() => toggleColumnVisibility("paymentTerms")}
                data-testid="checkbox-column-paymentTerms"
              >
                Payment Terms
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.creditLimit}
                onCheckedChange={() => toggleColumnVisibility("creditLimit")}
                data-testid="checkbox-column-creditLimit"
              >
                Credit Limit
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.openingBalance}
                onCheckedChange={() => toggleColumnVisibility("openingBalance")}
                data-testid="checkbox-column-openingBalance"
              >
                Opening Balance
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.salesPerson}
                onCheckedChange={() => toggleColumnVisibility("salesPerson")}
                data-testid="checkbox-column-salesPerson"
              >
                Sales Person
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.status}
                onCheckedChange={() => toggleColumnVisibility("status")}
                data-testid="checkbox-column-status"
              >
                Status
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.actions}
                onCheckedChange={() => toggleColumnVisibility("actions")}
                disabled
                data-testid="checkbox-column-actions"
              >
                Actions (Required)
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="gap-2 text-red-600 hover:text-red-800 hover:bg-red-50"
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
        <div className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-md" data-testid="text-customer-count">
          {filteredCustomers.length} of {customers.length} customers
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-200">
                {columnVisibility.clientName && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[200px]">
                    Client Name
                  </TableHead>
                )}
                {columnVisibility.category && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[120px]">
                    Category
                  </TableHead>
                )}
                {columnVisibility.city && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[150px]">
                    City
                  </TableHead>
                )}
                {columnVisibility.state && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[150px]">
                    State
                  </TableHead>
                )}
                {columnVisibility.primaryContact && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[180px]">
                    Primary Contact
                  </TableHead>
                )}
                {columnVisibility.primaryMobile && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[150px]">
                    Primary Mobile
                  </TableHead>
                )}
                {columnVisibility.primaryEmail && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[200px]">
                    Primary Email
                  </TableHead>
                )}
                {columnVisibility.paymentTerms && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[150px]">
                    Payment Terms (Days)
                  </TableHead>
                )}
                {columnVisibility.creditLimit && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[150px]">
                    Credit Limit (₹)
                  </TableHead>
                )}
                {columnVisibility.openingBalance && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[150px]">
                    Opening Balance (₹)
                  </TableHead>
                )}
                {columnVisibility.salesPerson && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[180px]">
                    Sales Person
                  </TableHead>
                )}
                {columnVisibility.status && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[120px]">
                    Status
                  </TableHead>
                )}
                {columnVisibility.actions && (
                  <TableHead className="py-4 font-semibold text-gray-900 min-w-[120px]">
                    Actions
                  </TableHead>
                )}
              </TableRow>
              <TableRow className="bg-white border-b">
                {columnVisibility.clientName && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search name..."
                      value={searchValues.clientName}
                      onChange={(e) => updateSearch("clientName", e.target.value)}
                      className="h-9"
                      data-testid="input-search-clientName"
                    />
                  </TableHead>
                )}
                {columnVisibility.category && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search category..."
                      value={searchValues.category}
                      onChange={(e) => updateSearch("category", e.target.value)}
                      className="h-9"
                      data-testid="input-search-category"
                    />
                  </TableHead>
                )}
                {columnVisibility.city && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search city..."
                      value={searchValues.city}
                      onChange={(e) => updateSearch("city", e.target.value)}
                      className="h-9"
                      data-testid="input-search-city"
                    />
                  </TableHead>
                )}
                {columnVisibility.state && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search state..."
                      value={searchValues.state}
                      onChange={(e) => updateSearch("state", e.target.value)}
                      className="h-9"
                      data-testid="input-search-state"
                    />
                  </TableHead>
                )}
                {columnVisibility.primaryContact && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search contact..."
                      value={searchValues.primaryContact}
                      onChange={(e) => updateSearch("primaryContact", e.target.value)}
                      className="h-9"
                      data-testid="input-search-primaryContact"
                    />
                  </TableHead>
                )}
                {columnVisibility.primaryMobile && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search mobile..."
                      value={searchValues.primaryMobile}
                      onChange={(e) => updateSearch("primaryMobile", e.target.value)}
                      className="h-9"
                      data-testid="input-search-primaryMobile"
                    />
                  </TableHead>
                )}
                {columnVisibility.primaryEmail && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search email..."
                      value={searchValues.primaryEmail}
                      onChange={(e) => updateSearch("primaryEmail", e.target.value)}
                      className="h-9"
                      data-testid="input-search-primaryEmail"
                    />
                  </TableHead>
                )}
                {columnVisibility.paymentTerms && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search terms..."
                      value={searchValues.paymentTerms}
                      onChange={(e) => updateSearch("paymentTerms", e.target.value)}
                      className="h-9"
                      data-testid="input-search-paymentTerms"
                    />
                  </TableHead>
                )}
                {columnVisibility.creditLimit && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search limit..."
                      value={searchValues.creditLimit}
                      onChange={(e) => updateSearch("creditLimit", e.target.value)}
                      className="h-9"
                      data-testid="input-search-creditLimit"
                    />
                  </TableHead>
                )}
                {columnVisibility.openingBalance && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search balance..."
                      value={searchValues.openingBalance}
                      onChange={(e) => updateSearch("openingBalance", e.target.value)}
                      className="h-9"
                      data-testid="input-search-openingBalance"
                    />
                  </TableHead>
                )}
                {columnVisibility.salesPerson && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search person..."
                      value={searchValues.salesPerson}
                      onChange={(e) => updateSearch("salesPerson", e.target.value)}
                      className="h-9"
                      data-testid="input-search-salesPerson"
                    />
                  </TableHead>
                )}
                {columnVisibility.status && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search status..."
                      value={searchValues.status}
                      onChange={(e) => updateSearch("status", e.target.value)}
                      className="h-9"
                      data-testid="input-search-status"
                    />
                  </TableHead>
                )}
                {columnVisibility.actions && <TableHead className="py-3"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnsCount}
                    className="text-center py-12 text-gray-500"
                    data-testid="text-empty-state"
                  >
                    {hasActiveFilters
                      ? "No customers match your search criteria. Try adjusting your filters."
                      : "No customers found. Add a customer to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors duration-150"
                    data-testid={`row-customer-${customer.id}`}
                  >
                    {columnVisibility.clientName && (
                      <TableCell className="py-4">
                        <div className="font-semibold text-gray-900" data-testid={`text-clientName-${customer.id}`}>
                          {customer.clientName}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">ID: #{customer.id.slice(0, 8)}</div>
                      </TableCell>
                    )}
                    {columnVisibility.category && (
                      <TableCell className="py-4">
                        <Badge
                          className={categoryColors[customer.category as keyof typeof categoryColors]}
                          data-testid={`badge-category-${customer.id}`}
                        >
                          {customer.category}
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.city && (
                      <TableCell className="py-4 text-gray-700" data-testid={`text-city-${customer.id}`}>
                        {customer.city || "—"}
                      </TableCell>
                    )}
                    {columnVisibility.state && (
                      <TableCell className="py-4 text-gray-700" data-testid={`text-state-${customer.id}`}>
                        {customer.state || "—"}
                      </TableCell>
                    )}
                    {columnVisibility.primaryContact && (
                      <TableCell className="py-4 text-gray-700" data-testid={`text-primaryContact-${customer.id}`}>
                        {customer.primaryContactName || "—"}
                      </TableCell>
                    )}
                    {columnVisibility.primaryMobile && (
                      <TableCell className="py-4 text-gray-700" data-testid={`text-primaryMobile-${customer.id}`}>
                        {customer.primaryMobile || "—"}
                      </TableCell>
                    )}
                    {columnVisibility.primaryEmail && (
                      <TableCell className="py-4 text-gray-700" data-testid={`text-primaryEmail-${customer.id}`}>
                        {customer.primaryEmail || "—"}
                      </TableCell>
                    )}
                    {columnVisibility.paymentTerms && (
                      <TableCell className="py-4 text-gray-700" data-testid={`text-paymentTerms-${customer.id}`}>
                        {customer.paymentTermsDays}
                      </TableCell>
                    )}
                    {columnVisibility.creditLimit && (
                      <TableCell className="py-4 font-medium text-gray-900" data-testid={`text-creditLimit-${customer.id}`}>
                        {formatCurrency(customer.creditLimit)}
                      </TableCell>
                    )}
                    {columnVisibility.openingBalance && (
                      <TableCell className="py-4 font-medium text-gray-900" data-testid={`text-openingBalance-${customer.id}`}>
                        {formatCurrency(customer.openingBalance)}
                      </TableCell>
                    )}
                    {columnVisibility.salesPerson && (
                      <TableCell className="py-4 text-gray-700" data-testid={`text-salesPerson-${customer.id}`}>
                        {customer.salesPerson || "—"}
                      </TableCell>
                    )}
                    {columnVisibility.status && (
                      <TableCell className="py-4">
                        <Badge
                          className={statusColors[customer.isActive as keyof typeof statusColors]}
                          data-testid={`badge-status-${customer.id}`}
                        >
                          {customer.isActive}
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.actions && (
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(customer)}
                            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                            data-testid={`button-edit-${customer.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(customer)}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                            data-testid={`button-delete-${customer.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
