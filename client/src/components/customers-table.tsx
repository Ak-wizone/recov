import { useState } from "react";
import { Customer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { MessageCircle, Mail, DollarSign, Edit, Trash2, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomersTableProps {
  customers: Customer[];
  isLoading: boolean;
  onEdit: (customer: Customer) => void;
  onPayment: (customer: Customer) => void;
  onPaymentHistory: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onWhatsApp: (customer: Customer) => void;
  onEmail: (customer: Customer) => void;
}

export function CustomersTable({
  customers,
  isLoading,
  onEdit,
  onPayment,
  onPaymentHistory,
  onDelete,
  onWhatsApp,
  onEmail,
}: CustomersTableProps) {
  const [sortField, setSortField] = useState<keyof Customer | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof Customer) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    if (!sortField) return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === "amountOwed") {
      aValue = parseFloat(a.amountOwed) as any;
      bValue = parseFloat(b.amountOwed) as any;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const categoryColors = {
    Alpha: "bg-red-100 text-red-800",
    Beta: "bg-yellow-100 text-yellow-800",
    Gamma: "bg-blue-100 text-blue-800",
    Delta: "bg-green-100 text-green-800",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
    <Card className="border border-[#E2E8F0]">
      <CardHeader className="border-b border-[#E2E8F0]">
        <CardTitle className="text-lg font-semibold text-[#1E293B]">
          Customer Debtors Management
        </CardTitle>
        <CardDescription>
          Manage customer information, payments, and communication
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F1F5F9]">
                <TableHead
                  className="cursor-pointer hover:bg-[#E2E8F0]"
                  onClick={() => handleSort("name")}
                  data-testid="header-name"
                >
                  <div className="flex items-center">
                    Customer Name
                    <span className="ml-1">↕</span>
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-[#E2E8F0]"
                  onClick={() => handleSort("amountOwed")}
                  data-testid="header-amount"
                >
                  <div className="flex items-center">
                    Amount Owed
                    <span className="ml-1">↕</span>
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-[#E2E8F0]"
                  onClick={() => handleSort("category")}
                  data-testid="header-category"
                >
                  <div className="flex items-center">
                    Category
                    <span className="ml-1">↕</span>
                  </div>
                </TableHead>
                <TableHead>Mobile Number</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No customers found. Add a customer to get started.
                  </TableCell>
                </TableRow>
              ) : (
                sortedCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="hover:bg-[#F1F5F9]"
                    data-testid={`row-customer-${customer.id}`}
                  >
                    <TableCell>
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
                    <TableCell>
                      <div className="text-lg font-semibold text-[#DC2626]" data-testid={`text-amount-${customer.id}`}>
                        ${parseFloat(customer.amountOwed).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={categoryColors[customer.category as keyof typeof categoryColors]}
                        data-testid={`badge-category-${customer.id}`}
                      >
                        {customer.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-[#1E293B]" data-testid={`text-mobile-${customer.id}`}>
                        {customer.mobile}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-[#1E293B]" data-testid={`text-email-${customer.id}`}>
                        {customer.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-[#25D366] hover:bg-[#1EBE57] text-white"
                          onClick={() => onWhatsApp(customer)}
                          title="Send WhatsApp"
                          data-testid={`button-whatsapp-${customer.id}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-700 text-white"
                          onClick={() => onEmail(customer)}
                          title="Send Email"
                          data-testid={`button-email-${customer.id}`}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#059669] hover:bg-[#047857] text-white"
                          onClick={() => onPayment(customer)}
                          title="Record Payment"
                          data-testid={`button-payment-${customer.id}`}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onPaymentHistory(customer)}
                          title="Payment History"
                          data-testid={`button-history-${customer.id}`}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-yellow-500 hover:bg-yellow-700 text-white"
                          onClick={() => onEdit(customer)}
                          title="Edit Customer"
                          data-testid={`button-edit-${customer.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                          onClick={() => onDelete(customer)}
                          title="Delete Customer"
                          data-testid={`button-delete-${customer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
