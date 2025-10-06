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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Phone, CheckCircle2, XCircle, Info, Eye, EyeOff } from "lucide-react";
import type { RinggConfig } from "@shared/schema";

const ringgConfigFormSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  fromNumber: z.string().min(1, "From Number is required").regex(/^\+\d{1,15}$/, "Must be in format +1234567890"),
  webhookUrl: z.string().optional(),
});

type RinggConfigFormValues = z.infer<typeof ringgConfigFormSchema>;

export default function RinggConfig() {
  const { toast } = useToast();
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: config, isLoading } = useQuery<RinggConfig | null>({
    queryKey: ["/api/ringg-config"],
  });

  const form = useForm<RinggConfigFormValues>({
    resolver: zodResolver(ringgConfigFormSchema),
    defaultValues: {
      apiKey: "",
      fromNumber: "",
      webhookUrl: "",
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        apiKey: config.apiKey || "",
        fromNumber: config.fromNumber || "",
        webhookUrl: config.webhookUrl || "",
      });
    }
  }, [config, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: RinggConfigFormValues) => {
      if (config?.id) {
        const response = await apiRequest("PUT", `/api/ringg-config/${config.id}`, data);
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/ringg-config", data);
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ringg-config"] });
      toast({
        title: "Success",
        description: "Ringg.ai configuration saved successfully",
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
      const response = await fetch("/api/ringg-config/test", {
        method: "POST",
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
      }

      if (response.ok) {
        setTestResult({ success: true, message: result.message || "Connection successful" });
        toast({
          title: "Success",
          description: "Ringg.ai connection test successful",
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
      const errorMessage = error.message || "An unexpected error occurred";
      setTestResult({ success: false, message: errorMessage });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const onSubmit = (data: RinggConfigFormValues) => {
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ringg.ai Configuration</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Configure Ringg.ai calling agent integration settings
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Enter your Ringg.ai API key. You can find this in your Ringg.ai dashboard under Settings → API Keys
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
              <CardDescription>Configure your Ringg.ai API credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showApiKey ? "text" : "password"}
                          placeholder="Enter your Ringg.ai API key"
                          data-testid="input-api-key"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>Your Ringg.ai API authentication key</FormDescription>
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
                name="webhookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        readOnly
                        placeholder="Auto-generated by backend"
                        className="bg-gray-50 dark:bg-gray-900"
                        data-testid="input-webhook-url"
                      />
                    </FormControl>
                    <FormDescription>
                      This URL is auto-generated. Configure this in your Ringg.ai dashboard to receive call updates
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
              disabled={testingConnection || !form.watch("apiKey")}
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
