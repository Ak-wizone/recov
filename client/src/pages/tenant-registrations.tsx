import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Building2, Mail, MapPin, CreditCard, Calendar } from "lucide-react";
import { format } from "date-fns";

interface RegistrationRequest {
  id: string;
  businessName: string;
  email: string;
  businessAddress: string;
  city: string;
  state: string | null;
  pincode: string;
  panNumber: string | null;
  gstNumber: string | null;
  industryType: string | null;
  planType: string;
  existingAccountingSoftware: string | null;
  paymentMethod: string;
  paymentReceiptUrl: string | null;
  status: string;
  tenantId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}

export default function TenantRegistrations() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);

  const { data: requests, isLoading } = useQuery<RegistrationRequest[]>({
    queryKey: ['/api/registration-requests'],
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("POST", `/api/registration-requests/${requestId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tenant approved and welcome email sent",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/registration-requests'] });
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanTypeBadge = (planType: string) => {
    const planLabels: Record<string, string> = {
      "6_months_demo": "6 Months Demo",
      "annual_subscription": "Annual Subscription",
      "lifetime": "Lifetime",
    };
    return <Badge variant="secondary">{planLabels[planType] || planType}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading registration requests...</p>
        </div>
      </div>
    );
  }

  const pendingRequests = requests?.filter(r => r.status === "pending") || [];
  const approvedRequests = requests?.filter(r => r.status === "approved") || [];
  const rejectedRequests = requests?.filter(r => r.status === "rejected") || [];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Registrations</h1>
        <p className="text-muted-foreground mt-2">Review and approve new tenant registration requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      {selectedRequest ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedRequest.businessName}</CardTitle>
                <CardDescription className="mt-2">
                  Registration Details
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedRequest(null)} data-testid="button-close-details">
                Back to List
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{selectedRequest.businessName}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{selectedRequest.email}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p>{selectedRequest.businessAddress}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRequest.city}, {selectedRequest.state} - {selectedRequest.pincode}
                      </p>
                    </div>
                  </div>
                </div>
                {selectedRequest.panNumber && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">PAN Number</label>
                    <p className="mt-1">{selectedRequest.panNumber}</p>
                  </div>
                )}
                {selectedRequest.gstNumber && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">GST Number</label>
                    <p className="mt-1">{selectedRequest.gstNumber}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Plan Type</label>
                  <div className="mt-1">{getPlanTypeBadge(selectedRequest.planType)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                  <div className="flex items-center gap-2 mt-1">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <p className="capitalize">{selectedRequest.paymentMethod.replace('_', ' ')}</p>
                  </div>
                </div>
                {selectedRequest.industryType && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Industry Type</label>
                    <p className="mt-1">{selectedRequest.industryType}</p>
                  </div>
                )}
                {selectedRequest.existingAccountingSoftware && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Existing Accounting Software</label>
                    <p className="mt-1">{selectedRequest.existingAccountingSoftware}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Submitted On</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p>{format(new Date(selectedRequest.createdAt), "PPP")}</p>
                  </div>
                </div>
              </div>
            </div>

            {selectedRequest.status === "pending" && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => approveMutation.mutate(selectedRequest.id)}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-approve-request"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {approveMutation.isPending ? "Approving..." : "Approve Registration"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Registration Requests</CardTitle>
            <CardDescription>
              Click on any request to view details and approve
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests && requests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No registration requests found
                </div>
              )}
              {requests?.map((request) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  data-testid={`request-item-${request.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{request.businessName}</h3>
                      {getStatusBadge(request.status)}
                      {getPlanTypeBadge(request.planType)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {request.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {request.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(request.createdAt), "PP")}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" data-testid={`button-view-${request.id}`}>
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
