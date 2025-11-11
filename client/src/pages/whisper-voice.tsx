import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Loader2, AlertCircle, CheckCircle2, Lightbulb, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TranscriptionResult {
  transcript: string;
  language: string;
  duration: number;
  cost: number;
  command?: {
    type: string;
    entities: Record<string, any>;
    confidence: number;
  };
  report?: {
    type: string;
    data: any;
    summary?: string;
  };
}

export default function WhisperVoicePage() {
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { data: credits, isLoading: isLoadingCredits } = useQuery<{ 
    planMinutesCurrent: number;
    addonMinutesBalance: number;
    usedPlanMinutes: number;
    usedAddonMinutes: number;
    remainingMinutes: number;
    nextResetAt: string;
  }>({
    queryKey: ["/api/whisper/credits"],
  });

  const remainingMinutes = credits?.remainingMinutes || 0;

  const transcribeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("feature", "voice_command");

      const response = await fetch("/api/whisper/transcribe", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Transcription failed");
      }

      return await response.json() as TranscriptionResult;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/whisper/credits"] });
      toast({
        title: "Transcription Complete",
        description: `Language: ${data.language.toUpperCase()} | Duration: ${data.duration.toFixed(1)}s`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Transcription Failed",
        description: error.message || "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startRecording = async () => {
    // Wait for credits to load before checking
    if (isLoadingCredits) {
      toast({
        title: "Loading Credits",
        description: "Please wait while we fetch your credit balance.",
      });
      return;
    }
    
    if (remainingMinutes <= 0) {
      toast({
        title: "No Credits Available",
        description: "Please purchase addon credits from Voice AI Credits page.",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setResult(null);
    } catch (error) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record audio.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };


  const handleTranscribe = () => {
    if (!audioBlob) return;

    const file = new File([audioBlob], "recording.webm", { type: audioBlob.type });
    transcribeMutation.mutate(file);
  };

  const getCommandSuggestion = () => {
    if (!result?.command) return null;

    const { type, entities, confidence } = result.command;
    const suggestions: Record<string, string> = {
      create_lead: `Create a new lead${entities.name ? ` for ${entities.name}` : ""}${entities.phone ? ` (${entities.phone})` : ""}`,
      create_quotation: `Create a quotation${entities.amount ? ` for ₹${entities.amount}` : ""}${entities.name ? ` for ${entities.name}` : ""}`,
      create_customer: `Create a customer${entities.name ? ` named ${entities.name}` : ""}${entities.email ? ` (${entities.email})` : ""}`,
      create_invoice: `Create an invoice${entities.amount ? ` for ₹${entities.amount}` : ""}${entities.name ? ` for ${entities.name}` : ""}`,
    };

    return {
      suggestion: suggestions[type] || "Unknown command",
      confidence,
      entities,
    };
  };

  const commandInfo = getCommandSuggestion();

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Voice AI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record audio to transcribe with AI-powered voice recognition
          </p>
        </div>
        <Badge variant="outline" className="text-base px-4 py-2" data-testid="badge-credits-remaining">
          {isLoadingCredits ? "Loading..." : `${remainingMinutes.toFixed(1)} min remaining`}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recording/Upload Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Record Audio
            </CardTitle>
            <CardDescription>
              Speak commands in English, Hindi, or Hinglish
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recording Controls */}
            <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="w-full"
                  disabled={isLoadingCredits || remainingMinutes <= 0}
                  data-testid="button-start-recording"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  {isLoadingCredits ? "Loading..." : "Start Recording"}
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="w-full animate-pulse"
                  data-testid="button-stop-recording"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Stop Recording
                </Button>
              )}
            </div>

            {/* Audio Preview */}
            {audioUrl && (
              <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Audio Ready</span>
                </div>
                <audio
                  controls
                  src={audioUrl}
                  className="w-full"
                  data-testid="audio-preview"
                />
                <Button
                  onClick={handleTranscribe}
                  disabled={isLoadingCredits || transcribeMutation.isPending || remainingMinutes <= 0}
                  className="w-full"
                  data-testid="button-transcribe"
                >
                  {transcribeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Transcribe Audio
                    </>
                  )}
                </Button>
              </div>
            )}

            {remainingMinutes <= 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No credits remaining. Visit Voice AI Credits to purchase more.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Transcription Results</CardTitle>
            <CardDescription>
              View transcript and detected commands
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <>
                {/* Transcript */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Transcript
                  </label>
                  <div
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm leading-relaxed"
                    data-testid="text-transcript"
                  >
                    {result.transcript}
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-xs text-muted-foreground">Language</div>
                    <div className="text-lg font-semibold text-blue-700 dark:text-blue-400" data-testid="text-language">
                      {result.language.toUpperCase()}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="text-xs text-muted-foreground">Duration</div>
                    <div className="text-lg font-semibold text-purple-700 dark:text-purple-400" data-testid="text-duration">
                      {result.duration.toFixed(1)}s
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-xs text-muted-foreground">Cost</div>
                    <div className="text-lg font-semibold text-green-700 dark:text-green-400" data-testid="text-cost">
                      {(result.cost / 100).toFixed(2)} min
                    </div>
                  </div>
                </div>

                {/* Command Detection */}
                {commandInfo ? (
                  <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                    <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-2">
                      <div className="font-medium text-amber-800 dark:text-amber-300">
                        Detected Command
                      </div>
                      <div className="text-sm text-amber-700 dark:text-amber-400" data-testid="text-command-suggestion">
                        {commandInfo.suggestion}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {(commandInfo.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                        {Object.keys(commandInfo.entities).length > 0 && (
                          <span>
                            • {Object.keys(commandInfo.entities).length} entities extracted
                          </span>
                        )}
                      </div>
                    </div>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No command detected. Try reports like "top 5 debtors", "today collection", or commands like "create lead".
                    </AlertDescription>
                  </Alert>
                )}

                {/* Report Results */}
                {result.report && (
                  <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        {result.report.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Report
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {result.report.summary}
                      </Badge>
                    </div>
                    
                    {/* Top Debtors/Customers/Payments Table */}
                    {(result.report.type === 'top_debtors' || 
                      result.report.type === 'top_customers_month' || 
                      result.report.type === 'top_payments_month') && Array.isArray(result.report.data) && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-blue-200 dark:border-blue-800">
                              <th className="text-left p-2 font-medium text-blue-900 dark:text-blue-100">
                                {result.report.type === 'top_payments_month' ? 'Customer / Date' : 'Customer'}
                              </th>
                              <th className="text-right p-2 font-medium text-blue-900 dark:text-blue-100">
                                {result.report.type === 'top_debtors' ? 'Outstanding' : 
                                 result.report.type === 'top_customers_month' ? 'Revenue' : 'Amount'}
                              </th>
                              {result.report.type !== 'top_payments_month' && (
                                <th className="text-center p-2 font-medium text-blue-900 dark:text-blue-100">
                                  {result.report.type === 'top_debtors' ? 'Invoices' : 'Orders'}
                                </th>
                              )}
                              {result.report.type === 'top_payments_month' && (
                                <th className="text-center p-2 font-medium text-blue-900 dark:text-blue-100">Mode</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {result.report.data.map((item: any, idx: number) => (
                              <tr key={idx} className="border-b border-blue-100 dark:border-blue-900">
                                <td className="p-2 text-blue-800 dark:text-blue-200">
                                  {item.customerName}
                                  {item.paymentDate && (
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(item.paymentDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </td>
                                <td className="text-right p-2 font-semibold text-blue-900 dark:text-blue-100">
                                  ₹{(item.outstanding || item.revenue || item.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </td>
                                {result.report.type !== 'top_payments_month' && (
                                  <td className="text-center p-2 text-blue-700 dark:text-blue-300">
                                    {item.invoiceCount}
                                  </td>
                                )}
                                {result.report.type === 'top_payments_month' && (
                                  <td className="text-center p-2">
                                    <Badge variant="outline" className="text-xs">{item.paymentMode}</Badge>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Collection/Revenue Summary Cards */}
                    {(result.report.type === 'today_collection' || 
                      result.report.type === 'weekly_revenue' || 
                      result.report.type === 'monthly_revenue') && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-md">
                          <div className="text-xs text-muted-foreground">Total Amount</div>
                          <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                            ₹{(result.report.data.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                          </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-md">
                          <div className="text-xs text-muted-foreground">
                            {result.report.type === 'today_collection' ? 'Payments' : 'Invoices'}
                          </div>
                          <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                            {result.report.data.count || result.report.data.invoiceCount || 0}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pending/Overdue Invoices */}
                    {(result.report.type === 'pending_invoices' || result.report.type === 'overdue_invoices') && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-md">
                            <div className="text-xs text-muted-foreground">Total Amount</div>
                            <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                              ₹{(result.report.data.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </div>
                          </div>
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-md">
                            <div className="text-xs text-muted-foreground">Invoice Count</div>
                            <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                              {result.report.data.count || 0}
                            </div>
                          </div>
                        </div>
                        {result.report.data.invoices && result.report.data.invoices.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Showing first {result.report.data.invoices.length} invoices
                          </div>
                        )}
                      </div>
                    )}

                    {/* Total Outstanding */}
                    {result.report.type === 'total_outstanding' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-md">
                          <div className="text-xs text-muted-foreground">Total Outstanding</div>
                          <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                            ₹{(result.report.data.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                          </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-md">
                          <div className="text-xs text-muted-foreground">Customers</div>
                          <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                            {result.report.data.customerCount || 0}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Conversion Rate */}
                    {result.report.type === 'conversion_rate' && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-md">
                          <div className="text-xs text-muted-foreground">Conversion Rate</div>
                          <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                            {result.report.data.conversionRate?.toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-md">
                          <div className="text-xs text-muted-foreground">Total Leads</div>
                          <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                            {result.report.data.totalLeads || 0}
                          </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-md">
                          <div className="text-xs text-muted-foreground">Converted</div>
                          <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                            {result.report.data.convertedLeads || 0}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recent Leads */}
                    {result.report.type === 'recent_leads' && Array.isArray(result.report.data) && (
                      <div className="space-y-2">
                        {result.report.data.map((lead: any, idx: number) => (
                          <div key={idx} className="p-2 bg-white dark:bg-gray-900 rounded-md text-sm">
                            <div className="font-medium text-blue-900 dark:text-blue-100">{lead.companyName}</div>
                            <div className="text-xs text-muted-foreground">
                              {lead.contactPerson} • {lead.status} • {new Date(lead.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                <Mic className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">Record audio to see transcription results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voice Command Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Reports & Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                  "Top 5 debtors" or "sabse jyada debt"
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                  "Today's collection" or "aaj ka collection"
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                  "Top customers this month"
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                  "Weekly revenue" or "is hafte ki sales"
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                  "Pending invoices" or "baaki invoice"
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                  "Total outstanding" or "kitna baaki hai"
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Create Records</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
                  "Create lead for John Doe, phone 9876543210"
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
                  "Create quotation for 50000 rupees"
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
                  "Create customer Rajesh Kumar"
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
                  "Create invoice for 75000"
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
