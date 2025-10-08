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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp API Configuration</CardTitle>
              <CardDescription>
                Choose your WhatsApp API provider and configure the credentials
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
