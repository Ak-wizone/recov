import { useState, useEffect } from "react";
import { Lead } from "@shared/schema";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Mail, Edit, Trash2, MoreVertical, ChevronDown, ChevronLeft, ChevronRight, Settings } from "lucide-react";
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

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onWhatsApp: (lead: Lead) => void;
  onEmail: (lead: Lead) => void;
  onFollowUp?: (lead: Lead) => void;
  onBulkDelete?: (ids: string[]) => void;
}

export function LeadTable({
  leads,
  isLoading,
  onEdit,
  onDelete,
  onWhatsApp,
  onEmail,
  onFollowUp,
  onBulkDelete,
}: LeadTableProps) {
  const { toast } = useToast();
  const [sortField, setSortField] = useState<keyof Lead | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('leads-table-columns');
    return stored ? JSON.parse(stored) : {
      companyName: true,
      contactPerson: true,
      mobile: true,
      email: true,
      leadSource: true,
      leadStatus: true,
      priority: true,
      industry: true,
      city: true,
      assignedUser: true,
      nextFollowUp: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('leads-table-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const columns = [
    { id: 'companyName', label: 'Company Name' },
    { id: 'contactPerson', label: 'Contact Person' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'email', label: 'Email' },
    { id: 'leadSource', label: 'Lead Source' },
    { id: 'leadStatus', label: 'Status' },
    { id: 'address', label: 'Address' },
    { id: 'city', label: 'City' },
    { id: 'state', label: 'State' },
    { id: 'pincode', label: 'Pincode' },
    { id: 'remarks', label: 'Remarks' },
    { id: 'industry', label: 'Industry' },
    { id: 'priority', label: 'Priority' },
    { id: 'assignedUser', label: 'Assigned User' },
    { id: 'lastFollowUp', label: 'Last Follow Up' },
    { id: 'nextFollowUp', label: 'Next Follow Up' },
  ];
  
  const [companySearch, setCompanySearch] = useState("");
  const [contactPersonSearch, setContactPersonSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [leadSourceSearch, setLeadSourceSearch] = useState("");
  const [leadStatusSearch, setLeadStatusSearch] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [pincodeSearch, setPincodeSearch] = useState("");
  const [remarksSearch, setRemarksSearch] = useState("");
  const [industrySearch, setIndustrySearch] = useState("");
  const [prioritySearch, setPrioritySearch] = useState("");
  const [assignedUserSearch, setAssignedUserSearch] = useState("");
  const [lastFollowUpSearch, setLastFollowUpSearch] = useState("");
  const [nextFollowUpSearch, setNextFollowUpSearch] = useState("");

  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredLeads.map(l => l.id));
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

  const handleLeadStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await apiRequest("PATCH", `/api/leads/${leadId}`, { leadStatus: newStatus });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead status updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePriorityChange = async (leadId: string, newPriority: string) => {
    try {
      await apiRequest("PATCH", `/api/leads/${leadId}`, { priority: newPriority });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Priority updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAssignedUserChange = async (leadId: string, newUser: string) => {
    try {
      await apiRequest("PATCH", `/api/leads/${leadId}`, { assignedUser: newUser });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
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

  const filteredLeads = leads.filter((lead) => {
    const matchesCompany = lead.companyName.toLowerCase().includes(companySearch.toLowerCase());
    const matchesContactPerson = lead.contactPerson.toLowerCase().includes(contactPersonSearch.toLowerCase());
    const matchesMobile = lead.mobile.includes(mobileSearch);
    const matchesEmail = lead.email.toLowerCase().includes(emailSearch.toLowerCase());
    const matchesLeadSource = lead.leadSource.toLowerCase().includes(leadSourceSearch.toLowerCase());
    const matchesLeadStatus = lead.leadStatus.toLowerCase().includes(leadStatusSearch.toLowerCase());
    const matchesAddress = (lead.address || "").toLowerCase().includes(addressSearch.toLowerCase());
    const matchesCity = (lead.city || "").toLowerCase().includes(citySearch.toLowerCase());
    const matchesState = (lead.state || "").toLowerCase().includes(stateSearch.toLowerCase());
    const matchesPincode = (lead.pincode || "").includes(pincodeSearch);
    const matchesRemarks = (lead.remarks || "").toLowerCase().includes(remarksSearch.toLowerCase());
    const matchesIndustry = (lead.industry || "").toLowerCase().includes(industrySearch.toLowerCase());
    const matchesPriority = (lead.priority || "").toLowerCase().includes(prioritySearch.toLowerCase());
    const matchesAssignedUser = (lead.assignedUser || "").toLowerCase().includes(assignedUserSearch.toLowerCase());
    const lastFollowUpStr = lead.lastFollowUp 
      ? format(new Date(lead.lastFollowUp), "MMM dd, yyyy HH:mm")
      : "";
    const matchesLastFollowUp = lastFollowUpStr.toLowerCase().includes(lastFollowUpSearch.toLowerCase());
    const nextFollowUpStr = lead.nextFollowUp 
      ? format(new Date(lead.nextFollowUp), "MMM dd, yyyy HH:mm")
      : "";
    const matchesNextFollowUp = nextFollowUpStr.toLowerCase().includes(nextFollowUpSearch.toLowerCase());

    return matchesCompany && matchesContactPerson && matchesMobile && matchesEmail && 
           matchesLeadSource && matchesLeadStatus && matchesAddress && matchesCity && 
           matchesState && matchesPincode && matchesRemarks && matchesIndustry && 
           matchesPriority && matchesAssignedUser && matchesLastFollowUp && matchesNextFollowUp;
  });

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === "asc" ? 1 : -1;
    if (bValue == null) return sortDirection === "asc" ? -1 : 1;

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedLeads.length / pageSize);
  const paginatedLeads = sortedLeads.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const leadStatusColors = {
    "New Lead": "bg-blue-100 text-blue-800",
    "In Progress": "bg-purple-100 text-purple-800",
    "Pending From Client": "bg-orange-100 text-orange-800",
    "Pending From Wizone": "bg-yellow-100 text-yellow-800",
    "Quotation Sent": "bg-cyan-100 text-cyan-800",
    "Converted": "bg-emerald-100 text-emerald-800",
    "Delivered": "bg-pink-100 text-pink-800",
  };

  const priorityColors = {
    High: "bg-red-100 text-red-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-green-100 text-green-800",
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
          Leads Management ({leads.length})
        </CardTitle>
        <CardDescription>
          Manage lead information and communication
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between" data-testid="bulk-action-bar">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.length} lead{selectedIds.length > 1 ? 's' : ''} selected
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
              <TableRow className="bg-[#F1F5F9] border-b-2 border-gray-300">
                <TableHead className="w-[50px] py-4 font-semibold">
                  <Checkbox
                    checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                {visibleColumns.companyName && (
                  <TableHead
                    className="cursor-pointer hover:bg-[#E2E8F0] py-4 font-semibold transition-colors"
                    onClick={() => handleSort("companyName")}
                    data-testid="header-company"
                  >
                    <div className="flex items-center">
                      Company Name
                      <span className="ml-1">↕</span>
                    </div>
                  </TableHead>
                )}
                {visibleColumns.contactPerson && (
                  <TableHead
                    className="cursor-pointer hover:bg-[#E2E8F0] py-4 font-semibold transition-colors"
                    onClick={() => handleSort("contactPerson")}
                    data-testid="header-contact"
                  >
                    <div className="flex items-center">
                      Contact Person
                      <span className="ml-1">↕</span>
                    </div>
                  </TableHead>
                )}
                {visibleColumns.mobile && <TableHead className="py-4 font-semibold">Mobile</TableHead>}
                {visibleColumns.email && <TableHead className="py-4 font-semibold">Email</TableHead>}
                {visibleColumns.leadSource && (
                  <TableHead
                    className="cursor-pointer hover:bg-[#E2E8F0] py-4 font-semibold transition-colors"
                    onClick={() => handleSort("leadSource")}
                    data-testid="header-source"
                  >
                    <div className="flex items-center">
                      Lead Source
                      <span className="ml-1">↕</span>
                    </div>
                  </TableHead>
                )}
                {visibleColumns.leadStatus && <TableHead className="py-4 font-semibold">Status</TableHead>}
                {visibleColumns.address && <TableHead className="py-4 font-semibold">Address</TableHead>}
                {visibleColumns.city && <TableHead className="py-4 font-semibold">City</TableHead>}
                {visibleColumns.state && <TableHead className="py-4 font-semibold">State</TableHead>}
                {visibleColumns.pincode && <TableHead className="py-4 font-semibold">Pincode</TableHead>}
                {visibleColumns.remarks && <TableHead className="py-4 font-semibold">Remarks</TableHead>}
                {visibleColumns.industry && <TableHead className="py-4 font-semibold">Industry</TableHead>}
                {visibleColumns.priority && <TableHead className="py-4 font-semibold">Priority</TableHead>}
                {visibleColumns.assignedUser && <TableHead className="py-4 font-semibold">Assigned User</TableHead>}
                {visibleColumns.lastFollowUp && <TableHead className="py-4 font-semibold">Last Follow Up</TableHead>}
                {visibleColumns.nextFollowUp && <TableHead className="py-4 font-semibold">Next Follow Up</TableHead>}
                <TableHead className="py-4 font-semibold">Actions</TableHead>
              </TableRow>
              <TableRow className="bg-white border-b">
                <TableHead className="py-3"></TableHead>
                {visibleColumns.companyName && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search company..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-company"
                    />
                  </TableHead>
                )}
                {visibleColumns.contactPerson && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search contact..."
                      value={contactPersonSearch}
                      onChange={(e) => setContactPersonSearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-contact"
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
                {visibleColumns.leadSource && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search source..."
                      value={leadSourceSearch}
                      onChange={(e) => setLeadSourceSearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-source"
                    />
                  </TableHead>
                )}
                {visibleColumns.leadStatus && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search status..."
                      value={leadStatusSearch}
                      onChange={(e) => setLeadStatusSearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-status"
                    />
                  </TableHead>
                )}
                {visibleColumns.address && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search address..."
                      value={addressSearch}
                      onChange={(e) => setAddressSearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-address"
                    />
                  </TableHead>
                )}
                {visibleColumns.city && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search city..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-city"
                    />
                  </TableHead>
                )}
                {visibleColumns.state && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search state..."
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-state"
                    />
                  </TableHead>
                )}
                {visibleColumns.pincode && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search pincode..."
                      value={pincodeSearch}
                      onChange={(e) => setPincodeSearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-pincode"
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
                {visibleColumns.industry && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search industry..."
                      value={industrySearch}
                      onChange={(e) => setIndustrySearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-industry"
                    />
                  </TableHead>
                )}
                {visibleColumns.priority && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search priority..."
                      value={prioritySearch}
                      onChange={(e) => setPrioritySearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-priority"
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
                {visibleColumns.lastFollowUp && (
                  <TableHead className="py-3">
                    <Input
                      type="text"
                      placeholder="Search last..."
                      value={lastFollowUpSearch}
                      onChange={(e) => setLastFollowUpSearch(e.target.value)}
                      className="h-10 min-w-[140px]"
                      data-testid="input-search-last-followup"
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
              {paginatedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={18} className="text-center py-8 text-gray-500">
                    No leads found. Add a lead to get started.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="border-b border-gray-200 hover:bg-[#F8FAFC] transition-colors"
                    data-testid={`row-lead-${lead.id}`}
                  >
                    <TableCell className="py-4">
                      <Checkbox
                        checked={selectedIds.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectOne(lead.id, checked as boolean)}
                        data-testid={`checkbox-lead-${lead.id}`}
                      />
                    </TableCell>
                    {visibleColumns.companyName && (
                      <TableCell className="py-4">
                        <div className="font-medium text-[#1E293B]" data-testid={`text-company-${lead.id}`}>
                          {lead.companyName}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.contactPerson && (
                      <TableCell className="py-4">
                        <div className="text-sm text-[#1E293B]" data-testid={`text-contact-${lead.id}`}>
                          {lead.contactPerson}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.mobile && (
                      <TableCell className="py-4">
                        <div className="text-sm text-[#1E293B]" data-testid={`text-mobile-${lead.id}`}>
                          {lead.mobile}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.email && (
                      <TableCell className="py-4">
                        <div className="text-sm text-[#1E293B]" data-testid={`text-email-${lead.id}`}>
                          {lead.email}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.leadSource && (
                      <TableCell className="py-4">
                        <div className="text-sm text-[#1E293B]" data-testid={`text-source-${lead.id}`}>
                          {lead.leadSource}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.leadStatus && (
                      <TableCell className="py-4">
                        <Select
                          value={lead.leadStatus}
                          onValueChange={(value) => handleLeadStatusChange(lead.id, value)}
                        >
                          <SelectTrigger className="w-[180px]" data-testid={`select-status-${lead.id}`}>
                            <SelectValue>
                              <Badge className={leadStatusColors[lead.leadStatus as keyof typeof leadStatusColors]}>
                                {lead.leadStatus}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New Lead">
                              <Badge className={leadStatusColors["New Lead"]}>New Lead</Badge>
                            </SelectItem>
                            <SelectItem value="In Progress">
                              <Badge className={leadStatusColors["In Progress"]}>In Progress</Badge>
                            </SelectItem>
                            <SelectItem value="Pending From Client">
                              <Badge className={leadStatusColors["Pending From Client"]}>Pending From Client</Badge>
                            </SelectItem>
                            <SelectItem value="Pending From Wizone">
                              <Badge className={leadStatusColors["Pending From Wizone"]}>Pending From Wizone</Badge>
                            </SelectItem>
                            <SelectItem value="Quotation Sent">
                              <Badge className={leadStatusColors["Quotation Sent"]}>Quotation Sent</Badge>
                            </SelectItem>
                            <SelectItem value="Converted">
                              <Badge className={leadStatusColors["Converted"]}>Converted</Badge>
                            </SelectItem>
                            <SelectItem value="Delivered">
                              <Badge className={leadStatusColors["Delivered"]}>Delivered</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    {visibleColumns.address && (
                      <TableCell className="py-4">
                        <div className="text-sm text-[#1E293B]" data-testid={`text-address-${lead.id}`}>
                          {truncate(lead.address, 50)}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.city && (
                      <TableCell className="py-4">
                        <div className="text-sm text-[#1E293B]" data-testid={`text-city-${lead.id}`}>
                          {lead.city || "—"}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.state && (
                      <TableCell className="py-4">
                        <div className="text-sm text-[#1E293B]" data-testid={`text-state-${lead.id}`}>
                          {lead.state || "—"}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.pincode && (
                      <TableCell className="py-4">
                        <div className="text-sm text-[#1E293B]" data-testid={`text-pincode-${lead.id}`}>
                          {lead.pincode || "—"}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.remarks && (
                      <TableCell className="py-4">
                        <div className="text-sm text-gray-700" data-testid={`text-remarks-${lead.id}`}>
                          {truncate(lead.remarks, 50)}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.industry && (
                      <TableCell className="py-4">
                        <div className="text-sm text-[#1E293B]" data-testid={`text-industry-${lead.id}`}>
                          {lead.industry || "—"}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.priority && (
                      <TableCell className="py-4">
                        <Select
                          value={lead.priority || ""}
                          onValueChange={(value) => handlePriorityChange(lead.id, value)}
                        >
                          <SelectTrigger className="w-[130px]" data-testid={`select-priority-${lead.id}`}>
                            <SelectValue placeholder="Set priority">
                              {lead.priority ? (
                                <Badge className={priorityColors[lead.priority as keyof typeof priorityColors]}>
                                  {lead.priority}
                                </Badge>
                              ) : (
                                "Not set"
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="High">
                              <Badge className={priorityColors.High}>High</Badge>
                            </SelectItem>
                            <SelectItem value="Medium">
                              <Badge className={priorityColors.Medium}>Medium</Badge>
                            </SelectItem>
                            <SelectItem value="Low">
                              <Badge className={priorityColors.Low}>Low</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    {visibleColumns.assignedUser && (
                      <TableCell className="py-4">
                        <Select
                          value={lead.assignedUser || ""}
                          onValueChange={(value) => handleAssignedUserChange(lead.id, value)}
                        >
                          <SelectTrigger className="w-[160px]" data-testid={`select-assigned-user-${lead.id}`}>
                            <SelectValue placeholder="Assign user">
                              {lead.assignedUser || "Not assigned"}
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
                    {visibleColumns.lastFollowUp && (
                      <TableCell className="py-4">
                        <div data-testid={`text-last-followup-${lead.id}`}>
                          {lead.lastFollowUp ? (
                            <div className="text-xs text-gray-500">
                              {format(new Date(lead.lastFollowUp), "MMM dd, yyyy HH:mm")}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.nextFollowUp && (
                      <TableCell className="py-4">
                        <div data-testid={`text-next-followup-${lead.id}`}>
                          {lead.nextFollowUp ? (
                            <div className="text-sm font-medium text-gray-900">
                              {format(new Date(lead.nextFollowUp), "MMM dd, yyyy HH:mm")}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#25D366] hover:text-[#25D366] hover:bg-green-50"
                          onClick={() => onWhatsApp(lead)}
                          data-testid={`button-whatsapp-${lead.id}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-500 hover:text-blue-500 hover:bg-blue-50"
                          onClick={() => onEmail(lead)}
                          data-testid={`button-email-${lead.id}`}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`button-actions-menu-${lead.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => onEdit(lead)}
                              data-testid={`button-edit-${lead.id}`}
                            >
                              <Edit className="mr-2 h-4 w-4 text-yellow-600" />
                              Edit Lead
                            </DropdownMenuItem>
                            {onFollowUp && (
                              <DropdownMenuItem
                                onClick={() => onFollowUp(lead)}
                                data-testid={`button-followup-${lead.id}`}
                              >
                                <Mail className="mr-2 h-4 w-4 text-blue-600" />
                                Schedule Follow-Up
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(lead)}
                              className="text-red-600 focus:text-red-600"
                              data-testid={`button-delete-${lead.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Lead
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {sortedLeads.length > 0 && (
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
