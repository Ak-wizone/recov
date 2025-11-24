import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TelegramBotConfig } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bot, Check, Copy, ExternalLink, Loader2, RefreshCw, Save, Settings, Webhook } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export default function TelegramBotSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [enableVoiceResponse, setEnableVoiceResponse] = useState(false);
  const [voiceType, setVoiceType] = useState<string>("alloy");
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Platform admin check
  const isPlatformAdmin = user && !user.tenantId;

  // Redirect if not platform admin
  if (!isPlatformAdmin) {
    navigate("/dashboard");
    return null;
  }

  // Fetch current bot configuration
  const { data: config, isLoading } = useQuery<TelegramBotConfig | null>({
    queryKey: ["/api/telegram/config"],
  });

  // Load config into state when fetched
  useEffect(() => {
    if (config) {
      setBotToken(config.botToken || "");
      setBotUsername(config.botUsername || "");
      setWebhookUrl(config.webhookUrl || "");
      setIsActive(config.isActive ?? true);
      setEnableVoiceResponse(config.enableVoiceResponse ?? false);
      setVoiceType(config.voiceType || "alloy");
    }
  }, [config]);

  // Save configuration mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!botToken.trim() || !botUsername.trim()) {
        throw new Error("Bot token and username are required");
      }

      return await apiRequest("POST", "/api/telegram/config", {
        botToken: botToken.trim(),
        botUsername: botUsername.trim(),
        webhookUrl: webhookUrl.trim() || undefined,
        isActive,
        enableVoiceResponse,
        voiceType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/config"] });
      toast({
        title: "Configuration saved",
        description: "Telegram bot configuration has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/telegram/test", {});
    },
    onSuccess: () => {
      toast({
        title: "Connection successful",
        description: "Successfully connected to Telegram Bot API.",
      });
      setShowTestDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyToken = () => {
    navigator.clipboard.writeText(botToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
    toast({
      title: "Copied",
      description: "Bot token copied to clipboard",
    });
  };

  const handleCopyWebhook = () => {
    const url = webhookUrl || `${window.location.origin}/api/telegram/webhook`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleTest = () => {
    setShowTestDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const defaultWebhookUrl = `${window.location.origin}/api/telegram/webhook`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Telegram Bot Configuration
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure your Telegram bot for business intelligence queries across all tenants
          </p>
        </div>
        <Badge variant={isActive ? "default" : "secondary"} className="text-sm px-3 py-1">
          {isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <Separator />

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Bot Settings
          </CardTitle>
          <CardDescription>
            Enter your Telegram bot credentials from @BotFather
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bot Token */}
          <div className="space-y-2">
            <Label htmlFor="bot-token">Bot Token *</Label>
            <div className="flex gap-2">
              <Input
                id="bot-token"
                data-testid="input-bot-token"
                type="password"
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyToken}
                disabled={!botToken}
                data-testid="button-copy-token"
              >
                {copiedToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get this from @BotFather on Telegram after creating a new bot
            </p>
          </div>

          {/* Bot Username */}
          <div className="space-y-2">
            <Label htmlFor="bot-username">Bot Username *</Label>
            <Input
              id="bot-username"
              data-testid="input-bot-username"
              placeholder="recov_business_bot"
              value={botUsername}
              onChange={(e) => setBotUsername(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Your bot's username (without @)
            </p>
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhook URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                data-testid="input-webhook-url"
                placeholder={defaultWebhookUrl}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyWebhook}
                data-testid="button-copy-webhook"
              >
                {copiedWebhook ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Default: {defaultWebhookUrl}
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="is-active">Bot Status</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable the bot globally
              </p>
            </div>
            <Switch
              id="is-active"
              data-testid="switch-bot-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Voice Response Settings */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enable-voice">Voice Responses</Label>
                <p className="text-sm text-muted-foreground">
                  Enable AI voice responses using OpenAI TTS
                </p>
              </div>
              <Switch
                id="enable-voice"
                data-testid="switch-voice-response"
                checked={enableVoiceResponse}
                onCheckedChange={setEnableVoiceResponse}
              />
            </div>

            {enableVoiceResponse && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="voice-type">Voice Type</Label>
                <Select value={voiceType} onValueChange={setVoiceType}>
                  <SelectTrigger id="voice-type" data-testid="select-voice-type">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                    <SelectItem value="echo">Echo (Male)</SelectItem>
                    <SelectItem value="fable">Fable (British)</SelectItem>
                    <SelectItem value="onyx">Onyx (Deep Male)</SelectItem>
                    <SelectItem value="nova">Nova (Female)</SelectItem>
                    <SelectItem value="shimmer">Shimmer (Soft Female)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the voice for AI-generated audio responses. Uses OpenAI TTS API.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !botToken.trim() || !botUsername.trim()}
              className="flex-1"
              data-testid="button-save-config"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testMutation.isPending || !config}
              data-testid="button-test-connection"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              1
            </div>
            <div>
              <p className="font-medium">Create a bot on Telegram</p>
              <p className="text-sm text-muted-foreground">
                Open @BotFather on Telegram and use /newbot command
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              2
            </div>
            <div>
              <p className="font-medium">Copy credentials</p>
              <p className="text-sm text-muted-foreground">
                @BotFather will give you a token and username - paste them above
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              3
            </div>
            <div>
              <p className="font-medium">Save and test</p>
              <p className="text-sm text-muted-foreground">
                Click "Save Configuration" and then "Test Connection" to verify
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              4
            </div>
            <div>
              <p className="font-medium">Users can start linking</p>
              <p className="text-sm text-muted-foreground">
                Tenant users can now generate linking codes and connect their Telegram accounts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Connection Dialog */}
      <AlertDialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Test Bot Connection</AlertDialogTitle>
            <AlertDialogDescription>
              This will verify that the bot token is valid and the bot is reachable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-test">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              data-testid="button-confirm-test"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Now"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
