import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mic,
  MicOff,
  Send,
  X,
  Settings,
  Loader2,
  MessageSquare,
  Sparkles,
  Phone,
  Mail,
  FileText,
  Users,
  TrendingUp,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
  Lightbulb,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { AssistantSettings } from "@/components/assistant-settings";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  isVoice?: boolean;
  action?: string;
  data?: any;
}

interface VoiceAssistantProps {
  className?: string;
}

export default function VoiceAssistant({ className }: VoiceAssistantProps) {
  const { user } = useAuth();
  
  // All hooks MUST be called before any conditional returns
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAlwaysListening, setIsAlwaysListening] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [assistantStatus, setAssistantStatus] = useState<"idle" | "listening" | "processing" | "speaking" | "done">("idle");
  
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const isRestartingRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // Check if user has access to Voice Assistant module
  const { data: tenant } = useQuery<any>({
    queryKey: ["/api/tenants/current"],
    enabled: !!user && !!user.tenantId,
    staleTime: 5 * 60 * 1000,
  });
  
  // Load assistant settings
  const { data: assistantSettings } = useQuery({
    queryKey: ["/api/assistant/settings"],
    enabled: !!user,
  });
  
  // Fetch chat history
  const { data: chatHistory = [] } = useQuery({
    queryKey: ["/api/assistant/history"],
    enabled: isOpen,
  });
  
  // Hydrate messages from chat history
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      const loadedMessages: Message[] = [];
      
      chatHistory.forEach((history: any) => {
        // Add user message
        loadedMessages.push({
          id: `${history.id}-user`,
          type: "user",
          content: history.userMessage,
          timestamp: new Date(history.createdAt),
          isVoice: history.isVoiceInput,
        });
        
        // Add assistant response
        loadedMessages.push({
          id: `${history.id}-assistant`,
          type: "assistant",
          content: history.assistantResponse,
          timestamp: new Date(history.createdAt),
          action: history.actionPerformed,
          data: history.resultData ? JSON.parse(history.resultData) : null,
        });
      });
      
      setMessages(loadedMessages);
    }
  }, [chatHistory]);

  // Process command mutation
  const processCommandMutation = useMutation({
    mutationFn: async (data: { message: string; isVoice: boolean }) => {
      const res = await apiRequest("POST", "/api/assistant/command", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to process command");
      }
      return await res.json();
    },
    onSuccess: (response: any, variables: { message: string; isVoice: boolean }) => {
      const assistantMessage: Message = {
        id: Date.now().toString() + "-assistant",
        type: "assistant",
        content: response.response,
        timestamp: new Date(),
        action: response.action,
        data: response.data,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/history"] });
      
      // Speak the response if it was a voice command
      if (variables.isVoice && response.response) {
        speak(response.response, true);
      }
    },
    onError: (error: Error, variables: { message: string; isVoice: boolean }) => {
      let errorMessage = "मुझे समझ नहीं आया। कृपया दोबारा कोशिश करें।";
      let suggestions: string[] = [];

      // Categorize errors and provide helpful messages
      if (error.message.includes("network") || error.message.includes("fetch") || error.message.toLowerCase().includes("failed to fetch")) {
        errorMessage = "❌ **नेटवर्क एरर**: इंटरनेट कनेक्शन चेक करें और दोबारा कोशिश करें।";
        suggestions = ["इंटरनेट कनेक्शन चेक करें", "पेज को रीफ्रेश करें"];
      } else if (error.message.includes("No customer found") || (error.message.includes("not found") && !error.message.includes("Failed to process"))) {
        errorMessage = "❌ **कस्टमर नहीं मिला**: इस नाम से कोई कस्टमर नहीं मिला।";
        suggestions = ["पूरा नाम बोलें", "स्पेलिंग चेक करें", "'सभी कस्टमर दिखाओ' कहें"];
      } else if (error.message.toLowerCase().includes("unrecognized")) {
        errorMessage = "❓ **कमांड समझ नहीं आई**: कृपया दोबारा कोशिश करें।";
        suggestions = [
          "उदाहरण: 'due invoices dikhao'",
          "उदाहरण: 'alpha category customers'",
          "उदाहरण: 'aaj ka collection'",
        ];
      } else if (error.message.includes("permission") || error.message.includes("mic")) {
        errorMessage = "🎤 **माइक Permission चाहिए**: ब्राउज़र में माइक एक्सेस allow करें।";
        suggestions = ["ब्राउज़र सेटिंग्स में जाएं", "माइक एक्सेस allow करें"];
      } else if (error.message.includes("Failed to process command")) {
        // Generic server error - don't treat as unrecognized command
        errorMessage = "❌ **Server Error**: कमांड process नहीं हो सका। कृपया दोबारा कोशिश करें।";
        suggestions = ["दोबारा कोशिश करें", "थोड़ी देर बाद कोशिश करें"];
      } else {
        errorMessage = `❌ **एरर**: ${error.message}`;
        suggestions = ["दोबारा कोशिश करें", "साफ़ शब्दों में बोलें"];
      }

      const errorAssistantMessage: Message = {
        id: Date.now().toString() + "-assistant-error",
        type: "assistant",
        content: errorMessage + (suggestions.length > 0 ? "\n\n**सुझाव:**\n" + suggestions.map(s => `• ${s}`).join("\n") : ""),
        timestamp: new Date(),
        action: "error",
        data: { error: error.message, suggestions },
      };

      setMessages((prev) => [...prev, errorAssistantMessage]);

      // Speak error message if it was a voice command
      if (variables.isVoice) {
        const spokenError = errorMessage.replace(/[❌❓🎤*]/g, "").split(":")[0]; // Remove emojis and formatting
        speak(spokenError, true);
      }
    },
  });

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      // Stop existing recognition before re-initialization
      const wasListening = isListening;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore stop errors
        }
      }

      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = assistantSettings?.language || "en-IN";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");

        // Get interim (non-final) transcript for real-time display
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (!event.results[i].isFinal) {
            interim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(interim);

        // Check for wake word
        if (isAlwaysListening && !wakeWordDetected) {
          if (
            transcript.toLowerCase().includes("hey recov") ||
            transcript.toLowerCase().includes("recov")
          ) {
            setWakeWordDetected(true);
            setIsOpen(true);
            setAssistantStatus("listening");
            playBeep();
            return;
          }
        }

        // Process command if wake word detected or manually activated
        if (wakeWordDetected || !isAlwaysListening) {
          if (event.results[event.results.length - 1].isFinal) {
            setInterimTranscript(""); // Clear interim transcript
            handleVoiceCommand(transcript);
            setWakeWordDetected(false);
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        // Handle different error types
        const errorType = event.error;
        
        // Don't log or handle 'no-speech' - it's just when user isn't speaking
        if (errorType === 'no-speech') {
          return;
        }
        
        // Don't log 'aborted' errors when user intentionally stops
        if (errorType === 'aborted' && !isAlwaysListening) {
          setIsListening(false);
          setAssistantStatus("idle");
          setInterimTranscript("");
          isRestartingRef.current = false; // Clear restart flag to allow manual recovery
          return;
        }
        
        // Log only real errors (not aborted, not no-speech)
        if (errorType !== 'aborted') {
          console.error("Speech recognition error:", errorType);
        }
        
        // Reset listening state, status, and flags for errors to allow recovery
        setIsListening(false);
        setAssistantStatus("idle");
        setInterimTranscript("");
        isRestartingRef.current = false;
        
        // Reset retry count on permission errors to allow fresh start
        if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
          retryCountRef.current = 0;
        }
      };

      // Helper function for retry logic with exponential backoff
      const attemptRestart = (currentRetry: number) => {
        if (!isAlwaysListening || currentRetry >= maxRetries) {
          setIsListening(false);
          isRestartingRef.current = false;
          if (currentRetry >= maxRetries) {
            console.warn("Max speech recognition retries reached. Please check mic permissions or toggle listening.");
          }
          retryCountRef.current = 0;
          return;
        }

        // Calculate exponential backoff delay
        const baseDelay = 500;
        const delay = baseDelay * Math.pow(2, currentRetry);
        const maxDelay = 5000;
        const actualDelay = Math.min(delay, maxDelay);

        setTimeout(() => {
          if (recognitionRef.current && isAlwaysListening && !isRestartingRef.current) {
            try {
              isRestartingRef.current = true;
              recognitionRef.current.start();
              
              // Set listening state to true after successful start
              setIsListening(true);
              
              // Clear restarting flag after short delay to prevent duplicate starts
              setTimeout(() => {
                isRestartingRef.current = false;
              }, 500);
              
              // Reset retry count on successful start after 2 seconds
              setTimeout(() => {
                retryCountRef.current = 0;
              }, 2000);
            } catch (error) {
              // Handle synchronous errors (NotAllowedError, InvalidStateError, etc.)
              console.error("Failed to restart recognition:", error);
              isRestartingRef.current = false;
              setIsListening(false);
              
              // Increment retry count and recursively schedule next retry
              const nextRetry = currentRetry + 1;
              retryCountRef.current = nextRetry;
              attemptRestart(nextRetry);
            }
          }
        }, actualDelay);
      };

      recognitionRef.current.onend = () => {
        isRestartingRef.current = false;
        
        if (isAlwaysListening) {
          attemptRestart(retryCountRef.current);
        } else {
          setIsListening(false);
          setAssistantStatus("idle");
          setInterimTranscript("");
        }
      };

      // Restart recognition if it was running before re-initialization
      if (wasListening || isAlwaysListening) {
        try {
          setTimeout(() => {
            if (recognitionRef.current && !isRestartingRef.current) {
              isRestartingRef.current = true;
              recognitionRef.current.start();
              setIsListening(true);
              
              // Reset restarting flag after successful start
              setTimeout(() => {
                isRestartingRef.current = false;
              }, 500);
            }
          }, 500); // Increased delay to 500ms for more stability
        } catch (error) {
          console.error("Failed to restart recognition after re-init:", error);
          isRestartingRef.current = false;
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore stop errors on cleanup
        }
      }
    };
  }, [isAlwaysListening, wakeWordDetected, assistantSettings?.language]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load voices when component mounts
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Load voices (required for Chrome)
      window.speechSynthesis.getVoices();
      
      // Add event listener for when voices are loaded
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Apply settings when loaded
  useEffect(() => {
    if (assistantSettings) {
      const shouldListen = assistantSettings.alwaysListen;
      setIsAlwaysListening(shouldListen);
      
      // Start or stop listening based on settings
      if (shouldListen && !isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (error) {
          console.error("Failed to start recognition:", error);
        }
      } else if (!shouldListen && isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          setIsListening(false);
        } catch (error) {
          console.error("Failed to stop recognition:", error);
        }
      }
    }
  }, [assistantSettings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+V - Toggle Voice Assistant
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      // Only handle these if assistant is open
      if (!isOpen) return;

      // Escape - Close assistant
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      // Ctrl+M - Toggle microphone
      if (event.ctrlKey && event.key === 'm') {
        event.preventDefault();
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
        return;
      }

      // Ctrl+H - Open help
      if (event.ctrlKey && event.key === 'h' && isOpen) {
        event.preventDefault();
        setIsHelpOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isListening]);
  
  // Helper functions (must be defined on every render)
  const playBeep = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const speak = (text: string, isVoiceResponse: boolean = false) => {
    // Only speak if voice feedback is enabled and response was from voice command
    if (!assistantSettings?.voiceFeedback && isVoiceResponse) {
      setAssistantStatus("done");
      setTimeout(() => setAssistantStatus("idle"), 2000);
      return;
    }

    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
      console.warn("Speech synthesis not supported in this browser");
      setAssistantStatus("done");
      setTimeout(() => setAssistantStatus("idle"), 2000);
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language based on settings
    const lang = assistantSettings?.language || "en-IN";
    utterance.lang = lang;
    
    // Get available voices and select appropriate one
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(voice => voice.lang.startsWith(lang.split('-')[0]));
    
    // Fallback to any voice if specific language not found
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Set speech parameters
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 0.8; // Slightly lower volume

    // Update speaking state and status
    setIsSpeaking(true);
    setAssistantStatus("speaking");
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setAssistantStatus("done");
      setTimeout(() => setAssistantStatus("idle"), 2000);
    };
    
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
      setIsSpeaking(false);
      setAssistantStatus("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

  const startListening = async () => {
    if (recognitionRef.current && !isListening && !isRestartingRef.current) {
      try {
        // Check microphone permission first
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (permError: any) {
            const permErrorMessage: Message = {
              id: Date.now().toString() + "-perm-error",
              type: "assistant",
              content: "🎤 **माइक Permission Required**\n\nवॉइस असिस्टेंट काम करने के लिए माइक एक्सेस चाहिए।\n\n**कैसे allow करें:**\n• Browser के Address Bar में Lock/Info icon पर click करें\n• Microphone को 'Allow' में set करें\n• Page को Reload करें",
              timestamp: new Date(),
              action: "error",
              data: { error: "mic_permission_denied", suggestions: ["माइक permission allow करें", "Page reload करें"] },
            };
            setMessages((prev) => [...prev, permErrorMessage]);
            speak("माइक permission चाहिए। ब्राउज़र सेटिंग्स में allow करें।", false);
            return;
          }
        }

        isRestartingRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
        setAssistantStatus("listening");
        playBeep();
        retryCountRef.current = 0; // Reset retry count on manual start
        
        // Reset restarting flag after successful start
        setTimeout(() => {
          isRestartingRef.current = false;
        }, 500);
      } catch (error: any) {
        console.error("Failed to start recognition:", error);
        isRestartingRef.current = false;
        setAssistantStatus("idle");
        
        // Show user-friendly error
        const startErrorMessage: Message = {
          id: Date.now().toString() + "-start-error",
          type: "assistant",
          content: `❌ **माइक शुरू नहीं हो सका**\n\n${error.message || "अज्ञात एरर"}\n\n**सुझाव:**\n• माइक connected है check करें\n• दूसरा app माइक use कर रहा है तो बंद करें\n• Page को reload करें`,
          timestamp: new Date(),
          action: "error",
          data: { error: error.message },
        };
        setMessages((prev) => [...prev, startErrorMessage]);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        retryCountRef.current = 0; // Reset retry count on manual stop
        isRestartingRef.current = false;
        recognitionRef.current.stop();
        setIsListening(false);
        setAssistantStatus("idle");
        setInterimTranscript("");
      } catch (error) {
        console.error("Failed to stop recognition:", error);
        setIsListening(false);
        setAssistantStatus("idle");
        setInterimTranscript("");
        isRestartingRef.current = false;
      }
    }
  };

  const toggleAlwaysListening = () => {
    if (!isAlwaysListening) {
      setIsAlwaysListening(true);
      startListening();
    } else {
      setIsAlwaysListening(false);
      stopListening();
    }
  };

  const handleVoiceCommand = async (transcript: string) => {
    stopListening();
    setIsProcessing(true);
    setAssistantStatus("processing");

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: transcript,
      timestamp: new Date(),
      isVoice: true,
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      await processCommandMutation.mutateAsync({
        message: transcript,
        isVoice: true,
      });
    } finally {
      setIsProcessing(false);
      // Only reset status if not speaking (TTS might be active)
      if (assistantStatus !== "speaking") {
        setAssistantStatus("idle");
      }
    }
  };

  const handleSendMessage = async (commandText?: string) => {
    const messageToSend = commandText || inputText;
    if (!messageToSend.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: messageToSend,
      timestamp: new Date(),
      isVoice: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!commandText) {
      setInputText("");
    }
    setIsProcessing(true);
    setAssistantStatus("processing");

    try {
      await processCommandMutation.mutateAsync({
        message: messageToSend,
        isVoice: false,
      });
    } finally {
      setIsProcessing(false);
      // Only reset status if not speaking (TTS might be active)
      if (assistantStatus !== "speaking") {
        setAssistantStatus("idle");
      }
    }
  };

  const quickActions = [
    { icon: FileText, label: "Due Invoices", command: "due invoices dikhao" },
    { icon: Users, label: "Customers", command: "alpha category customers" },
    { icon: TrendingUp, label: "Collection", command: "aaj ka collection" },
    { icon: Mail, label: "Reports", command: "payment report" },
  ];

  // Check access control - don't render if:
  // 1. User is not authenticated
  // 2. User is platform admin (no tenantId)
  // 3. User's subscription doesn't include "RECOV Voice Assistant" module
  if (!user || !user.tenantId) {
    return null;
  }
  
  const allowedModules = tenant?.customModules || tenant?.subscriptionPlan?.allowedModules || [];
  if (!allowedModules.includes("RECOV Voice Assistant")) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className={cn("fixed bottom-6 right-6 z-50", className)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all",
            isAlwaysListening && "ring-4 ring-blue-500/50 animate-pulse",
            wakeWordDetected && "ring-4 ring-green-500/50"
          )}
          onClick={() => setIsOpen(true)}
          data-testid="button-voice-assistant"
        >
          <motion.div
            animate={isListening ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ repeat: isListening ? Infinity : 0, duration: 1 }}
          >
            <Sparkles className="h-6 w-6" />
          </motion.div>
        </Button>

        {/* Always Listening Indicator */}
        {isAlwaysListening && (
          <motion.div
            className="absolute -top-2 -right-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <div className="h-4 w-4 rounded-full bg-red-500 animate-pulse" />
          </motion.div>
        )}
      </motion.div>

      {/* Chat Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-xl">RECOV Assistant</SheetTitle>
                    {isSpeaking && (
                      <Badge variant="secondary" className="text-xs animate-pulse">
                        Speaking...
                      </Badge>
                    )}
                  </div>
                  <SheetDescription>Your AI-powered business helper</SheetDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsHelpOpen(true)}
                  data-testid="button-assistant-help"
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSettingsOpen(true)}
                  data-testid="button-assistant-settings"
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleAlwaysListening}
                  className={cn(isAlwaysListening && "bg-red-50 dark:bg-red-950")}
                  data-testid="button-toggle-always-listen"
                >
                  {isAlwaysListening ? (
                    <Mic className="h-5 w-5 text-red-500" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </SheetHeader>

          <Separator />

          {/* Quick Actions */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 font-medium">
              Quick Actions
            </p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleSendMessage(action.command)}
                  data-testid={`button-quick-${action.label.toLowerCase()}`}
                >
                  <action.icon className="h-3 w-3 mr-1.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Recent Commands History */}
          {messages.filter(m => m.type === "user").length > 0 && (
            <>
              <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900">
                  <CollapsibleTrigger className="w-full flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Recent Commands ({Math.min(messages.filter(m => m.type === "user").length, 10)})
                    </span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isHistoryOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-3 space-y-2">
                    {messages
                      .filter(m => m.type === "user")
                      .slice(-10)
                      .reverse()
                      .map((cmd, idx) => {
                        // Find the corresponding assistant response
                        const cmdIndex = messages.findIndex(m => m.id === cmd.id);
                        const response = cmdIndex >= 0 && cmdIndex < messages.length - 1 
                          ? messages[cmdIndex + 1] 
                          : null;
                        const isError = response?.action === "error";
                        
                        return (
                          <motion.div
                            key={cmd.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={cn(
                              "flex items-start justify-between gap-2 p-2 rounded border text-xs",
                              isError 
                                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" 
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                {cmd.isVoice && <Mic className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                                {isError ? (
                                  <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                                ) : response ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                ) : null}
                                <span className="text-slate-500 dark:text-slate-400 text-xs">
                                  {cmd.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-900 dark:text-white line-clamp-2 break-words">
                                {cmd.content}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 flex-shrink-0"
                              onClick={() => handleSendMessage(cmd.content)}
                              disabled={isProcessing}
                              data-testid={`button-rerun-command-${idx}`}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </motion.div>
                        );
                      })}
                  </CollapsibleContent>
                </div>
              </Collapsible>
              <Separator />
            </>
          )}

          {/* Status Indicator & Real-time Transcript */}
          {(assistantStatus !== "idle" || interimTranscript) && (
            <>
              <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  {/* Status Icon with Animation */}
                  <div className="relative">
                    {assistantStatus === "listening" && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="h-3 w-3 rounded-full bg-blue-500"
                      />
                    )}
                    {assistantStatus === "processing" && (
                      <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                    )}
                    {assistantStatus === "speaking" && (
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="h-3 w-3 rounded-full bg-green-500"
                      />
                    )}
                    {assistantStatus === "done" && (
                      <div className="h-3 w-3 rounded-full bg-green-600" />
                    )}
                  </div>

                  {/* Status Text */}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {assistantStatus === "listening" && "Listening..."}
                      {assistantStatus === "processing" && "Processing..."}
                      {assistantStatus === "speaking" && "Speaking..."}
                      {assistantStatus === "done" && "Done!"}
                    </p>
                    
                    {/* Real-time Transcript */}
                    {interimTranscript && assistantStatus === "listening" && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-slate-600 dark:text-slate-400 italic mt-1"
                      >
                        "{interimTranscript}"
                      </motion.p>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 px-6" ref={scrollRef}>
            <div className="py-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Say "Hey RECOV" or type your query
                  </p>
                </div>
              )}

              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "flex",
                      message.type === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        message.type === "user"
                          ? "bg-blue-600 text-white"
                          : message.action === "error"
                          ? "bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100 border-2 border-red-200 dark:border-red-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                      )}
                    >
                      {message.isVoice && (
                        <Badge variant="secondary" className="mb-1 text-xs">
                          <Mic className="h-3 w-3 mr-1" />
                          Voice
                        </Badge>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Formatted Data Display */}
                      {message.type === "assistant" && message.data && Array.isArray(message.data) && message.data.length > 0 && (
                        <div className="mt-3 space-y-2 max-w-full overflow-x-auto">
                          {/* Invoice/Customer Table - Check for data structure instead of action type */}
                          {(message.data[0].invoiceNumber || message.data[0].customerName || message.data[0].name || message.data[0].category) && (
                            <div className="text-xs bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                              <table className="w-full">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                  <tr>
                                    <th className="px-2 py-1 text-left font-medium">Name</th>
                                    {message.data[0].invoiceNumber && <th className="px-2 py-1 text-left font-medium">Invoice</th>}
                                    {message.data[0].invoiceAmount && <th className="px-2 py-1 text-right font-medium">Amount</th>}
                                    {message.data[0].category && <th className="px-2 py-1 text-left font-medium">Category</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {message.data.slice(0, 5).map((item: any, idx: number) => (
                                    <tr key={idx} className="border-t border-slate-100 dark:border-slate-800">
                                      <td className="px-2 py-1">{item.customerName || item.name}</td>
                                      {item.invoiceNumber && <td className="px-2 py-1">{item.invoiceNumber}</td>}
                                      {item.invoiceAmount && (
                                        <td className="px-2 py-1 text-right font-mono">
                                          ₹{(parseFloat(item.invoiceAmount) - parseFloat(item.paidAmount || 0)).toFixed(2)}
                                        </td>
                                      )}
                                      {item.category && (
                                        <td className="px-2 py-1">
                                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {message.data.length > 5 && (
                                <div className="px-2 py-1 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800">
                                  +{message.data.length - 5} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Single Customer/Entity Card */}
                      {message.type === "assistant" && message.data && !Array.isArray(message.data) && (
                        <div className="mt-3 text-xs bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 p-3">
                          {message.data.name && (
                            <div className="font-medium mb-1">{message.data.name}</div>
                          )}
                          {message.data.mobileNumber && (
                            <div className="text-slate-600 dark:text-slate-400">📱 {message.data.mobileNumber}</div>
                          )}
                          {message.data.email && (
                            <div className="text-slate-600 dark:text-slate-400">✉️ {message.data.email}</div>
                          )}
                        </div>
                      )}
                      
                      {/* Retry Button for Errors */}
                      {message.type === "assistant" && message.action === "error" && (
                        <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                            onClick={() => {
                              // Find the previous user message to retry
                              const messageIndex = messages.findIndex(m => m.id === message.id);
                              if (messageIndex > 0) {
                                const previousUserMessage = messages[messageIndex - 1];
                                if (previousUserMessage.type === "user") {
                                  handleSendMessage(previousUserMessage.content);
                                }
                              }
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                          {message.data?.suggestions && message.data.suggestions.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                              onClick={() => handleSendMessage("help")}
                            >
                              <HelpCircle className="h-3 w-3 mr-1" />
                              Get Help
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {/* Contextual Quick Actions */}
                      {message.type === "assistant" && message.data && Array.isArray(message.data) && message.data.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
                          {/* Actions for due invoices */}
                          {message.action?.includes("invoice") && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => handleSendMessage("Send email reminder to overdue customers")}
                              >
                                <Mail className="h-3 w-3 mr-1" />
                                Send Email Reminders
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => handleSendMessage("Send WhatsApp reminder to due customers")}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Send WhatsApp
                              </Button>
                            </>
                          )}
                          
                          {/* Actions for customer lists */}
                          {message.action?.includes("customer") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => handleSendMessage("Show collection report")}
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              View Collections
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type or use voice..."
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                disabled={isProcessing}
                data-testid="input-voice-message"
              />
              <Button
                size="icon"
                variant={isListening ? "destructive" : "default"}
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                data-testid="button-voice-toggle"
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isProcessing}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <BookOpen className="h-6 w-6 text-blue-500" />
              Voice Assistant Help
            </DialogTitle>
            <DialogDescription>
              Learn how to use RECOV Voice Assistant effectively
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Quick Tips */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Quick Tips</h3>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                    <li>• Say <strong>"Hey RECOV"</strong> to activate (if always-listening is ON)</li>
                    <li>• You can type OR speak your commands</li>
                    <li>• Speak clearly and naturally in Hindi or English</li>
                    <li>• Use the <strong>Recent Commands</strong> panel to rerun previous queries</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Invoice Management */}
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-3 text-slate-900 dark:text-white">
                <FileText className="h-5 w-5 text-emerald-500" />
                Invoice Management
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {[
                  "due invoices dikhao",
                  "overdue invoices kitne hain",
                  "pending invoices list",
                  "today's invoices",
                  "इस महीने के invoices",
                  "invoice status check karo"
                ].map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleSendMessage(cmd);
                      setIsHelpOpen(false);
                    }}
                    className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 text-left transition-colors"
                  >
                    <Zap className="h-3 w-3 text-blue-500 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{cmd}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Management */}
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-3 text-slate-900 dark:text-white">
                <Users className="h-5 w-5 text-purple-500" />
                Customer Management
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {[
                  "alpha category customers",
                  "beta category list",
                  "gamma customers dikhao",
                  "delta category kitne hain",
                  "सभी customers की list",
                  "customer details check karo"
                ].map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleSendMessage(cmd);
                      setIsHelpOpen(false);
                    }}
                    className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 text-left transition-colors"
                  >
                    <Zap className="h-3 w-3 text-purple-500 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{cmd}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Collections & Reports */}
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-3 text-slate-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Collections & Reports
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {[
                  "aaj ka collection",
                  "today's collection report",
                  "payment report dikhao",
                  "collection summary",
                  "इस हफ्ते का collection",
                  "monthly collection"
                ].map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleSendMessage(cmd);
                      setIsHelpOpen(false);
                    }}
                    className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 text-left transition-colors"
                  >
                    <Zap className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{cmd}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Communication */}
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-3 text-slate-900 dark:text-white">
                <MessageSquare className="h-5 w-5 text-orange-500" />
                Communication
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {[
                  "email reminder bhejo",
                  "whatsapp message send karo",
                  "due customers ko reminder",
                  "payment reminder send",
                  "bulk email भेजो",
                  "follow-up message"
                ].map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleSendMessage(cmd);
                      setIsHelpOpen(false);
                    }}
                    className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 text-left transition-colors"
                  >
                    <Zap className="h-3 w-3 text-orange-500 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{cmd}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white mb-3">
                <span className="text-lg">⌨️</span>
                Keyboard Shortcuts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 font-mono text-xs">Ctrl+Shift+V</kbd>
                  <span className="text-slate-700 dark:text-slate-300">Toggle Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 font-mono text-xs">Escape</kbd>
                  <span className="text-slate-700 dark:text-slate-300">Close Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 font-mono text-xs">Ctrl+M</kbd>
                  <span className="text-slate-700 dark:text-slate-300">Toggle Microphone</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 font-mono text-xs">Ctrl+H</kbd>
                  <span className="text-slate-700 dark:text-slate-300">Open Help</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 font-mono text-xs">Enter</kbd>
                  <span className="text-slate-700 dark:text-slate-300">Send Message</span>
                </div>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Pro Tips 🚀</h3>
              <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
                <li>• <strong>Mix Hindi & English:</strong> "alpha customers ka list dikhao"</li>
                <li>• <strong>Be specific:</strong> "last 7 days ke due invoices" instead of just "invoices"</li>
                <li>• <strong>Use retry:</strong> If command fails, click the retry button for quick rerun</li>
                <li>• <strong>Voice feedback:</strong> Enable TTS in Settings for spoken responses</li>
                <li>• <strong>Quick access:</strong> Use keyboard shortcuts for faster navigation</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <AssistantSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
