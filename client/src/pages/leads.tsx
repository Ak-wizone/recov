import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Lead } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Plus,
  FileDown,
  FileUp,
  X,
  Users,
  Sparkles,
  RefreshCw,
  UserX,
  Building2,
  FileText,
  CheckCircle2,
  Package,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Leads() {
  const { toast } = useToast();
  const [leadStatusFilter, setLeadStatusFilter] = useState<string | null>(null);
  const [assignedUserFilter, setAssignedUserFilter] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/leads/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leads.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leads exported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete lead");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedLead(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch("/api/leads/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to delete leads");
      }
      return await response.json();
    },
    onSuccess: (data: { deleted: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: `${data.deleted} lead(s) deleted successfully`,
      });
      setIsBulkDeleteDialogOpen(false);
      setBulkDeleteIds([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const monthFilteredLeads = leads.filter((lead) => {
    const leadDate = new Date(lead.dateCreated);
    return (
      leadDate.getFullYear() === selectedYear &&
      leadDate.getMonth() === selectedMonth
    );
  });

  const totalCount = monthFilteredLeads.length;
  
  const newLeadItems = monthFilteredLeads.filter(lead => lead.leadStatus === "New Lead");
  const newLeadCount = newLeadItems.length;

  const inProgressItems = monthFilteredLeads.filter(lead => lead.leadStatus === "In Progress");
  const inProgressCount = inProgressItems.length;

  const pendingClientItems = monthFilteredLeads.filter(lead => lead.leadStatus === "Pending From Client");
  const pendingClientCount = pendingClientItems.length;

  const pendingWizoneItems = monthFilteredLeads.filter(lead => lead.leadStatus === "Pending From Wizone");
  const pendingWizoneCount = pendingWizoneItems.length;

  const quotationSentItems = monthFilteredLeads.filter(lead => lead.leadStatus === "Quotation Sent");
  const quotationSentCount = quotationSentItems.length;

  const convertedItems = monthFilteredLeads.filter(lead => lead.leadStatus === "Converted");
  const convertedCount = convertedItems.length;

  const deliveredItems = monthFilteredLeads.filter(lead => lead.leadStatus === "Delivered");
  const deliveredCount = deliveredItems.length;

  const filteredLeads = leads.filter((lead) => {
    const leadDate = new Date(lead.dateCreated);
    const matchesMonth = leadDate.getFullYear() === selectedYear && leadDate.getMonth() === selectedMonth;

    let matchesStatusFilter = true;
    if (leadStatusFilter) {
      matchesStatusFilter = lead.leadStatus === leadStatusFilter;
    }

    let matchesAssignedUserFilter = true;
    if (assignedUserFilter) {
      matchesAssignedUserFilter = lead.assignedUser === assignedUserFilter;
    }

    let matchesCardFilter = true;
    if (activeCardFilter) {
      matchesCardFilter = lead.leadStatus === activeCardFilter;
    }

    return matchesMonth && matchesStatusFilter && matchesAssignedUserFilter && matchesCardFilter;
  });

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDelete = (ids: string[]) => {
    setBulkDeleteIds(ids);
    setIsBulkDeleteDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedLead(null);
    setIsAddDialogOpen(true);
  };

  const handleWhatsApp = (lead: Lead) => {
    const message = encodeURIComponent(`Hello ${lead.contactPerson}, this is regarding your inquiry from ${lead.companyName}.`);
    const phoneNumber = lead.mobile.replace(/\D/g, '');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handleEmail = (lead: Lead) => {
    const subject = encodeURIComponent('Follow-up on Your Inquiry');
    const body = encodeURIComponent(`Dear ${lead.contactPerson},\n\nThank you for your interest in our services.\n\nBest regards`);
    window.location.href = `mailto:${lead.email}?subject=${subject}&body=${body}`;
  };

  const clearFilters = () => {
    setLeadStatusFilter(null);
    setAssignedUserFilter(null);
    setActiveCardFilter(null);
  };

  const hasActiveFilters = leadStatusFilter || assignedUserFilter || activeCardFilter;

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10 shadow-sm animate-in slide-in-from-top duration-500">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Leads Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Track and manage all business leads</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-5"
                data-testid="button-add-lead"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Lead
              </Button>
              <Button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = "/api/leads/template";
                  a.download = "leads_template.xlsx";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  toast({
                    title: "Success",
                    description: "Template downloaded successfully",
                  });
                }}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-5"
                data-testid="button-download-template"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Template
              </Button>
              <Button
                onClick={() => setIsImportDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-5 py-5"
                data-testid="button-import-leads"
              >
                <FileUp className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button
                onClick={() => exportMutation.mutate()}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-5"
                data-testid="button-export-leads"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-6 lg:px-8 py-8">
        <div className="flex gap-3 items-center mb-6">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[140px]" data-testid="select-year">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
          >
            <SelectTrigger className="w-[160px]" data-testid="select-month">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">January</SelectItem>
              <SelectItem value="1">February</SelectItem>
              <SelectItem value="2">March</SelectItem>
              <SelectItem value="3">April</SelectItem>
              <SelectItem value="4">May</SelectItem>
              <SelectItem value="5">June</SelectItem>
              <SelectItem value="6">July</SelectItem>
              <SelectItem value="7">August</SelectItem>
              <SelectItem value="8">September</SelectItem>
              <SelectItem value="9">October</SelectItem>
              <SelectItem value="10">November</SelectItem>
              <SelectItem value="11">December</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 flex gap-3">
            <Select
              value={leadStatusFilter || "all"}
              onValueChange={(value) => setLeadStatusFilter(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[220px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="New Lead">New Lead</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Pending From Client">Pending From Client</SelectItem>
                <SelectItem value="Pending From Wizone">Pending From Wizone</SelectItem>
                <SelectItem value="Quotation Sent">Quotation Sent</SelectItem>
                <SelectItem value="Converted">Converted</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={assignedUserFilter || "all"}
              onValueChange={(value) => setAssignedUserFilter(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[200px]" data-testid="select-assigned-user-filter">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="Manpreet Bedi">Manpreet Bedi</SelectItem>
                <SelectItem value="Bilal Ahamad">Bilal Ahamad</SelectItem>
                <SelectItem value="Anjali Dhiman">Anjali Dhiman</SelectItem>
                <SelectItem value="Princi Soni">Princi Soni</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-8 gap-4 mb-6">
          <Card
            className={`cursor-pointer transition-all border-0 ${
              activeCardFilter === null
                ? "bg-blue-100 dark:bg-blue-900/40 shadow-md"
                : "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100"
            }`}
            onClick={() => setActiveCardFilter(activeCardFilter === null ? null : null)}
            data-testid="card-total-leads"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500 p-3 rounded-xl">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                    Total Leads
                  </p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {totalCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-0 ${
              activeCardFilter === "New Lead"
                ? "bg-green-100 dark:bg-green-900/40 shadow-md"
                : "bg-green-50 dark:bg-green-900/20 hover:bg-green-100"
            }`}
            onClick={() => setActiveCardFilter(activeCardFilter === "New Lead" ? null : "New Lead")}
            data-testid="card-new-lead"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="bg-green-500 p-3 rounded-xl">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
                    New Lead
                  </p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-100">
                    {newLeadCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-0 ${
              activeCardFilter === "In Progress"
                ? "bg-purple-100 dark:bg-purple-900/40 shadow-md"
                : "bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100"
            }`}
            onClick={() => setActiveCardFilter(activeCardFilter === "In Progress" ? null : "In Progress")}
            data-testid="card-in-progress"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="bg-purple-500 p-3 rounded-xl">
                  <RefreshCw className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                    In Progress
                  </p>
                  <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                    {inProgressCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-0 ${
              activeCardFilter === "Pending From Client"
                ? "bg-orange-100 dark:bg-orange-900/40 shadow-md"
                : "bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100"
            }`}
            onClick={() => setActiveCardFilter(activeCardFilter === "Pending From Client" ? null : "Pending From Client")}
            data-testid="card-pending-client"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="bg-orange-500 p-3 rounded-xl">
                  <UserX className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">
                    Pending Client
                  </p>
                  <p className="text-xl font-bold text-orange-900 dark:text-orange-100">
                    {pendingClientCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-0 ${
              activeCardFilter === "Pending From Wizone"
                ? "bg-yellow-100 dark:bg-yellow-900/40 shadow-md"
                : "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100"
            }`}
            onClick={() => setActiveCardFilter(activeCardFilter === "Pending From Wizone" ? null : "Pending From Wizone")}
            data-testid="card-pending-wizone"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-500 p-3 rounded-xl">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 uppercase tracking-wide">
                    Pending Wizone
                  </p>
                  <p className="text-xl font-bold text-yellow-900 dark:text-yellow-100">
                    {pendingWizoneCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-0 ${
              activeCardFilter === "Quotation Sent"
                ? "bg-cyan-100 dark:bg-cyan-900/40 shadow-md"
                : "bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100"
            }`}
            onClick={() => setActiveCardFilter(activeCardFilter === "Quotation Sent" ? null : "Quotation Sent")}
            data-testid="card-quotation-sent"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="bg-cyan-500 p-3 rounded-xl">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wide">
                    Quotation Sent
                  </p>
                  <p className="text-xl font-bold text-cyan-900 dark:text-cyan-100">
                    {quotationSentCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-0 ${
              activeCardFilter === "Converted"
                ? "bg-emerald-100 dark:bg-emerald-900/40 shadow-md"
                : "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100"
            }`}
            onClick={() => setActiveCardFilter(activeCardFilter === "Converted" ? null : "Converted")}
            data-testid="card-converted"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                    Converted
                  </p>
                  <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                    {convertedCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-0 ${
              activeCardFilter === "Delivered"
                ? "bg-pink-100 dark:bg-pink-900/40 shadow-md"
                : "bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100"
            }`}
            onClick={() => setActiveCardFilter(activeCardFilter === "Delivered" ? null : "Delivered")}
            data-testid="card-delivered"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="bg-pink-500 p-3 rounded-xl">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-pink-700 dark:text-pink-300 uppercase tracking-wide">
                    Delivered
                  </p>
                  <p className="text-xl font-bold text-pink-900 dark:text-pink-100">
                    {deliveredCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-500 text-center">Lead Table Component - To be implemented</p>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lead
              {selectedLead && ` "${selectedLead.companyName}"`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedLead && deleteMutation.mutate(selectedLead.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Leads</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {bulkDeleteIds.length} lead(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(bulkDeleteIds)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-bulk-delete"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
