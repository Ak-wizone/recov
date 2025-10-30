import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Loader2, Settings2, TrendingUp, Activity, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AssistantSettings {
  alwaysListen: boolean;
  wakeWord: string;
  wakeWordSensitivity: number;
  voiceFeedback: boolean;
  language: string;
  autoExecuteActions: boolean;
  showSuggestions: boolean;
  theme: string;
}

interface AssistantSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AssistantSettings({ isOpen, onClose }: AssistantSettingsProps) {
  const { toast } = useToast();
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  
  const { data: settings, isLoading } = useQuery<AssistantSettings>({
    queryKey: ["/api/assistant/settings"],
    enabled: isOpen,
  });

  const { data: analytics } = useQuery<any>({
    queryKey: ["/api/assistant/analytics"],
    enabled: isOpen && analyticsOpen,
  });

  const [formData, setFormData] = useState<AssistantSettings>({
    alwaysListen: false,
    wakeWord: "RECOV",
    wakeWordSensitivity: 5,
    voiceFeedback: true,
    language: "en-IN",
    autoExecuteActions: false,
    showSuggestions: true,
    theme: "light",
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        alwaysListen: settings.alwaysListen,
        wakeWord: settings.wakeWord,
        wakeWordSensitivity: settings.wakeWordSensitivity,
        voiceFeedback: settings.voiceFeedback,
        language: settings.language,
        autoExecuteActions: settings.autoExecuteActions,
        showSuggestions: settings.showSuggestions,
        theme: settings.theme,
      });
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: AssistantSettings) => {
      return await apiRequest("PUT", "/api/assistant/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/settings"] });
      toast({
        title: "Settings saved",
        description: "Your voice assistant preferences have been updated.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-xl">Assistant Settings</SheetTitle>
              <SheetDescription>
                Customize your voice assistant experience
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-6" />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Analytics Section */}
            <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between" data-testid="button-toggle-analytics">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Usage Analytics (Last 30 Days)</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {analyticsOpen ? "Hide" : "Show"}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                {analytics ? (
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Activity className="h-4 w-4" />
                          Total Commands
                        </div>
                        <div className="text-2xl font-bold mt-1">{analytics.totalCommands}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Clock className="h-4 w-4" />
                          Avg Response
                        </div>
                        <div className="text-2xl font-bold mt-1">{analytics.avgResponseTime}ms</div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-md">
                      <div className="text-sm text-slate-600 dark:text-slate-400">Success Rate</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-green-500 h-full"
                            style={{ width: `${analytics.successRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{analytics.successRate}%</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {analytics.successfulCommands} success / {analytics.failedCommands} failed
                      </div>
                    </div>
                    {analytics.mostUsedCommands && analytics.mostUsedCommands.length > 0 && (
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-md">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Most Used Commands</div>
                        <div className="space-y-1">
                          {analytics.mostUsedCommands.slice(0, 3).map((cmd: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="truncate flex-1">{cmd.command}</span>
                              <span className="text-slate-500 ml-2">{cmd.count}×</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Always Listen Mode */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="always-listen" className="text-base font-medium">
                    Always Listen
                  </Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Automatically listen for "Hey RECOV"
                  </p>
                </div>
                <Switch
                  id="always-listen"
                  checked={formData.alwaysListen}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, alwaysListen: checked })
                  }
                  data-testid="switch-always-listen"
                />
              </div>
            </div>

            <Separator />

            {/* Wake Word Sensitivity */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-medium">Wake Word Sensitivity</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Adjust how easily "Hey RECOV" triggers (1-10)
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 w-8">Low</span>
                <Slider
                  value={[formData.wakeWordSensitivity]}
                  onValueChange={(value) =>
                    setFormData({ ...formData, wakeWordSensitivity: value[0] })
                  }
                  min={1}
                  max={10}
                  step={1}
                  className="flex-1"
                  data-testid="slider-wake-word-sensitivity"
                />
                <span className="text-sm text-slate-500 w-8">High</span>
              </div>
              <p className="text-sm text-center text-slate-600 dark:text-slate-400 font-medium">
                Current: {formData.wakeWordSensitivity}
              </p>
            </div>

            <Separator />

            {/* Voice Feedback */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="voice-feedback" className="text-base font-medium">
                    Voice Feedback
                  </Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Hear responses spoken aloud
                  </p>
                </div>
                <Switch
                  id="voice-feedback"
                  checked={formData.voiceFeedback}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, voiceFeedback: checked })
                  }
                  data-testid="switch-voice-feedback"
                />
              </div>
            </div>

            <Separator />

            {/* Language Selection */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Language</Label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Choose your preferred language
              </p>
              <Select
                value={formData.language}
                onValueChange={(value) =>
                  setFormData({ ...formData, language: value })
                }
              >
                <SelectTrigger data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-IN">English (India)</SelectItem>
                  <SelectItem value="hi-IN">Hindi (हिन्दी)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Auto Execute Actions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-execute" className="text-base font-medium">
                    Auto Execute Actions
                  </Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Skip confirmation for emails/messages
                  </p>
                </div>
                <Switch
                  id="auto-execute"
                  checked={formData.autoExecuteActions}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, autoExecuteActions: checked })
                  }
                  data-testid="switch-auto-execute"
                />
              </div>
            </div>

            <Separator />

            {/* Show Suggestions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-suggestions" className="text-base font-medium">
                    Show Suggestions
                  </Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Display quick action suggestions
                  </p>
                </div>
                <Switch
                  id="show-suggestions"
                  checked={formData.showSuggestions}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, showSuggestions: checked })
                  }
                  data-testid="switch-show-suggestions"
                />
              </div>
            </div>

            <Separator />

            {/* Save Button */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
                data-testid="button-cancel-settings"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {saveSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
