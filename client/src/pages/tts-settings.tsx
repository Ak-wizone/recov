import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Loader2, 
  Play, 
  Square, 
  Volume2, 
  Mic,
  Check,
  Languages,
  User,
  RefreshCw,
  Save
} from "lucide-react";

// Voice categories
const VOICE_CATEGORIES = {
  hindi: {
    name: "Hindi",
    voices: [
      { id: "hi-IN-SwaraNeural", name: "Swara (Female)", shortName: "Swara", gender: "Female" },
      { id: "hi-IN-MadhurNeural", name: "Madhur (Male)", shortName: "Madhur", gender: "Male" },
    ]
  },
  english_in: {
    name: "English (India)",
    voices: [
      { id: "en-IN-NeerjaNeural", name: "Neerja (Female)", shortName: "Neerja", gender: "Female" },
      { id: "en-IN-PrabhatNeural", name: "Prabhat (Male)", shortName: "Prabhat", gender: "Male" },
    ]
  },
  english_us: {
    name: "English (US)",
    voices: [
      { id: "en-US-JennyNeural", name: "Jenny (Female)", shortName: "Jenny", gender: "Female" },
      { id: "en-US-GuyNeural", name: "Guy (Male)", shortName: "Guy", gender: "Male" },
      { id: "en-US-AriaNeural", name: "Aria (Female)", shortName: "Aria", gender: "Female" },
      { id: "en-US-DavisNeural", name: "Davis (Male)", shortName: "Davis", gender: "Male" },
    ]
  },
  english_uk: {
    name: "English (UK)",
    voices: [
      { id: "en-GB-SoniaNeural", name: "Sonia (Female)", shortName: "Sonia", gender: "Female" },
      { id: "en-GB-RyanNeural", name: "Ryan (Male)", shortName: "Ryan", gender: "Male" },
    ]
  }
};

type LanguageKey = keyof typeof VOICE_CATEGORIES;

// Voice Behaviours - ENHANCED with noticeable differences
const VOICE_BEHAVIOURS = {
  kind: {
    name: "Kind & Friendly",
    description: "Slow, soft & warm (-20% speed, +15Hz pitch)",
    icon: "😊",
    color: "#22c55e",
  },
  normal: {
    name: "Normal & Professional",
    description: "Standard professional tone (no change)",
    icon: "😐",
    color: "#3b82f6",
  },
  firm: {
    name: "Firm & Serious",
    description: "Faster & deeper (+15% speed, -10Hz pitch)",
    icon: "😤",
    color: "#f59e0b",
  },
  strict: {
    name: "Strict & Urgent",
    description: "Fast, loud & commanding (+25% speed, -20Hz)",
    icon: "😠",
    color: "#ef4444",
  },
  final_warning: {
    name: "Final Warning",
    description: "Very fast & grave (+35% speed, -30Hz pitch)",
    icon: "🚨",
    color: "#7c2d12",
  },
};

type BehaviourKey = keyof typeof VOICE_BEHAVIOURS;

interface TtsSettings {
  id?: string;
  voiceId: string;
  voiceName: string;
  language: string;
  gender: string;
  rate: string;
  pitch: string;
  volume: string;
  behaviour?: string;
  useEdgeTts: boolean;
}

export default function TtsSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);

  // State
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>("hindi");
  const [selectedVoice, setSelectedVoice] = useState("hi-IN-SwaraNeural");
  const [selectedGender, setSelectedGender] = useState<"Male" | "Female">("Female");
  const [selectedBehaviour, setSelectedBehaviour] = useState<BehaviourKey>("normal");
  const [rate, setRate] = useState([0]); // -50 to +50
  const [pitch, setPitch] = useState([0]); // -50 to +50
  const [volume, setVolume] = useState([0]); // -50 to +50
  const [useEdgeTts, setUseEdgeTts] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewText, setPreviewText] = useState(
    "नमस्ते {{customerName}} जी, आपके invoice number {{invoiceNumber}} का payment of ₹{{amount}} due है। कृपया जल्द से जल्द payment करें।"
  );

  // Fetch existing settings
  const { data: settings, isLoading } = useQuery<{ settings: TtsSettings | null }>({
    queryKey: ["/api/tts/settings"],
  });

  // Load saved settings
  useEffect(() => {
    if (settings?.settings) {
      const s = settings.settings;
      setSelectedVoice(s.voiceId);
      setSelectedLanguage(s.language as LanguageKey);
      setSelectedGender(s.gender as "Male" | "Female");
      setSelectedBehaviour((s.behaviour as BehaviourKey) || "normal");
      setUseEdgeTts(s.useEdgeTts);
      
      // Parse rate/pitch/volume (e.g., "+10%" -> 10)
      const parseValue = (val: string) => {
        const num = parseInt(val.replace(/[+%Hz]/g, ""));
        return isNaN(num) ? 0 : num;
      };
      setRate([parseValue(s.rate || "+0%")]);
      setPitch([parseValue(s.pitch || "+0Hz")]);
      setVolume([parseValue(s.volume || "+0%")]);
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/tts/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tts/settings"] });
      toast({
        title: "Settings Saved",
        description: "Your TTS voice settings have been saved successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  // Preview voice mutation
  const previewMutation = useMutation({
    mutationFn: async (data: { text: string; voiceId: string; rate?: string; pitch?: string; volume?: string; behaviour?: string }) => {
      const response = await fetch("/api/tts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Preview failed");
      }
      return response.blob();
    },
    onSuccess: async (blob) => {
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Preview Failed",
        description: error.message || "Failed to generate voice preview",
        variant: "destructive",
      });
    },
  });

  // Get voice name from ID
  const getVoiceName = (voiceId: string): string => {
    for (const category of Object.values(VOICE_CATEGORIES)) {
      const voice = category.voices.find(v => v.id === voiceId);
      if (voice) return voice.name;
    }
    return "Unknown";
  };

  // Handle language change
  const handleLanguageChange = (language: LanguageKey) => {
    setSelectedLanguage(language);
    // Select first voice of the gender, or first available
    const voices = VOICE_CATEGORIES[language].voices;
    const genderVoice = voices.find(v => v.gender === selectedGender);
    setSelectedVoice(genderVoice?.id || voices[0].id);
  };

  // Handle gender change
  const handleGenderChange = (gender: "Male" | "Female") => {
    setSelectedGender(gender);
    // Select voice of this gender in current language
    const voices = VOICE_CATEGORIES[selectedLanguage].voices;
    const genderVoice = voices.find(v => v.gender === gender);
    if (genderVoice) {
      setSelectedVoice(genderVoice.id);
    }
  };

  // Handle save
  const handleSave = () => {
    const rateStr = rate[0] >= 0 ? `+${rate[0]}%` : `${rate[0]}%`;
    const pitchStr = pitch[0] >= 0 ? `+${pitch[0]}Hz` : `${pitch[0]}Hz`;
    const volumeStr = volume[0] >= 0 ? `+${volume[0]}%` : `${volume[0]}%`;

    saveMutation.mutate({
      voiceId: selectedVoice,
      voiceName: getVoiceName(selectedVoice),
      language: selectedLanguage,
      gender: selectedGender,
      rate: rateStr,
      pitch: pitchStr,
      volume: volumeStr,
      behaviour: selectedBehaviour,
      useEdgeTts,
    });
  };

  // Handle preview
  const handlePreview = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    // Replace sample variables
    const sampleText = previewText
      .replace(/{{customerName}}/g, "राज कुमार")
      .replace(/{{invoiceNumber}}/g, "INV-2024-001")
      .replace(/{{amount}}/g, "25,000")
      .replace(/{{dueDate}}/g, "15 December 2024");

    const rateStr = rate[0] >= 0 ? `+${rate[0]}%` : `${rate[0]}%`;
    const pitchStr = pitch[0] >= 0 ? `+${pitch[0]}Hz` : `${pitch[0]}Hz`;
    const volumeStr = volume[0] >= 0 ? `+${volume[0]}%` : `${volume[0]}%`;

    previewMutation.mutate({
      text: sampleText,
      voiceId: selectedVoice,
      rate: rateStr,
      pitch: pitchStr,
      volume: volumeStr,
      behaviour: selectedBehaviour,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Volume2 className="h-8 w-8" />
          TTS Voice Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure your Text-to-Speech voice for automated calls. Choose from multiple Hindi and English voices.
        </p>
        <Badge variant="default" className="mt-2 bg-green-600">
          <Check className="h-3 w-3 mr-1" />
          Free & Unlimited - Powered by Edge TTS
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Voice Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Voice Selection
            </CardTitle>
            <CardDescription>
              Choose your preferred language and voice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Language</Label>
              <Tabs value={selectedLanguage} onValueChange={(v) => handleLanguageChange(v as LanguageKey)}>
                <TabsList className="grid w-full grid-cols-4">
                  {Object.entries(VOICE_CATEGORIES).map(([key, category]) => (
                    <TabsTrigger key={key} value={key}>
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Gender Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Voice Gender</Label>
              <RadioGroup
                value={selectedGender}
                onValueChange={(v) => handleGenderChange(v as "Male" | "Female")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Female" id="female" />
                  <Label htmlFor="female" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4 text-pink-500" />
                    Female
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Male" id="male" />
                  <Label htmlFor="male" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4 text-blue-500" />
                    Male
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Voice Selection within Language */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Select Voice</Label>
              <div className="grid grid-cols-2 gap-3">
                {VOICE_CATEGORIES[selectedLanguage].voices
                  .filter(v => v.gender === selectedGender || 
                    !VOICE_CATEGORIES[selectedLanguage].voices.some(x => x.gender === selectedGender))
                  .map((voice) => (
                    <div
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedVoice === voice.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{voice.shortName}</p>
                          <p className="text-sm text-muted-foreground">{voice.gender}</p>
                        </div>
                        {selectedVoice === voice.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Behaviour */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice Behaviour
            </CardTitle>
            <CardDescription>
              Select the tone and style for collection calls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(VOICE_BEHAVIOURS).map(([key, behaviour]) => (
                <div
                  key={key}
                  onClick={() => setSelectedBehaviour(key as BehaviourKey)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedBehaviour === key
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{behaviour.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{behaviour.name}</p>
                      <p className="text-xs text-muted-foreground">{behaviour.description}</p>
                    </div>
                    {selectedBehaviour === key && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              💡 Tip: Use "Kind" for new customers, "Firm" or "Strict" for overdue payments
            </p>
          </CardContent>
        </Card>

        {/* Voice Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice Parameters
            </CardTitle>
            <CardDescription>
              Fine-tune the voice speed, pitch, and volume
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rate */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Speed: {rate[0] >= 0 ? `+${rate[0]}%` : `${rate[0]}%`}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRate([0])}
                  className="h-6 px-2"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <Slider
                value={rate}
                onValueChange={setRate}
                min={-50}
                max={50}
                step={5}
              />
              <p className="text-sm text-muted-foreground">
                Negative = Slower, Positive = Faster
              </p>
            </div>

            {/* Pitch */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Pitch: {pitch[0] >= 0 ? `+${pitch[0]}Hz` : `${pitch[0]}Hz`}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPitch([0])}
                  className="h-6 px-2"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <Slider
                value={pitch}
                onValueChange={setPitch}
                min={-50}
                max={50}
                step={5}
              />
              <p className="text-sm text-muted-foreground">
                Negative = Lower pitch, Positive = Higher pitch
              </p>
            </div>

            {/* Volume */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Volume: {volume[0] >= 0 ? `+${volume[0]}%` : `${volume[0]}%`}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVolume([0])}
                  className="h-6 px-2"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <Slider
                value={volume}
                onValueChange={setVolume}
                min={-50}
                max={50}
                step={5}
              />
              <p className="text-sm text-muted-foreground">
                Negative = Quieter, Positive = Louder
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Preview Voice
            </CardTitle>
            <CardDescription>
              Test how your selected voice sounds with sample text
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Preview Text</Label>
              <Textarea
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                rows={4}
                placeholder="Enter text to preview..."
              />
              <p className="text-sm text-muted-foreground">
                Use variables like <code className="bg-muted px-1 rounded">{"{{customerName}}"}</code>, 
                <code className="bg-muted px-1 rounded ml-1">{"{{amount}}"}</code>, 
                <code className="bg-muted px-1 rounded ml-1">{"{{invoiceNumber}}"}</code>
              </p>
            </div>

            <Button
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              variant={isPlaying ? "destructive" : "default"}
              className="w-full"
            >
              {previewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating Audio...
                </>
              ) : isPlaying ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Playback
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play Preview
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Current Selection Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Current Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Language</p>
                <p className="font-medium">{VOICE_CATEGORIES[selectedLanguage].name}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Voice</p>
                <p className="font-medium">{getVoiceName(selectedVoice).split(" ")[0]}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium">{selectedGender}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Engine</p>
                <p className="font-medium text-green-600">Edge TTS (Free)</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full"
              size="lg"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Voice Settings
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
