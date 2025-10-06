import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Phone, Play, Eye, Search } from "lucide-react";
import type { CallLog } from "@shared/schema";
import { format } from "date-fns";

const moduleColors: Record<string, string> = {
  leads: "bg-green-500",
  quotations: "bg-purple-500",
  proforma_invoices: "bg-indigo-500",
  invoices: "bg-blue-500",
  receipts: "bg-yellow-500",
  debtors: "bg-red-500",
  credit_management: "bg-orange-500",
};

const moduleLabels: Record<string, string> = {
  leads: "Leads",
  quotations: "Quotations",
  proforma_invoices: "Proforma Invoices",
  invoices: "Invoices",
  receipts: "Receipts",
  debtors: "Debtors",
  credit_management: "Credit Management",
};

const statusColors: Record<string, string> = {
  initiated: "bg-gray-500",
  ringing: "bg-yellow-500",
  answered: "bg-green-500",
  completed: "bg-blue-500",
  failed: "bg-red-500",
  busy: "bg-orange-500",
  no_answer: "bg-gray-400",
};

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function RinggCallHistory() {
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);

  const { data: calls, isLoading } = useQuery<CallLog[]>({
    queryKey: ["/api/calls/history", { module: moduleFilter, status: statusFilter, search: searchQuery }],
    refetchInterval: 10000,
  });

  const filteredCalls = calls?.filter((call) => {
    const matchesModule = moduleFilter === "all" || call.module === moduleFilter;
    const matchesStatus = statusFilter === "all" || call.status === statusFilter;
    const matchesSearch = !searchQuery || call.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModule && matchesStatus && matchesSearch;
  }) || [];

  const totalCalls = filteredCalls.length;
  const answeredCalls = filteredCalls.filter((c) => c.status === "answered" || c.status === "completed").length;
  const failedCalls = filteredCalls.filter((c) => c.status === "failed" || c.status === "no_answer").length;
  const avgDuration = filteredCalls.length > 0
    ? filteredCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / filteredCalls.length
    : 0;

  const handleViewDetails = (call: CallLog) => {
    setSelectedCall(call);
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6 overflow-auto">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Call History</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          View and manage all Ringg.ai call logs
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-module-filter">
            <SelectValue placeholder="All Modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            <SelectItem value="leads">Leads</SelectItem>
            <SelectItem value="quotations">Quotations</SelectItem>
            <SelectItem value="proforma_invoices">Proforma Invoices</SelectItem>
            <SelectItem value="invoices">Invoices</SelectItem>
            <SelectItem value="receipts">Receipts</SelectItem>
            <SelectItem value="debtors">Debtors</SelectItem>
            <SelectItem value="credit_management">Credit Management</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="initiated">Initiated</SelectItem>
            <SelectItem value="ringing">Ringing</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-calls">{totalCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Answered Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-answered-calls">
              {answeredCalls}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0}%)
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Failed Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-failed-calls">
              {failedCalls}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({totalCalls > 0 ? Math.round((failedCalls / totalCalls) * 100) : 0}%)
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-duration">
              {formatDuration(Math.round(avgDuration))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCalls.length > 0 ? (
              filteredCalls.map((call) => (
                <TableRow key={call.id} data-testid={`row-call-${call.id}`}>
                  <TableCell data-testid={`text-date-${call.id}`}>
                    {format(new Date(call.createdAt), "MMM dd, yyyy HH:mm")}
                  </TableCell>
                  <TableCell data-testid={`text-customer-${call.id}`}>{call.customerName}</TableCell>
                  <TableCell data-testid={`text-phone-${call.id}`}>{call.phoneNumber}</TableCell>
                  <TableCell>
                    <Badge
                      className={`${moduleColors[call.module]} text-white`}
                      data-testid={`badge-module-${call.id}`}
                    >
                      {moduleLabels[call.module]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${statusColors[call.status]} text-white`}
                      data-testid={`badge-status-${call.id}`}
                    >
                      {call.status}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-duration-${call.id}`}>
                    {formatDuration(call.duration)}
                  </TableCell>
                  <TableCell data-testid={`text-outcome-${call.id}`}>{call.outcome || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(call)}
                        data-testid={`button-view-${call.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {call.recordingUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(call.recordingUrl!, "_blank")}
                          data-testid={`button-play-${call.id}`}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No call history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Call Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the call
            </DialogDescription>
          </DialogHeader>

          {selectedCall && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Customer Name</p>
                  <p className="text-base" data-testid="detail-customer-name">{selectedCall.customerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone Number</p>
                  <p className="text-base" data-testid="detail-phone-number">{selectedCall.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Module</p>
                  <Badge className={`${moduleColors[selectedCall.module]} text-white`} data-testid="detail-module">
                    {moduleLabels[selectedCall.module]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge className={`${statusColors[selectedCall.status]} text-white`} data-testid="detail-status">
                    {selectedCall.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Duration</p>
                  <p className="text-base" data-testid="detail-duration">{formatDuration(selectedCall.duration)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date & Time</p>
                  <p className="text-base" data-testid="detail-date">
                    {format(new Date(selectedCall.createdAt), "MMM dd, yyyy HH:mm:ss")}
                  </p>
                </div>
              </div>

              {selectedCall.outcome && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Outcome</p>
                  <p className="text-base" data-testid="detail-outcome">{selectedCall.outcome}</p>
                </div>
              )}

              {selectedCall.recordingUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Recording</p>
                  <audio controls className="w-full" data-testid="audio-recording">
                    <source src={selectedCall.recordingUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {selectedCall.transcript && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Transcript</p>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap" data-testid="detail-transcript">
                      {selectedCall.transcript}
                    </p>
                  </div>
                </div>
              )}

              {selectedCall.callContext && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Call Context</p>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <pre className="text-sm overflow-auto" data-testid="detail-context">
                      {JSON.stringify(JSON.parse(selectedCall.callContext), null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedCall.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <p className="text-sm" data-testid="detail-notes">{selectedCall.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
