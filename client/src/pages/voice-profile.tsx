import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Mic, Upload, Play, Trash2, CheckCircle, AlertCircle, Volume2, Square, RotateCcw, Pause } from "lucide-react";

interface VoiceClone {
  id: string;
  tenantId: string;
  userId: string;
  elevenLabsVoiceId: string;
  voiceName: string;
  description: string | null;
  sampleFileName: string | null;
  status: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VoiceClonesResponse {
  voiceClones: VoiceClone[];
}

export default function VoiceProfile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordedAudioRef = useRef<HTMLAudioElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const [voiceName, setVoiceName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upload");
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Recording timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  // Comprehensive cleanup on unmount - stop recording, close resources
  useEffect(() => {
    return () => {
      // Stop animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Stop media recorder if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // Recorder may already be stopped
        }
        mediaRecorderRef.current = null;
      }
      
      // Stop all media stream tracks (releases microphone)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        mediaStreamRef.current = null;
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      
      // Clean up analyser
      analyserRef.current = null;
      
      // Revoke blob URL
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [recordedUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isRecording) return;
      
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      
      ctx.fillStyle = "hsl(var(--muted))";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = "hsl(var(--primary))";
      ctx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    
    draw();
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Set up audio analyser for waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        
        // Stop all tracks and close audio context
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        analyserRef.current = null;
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setRecordedBlob(null);
      setRecordedUrl(null);
      setPermissionDenied(false);
      
      // Start drawing waveform
      setTimeout(() => drawWaveform(), 100);
      
    } catch (error: any) {
      console.error("Error starting recording:", error);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setPermissionDenied(true);
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access in your browser to record audio",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Recording Error",
          description: error.message || "Failed to start recording",
          variant: "destructive",
        });
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        drawWaveform();
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const resetRecording = () => {
    // Stop any playback
    if (recordedAudioRef.current) {
      recordedAudioRef.current.pause();
      recordedAudioRef.current.currentTime = 0;
    }
    
    // Revoke old URL
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    
    // Reset state
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    setIsPlayingRecording(false);
  };

  const playRecording = () => {
    if (recordedAudioRef.current && recordedUrl) {
      if (isPlayingRecording) {
        recordedAudioRef.current.pause();
        recordedAudioRef.current.currentTime = 0;
        setIsPlayingRecording(false);
      } else {
        recordedAudioRef.current.play();
        setIsPlayingRecording(true);
      }
    }
  };

  const { data: voiceClonesData, isLoading } = useQuery<VoiceClonesResponse>({
    queryKey: ["/api/voice-clones"],
  });

  const createVoiceCloneMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/voice-clones", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create voice clone");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-clones"] });
      toast({
        title: "Voice Clone Created",
        description: "Your voice has been cloned successfully! You can now use it for calls.",
      });
      // Reset all form fields including recording
      setVoiceName("");
      setDescription("");
      setSelectedFile(null);
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      setRecordedBlob(null);
      setRecordedUrl(null);
      setRecordingTime(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create voice clone",
        variant: "destructive",
      });
    },
  });

  const deleteVoiceCloneMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/voice-clones/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-clones"] });
      toast({
        title: "Voice Clone Deleted",
        description: "Your voice clone has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete voice clone",
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/voice-clones/${id}/set-default`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-clones"] });
      toast({
        title: "Default Voice Updated",
        description: "This voice will now be used for your calls",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set default voice",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/m4a", "audio/ogg", "audio/webm"];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
        toast({
          title: "Invalid File",
          description: "Please upload an MP3, WAV, M4A, OGG, or WebM file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 50MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const audioFile = activeTab === "upload" ? selectedFile : recordedBlob;
    
    if (!audioFile) {
      toast({
        title: "Missing Audio",
        description: activeTab === "upload" 
          ? "Please select an audio sample file"
          : "Please record an audio sample first",
        variant: "destructive",
      });
      return;
    }

    if (!voiceName.trim()) {
      toast({
        title: "Missing Name",
        description: "Please enter a name for your voice",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    
    if (activeTab === "upload" && selectedFile) {
      formData.append("audioSample", selectedFile);
    } else if (activeTab === "record" && recordedBlob) {
      // Convert blob to file with proper extension
      const extension = recordedBlob.type.includes("webm") ? "webm" : "mp4";
      const recordedFile = new File([recordedBlob], `recording.${extension}`, { type: recordedBlob.type });
      formData.append("audioSample", recordedFile);
    }
    
    formData.append("voiceName", voiceName);
    if (description) {
      formData.append("description", description);
    }

    createVoiceCloneMutation.mutate(formData);
  };
  
  // Handle successful voice clone creation - reset recording too
  const handleCreateSuccess = () => {
    setVoiceName("");
    setDescription("");
    setSelectedFile(null);
    resetRecording();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePreview = async (voiceClone: VoiceClone) => {
    try {
      setIsPlaying(voiceClone.id);
      
      const response = await fetch(`/api/voice-clones/${voiceClone.id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Namaste, yeh meri awaaz ka preview hai." }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to generate preview");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        audioRef.current.onended = () => setIsPlaying(null);
      }
    } catch (error: any) {
      toast({
        title: "Preview Failed",
        description: error.message || "Failed to generate voice preview",
        variant: "destructive",
      });
      setIsPlaying(null);
    }
  };

  const voiceClones = voiceClonesData?.voiceClones || [];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <audio ref={audioRef} className="hidden" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
          My Voice Profile
        </h1>
        <p className="text-muted-foreground mt-2">
          Clone your voice and use it for automated calls. Upload a 1-2 minute audio sample of your voice.
        </p>
      </div>

      <div className="space-y-6">
        {/* Hidden audio elements */}
        <audio 
          ref={recordedAudioRef} 
          src={recordedUrl || undefined} 
          className="hidden"
          onEnded={() => setIsPlayingRecording(false)}
        />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Create Voice Clone
            </CardTitle>
            <CardDescription>
              Upload an existing audio file or record directly from your browser (1-2 minutes recommended)
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="voiceName">Voice Name *</Label>
                <Input
                  id="voiceName"
                  placeholder="e.g., My Professional Voice"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  data-testid="input-voice-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add a description for this voice..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="input-description"
                />
              </div>

              <div className="space-y-2">
                <Label>Audio Sample *</Label>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="flex items-center gap-2" data-testid="tab-upload">
                      <Upload className="h-4 w-4" />
                      Upload File
                    </TabsTrigger>
                    <TabsTrigger value="record" className="flex items-center gap-2" data-testid="tab-record">
                      <Mic className="h-4 w-4" />
                      Record Now
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload" className="mt-4">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="audioFile"
                        accept="audio/*"
                        onChange={handleFileChange}
                        className="hidden"
                        data-testid="input-audio-file"
                      />
                      {selectedFile ? (
                        <div className="space-y-2">
                          <Mic className="h-8 w-8 mx-auto text-primary" />
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Change File
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-sm text-muted-foreground">
                            MP3, WAV, M4A, WebM (max 50MB)
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            data-testid="button-upload"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Select Audio File
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="record" className="mt-4">
                    <div className="border-2 border-dashed rounded-lg p-6 space-y-4">
                      {/* Waveform visualization */}
                      <div className="relative">
                        <canvas
                          ref={canvasRef}
                          width={500}
                          height={100}
                          className="w-full h-24 rounded-lg bg-muted"
                        />
                        {!isRecording && !recordedBlob && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-muted-foreground text-sm">Waveform will appear here while recording</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Recording timer */}
                      <div className="text-center">
                        <span className={`text-3xl font-mono font-bold ${isRecording && !isPaused ? "text-red-500 animate-pulse" : "text-foreground"}`}>
                          {formatTime(recordingTime)}
                        </span>
                        {isRecording && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {isPaused ? "Paused" : "Recording..."}
                          </p>
                        )}
                        {recordingTime > 0 && recordingTime < 60 && !recordedBlob && (
                          <p className="text-sm text-yellow-600 mt-1">
                            Recommended: Record at least 1 minute
                          </p>
                        )}
                      </div>
                      
                      {/* Recording controls */}
                      <div className="flex items-center justify-center gap-3">
                        {!isRecording && !recordedBlob && (
                          <Button
                            type="button"
                            onClick={startRecording}
                            className="bg-red-500 hover:bg-red-600"
                            data-testid="button-start-recording"
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            Start Recording
                          </Button>
                        )}
                        
                        {isRecording && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={pauseRecording}
                              data-testid="button-pause-recording"
                            >
                              {isPaused ? (
                                <>
                                  <Mic className="h-4 w-4 mr-2" />
                                  Resume
                                </>
                              ) : (
                                <>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={stopRecording}
                              data-testid="button-stop-recording"
                            >
                              <Square className="h-4 w-4 mr-2" />
                              Stop
                            </Button>
                          </>
                        )}
                        
                        {recordedBlob && !isRecording && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={playRecording}
                              data-testid="button-play-recording"
                            >
                              {isPlayingRecording ? (
                                <>
                                  <Square className="h-4 w-4 mr-2" />
                                  Stop Playback
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Play Recording
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={resetRecording}
                              data-testid="button-reset-recording"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Re-record
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {/* Recording ready indicator */}
                      {recordedBlob && (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Recording ready ({formatTime(recordingTime)})</span>
                        </div>
                      )}
                      
                      {/* Permission denied message */}
                      {permissionDenied && (
                        <div className="flex items-center justify-center gap-2 text-red-500">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Microphone access denied. Please allow access in browser settings.</span>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Tips for Best Results
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Record 1-2 minutes of clear speech</li>
                  <li>Speak naturally in a quiet environment</li>
                  <li>Avoid background noise and music</li>
                  <li>Use consistent volume and tone</li>
                  <li>Include varied sentences (not just one repeated phrase)</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={
                  createVoiceCloneMutation.isPending || 
                  !voiceName.trim() ||
                  (activeTab === "upload" && !selectedFile) ||
                  (activeTab === "record" && !recordedBlob)
                }
                data-testid="button-create"
              >
                {createVoiceCloneMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Voice Clone...
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Create Voice Clone
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Voice Clones</CardTitle>
            <CardDescription>
              Manage your cloned voices. The default voice will be used for automated calls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : voiceClones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>You haven't created any voice clones yet.</p>
                <p className="text-sm">Upload an audio sample above to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {voiceClones.map((clone) => (
                  <div
                    key={clone.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`voice-clone-${clone.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mic className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{clone.voiceName}</h4>
                          {clone.isDefault && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                          <Badge variant={clone.status === "active" ? "secondary" : "destructive"}>
                            {clone.status}
                          </Badge>
                        </div>
                        {clone.description && (
                          <p className="text-sm text-muted-foreground">{clone.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(clone.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(clone)}
                        disabled={isPlaying === clone.id}
                        data-testid={`button-preview-${clone.id}`}
                      >
                        {isPlaying === clone.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      {!clone.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(clone.id)}
                          disabled={setDefaultMutation.isPending}
                          data-testid={`button-set-default-${clone.id}`}
                        >
                          Set Default
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${clone.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Voice Clone?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete your voice clone "{clone.voiceName}".
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteVoiceCloneMutation.mutate(clone.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
