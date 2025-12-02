import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Eye, EyeOff, Save, TestTube2, CheckCircle2, XCircle, Loader2, Info, Zap, Brain, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AiAssistantConfig {
  id?: number;
  tenantId?: string;
  apiKey?: string;
  hasApiKey?: boolean;
  maskedApiKey?: string;
  model: string;
  isEnabled: boolean;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  lastTestedAt?: string;
  isApiValid?: boolean;
}

const AVAILABLE_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (Recommended)", description: "Latest flagship model" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Fast and cost-effective" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", description: "High capability" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", description: "Good balance" },
];

const DEFAULT_SYSTEM_PROMPT = "You are Hey Recov, a helpful AI assistant for the RECOV debt collection platform.";

export default function AiAssistantConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState("gpt-4o");
  const [isEnabled, setIsEnabled] = useState(false);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: config, isLoading } = useQuery<AiAssistantConfig>({
    queryKey: ["/api/ai-assistant/config"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/ai-assistant/config");
      return response.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (config) {
      setModel(config.model || "gpt-4o");
      setIsEnabled(config.isEnabled || false);
      setMaxTokens(config.maxTokens || 2000);
      setTemperature(config.temperature || 0.7);
      setSystemPrompt(config.systemPrompt || DEFAULT_SYSTEM_PROMPT);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<AiAssistantConfig>) => {
      const response = await apiRequest("POST", "/api/ai-assistant/config", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configuration Saved", description: "AI Assistant settings saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-assistant/config"] });
      setApiKey("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await apiRequest("POST", "/api/ai-assistant/test", { apiKey: key });
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult({ success: true, message: data.message || "API connection successful!" });
      toast({ title: "Connection Successful", description: "OpenAI API is working." });
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message });
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const data: Partial<AiAssistantConfig> = { model, isEnabled, maxTokens, temperature, systemPrompt };
    if (apiKey.trim()) data.apiKey = apiKey.trim();
    saveMutation.mutate(data);
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim() && !config?.apiKey) {
      toast({ title: "API Key Required", description: "Please enter an API key.", variant: "destructive" });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try { await testMutation.mutateAsync(apiKey.trim() || "use-stored"); } 
    finally { setIsTesting(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const getLastTestedText = () => {
    if (config?.lastTestedAt) {
      return "Last tested: " + new Date(config.lastTestedAt).toLocaleString();
    }
    return "Not tested yet";
  };

  const getTestResultClass = () => {
    if (testResult?.success) return "flex items-center gap-2 text-sm text-green-600";
    return "flex items-center gap-2 text-sm text-red-600";
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Hey Recov - AI Assistant</h1>
          <p className="text-muted-foreground">Configure OpenAI integration</p>
        </div>
      </div>

      <Card className={isEnabled && config?.isApiValid ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isEnabled && config?.isApiValid ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <XCircle className="h-6 w-6 text-muted-foreground" />}
              <div>
                <p className="font-medium">{isEnabled && config?.isApiValid ? "AI Assistant is Active" : "AI Assistant is Inactive"}</p>
                <p className="text-sm text-muted-foreground">{getLastTestedText()}</p>
              </div>
            </div>
            <Badge variant={isEnabled ? "default" : "secondary"}>{isEnabled ? "Enabled" : "Disabled"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-500" />API Configuration</CardTitle>
          <CardDescription>Enter your OpenAI API key</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input id="apiKey" type={showApiKey ? "text" : "password"} placeholder={config?.maskedApiKey || "sk-..."} value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="pr-10" />
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" onClick={handleTestConnection} disabled={isTesting || (!apiKey.trim() && !config?.hasApiKey)}>
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TestTube2 className="h-4 w-4 mr-2" />}Test
              </Button>
            </div>
            {testResult && <div className={getTestResultClass()}>{testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{testResult.message}</div>}
          </div>
          <div className="flex items-center justify-between py-2">
            <div><Label>Enable AI Assistant</Label><p className="text-sm text-muted-foreground">Allow users to interact with Hey Recov</p></div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-purple-500" />Model Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger>
              <SelectContent>{AVAILABLE_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label>Max Tokens</Label><Badge variant="outline">{maxTokens}</Badge></div>
            <Slider value={[maxTokens]} onValueChange={(v) => setMaxTokens(v[0])} min={100} max={4000} step={100} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label>Temperature</Label><Badge variant="outline">{temperature.toFixed(1)}</Badge></div>
            <Slider value={[temperature]} onValueChange={(v) => setTemperature(v[0])} min={0} max={2} step={0.1} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-blue-500" />System Prompt</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="Enter system instructions..." className="min-h-[200px]" />
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}>Reset to Default</Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-gradient-to-r from-purple-500 to-pink-500">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save Configuration
        </Button>
      </div>
    </div>
  );
}
