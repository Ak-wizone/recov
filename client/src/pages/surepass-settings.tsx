import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loader2, Key, Shield, Settings, Check, AlertCircle, CheckCircle, 
  FileText, Building, CreditCard, Activity, RefreshCw 
} from "lucide-react";

interface SurepassConfigResponse {
  exists: boolean;
  message?: string;
  config?: {
    id: string;
    tenantId: string;
    environment: string;
    isEnabled: boolean;
    gstinEnabled: boolean;
    tdsEnabled: boolean;
    creditReportEnabled: boolean;
    hasToken: boolean;
    lastVerifiedAt: string | null;
    totalApiCalls: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface SurepassLog {
  id: string;
  apiType: string;
  responseStatus: number;
  isSuccess: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export default function SurepassSettings() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [apiToken, setApiToken] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [isEnabled, setIsEnabled] = useState(true);
  const [gstinEnabled, setGstinEnabled] = useState(true);
  const [tdsEnabled, setTdsEnabled] = useState(true);
  const [creditReportEnabled, setCreditReportEnabled] = useState(true);

  // Fetch existing configuration
  const { data: configData, isLoading: isLoadingConfig } = useQuery<SurepassConfigResponse>({
    queryKey: ["/api/surepass/config"],
  });

  // Fetch API logs
  const { data: logsData, isLoading: isLoadingLogs } = useQuery<SurepassLog[]>({
    queryKey: ["/api/surepass/logs"],
    enabled: configData?.exists === true,
  });

  // Update form when config loads
  useEffect(() => {
    if (configData?.exists && configData?.config) {
      setEnvironment(configData.config.environment as "sandbox" | "production");
      setIsEnabled(configData.config.isEnabled);
      setGstinEnabled(configData.config.gstinEnabled);
      setTdsEnabled(configData.config.tdsEnabled);
      setCreditReportEnabled(configData.config.creditReportEnabled);
    }
  }, [configData]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/surepass/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surepass/config"] });
      toast({
        title: "Success",
        description: "Surepass configuration saved successfully",
      });
      setApiToken(""); // Clear token field after save
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/surepass/test-connection", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/surepass/config"] });
      toast({
        title: "Connection Successful",
        description: `Connected to Surepass API (${data.environment || environment} environment)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Surepass API",
        variant: "destructive",
      });
    },
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/surepass/config");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surepass/config"] });
      toast({
        title: "Deleted",
        description: "Surepass configuration removed",
      });
      // Reset form
      setApiToken("");
      setEnvironment("sandbox");
      setIsEnabled(true);
      setGstinEnabled(true);
      setTdsEnabled(true);
      setCreditReportEnabled(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete configuration",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (!apiToken && !configData?.config?.hasToken) {
      toast({
        title: "Validation Error",
        description: "Surepass API Token is required",
        variant: "destructive",
      });
      return;
    }

    const data: any = {
      environment,
      isEnabled,
      gstinEnabled,
      tdsEnabled,
      creditReportEnabled,
    };

    if (apiToken) {
      data.apiToken = apiToken;
    }

    saveConfigMutation.mutate(data);
  };

  const getApiTypeBadge = (apiType: string) => {
    switch (apiType) {
      case "gstin":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">GSTIN</Badge>;
      case "tds":
        return <Badge variant="outline" className="bg-green-50 text-green-700">TDS</Badge>;
      case "credit_report":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Credit Report</Badge>;
      case "credit_report_pdf":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700">Credit PDF</Badge>;
      default:
        return <Badge variant="outline">{apiType}</Badge>;
    }
  };

  if (isAuthLoading || isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Surepass KYC Integration</h1>
        <p className="text-muted-foreground mt-2">
          Configure Surepass API for GSTIN verification, TDS check, and Credit Reports
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            API Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Connection Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Connection Status
                  </CardTitle>
                  <CardDescription>
                    Current status of your Surepass API connection
                  </CardDescription>
                </div>
                {configData?.exists ? (
                  <Badge variant={configData.config?.isEnabled ? "default" : "secondary"}>
                    {configData.config?.isEnabled ? "Active" : "Disabled"}
                  </Badge>
                ) : (
                  <Badge variant="outline">Not Configured</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {configData?.config?.totalApiCalls || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total API Calls</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold capitalize">
                    {configData?.config?.environment || "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground">Environment</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {configData?.config?.lastVerifiedAt 
                      ? new Date(configData.config.lastVerifiedAt).toLocaleDateString()
                      : "Never"
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Last Verified</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-center">
                    {configData?.config?.hasToken ? (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    ) : (
                      <AlertCircle className="h-8 w-8 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">Token Status</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Enter your Surepass API credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiToken">API Token (Bearer Token)</Label>
                <Input
                  id="apiToken"
                  type="password"
                  placeholder={configData?.config?.hasToken ? "••••••••••••••••" : "Enter your Surepass API token"}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your token from Surepass Dashboard → Credential section
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <Select value={environment} onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                    <SelectItem value="production">Production (Live)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Surepass Integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn off to disable all KYC verifications
                  </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>
            </CardContent>
          </Card>

          {/* API Permissions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                API Permissions
              </CardTitle>
              <CardDescription>
                Enable or disable specific API features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium">GSTIN Verification</div>
                    <div className="text-sm text-muted-foreground">Verify GST numbers and get business details</div>
                  </div>
                </div>
                <Switch checked={gstinEnabled} onCheckedChange={setGstinEnabled} />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">TDS Check</div>
                    <div className="text-sm text-muted-foreground">Verify TAN numbers and TDS compliance</div>
                  </div>
                </div>
                <Switch checked={tdsEnabled} onCheckedChange={setTdsEnabled} />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="font-medium">Credit Report (CIBIL)</div>
                    <div className="text-sm text-muted-foreground">Get credit scores and financial reports</div>
                  </div>
                </div>
                <Switch checked={creditReportEnabled} onCheckedChange={setCreditReportEnabled} />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={handleSave} 
              disabled={saveConfigMutation.isPending}
              className="gap-2"
            >
              {saveConfigMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save Configuration
            </Button>

            <Button 
              variant="outline" 
              onClick={() => testConnectionMutation.mutate()}
              disabled={testConnectionMutation.isPending || !configData?.config?.hasToken}
              className="gap-2"
            >
              {testConnectionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Test Connection
            </Button>

            {configData?.exists && (
              <Button 
                variant="destructive" 
                onClick={() => deleteConfigMutation.mutate()}
                disabled={deleteConfigMutation.isPending}
              >
                {deleteConfigMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Remove Configuration"
                )}
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                API Call History
              </CardTitle>
              <CardDescription>
                Recent Surepass API calls and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : logsData && logsData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>API Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{getApiTypeBadge(log.apiType)}</TableCell>
                        <TableCell>
                          {log.isSuccess ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {log.errorMessage || `HTTP ${log.responseStatus}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No API calls recorded yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
