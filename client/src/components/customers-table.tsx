import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Mail, DollarSign, Edit, Trash2, History, Calendar, ChevronDown, MoreVertical, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [sortField, setSortField] = useState<keyof Customer | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Column chooser states
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('debtors-table-columns');
    return stored ? JSON.parse(stored) : {
      name: true,
      amountOwed: true,
      category: true,
      assignedUser: true,
      mobile: true,
      email: true,
      lastFollowUp: true,
      remarks: true,
      nextFollowUp: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('debtors-table-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const columns = [
    { id: 'name', label: 'Customer Name' },
    { id: 'amountOwed', label: 'Amount Owed' },
    { id: 'category', label: 'Category' },
    { id: 'assignedUser', label: 'Assigned User' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'email', label: 'Email' },
    { id: 'lastFollowUp', label: 'Last Follow Up' },
    { id: 'remarks', label: 'Remarks' },
    { id: 'nextFollowUp', label: 'Next Follow Up' },
  ];
  
  // Column search states
  const [nameSearch, setNameSearch] = useState("");
  const [amountSearch, setAmountSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [assignedUserSearch, setAssignedUserSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [lastFollowUpSearch, setLastFollowUpSearch] = useState("");
  const [remarksSearch, setRemarksSearch] = useState("");
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

  const handleCategoryChange = async (customerId: string, newCategory: string) => {
    try {
      await apiRequest("PATCH", `/api/customers/${customerId}`, { category: newCategory });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAssignedUserChange = async (customerId: string, newAssignedUser: string) => {
    try {
      await apiRequest("PATCH", `/api/customers/${customerId}`, { assignedUser: newAssignedUser });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Assigned user updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter customers based on column searches (AND logic)
  const filteredCustomers = customers.filter((customer) => {
    const matchesName = customer.name.toLowerCase().includes(nameSearch.toLowerCase());
    const matchesAmount = customer.amountOwed.toString().includes(amountSearch);
    const matchesCategory = customer.category.toLowerCase().includes(categorySearch.toLowerCase());
    const matchesAssignedUser = (customer.assignedUser || "").toLowerCase().includes(assignedUserSearch.toLowerCase());
    const matchesMobile = customer.mobile.includes(mobileSearch);
    const matchesEmail = customer.email.toLowerCase().includes(emailSearch.toLowerCase());
    const lastFollowUpStr = customer.lastFollowUpDate 
      ? `${format(new Date(customer.lastFollowUpDate), "MMM dd, yyyy HH:mm")} ${customer.lastFollowUpType || ""}`
      : "";
    const matchesLastFollowUp = lastFollowUpStr.toLowerCase().includes(lastFollowUpSearch.toLowerCase());
    const matchesRemarks = (customer.lastFollowUpRemarks || "").toLowerCase().includes(remarksSearch.toLowerCase());
    const nextFollowUpStr = customer.nextFollowUpDate 
      ? `${format(new Date(customer.nextFollowUpDate), "MMM dd, yyyy HH:mm")} ${customer.nextFollowUpType || ""}`
      : "";
    const matchesNextFollowUp = nextFollowUpStr.toLowerCase().includes(nextFollowUpSearch.toLowerCase());

    return matchesName && matchesAmount && matchesCategory && matchesAssignedUser && matchesMobile && 
           matchesEmail && matchesLastFollowUp && matchesRemarks && matchesNextFollowUp;
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

  // Pagination
  const totalPages = Math.ceil(sortedCustomers.length / pageSize);
  const paginatedCustomers = sortedCustomers.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white hover:bg-gray-50"
                onClick={() => {
                  const selectedCustomers = customers.filter(c => selectedIds.includes(c.id));
                  selectedCustomers.forEach(customer => onWhatsApp(customer));
                }}
                data-testid="button-bulk-whatsapp"
              >
                <MessageCircle className="h-4 w-4 mr-2 text-[#25D366]" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white hover:bg-gray-50"
                onClick={() => {
                  const selectedCustomers = customers.filter(c => selectedIds.includes(c.id));
                  selectedCustomers.forEach(customer => onEmail(customer));
                }}
                data-testid="button-bulk-email"
              >
                <Mail className="h-4 w-4 mr-2 text-blue-500" />
                Email
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white hover:bg-gray-50"
                onClick={() => {
                  const selectedCustomers = customers.filter(c => selectedIds.includes(c.id));
                  selectedCustomers.forEach(customer => onPayment(customer));
                }}
                data-testid="button-bulk-payment"
              >
                <DollarSign className="h-4 w-4 mr-2 text-[#059669]" />
                Payment
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white hover:bg-gray-50"
                onClick={() => {
                  const selectedCustomers = customers.filter(c => selectedIds.includes(c.id));
                  selectedCustomers.forEach(customer => onFollowUp(customer));
                }}
                data-testid="button-bulk-followup"
              >
                <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                Follow Up
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white hover:bg-gray-50"
                onClick={() => {
                  const selectedCustomers = customers.filter(c => selectedIds.includes(c.id));
                  if (selectedCustomers.length === 1) {
                    onEdit(selectedCustomers[0]);
                  } else {
                    toast({
                      title: "Edit Not Available",
                      description: "Please select only one customer to edit",
                      variant: "destructive",
                    });
                  }
                }}
                data-testid="button-bulk-edit"
              >
                <Edit className="h-4 w-4 mr-2 text-orange-500" />
                Edit
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleBulkDeleteClick}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
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
                {visibleColumns.name && (
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
                )}
                {visibleColumns.amountOwed && (
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
                )}
                {visibleColumns.category && (
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
                )}
                {visibleColumns.assignedUser && <TableHead className="py-4 font-semibold">Assigned User</TableHead>}
                {visibleColumns.mobile && <TableHead className="py-4 font-semibold">Mobile Number</TableHead>}
                {visibleColumns.email && <TableHead className="py-4 font-semibold">Email Address</TableHead>}
                {visibleColumns.lastFollowUp && <TableHead className="py-4 font-semibold">Last Follow Up</TableHead>}
                {visibleColumns.remarks && <TableHead className="py-4 font-semibold">Remarks</TableHead>}
                {visibleColumns.nextFollowUp && <TableHead className="py-4 font-semibold">Next Follow Up</TableHead>}
                <TableHead className="py-4 font-semibold">Actions</TableHead>
              </TableRow>
              {/* Search Row */}
              <TableRow className="bg-white border-b">
                <TableHead className="py-3"></TableHead>
                {visibleColumns.name && (
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
                )}
                {visibleColumns.amountOwed && (
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
                )}
                {visibleColumns.category && (
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
                )}
                {visibleColumns.assignedUser && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search user..."
                      value={assignedUserSearch}
                      onChange={(e) => setAssignedUserSearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-assigned-user"
                    />
                  </TableHead>
                )}
                {visibleColumns.mobile && (
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
                )}
                {visibleColumns.email && (
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
                )}
                {visibleColumns.lastFollowUp && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search follow-up..."
                      value={lastFollowUpSearch}
                      onChange={(e) => setLastFollowUpSearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-last-followup"
                    />
                  </TableHead>
                )}
                {visibleColumns.remarks && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search remarks..."
                      value={remarksSearch}
                      onChange={(e) => setRemarksSearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-remarks"
                    />
                  </TableHead>
                )}
                {visibleColumns.nextFollowUp && (
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
                )}
                <TableHead className="py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                    No customers found. Add a customer to get started.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => (
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
                    {visibleColumns.name && (
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
                    )}
                    {visibleColumns.amountOwed && (
                      <TableCell className="py-4">
                        <div className="text-lg font-semibold text-[#DC2626]" data-testid={`text-amount-${customer.id}`}>
                          ₹{parseFloat(customer.amountOwed).toFixed(2)}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.category && (
                      <TableCell className="py-4">
                        <Select
                          value={customer.category}
                          onValueChange={(value) => handleCategoryChange(customer.id, value)}
                        >
                          <SelectTrigger className="w-[130px]" data-testid={`select-category-${customer.id}`}>
                            <SelectValue>
                              <Badge className={categoryColors[customer.category as keyof typeof categoryColors]}>
                                {customer.category}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Alpha">
                              <Badge className={categoryColors.Alpha}>Alpha</Badge>
                            </SelectItem>
                            <SelectItem value="Beta">
                              <Badge className={categoryColors.Beta}>Beta</Badge>
                            </SelectItem>
                            <SelectItem value="Gamma">
                              <Badge className={categoryColors.Gamma}>Gamma</Badge>
                            </SelectItem>
                            <SelectItem value="Delta">
                              <Badge className={categoryColors.Delta}>Delta</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    {visibleColumns.assignedUser && (
                      <TableCell className="py-4">
                        <Select
                          value={customer.assignedUser || ""}
                          onValueChange={(value) => handleAssignedUserChange(customer.id, value)}
                        >
                          <SelectTrigger className="w-[160px]" data-testid={`select-assigned-user-${customer.id}`}>
                            <SelectValue placeholder="Assign user">
                              {customer.assignedUser || "Not assigned"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Manpreet Bedi">Manpreet Bedi</SelectItem>
                            <SelectItem value="Bilal Ahamad">Bilal Ahamad</SelectItem>
                            <SelectItem value="Anjali Dhiman">Anjali Dhiman</SelectItem>
                            <SelectItem value="Princi Soni">Princi Soni</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    {visibleColumns.mobile && (
                      <TableCell className="py-4">
                        <div className="text-sm text-[#1E293B]" data-testid={`text-mobile-${customer.id}`}>
                          {customer.mobile}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.email && (
                      <TableCell className="py-4">
                        <div className="text-sm text-[#1E293B]" data-testid={`text-email-${customer.id}`}>
                          {customer.email}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.lastFollowUp && (
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1" data-testid={`text-last-followup-${customer.id}`}>
                          {customer.lastFollowUpDate ? (
                            <>
                              <div className="text-xs text-gray-500">
                                {format(new Date(customer.lastFollowUpDate), "MMM dd, yyyy HH:mm")}
                              </div>
                              {customer.lastFollowUpType && (
                                <Badge
                                  className={followUpTypeColors[customer.lastFollowUpType as keyof typeof followUpTypeColors]}
                                  data-testid={`badge-last-followup-type-${customer.id}`}
                                >
                                  {customer.lastFollowUpType}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.remarks && (
                      <TableCell className="py-4">
                        <div className="text-sm text-gray-700" data-testid={`text-remarks-${customer.id}`}>
                          {truncate(customer.lastFollowUpRemarks, 50)}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.nextFollowUp && (
                      <TableCell className="py-4">
                        <div data-testid={`text-next-followup-${customer.id}`}>
                          {customer.nextFollowUpDate ? (
                            <div className="text-sm font-medium text-gray-900">
                              {format(new Date(customer.nextFollowUpDate), "MMM dd, yyyy HH:mm")}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </div>
                      </TableCell>
                    )}
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
        
        {/* Pagination Controls */}
        {sortedCustomers.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="h-8 w-8"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[100px] text-center">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="h-8 w-8"
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(0);
              }}>
                <SelectTrigger className="w-[110px] h-8" data-testid="select-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 rows</SelectItem>
                  <SelectItem value="20">20 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsColumnChooserOpen(true)}
              className="flex items-center gap-2"
              data-testid="button-column-chooser"
            >
              <Settings className="h-4 w-4" />
              Columns
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={isColumnChooserOpen} onOpenChange={setIsColumnChooserOpen}>
        <DialogContent className="sm:max-w-[425px]" data-testid="dialog-column-chooser">
          <DialogHeader>
            <DialogTitle>Column Visibility</DialogTitle>
            <DialogDescription>
              Show or hide columns in the table
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] py-4">
            <div className="space-y-3">
              {columns.map((column) => (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`column-${column.id}`}
                    checked={visibleColumns[column.id]}
                    onCheckedChange={(checked) => {
                      setVisibleColumns({
                        ...visibleColumns,
                        [column.id]: checked as boolean,
                      });
                    }}
                    data-testid={`checkbox-column-${column.id}`}
                  />
                  <Label
                    htmlFor={`column-${column.id}`}
                    className="text-sm font-normal leading-none cursor-pointer"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const defaultVisibility: Record<string, boolean> = {};
                columns.forEach(col => {
                  defaultVisibility[col.id] = true;
                });
                setVisibleColumns(defaultVisibility);
              }}
              data-testid="button-reset-columns"
            >
              Reset to Default
            </Button>
            <Button
              onClick={() => setIsColumnChooserOpen(false)}
              data-testid="button-apply-columns"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
