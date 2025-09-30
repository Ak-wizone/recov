import { useState } from "react";
import { Customer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageCircle, Mail, DollarSign, Edit, Trash2, History, Calendar, ChevronDown, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface CustomersTableProps {
  customers: Customer[];
  isLoading: boolean;
  onEdit: (customer: Customer) => void;
  onPayment: (customer: Customer) => void;
  onPaymentHistory: (customer: Customer) => void;
  onFollowUp: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onWhatsApp: (customer: Customer) => void;
  onEmail: (customer: Customer) => void;
  onBulkDelete?: (ids: string[]) => void;
}

export function CustomersTable({
  customers,
  isLoading,
  onEdit,
  onPayment,
  onPaymentHistory,
  onFollowUp,
  onDelete,
  onWhatsApp,
  onEmail,
  onBulkDelete,
}: CustomersTableProps) {
  const [sortField, setSortField] = useState<keyof Customer | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Column search states
  const [nameSearch, setNameSearch] = useState("");
  const [amountSearch, setAmountSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [lastFollowUpSearch, setLastFollowUpSearch] = useState("");
  const [nextFollowUpSearch, setNextFollowUpSearch] = useState("");

  const handleSort = (field: keyof Customer) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredCustomers.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id));
    }
  };

  const handleBulkDeleteClick = () => {
    if (onBulkDelete && selectedIds.length > 0) {
      onBulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  // Filter customers based on column searches (AND logic)
  const filteredCustomers = customers.filter((customer) => {
    const matchesName = customer.name.toLowerCase().includes(nameSearch.toLowerCase());
    const matchesAmount = customer.amountOwed.toString().includes(amountSearch);
    const matchesCategory = customer.category.toLowerCase().includes(categorySearch.toLowerCase());
    const matchesMobile = customer.mobile.includes(mobileSearch);
    const matchesEmail = customer.email.toLowerCase().includes(emailSearch.toLowerCase());
    const matchesLastFollowUp = (customer.lastFollowUpRemarks || "").toLowerCase().includes(lastFollowUpSearch.toLowerCase());
    const nextFollowUpStr = customer.nextFollowUpDate 
      ? `${format(new Date(customer.nextFollowUpDate), "MMM dd, yyyy HH:mm")} ${customer.nextFollowUpType || ""}`
      : "";
    const matchesNextFollowUp = nextFollowUpStr.toLowerCase().includes(nextFollowUpSearch.toLowerCase());

    return matchesName && matchesAmount && matchesCategory && matchesMobile && 
           matchesEmail && matchesLastFollowUp && matchesNextFollowUp;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === "amountOwed") {
      aValue = parseFloat(a.amountOwed);
      bValue = parseFloat(b.amountOwed);
    }

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === "asc" ? 1 : -1;
    if (bValue == null) return sortDirection === "asc" ? -1 : 1;

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const categoryColors = {
    Alpha: "bg-green-100 text-green-800",
    Beta: "bg-blue-100 text-blue-800",
    Gamma: "bg-yellow-100 text-yellow-800",
    Delta: "bg-red-100 text-red-800",
  };

  const followUpTypeColors = {
    Meeting: "bg-purple-100 text-purple-800",
    Call: "bg-blue-100 text-blue-800",
    WhatsApp: "bg-green-100 text-green-800",
    Email: "bg-orange-100 text-orange-800",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const truncate = (text: string | null | undefined, maxLength: number) => {
    if (!text) return "—";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <Card className="border border-[#E2E8F0]">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[#E2E8F0] shadow-sm">
      <CardHeader className="border-b border-[#E2E8F0] bg-white">
        <CardTitle className="text-lg font-semibold text-[#1E293B]">
          Customer Debtors Management
        </CardTitle>
        <CardDescription>
          Manage customer information, payments, and communication
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between" data-testid="bulk-action-bar">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.length} customer{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleBulkDeleteClick}
              data-testid="button-bulk-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedIds.length})
            </Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              {/* Header Row with Column Names */}
              <TableRow className="bg-[#F1F5F9] border-b-2 border-gray-300">
                <TableHead className="w-[50px] py-4 font-semibold">
                  <Checkbox
                    checked={selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-[#E2E8F0] py-4 font-semibold transition-colors"
                  onClick={() => handleSort("name")}
                  data-testid="header-name"
                >
                  <div className="flex items-center">
                    Customer Name
                    <span className="ml-1">↕</span>
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-[#E2E8F0] py-4 font-semibold transition-colors"
                  onClick={() => handleSort("amountOwed")}
                  data-testid="header-amount"
                >
                  <div className="flex items-center">
                    Amount Owed
                    <span className="ml-1">↕</span>
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-[#E2E8F0] py-4 font-semibold transition-colors"
                  onClick={() => handleSort("category")}
                  data-testid="header-category"
                >
                  <div className="flex items-center">
                    Category
                    <span className="ml-1">↕</span>
                  </div>
                </TableHead>
                <TableHead className="py-4 font-semibold">Mobile Number</TableHead>
                <TableHead className="py-4 font-semibold">Email Address</TableHead>
                <TableHead className="py-4 font-semibold">Last Follow Up</TableHead>
                <TableHead className="py-4 font-semibold">Next Follow Up</TableHead>
                <TableHead className="py-4 font-semibold">Actions</TableHead>
              </TableRow>
              {/* Search Row */}
              <TableRow className="bg-white border-b">
                <TableHead className="py-3"></TableHead>
                <TableHead className="py-3">
                  <Input
                    type="text"
                    placeholder="Search name..."
                    value={nameSearch}
                    onChange={(e) => setNameSearch(e.target.value)}
                    className="h-10 min-w-[140px]"
                    data-testid="input-search-name"
                  />
                </TableHead>
                <TableHead className="py-3">
                  <Input
                    type="text"
                    placeholder="Search amount..."
                    value={amountSearch}
                    onChange={(e) => setAmountSearch(e.target.value)}
                    className="h-10 min-w-[140px]"
                    data-testid="input-search-amount"
                  />
                </TableHead>
                <TableHead className="py-3">
                  <Input
                    type="text"
                    placeholder="Search category..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="h-10 min-w-[140px]"
                    data-testid="input-search-category"
                  />
                </TableHead>
                <TableHead className="py-3">
                  <Input
                    type="text"
                    placeholder="Search mobile..."
                    value={mobileSearch}
                    onChange={(e) => setMobileSearch(e.target.value)}
                    className="h-10 min-w-[140px]"
                    data-testid="input-search-mobile"
                  />
                </TableHead>
                <TableHead className="py-3">
                  <Input
                    type="text"
                    placeholder="Search email..."
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    className="h-10 min-w-[140px]"
                    data-testid="input-search-email"
                  />
                </TableHead>
                <TableHead className="py-3">
                  <Input
                    type="text"
                    placeholder="Search remarks..."
                    value={lastFollowUpSearch}
                    onChange={(e) => setLastFollowUpSearch(e.target.value)}
                    className="h-10 min-w-[140px]"
                    data-testid="input-search-last-followup"
                  />
                </TableHead>
                <TableHead className="py-3">
                  <Input
                    type="text"
                    placeholder="Search next..."
                    value={nextFollowUpSearch}
                    onChange={(e) => setNextFollowUpSearch(e.target.value)}
                    className="h-10 min-w-[140px]"
                    data-testid="input-search-next-followup"
                  />
                </TableHead>
                <TableHead className="py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No customers found. Add a customer to get started.
                  </TableCell>
                </TableRow>
              ) : (
                sortedCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="border-b border-gray-200 hover:bg-[#F8FAFC] transition-colors"
                    data-testid={`row-customer-${customer.id}`}
                  >
                    <TableCell className="py-4">
                      <Checkbox
                        checked={selectedIds.includes(customer.id)}
                        onCheckedChange={(checked) => handleSelectOne(customer.id, checked as boolean)}
                        data-testid={`checkbox-customer-${customer.id}`}
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 bg-[#2563EB] text-white">
                          <AvatarFallback className="bg-[#2563EB] text-white">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <div className="font-medium text-[#1E293B]" data-testid={`text-customer-name-${customer.id}`}>
                            {customer.name}
                          </div>
                          <div className="text-sm text-gray-500">ID: #{customer.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-lg font-semibold text-[#DC2626]" data-testid={`text-amount-${customer.id}`}>
                        ${parseFloat(customer.amountOwed).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        className={categoryColors[customer.category as keyof typeof categoryColors]}
                        data-testid={`badge-category-${customer.id}`}
                      >
                        {customer.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm text-[#1E293B]" data-testid={`text-mobile-${customer.id}`}>
                        {customer.mobile}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm text-[#1E293B]" data-testid={`text-email-${customer.id}`}>
                        {customer.email}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm text-gray-700" data-testid={`text-last-followup-${customer.id}`}>
                        {truncate(customer.lastFollowUpRemarks, 50)}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1" data-testid={`text-next-followup-${customer.id}`}>
                        {customer.nextFollowUpDate ? (
                          <>
                            <div className="text-sm font-medium text-gray-900">
                              {format(new Date(customer.nextFollowUpDate), "MMM dd, yyyy HH:mm")}
                            </div>
                            {customer.nextFollowUpType && (
                              <Badge
                                className={followUpTypeColors[customer.nextFollowUpType as keyof typeof followUpTypeColors]}
                                data-testid={`badge-followup-type-${customer.id}`}
                              >
                                {customer.nextFollowUpType}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="min-w-[100px]"
                            data-testid={`button-actions-${customer.id}`}
                          >
                            Actions
                            <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            onClick={() => onWhatsApp(customer)}
                            data-testid={`button-whatsapp-${customer.id}`}
                          >
                            <MessageCircle className="mr-2 h-4 w-4 text-[#25D366]" />
                            Send WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEmail(customer)}
                            data-testid={`button-email-${customer.id}`}
                          >
                            <Mail className="mr-2 h-4 w-4 text-blue-500" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onPayment(customer)}
                            data-testid={`button-payment-${customer.id}`}
                          >
                            <DollarSign className="mr-2 h-4 w-4 text-[#059669]" />
                            Record Payment
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onPaymentHistory(customer)}
                            data-testid={`button-history-${customer.id}`}
                          >
                            <History className="mr-2 h-4 w-4 text-gray-600" />
                            Payment History
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onFollowUp(customer)}
                            data-testid={`button-followup-${customer.id}`}
                          >
                            <Calendar className="mr-2 h-4 w-4 text-purple-500" />
                            Schedule Follow Up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEdit(customer)}
                            data-testid={`button-edit-${customer.id}`}
                          >
                            <Edit className="mr-2 h-4 w-4 text-yellow-600" />
                            Edit Customer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(customer)}
                            className="text-red-600 focus:text-red-600"
                            data-testid={`button-delete-${customer.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
