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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAlwaysListening, setIsAlwaysListening] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      return await res.json();
    },
    onSuccess: (response: any) => {
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
    },
  });

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-IN"; // Indian English

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");

        // Check for wake word
        if (isAlwaysListening && !wakeWordDetected) {
          if (
            transcript.toLowerCase().includes("hey recov") ||
            transcript.toLowerCase().includes("recov")
          ) {
            setWakeWordDetected(true);
            setIsOpen(true);
            playBeep();
            return;
          }
        }

        // Process command if wake word detected or manually activated
        if (wakeWordDetected || !isAlwaysListening) {
          if (event.results[event.results.length - 1].isFinal) {
            handleVoiceCommand(transcript);
            setWakeWordDetected(false);
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isAlwaysListening) {
          recognitionRef.current?.start();
        } else {
          setIsListening(false);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isAlwaysListening, wakeWordDetected]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
      playBeep();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
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

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: transcript,
      timestamp: new Date(),
      isVoice: true,
    };

    setMessages((prev) => [...prev, userMessage]);

    await processCommandMutation.mutateAsync({
      message: transcript,
      isVoice: true,
    });

    setIsProcessing(false);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputText,
      timestamp: new Date(),
      isVoice: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsProcessing(true);

    await processCommandMutation.mutateAsync({
      message: inputText,
      isVoice: false,
    });

    setIsProcessing(false);
  };

  const quickActions = [
    { icon: FileText, label: "Due Invoices", command: "due invoices dikhao" },
    { icon: Users, label: "Customers", command: "alpha category customers" },
    { icon: TrendingUp, label: "Collection", command: "aaj ka collection" },
    { icon: Mail, label: "Reports", command: "payment report" },
  ];

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
                  <SheetTitle className="text-xl">RECOV Assistant</SheetTitle>
                  <SheetDescription>Your AI-powered business helper</SheetDescription>
                </div>
              </div>
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
                  onClick={() => {
                    setInputText(action.command);
                    handleSendMessage();
                  }}
                  data-testid={`button-quick-${action.label.toLowerCase()}`}
                >
                  <action.icon className="h-3 w-3 mr-1.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

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
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isProcessing}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
