import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Phone, Loader2, Radio, Zap, Mic, User, Volume2, AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { CallTemplate } from "@shared/schema";

// Voice behaviours for collection calls - ENHANCED with noticeable differences
const VOICE_BEHAVIOURS = {
  kind: {
    name: "Kind & Polite",
    description: "Slow, soft (-20% speed)",
    emoji: "😊",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  normal: {
    name: "Normal",
    description: "Standard tone",
    emoji: "😐",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  firm: {
    name: "Firm",
    description: "Faster, deeper (+15%)",
    emoji: "😤",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  strict: {
    name: "Strict",
    description: "Fast & loud (+25%)",
    emoji: "😠",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
  final_warning: {
    name: "Final Warning",
    description: "Very fast (+35%)",
    emoji: "🚨",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

type BehaviourKey = keyof typeof VOICE_BEHAVIOURS;

interface VoiceClone {
  id: string;
  userId: string;
  voiceName: string;
  status: string;
  isDefault: boolean;
  elevenLabsVoiceId: string | null;
}

interface EdgeVoice {
  id: string;
  name: string;
  shortName: string;
  language: string;
  gender: "Male" | "Female";
  locale: string;
}

interface TelecmiCallButtonProps {
  customerPhone: string;
  customerName: string;
  module: "invoices" | "debtors" | "quotations" | "leads" | "receipts" | "proforma_invoices" | "credit_management";
  invoiceNumber?: string;
  amount?: number;
  daysOverdue?: number;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "destructive";
  icon?: React.ReactNode;
  className?: string;
}

export function TelecmiCallButton({
  customerPhone,
  customerName,
  module,
  invoiceNumber,
  amount,
  daysOverdue,
  buttonText = "Call Customer",
  buttonVariant = "outline",
  icon = <Phone className="h-4 w-4" />,
  className,
}: TelecmiCallButtonProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [language, setLanguage] = useState<"hindi" | "english" | "hinglish">("english");
  const [callMode, setCallMode] = useState<"simple" | "ai">("simple");
  const [useMyVoice, setUseMyVoice] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [selectedBehaviour, setSelectedBehaviour] = useState<BehaviourKey>("normal");

  // Auto-suggest behaviour based on days overdue
  const getSuggestedBehaviour = (): BehaviourKey => {
    const days = Math.max(0, daysOverdue || 0);
    if (days === 0) return "kind";
    if (days <= 7) return "normal";
    if (days <= 15) return "firm";
    if (days <= 30) return "strict";
    return "final_warning";
  };

  // Fetch available call templates for this module
  const { data: templates, isLoading: templatesLoading } = useQuery<CallTemplate[]>({
    queryKey: ["/api/call-templates", module],
    enabled: dialogOpen,
  });

  // Fetch user's voice clones
  const { data: voiceClonesData } = useQuery<{ voiceClones: VoiceClone[] }>({
    queryKey: ["/api/voice-clones"],
    enabled: dialogOpen,
  });

  // Fetch available TTS voices
  const { data: ttsVoicesData } = useQuery<{ voices: EdgeVoice[] }>({
    queryKey: ["/api/tts/voices"],
    enabled: dialogOpen && callMode === "simple",
  });

  const voiceClones = voiceClonesData?.voiceClones || [];
  const readyVoiceClone = voiceClones.find(vc => vc.status === "active" && vc.elevenLabsVoiceId);
  const hasClonedVoice = !!readyVoiceClone;

  // Get voices array from response
  const ttsVoices = ttsVoicesData?.voices || [];

  // Filter voices based on language selection
  const filteredVoices = ttsVoices.filter(voice => {
    if (language === "hindi" || language === "hinglish") {
      return voice.locale === "hi-IN";
    } else {
      return voice.locale.startsWith("en-");
    }
  });

  // Set default voice when language changes or voices load
  useEffect(() => {
    if (filteredVoices.length > 0) {
      // Default: first female voice
      const defaultVoice = filteredVoices.find(v => v.gender === "Female") || filteredVoices[0];
      if (defaultVoice) {
        setSelectedVoice(defaultVoice.id);
      }
    }
  }, [language, ttsVoices]);

  const makeCallMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/telecmi/make-call", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-logs"] });
      toast({
        title: "Call Initiated",
        description: `Calling ${customerName} at ${customerPhone}`,
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedTemplate("");
    setLanguage("english");
    setCallMode("simple");
    setUseMyVoice(false);
    setSelectedVoice("");
    setSelectedBehaviour("normal");
  };

  const handleMakeCall = () => {
    if (!selectedTemplate) {
      toast({
        title: "Template Required",
        description: "Please select a call template",
        variant: "destructive",
      });
      return;
    }

    const selectedTemplateData = templates?.find(t => t.id === selectedTemplate);
    if (!selectedTemplateData) {
      toast({
        title: "Invalid Template",
        description: "Selected template not found",
        variant: "destructive",
      });
      return;
    }

    makeCallMutation.mutate({
      phoneNumber: customerPhone,
      customerName,
      module,
      callMode,
      language,
      templateId: selectedTemplate,
      useMyVoice: useMyVoice && hasClonedVoice,
      voiceId: useMyVoice && hasClonedVoice ? undefined : selectedVoice, // Edge TTS voice
      behaviour: selectedBehaviour, // Voice behaviour/tone
      callContext: {
        customerName: customerName,
        invoiceNumber: invoiceNumber || "",
        amount: amount?.toString() || "0",
        daysOverdue: daysOverdue?.toString() || "0",
      },
    });
  };

  // Get template suggestions based on days overdue
  const getSuggestedTemplate = (lang: "hindi" | "english" | "hinglish" = language) => {
    if (!templates || templates.length === 0) return null;
    
    // Clamp daysOverdue to prevent negative values (not-yet-due invoices) from triggering overdue scripts
    const clampedDays = Math.max(0, daysOverdue || 0);
    
    if (clampedDays === 0) {
      return templates.find(t => t.name === "Payment Due Reminder" && t.language === lang);
    } else if (clampedDays <= 7) {
      return templates.find(t => t.name === "7 Days Overdue Notice" && t.language === lang);
    } else if (clampedDays <= 15) {
      return templates.find(t => t.name === "15 Days Overdue - Urgent" && t.language === lang);
    } else {
      return templates.find(t => t.name === "30 Days Overdue - Final Notice" && t.language === lang);
    }
  };

  // Auto-select suggested template when language changes
  const handleLanguageChange = (newLanguage: "hindi" | "english" | "hinglish") => {
    setLanguage(newLanguage);
    // Recompute suggested template with NEW language to ensure auto-selection matches user intent
    const suggested = getSuggestedTemplate(newLanguage);
    if (suggested) {
      setSelectedTemplate(suggested.id);
    }
  };

  // Auto-select suggested template when dialog opens or templates/daysOverdue change
  useEffect(() => {
    if (dialogOpen && templates && templates.length > 0 && !selectedTemplate) {
      const suggested = getSuggestedTemplate();
      if (suggested) {
        setSelectedTemplate(suggested.id);
      }
    }
  }, [dialogOpen, templates, daysOverdue, language, selectedTemplate]);

  // Auto-select suggested behaviour when dialog opens based on days overdue
  useEffect(() => {
    if (dialogOpen) {
      const suggestedBehaviour = getSuggestedBehaviour();
      setSelectedBehaviour(suggestedBehaviour);
    }
  }, [dialogOpen, daysOverdue]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm" className={className} data-testid="button-telecmi-call">
          {icon}
          {buttonText && <span className="ml-1.5">{buttonText}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Initiate Call via Telecmi
          </DialogTitle>
          <DialogDescription>
            Call {customerName} at {customerPhone}
            {daysOverdue !== undefined && daysOverdue > 0 && (
              <span className="text-red-600 font-medium"> ({daysOverdue} days overdue)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Language Selection */}
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hindi">Hindi (हिंदी)</SelectItem>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hinglish">Hinglish (हिंग्लिश)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Call Template Selection */}
          <div className="space-y-2">
            <Label>Call Template</Label>
            {templatesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates
                    ?.filter(t => t.language === language)
                    .map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.isDefault === "Yes" && " (Default)"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            {selectedTemplate && templates && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md text-sm">
                <p className="font-medium mb-1">Script Preview:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {templates.find(t => t.id === selectedTemplate)?.scriptText}
                </p>
              </div>
            )}
          </div>

          {/* Call Mode Selection */}
          <div className="space-y-2">
            <Label>Call Mode</Label>
            <RadioGroup value={callMode} onValueChange={(value: "simple" | "ai") => setCallMode(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-900">
                <RadioGroupItem value="simple" id="simple" data-testid="radio-simple" />
                <Label htmlFor="simple" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Radio className="h-4 w-4 text-gray-600" />
                  <div>
                    <div className="font-medium">Simple TTS Call</div>
                    <div className="text-xs text-gray-500">Pre-recorded text-to-speech message</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-900">
                <RadioGroupItem value="ai" id="ai" data-testid="radio-ai" />
                <Label htmlFor="ai" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="font-medium">AI Conversation</div>
                    <div className="text-xs text-gray-500">Interactive AI-powered conversation (Coming Soon)</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Voice Selection - Only show for Simple TTS Call mode */}
          {callMode === "simple" && (
            <div className="space-y-2">
              <Label>Voice</Label>
              {hasClonedVoice && (
                <div className="flex items-center justify-between p-3 border rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${useMyVoice ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                      <Mic className={`h-4 w-4 ${useMyVoice ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        Use My Cloned Voice
                        {useMyVoice && (
                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {useMyVoice ? `Using: ${readyVoiceClone?.voiceName}` : "Use default system voice"}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={useMyVoice}
                    onCheckedChange={setUseMyVoice}
                    data-testid="switch-use-my-voice"
                  />
                </div>
              )}
              
              {/* Edge TTS Voice Selection - Show when not using cloned voice */}
              {!useMyVoice && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Volume2 className="h-4 w-4" />
                    <span>Select TTS Voice</span>
                  </div>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger data-testid="select-voice">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredVoices.map(voice => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${voice.gender === 'Female' ? 'bg-pink-500' : 'bg-blue-500'}`} />
                            <span>{voice.name}</span>
                            <span className="text-xs text-gray-500">({voice.language})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!hasClonedVoice && (
                    <p className="text-xs text-gray-500">
                      Want to use your own voice? <a href="/voice-profile" className="text-blue-600 hover:underline">Create a voice clone</a>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Voice Behaviour Selection - Only for Simple TTS mode */}
          {callMode === "simple" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Voice Tone / Behaviour
              </Label>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">Suggested based on {daysOverdue || 0} days overdue:</span>
                <Badge variant="outline" className={VOICE_BEHAVIOURS[getSuggestedBehaviour()].color}>
                  {VOICE_BEHAVIOURS[getSuggestedBehaviour()].emoji} {VOICE_BEHAVIOURS[getSuggestedBehaviour()].name}
                </Badge>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(VOICE_BEHAVIOURS).map(([key, behaviour]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedBehaviour(key as BehaviourKey)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      selectedBehaviour === key
                        ? "border-primary bg-primary/10 ring-2 ring-primary"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                    title={behaviour.description}
                  >
                    <div className="text-xl mb-1">{behaviour.emoji}</div>
                    <div className="text-xs font-medium truncate">{behaviour.name.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={makeCallMutation.isPending}
            data-testid="button-cancel-call"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMakeCall}
            disabled={makeCallMutation.isPending || !selectedTemplate}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-confirm-call"
          >
            {makeCallMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calling...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Make Call
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
