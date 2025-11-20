import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Phone, Info, Eye, EyeOff, ArrowLeft, Copy, CheckCircle2, Shield, Zap, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import type { TelecmiConfig } from "@shared/schema";

const telecmiConfigFormSchema = z.object({
  appId: z.string().trim().min(1, "App ID is required"),
  appSecret: z.string().trim().min(1, "App Secret is required"),
  fromNumber: z.string().trim().min(1, "From Number is required").regex(/^\+?\d{1,15}$/, "Must be a valid phone number"),
  answerUrl: z.string().optional().transform(val => val?.trim() || undefined).refine(
    (val) => !val || val === "" || z.string().url().safeParse(val).success,
    { message: "Must be a valid URL" }
  ),
  isActive: z.enum(["Active", "Inactive"]).default("Active"),
});

type TelecmiConfigFormValues = z.infer<typeof telecmiConfigFormSchema>;

export default function TelecmiConfig() {
  const { toast } = useToast();
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copiedWebhookSecret, setCopiedWebhookSecret] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const { data: config, isLoading } = useQuery<TelecmiConfig | null>({
    queryKey: ["/api/telecmi/config"],
  });

  const { data: webhookSecret } = useQuery<{ secret: string }>({
    queryKey: ["/api/telecmi/webhook-secret"],
    enabled: !!config,
  });

  const form = useForm<TelecmiConfigFormValues>({
    resolver: zodResolver(telecmiConfigFormSchema),
    defaultValues: {
      appId: "",
      appSecret: "",
      fromNumber: "",
      answerUrl: "",
      isActive: "Active",
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        appId: config.appId || "",
        appSecret: config.appSecret || "",
        fromNumber: config.fromNumber || "",
        answerUrl: config.answerUrl || "",
        isActive: (config.isActive as "Active" | "Inactive") || "Active",
      });
    }
  }, [config, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: TelecmiConfigFormValues) => {
      return await apiRequest("POST", "/api/telecmi/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telecmi/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/telecmi/webhook-secret"] });
      toast({
        title: "Success",
        description: "Telecmi configuration saved successfully",
      });
      // Reset connection status after saving new config
      setConnectionStatus(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/telecmi/test-connection", {});
    },
    onSuccess: (data: any) => {
      setConnectionStatus(data);
      toast({
        title: data.connected ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.connected ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      setConnectionStatus({
        connected: false,
        message: error.message || "Failed to test connection",
      });
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyWebhookSecret = () => {
    if (webhookSecret?.secret) {
      navigator.clipboard.writeText(webhookSecret.secret);
      setCopiedWebhookSecret(true);
      toast({
        title: "Copied!",
        description: "Webhook secret copied to clipboard",
      });
      setTimeout(() => setCopiedWebhookSecret(false), 2000);
    }
  };

  const onSubmit = (data: TelecmiConfigFormValues) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const webhookUrl = window.location.origin + "/api/telecmi/webhook/answered";
  const cdrUrl = window.location.origin + "/api/telecmi/webhook/cdr";

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Telecmi PIOPIY Configuration</h1>
            {connectionStatus && (
              <Badge 
                variant={connectionStatus.connected ? "default" : "destructive"}
                className={connectionStatus.connected ? "bg-green-500 hover:bg-green-600" : ""}
              >
                {connectionStatus.connected ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </>
                )}
              </Badge>
            )}
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Configure Telecmi PIOPIY voice calling integration for payment reminders
          </p>
        </div>
        <Link href="/credit-control/followup-automation">
          <Button variant="outline" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Configuration
          </Button>
        </Link>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Enter your Telecmi PIOPIY credentials. You can find these in your Telecmi dashboard under Settings → API Credentials.
          Supports both simple pre-recorded calls and AI-powered conversations.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                API Configuration
              </CardTitle>
              <CardDescription>Configure your Telecmi PIOPIY API credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="appId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App ID *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your Telecmi App ID"
                        data-testid="input-app-id"
                      />
                    </FormControl>
                    <FormDescription>Your Telecmi PIOPIY application ID</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Secret *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showAppSecret ? "text" : "password"}
                          placeholder="Enter your Telecmi App Secret"
                          data-testid="input-app-secret"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowAppSecret(!showAppSecret)}
                        >
                          {showAppSecret ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Your Telecmi PIOPIY app secret (encrypted at rest). 
                      {config && " Leave as-is to keep existing secret, or enter new secret to update."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fromNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Number *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="+919876543210"
                        data-testid="input-from-number"
                      />
                    </FormControl>
                    <FormDescription>
                      The phone number that will appear as caller ID (with country code, e.g., +919876543210)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="answerUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://your-server.com/answer-url"
                        data-testid="input-answer-url"
                      />
                    </FormControl>
                    <FormDescription>
                      Custom PCMO answer URL (optional, leave blank for default TTS handling)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {config && webhookSecret && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Webhook Configuration
                </CardTitle>
                <CardDescription>Configure these webhooks in your Telecmi dashboard for call status updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Webhook Secret</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                      <Input
                        value={webhookSecret.secret}
                        type={showWebhookSecret ? "text" : "password"}
                        readOnly
                        className="bg-gray-50 dark:bg-gray-900 pr-20"
                        data-testid="input-webhook-secret"
                      />
                      <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                          className="h-8 w-8 p-0"
                        >
                          {showWebhookSecret ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={copyWebhookSecret}
                          className="h-8 w-8 p-0"
                          data-testid="button-copy-webhook-secret"
                        >
                          {copiedWebhookSecret ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use this secret to sign webhook requests in Telecmi dashboard
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Answer URL</Label>
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-900 mt-2 font-mono text-xs"
                    data-testid="input-webhook-url"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Configure this as the Answer URL in Telecmi dashboard
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">CDR URL</Label>
                  <Input
                    value={cdrUrl}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-900 mt-2 font-mono text-xs"
                    data-testid="input-cdr-url"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Configure this as the CDR URL in Telecmi dashboard
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              data-testid="button-save-config"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending}
                data-testid="button-test-connection"
              >
                {testConnectionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
