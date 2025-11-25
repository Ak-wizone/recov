import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Key, Mic, Settings, Check, AlertCircle, CheckCircle, Users } from "lucide-react";

interface ElevenLabsConfigResponse {
  exists: boolean;
  message?: string;
  config?: {
    id: string;
    isEnabled: boolean;
    defaultModel: string;
    defaultStability: string;
    defaultSimilarityBoost: string;
    hasApiKey: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

interface SubscriptionInfo {
  tier: string;
  characterCount: number;
  characterLimit: number;
  voiceLimit: number;
  professionalVoiceLimit: number;
}

export default function ElevenLabsSettings() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [apiKey, setApiKey] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [defaultModel, setDefaultModel] = useState("eleven_multilingual_v2");
  const [stability, setStability] = useState([0.5]);
  const [similarityBoost, setSimilarityBoost] = useState([0.75]);

  useEffect(() => {
    if (!isAuthLoading && user && user.tenantId) {
      toast({
        title: "Access Denied",
        description: "This page is only accessible to platform administrators",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [user, isAuthLoading, setLocation, toast]);

  const { data: configData, isLoading: isLoadingConfig } = useQuery<ElevenLabsConfigResponse>({
    queryKey: ["/api/elevenlabs/config"],
  });

  useEffect(() => {
    if (configData?.exists && configData?.config) {
      setIsEnabled(configData.config.isEnabled);
      setDefaultModel(configData.config.defaultModel);
      setStability([parseFloat(configData.config.defaultStability)]);
      setSimilarityBoost([parseFloat(configData.config.defaultSimilarityBoost)]);
    }
  }, [configData]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/elevenlabs/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/config"] });
      toast({
        title: "Success",
        description: "ElevenLabs configuration saved successfully",
      });
      setApiKey("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const testApiMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/elevenlabs/test-api", {});
    },
    onSuccess: (data: any) => {
      const subscription = data.subscription as SubscriptionInfo;
      toast({
        title: "Connection Successful",
        description: `Connected to ElevenLabs (${subscription?.tier || "Unknown"} plan). Characters: ${subscription?.characterCount?.toLocaleString() || 0}/${subscription?.characterLimit?.toLocaleString() || 0}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to ElevenLabs API",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (!apiKey && !configData?.config?.hasApiKey) {
      toast({
        title: "Validation Error",
        description: "ElevenLabs API key is required",
        variant: "destructive",
      });
      return;
    }

    const data: any = {
      isEnabled,
      defaultModel,
      defaultStability: stability[0].toFixed(2),
      defaultSimilarityBoost: similarityBoost[0].toFixed(2),
    };

    if (apiKey) {
      data.apiKey = apiKey;
    }

    saveConfigMutation.mutate(data);
  };

  if (isAuthLoading || isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">ElevenLabs Voice Cloning</h1>
        <p className="text-muted-foreground mt-2">
          Configure ElevenLabs API for voice cloning. Users can clone their voice and use it for Telecmi calls.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Enter your ElevenLabs API key to enable voice cloning features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={configData?.config?.hasApiKey ? "••••••••••••••••" : "Enter ElevenLabs API key"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  data-testid="input-api-key"
                />
                <Button
                  variant="outline"
                  onClick={() => testApiMutation.mutate()}
                  disabled={testApiMutation.isPending || (!apiKey && !configData?.config?.hasApiKey)}
                  data-testid="button-test-connection"
                >
                  {testApiMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Test Connection"
                  )}
                </Button>
              </div>
              {configData?.config?.hasApiKey && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  API key is configured. Enter a new key to update.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Voice Cloning</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to create and use cloned voices
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                data-testid="switch-enabled"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Voice Settings
            </CardTitle>
            <CardDescription>
              Configure default settings for text-to-speech generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Voice Model</Label>
              <Select value={defaultModel} onValueChange={setDefaultModel}>
                <SelectTrigger data-testid="select-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eleven_multilingual_v2">Multilingual V2 (Recommended)</SelectItem>
                  <SelectItem value="eleven_monolingual_v1">Monolingual V1 (English only)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Multilingual V2 supports Hindi, English, and Hinglish
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Stability: {(stability[0] * 100).toFixed(0)}%</Label>
                </div>
                <Slider
                  value={stability}
                  onValueChange={setStability}
                  min={0}
                  max={1}
                  step={0.01}
                  data-testid="slider-stability"
                />
                <p className="text-sm text-muted-foreground">
                  Higher stability means more consistent but less expressive voice
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Similarity Boost: {(similarityBoost[0] * 100).toFixed(0)}%</Label>
                </div>
                <Slider
                  value={similarityBoost}
                  onValueChange={setSimilarityBoost}
                  min={0}
                  max={1}
                  step={0.01}
                  data-testid="slider-similarity"
                />
                <p className="text-sm text-muted-foreground">
                  Higher similarity makes the voice closer to the original sample
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={configData?.config?.hasApiKey ? "default" : "secondary"}>
                {configData?.config?.hasApiKey ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Configured
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Configured
                  </>
                )}
              </Badge>
              <Badge variant={isEnabled ? "default" : "secondary"}>
                {isEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            onClick={handleSave}
            disabled={saveConfigMutation.isPending}
            data-testid="button-save"
          >
            {saveConfigMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
