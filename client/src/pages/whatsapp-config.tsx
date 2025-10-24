import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWhatsappConfigSchema, type InsertWhatsappConfig, type WhatsappConfig } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, MessageSquare, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function WhatsAppConfig() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [whatsappWebStatus, setWhatsappWebStatus] = useState<{ status: string; qrCode: string | null }>({ status: "not_initialized", qrCode: null });

  const { data: config, isLoading } = useQuery<WhatsappConfig | null>({
    queryKey: ["/api/whatsapp-config"],
  });

  const form = useForm<InsertWhatsappConfig>({
    resolver: zodResolver(insertWhatsappConfigSchema),
    defaultValues: {
      provider: "twilio",
      apiKey: "",
      apiSecret: "",
      accountSid: "",
      phoneNumberId: "",
      businessAccountId: "",
      fromNumber: "",
      apiUrl: "",
      isActive: "Active",
    },
  });

  const selectedProvider = form.watch("provider");

  useEffect(() => {
    if (config) {
      form.reset({
        provider: config.provider as any,
        apiKey: config.apiKey,
        apiSecret: config.apiSecret || "",
        accountSid: config.accountSid || "",
        phoneNumberId: config.phoneNumberId || "",
        businessAccountId: config.businessAccountId || "",
        fromNumber: config.fromNumber,
        apiUrl: config.apiUrl || "",
        isActive: config.isActive as "Active" | "Inactive",
      });
    }
  }, [config, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: InsertWhatsappConfig) => {
      const response = await apiRequest("POST", "/api/whatsapp-config", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-config"] });
      toast({
        title: "Success",
        description: "WhatsApp configuration saved successfully",
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

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await apiRequest("POST", "/api/whatsapp-config/test", {});
      const data = await response.json();
      
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? "Connection successful!" : "Connection failed"),
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || "Failed to test connection",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = (data: InsertWhatsappConfig) => {
    saveMutation.mutate(data);
  };

  // WhatsApp Web mutations
  const initializeWhatsAppWeb = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/whatsapp-web/initialize", {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Initializing",
        description: "WhatsApp Web is initializing. Please scan the QR code.",
      });
      // Start polling for status
      pollWhatsAppWebStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disconnectWhatsAppWeb = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/whatsapp-web/disconnect", {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "WhatsApp Web has been disconnected.",
      });
      setWhatsappWebStatus({ status: "not_initialized", qrCode: null });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pollWhatsAppWebStatus = async () => {
    try {
      const response = await apiRequest("GET", "/api/whatsapp-web/status", {});
      const data = await response.json();
      setWhatsappWebStatus(data);

      // Continue polling if waiting for QR or connecting
      if (data.status === "qr" || data.status === "disconnected") {
        setTimeout(pollWhatsAppWebStatus, 2000);
      }
    } catch (error) {
      console.error("Failed to fetch WhatsApp Web status:", error);
    }
  };

  // Check status on mount
  useEffect(() => {
    pollWhatsAppWebStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-green-600" />
            WhatsApp Configuration
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Configure WhatsApp API settings for automated messaging
          </p>
        </div>
        <Link href="/company-settings">
          <Button variant="outline" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
      </div>

      {/* WhatsApp Web Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Web (Recommended)
          </CardTitle>
          <CardDescription>
            Connect your WhatsApp account directly without API costs. Scan the QR code with your phone to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              {whatsappWebStatus.status === "ready" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-sm">Connected</div>
                    <div className="text-xs text-gray-500">WhatsApp Web is ready to send messages</div>
                  </div>
                </>
              ) : whatsappWebStatus.status === "qr" ? (
                <>
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div>
                    <div className="font-medium text-sm">Waiting for Scan</div>
                    <div className="text-xs text-gray-500">Please scan the QR code with your phone</div>
                  </div>
                </>
              ) : whatsappWebStatus.status === "connected" ? (
                <>
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div>
                    <div className="font-medium text-sm">Connecting...</div>
                    <div className="text-xs text-gray-500">Authenticating with WhatsApp</div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">Not Connected</div>
                    <div className="text-xs text-gray-500">Click Initialize to connect WhatsApp Web</div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              {whatsappWebStatus.status === "ready" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectWhatsAppWeb.mutate()}
                  disabled={disconnectWhatsAppWeb.isPending}
                  data-testid="button-disconnect-whatsapp-web"
                >
                  {disconnectWhatsAppWeb.isPending ? "Disconnecting..." : "Disconnect"}
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => initializeWhatsAppWeb.mutate()}
                  disabled={initializeWhatsAppWeb.isPending || whatsappWebStatus.status === "qr" || whatsappWebStatus.status === "connected"}
                  data-testid="button-initialize-whatsapp-web"
                >
                  {initializeWhatsAppWeb.isPending ? "Initializing..." : "Initialize WhatsApp Web"}
                </Button>
              )}
            </div>
          </div>

          {whatsappWebStatus.qrCode && (
            <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed">
              <p className="text-sm font-medium mb-4">Scan this QR code with WhatsApp on your phone</p>
              <img src={whatsappWebStatus.qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
              <p className="text-xs text-gray-500 mt-4 text-center max-w-md">
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → Scan this QR code
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp API Configuration (Alternative)</CardTitle>
              <CardDescription>
                Or use WhatsApp Business API provider if you prefer API-based integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-provider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio WhatsApp API</SelectItem>
                        <SelectItem value="wati">WATI (WhatsApp Team Inbox)</SelectItem>
                        <SelectItem value="meta">Meta WhatsApp Business API</SelectItem>
                        <SelectItem value="interakt">Interakt</SelectItem>
                        <SelectItem value="aisensy">AiSensy</SelectItem>
                        <SelectItem value="other">Other (Custom API)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedProvider === "twilio" && (
                <>
                  <FormField
                    control={form.control}
                    name="accountSid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account SID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" data-testid="input-account-sid" />
                        </FormControl>
                        <FormDescription>Your Twilio Account SID</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auth Token</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Your Twilio Auth Token" data-testid="input-auth-token" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {selectedProvider === "meta" && (
                <>
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Access Token</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Your Meta Access Token" data-testid="input-access-token" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="1234567890" data-testid="input-phone-id" />
                        </FormControl>
                        <FormDescription>Your WhatsApp Business Phone Number ID</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Account ID (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="1234567890" data-testid="input-business-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {(selectedProvider === "wati" || selectedProvider === "interakt" || selectedProvider === "aisensy") && (
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Your API Key" data-testid="input-api-key" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedProvider === "other" && (
                <>
                  <FormField
                    control={form.control}
                    name="apiUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://api.yourprovider.com/send" data-testid="input-api-url" />
                        </FormControl>
                        <FormDescription>Your custom WhatsApp API endpoint</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key/Token</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Your API Key or Token" data-testid="input-api-key" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="fromNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1234567890" data-testid="input-from-number" />
                    </FormControl>
                    <FormDescription>Your WhatsApp number in international format (e.g., +919876543210)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              data-testid="button-save-config"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>

            {config && (
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={isTesting}
                data-testid="button-test-connection"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
            )}
          </div>

          {testResult && (
            <Card className={testResult.success ? "border-green-500" : "border-red-500"}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <p className={testResult.success ? "text-green-600" : "text-red-600"}>
                    {testResult.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
}
