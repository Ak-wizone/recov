import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { WhisperConfig } from "@shared/schema";

interface WhisperConfigResponse {
  exists: boolean;
  message?: string;
  config?: WhisperConfig & { hasApiKey: boolean };
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Key, Clock, DollarSign, ToggleLeft, Check, AlertCircle } from "lucide-react";

export default function WhisperSettings() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [apiKey, setApiKey] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [starterMinutes, setStarterMinutes] = useState(100);
  const [professionalMinutes, setProfessionalMinutes] = useState(500);
  const [enterpriseMinutes, setEnterpriseMinutes] = useState(2000);
  
  // Platform admin guard - redirect non-platform-admin users
  useEffect(() => {
    if (!isAuthLoading && user && user.tenantId) {
      // User has a tenantId, meaning they're not a platform admin
      toast({
        title: "Access Denied",
        description: "This page is only accessible to platform administrators",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [user, isAuthLoading, setLocation, toast]);

  // Fetch current configuration
  const { data: configData, isLoading } = useQuery<WhisperConfigResponse>({
    queryKey: ["/api/whisper/config"],
  });

  // Hydrate state when data loads
  useEffect(() => {
    if (configData?.exists && configData?.config) {
      setIsEnabled(configData.config.enabled ?? true);
      setStarterMinutes(configData.config.starterMinutes ?? 100);
      setProfessionalMinutes(configData.config.professionalMinutes ?? 500);
      setEnterpriseMinutes(configData.config.enterpriseMinutes ?? 2000);
    }
  }, [configData]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/whisper/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whisper/config"] });
      toast({
        title: "Success",
        description: "Whisper configuration saved successfully",
      });
      setApiKey(""); // Clear API key input
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!apiKey && !configData?.config?.hasApiKey) {
      toast({
        title: "Validation Error",
        description: "OpenAI API key is required",
        variant: "destructive",
      });
      return;
    }

    const payload: any = {
      isEnabled,
      starterMinutes,
      professionalMinutes,
      enterpriseMinutes,
      addonPricingTiers: JSON.stringify([
        { minutes: 100, price: 50 },
        { minutes: 500, price: 200 },
        { minutes: 1000, price: 350 },
      ]),
    };

    if (apiKey) {
      payload.apiKey = apiKey;
    }

    saveConfigMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-whisper-settings" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Whisper Voice AI Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure OpenAI Whisper integration and credit allocation for all tenants
          </p>
        </div>
        {configData?.config?.hasApiKey && (
          <Badge variant="outline" className="text-green-600 dark:text-green-400">
            <Check className="h-3 w-3 mr-1" />
            API Key Configured
          </Badge>
        )}
      </div>

      {/* API Key Configuration */}
      <Card data-testid="card-api-key">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            OpenAI API Key
          </CardTitle>
          <CardDescription>
            {configData?.config?.hasApiKey
              ? "API key is stored securely. Enter a new key to rotate it."
              : "Enter your OpenAI API key to enable Whisper transcription"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={configData?.config?.hasApiKey ? "Enter new key to rotate" : "sk-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              data-testid="input-api-key"
            />
            <p className="text-sm text-muted-foreground">
              {configData?.config?.hasApiKey
                ? "Leave empty to keep current key. Your API key is encrypted using AES-256-GCM."
                : "Get your API key from OpenAI platform. It will be encrypted before storage."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plan Allocations */}
      <Card data-testid="card-plan-allocations">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Plan-wise Credit Allocation
          </CardTitle>
          <CardDescription>
            Set monthly voice minutes allocation for each subscription plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="starterMinutes">Starter Plan</Label>
              <Input
                id="starterMinutes"
                type="number"
                min="0"
                value={starterMinutes}
                onChange={(e) => setStarterMinutes(parseInt(e.target.value) || 0)}
                data-testid="input-starter-minutes"
              />
              <p className="text-xs text-muted-foreground">Minutes per month</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="professionalMinutes">Professional Plan</Label>
              <Input
                id="professionalMinutes"
                type="number"
                min="0"
                value={professionalMinutes}
                onChange={(e) => setProfessionalMinutes(parseInt(e.target.value) || 0)}
                data-testid="input-professional-minutes"
              />
              <p className="text-xs text-muted-foreground">Minutes per month</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enterpriseMinutes">Enterprise Plan</Label>
              <Input
                id="enterpriseMinutes"
                type="number"
                min="0"
                value={enterpriseMinutes}
                onChange={(e) => setEnterpriseMinutes(parseInt(e.target.value) || 0)}
                data-testid="input-enterprise-minutes"
              />
              <p className="text-xs text-muted-foreground">Minutes per month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addon Pricing */}
      <Card data-testid="card-addon-pricing">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Addon Pricing Tiers
          </CardTitle>
          <CardDescription>
            Configure addon credit packages for purchase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
              <div>Minutes</div>
              <div>Price (₹)</div>
              <div>Per Minute</div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="font-medium">100 minutes</div>
              <div className="text-muted-foreground">₹50</div>
              <div className="text-sm text-muted-foreground">₹0.50/min</div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="font-medium">500 minutes</div>
              <div className="text-muted-foreground">₹200</div>
              <div className="text-sm text-muted-foreground">₹0.40/min</div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="font-medium">1000 minutes</div>
              <div className="text-muted-foreground">₹350</div>
              <div className="text-sm text-muted-foreground">₹0.35/min</div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Addon packages are available for tenants to purchase when plan minutes are exhausted
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggle */}
      <Card data-testid="card-feature-toggle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ToggleLeft className="h-5 w-5" />
            Feature Status
          </CardTitle>
          <CardDescription>
            Enable or disable Whisper Voice AI globally for all tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="featureToggle" className="text-base">
                Whisper Voice AI
              </Label>
              <p className="text-sm text-muted-foreground">
                When disabled, all tenants will use browser speech recognition instead
              </p>
            </div>
            <Switch
              id="featureToggle"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              data-testid="switch-feature-enabled"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>Changes will apply immediately after saving</span>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveConfigMutation.isPending}
          size="lg"
          data-testid="button-save-config"
        >
          {saveConfigMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
