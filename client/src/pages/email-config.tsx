import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Mail, CheckCircle2, XCircle, Info, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { EmailConfig } from "@shared/schema";

const emailConfigFormSchema = z.object({
  provider: z.enum(["gmail", "smtp"]),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  fromEmail: z.string().email("Invalid email address"),
  fromName: z.string().min(1, "From name is required"),
}).refine((data) => {
  if (data.provider === "smtp") {
    return !!data.smtpHost && !!data.smtpPort && !!data.smtpUser && !!data.smtpPassword;
  }
  return true;
}, {
  message: "SMTP fields are required when using SMTP provider",
  path: ["smtpHost"],
});

type EmailConfigFormValues = z.infer<typeof emailConfigFormSchema>;

export default function EmailConfig() {
  const { toast } = useToast();
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: config, isLoading } = useQuery<EmailConfig | null>({
    queryKey: ["/api/email-config"],
  });

  const form = useForm<EmailConfigFormValues>({
    resolver: zodResolver(emailConfigFormSchema),
    defaultValues: {
      provider: "smtp",
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "",
      fromName: "",
    },
  });

  const provider = form.watch("provider");

  useEffect(() => {
    if (config) {
      form.reset({
        provider: config.provider as "gmail" | "smtp",
        smtpHost: config.smtpHost || "",
        smtpPort: config.smtpPort || 587,
        smtpUser: config.smtpUser || "",
        smtpPassword: config.smtpPassword || "",
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
    }
  }, [config, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: EmailConfigFormValues) => {
      if (config?.id) {
        const response = await apiRequest("PUT", `/api/email-config/${config.id}`, data);
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/email-config", data);
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
      toast({
        title: "Success",
        description: "Email configuration saved successfully",
      });
      setTestResult(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = async () => {
    const values = form.getValues();
    setTestingConnection(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/email-config/test", {
        method: "POST",
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: result.message || "Connection successful" });
        toast({
          title: "Success",
          description: "Email connection test successful",
        });
      } else {
        setTestResult({ success: false, message: result.message || "Connection failed" });
        toast({
          title: "Test Failed",
          description: result.message || "Connection failed",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleGmailConnect = async () => {
    try {
      const response = await fetch("/api/auth/google");
      const data = await response.json();
      
      if (data.url) {
        window.open(data.url, "_blank", "width=600,height=700");
        
        toast({
          title: "Authentication Started",
          description: "Please complete the authentication in the popup window",
        });

        const checkInterval = setInterval(async () => {
          const configResponse = await fetch("/api/email-config");
          const config = await configResponse.json();
          
          if (config && config.provider === "gmail" && config.gmailRefreshToken) {
            clearInterval(checkInterval);
            queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
            toast({
              title: "Success",
              description: "Gmail account connected successfully!",
            });
          }
        }, 2000);

        setTimeout(() => clearInterval(checkInterval), 120000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: EmailConfigFormValues) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Configuration</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Configure email settings for sending notifications and communications
          </p>
        </div>
        <Link href="/credit-control/followup-automation">
          <Button variant="outline" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Configuration
          </Button>
        </Link>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Provider Settings
              </CardTitle>
              <CardDescription>Choose your email provider and configure settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Provider *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-provider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gmail">Gmail OAuth2</SelectItem>
                        <SelectItem value="smtp">SMTP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {provider === "gmail" && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Click 'Connect with Google' to authenticate and configure Gmail
                  </AlertDescription>
                </Alert>
              )}

              {provider === "gmail" && (
                <Button
                  type="button"
                  onClick={handleGmailConnect}
                  variant="outline"
                  className="w-full"
                  data-testid="button-connect-gmail"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Connect with Google
                </Button>
              )}

              {provider === "smtp" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="smtpHost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Host *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="smtp.gmail.com"
                            data-testid="input-smtp-host"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Port *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="587"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            value={field.value || ""}
                            data-testid="input-smtp-port"
                          />
                        </FormControl>
                        <FormDescription>Common ports: 587 (TLS), 465 (SSL)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpUser"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP User (Email) *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="your-email@gmail.com"
                            data-testid="input-smtp-user"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Password *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-smtp-password"
                          />
                        </FormControl>
                        <FormDescription>Use app password for Gmail</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <FormField
                  control={form.control}
                  name="fromEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Email *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="noreply@company.com"
                          data-testid="input-from-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fromName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Company Name"
                          data-testid="input-from-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription data-testid="text-test-result">
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection || !form.formState.isValid}
              data-testid="button-test-connection"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>

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
          </div>
        </form>
      </Form>
    </div>
  );
}
