import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, FileText, CreditCard, Download, CheckCircle, XCircle, AlertCircle, Calendar } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import html2pdf from "html2pdf.js";

interface SurepassConfig {
  exists: boolean;
  config?: {
    isEnabled: boolean;
    gstinEnabled: boolean;
    tdsEnabled: boolean;
    creditReportEnabled: boolean;
    environment: string;
  };
}

interface GstinResult {
  gstin: string;
  business_name: string;
  legal_name: string;
  center_jurisdiction: string;
  state_jurisdiction: string;
  date_of_registration: string;
  constitution_of_business: string;
  taxpayer_type: string;
  gstin_status: string;
  date_of_cancellation?: string;
  address: string;
  nature_of_core_business_activity_code?: string;
  nature_of_core_business_activity_description: string;
  nature_bus_activities?: string[];
  field_visit_conducted?: string;
  aadhaar_validation?: string;
  aadhaar_validation_date?: string;
  einvoice_status?: boolean | string;
  pan_number?: string;
  fy?: string | null;
  client_id?: string;
  filing_status?: Array<{
    return_type: string;
    financial_year?: string;
    tax_period?: string;
    date_of_filing?: string;
    status?: string;
    mode_of_filing?: string;
    arn?: string;
  }>;
  hsn_info?: Record<string, any> | Array<{
    hsn_code: string;
    description: string;
  }>;
  filing_frequency?: Array<any> | {
    gstr1?: string;
    gstr3b?: string;
  };
  // Address details object from API
  address_details?: {
    floor?: string;
    building_number?: string;
    building_name?: string;
    street?: string;
    locality?: string;
    state?: string;
    district?: string;
    pincode?: string;
    city?: string;
    door_number?: string;
    latitude?: string;
    longitude?: string;
  };
  // Legacy split address fields
  building_name?: string;
  street?: string;
  location?: string;
  state_name?: string;
  floor_number?: string;
  pincode?: string;
  district?: string;
  city?: string;
  door_number?: string;
  latitude?: string;
  longitude?: string;
}

interface TdsResult {
  tan: string;
  name: string;
  status: string;
  category: string;
  pan_of_deductor: string;
  ao_details: string;
}

interface CreditReportResult {
  name: string;
  credit_score: number;
  credit_report: any;
}

export function KycVerification() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("gstin");
  const gstinResultRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  
  // GSTIN state
  const [gstinNumber, setGstinNumber] = useState("");
  const [gstinResult, setGstinResult] = useState<GstinResult | null>(null);
  const [financialYear, setFinancialYear] = useState("2024");
  const [filingStatusEnabled, setFilingStatusEnabled] = useState(true);
  const [hsnInfoEnabled, setHsnInfoEnabled] = useState(true);
  const [filingFrequencyEnabled, setFilingFrequencyEnabled] = useState(true);
  const [splitAddressEnabled, setSplitAddressEnabled] = useState(true);
  
  // TDS state
  const [tanNumber, setTanNumber] = useState("");
  const [tdsResult, setTdsResult] = useState<TdsResult | null>(null);
  
  // Credit Report state
  const [creditName, setCreditName] = useState("");
  const [creditPan, setCreditPan] = useState("");
  const [creditMobile, setCreditMobile] = useState("");
  const [creditDob, setCreditDob] = useState("");
  const [creditAddress, setCreditAddress] = useState("");
  const [creditPincode, setCreditPincode] = useState("");
  const [creditResult, setCreditResult] = useState<CreditReportResult | null>(null);
  
  // Fetch Surepass config to check if enabled
  const { data: surepassConfig } = useQuery<SurepassConfig>({
    queryKey: ["/api/surepass/config"],
  });

  // GSTIN Verification mutation
  const verifyGstinMutation = useMutation({
    mutationFn: async (params: { gstin: string; financialYear: string; filingStatus: boolean; hsnInfo: boolean; filingFrequency: boolean; splitAddress: boolean }) => {
      const response = await apiRequest("POST", "/api/surepass/verify-gstin", { 
        gstin: params.gstin,
        financialYear: params.financialYear,
        filingStatus: params.filingStatus,
        hsnInfo: params.hsnInfo,
        filingFrequency: params.filingFrequency,
        splitAddress: params.splitAddress,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setGstinResult(data.data);
        toast({
          title: "GSTIN Verified",
          description: "GSTIN verification completed successfully",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "Failed to verify GSTIN",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify GSTIN",
        variant: "destructive",
      });
    },
  });

  // TDS Verification mutation
  const verifyTdsMutation = useMutation({
    mutationFn: async (tan: string) => {
      const response = await apiRequest("POST", "/api/surepass/verify-tds", { tan });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setTdsResult(data.data);
        toast({
          title: "TAN Verified",
          description: "TDS/TAN verification completed successfully",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "Failed to verify TAN",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify TAN",
        variant: "destructive",
      });
    },
  });

  // Credit Report mutation
  const getCreditReportMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await apiRequest("POST", "/api/surepass/credit-report", params);
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setCreditResult(data.data);
        toast({
          title: "Credit Report Fetched",
          description: "CIBIL credit report retrieved successfully",
        });
      } else {
        toast({
          title: "Failed to Fetch Report",
          description: data.message || "Failed to fetch credit report",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Fetch Report",
        description: error.message || "Failed to fetch credit report",
        variant: "destructive",
      });
    },
  });

  // Credit Report PDF mutation
  const getCreditReportPdfMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await apiRequest("POST", "/api/surepass/credit-report-pdf", params);
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success && data.data.pdf_url) {
        window.open(data.data.pdf_url, "_blank");
        toast({
          title: "PDF Generated",
          description: "Credit report PDF opened in new tab",
        });
      } else {
        toast({
          title: "Failed to Generate PDF",
          description: data.message || "Failed to generate credit report PDF",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Generate PDF",
        description: error.message || "Failed to generate credit report PDF",
        variant: "destructive",
      });
    },
  });

  const handleVerifyGstin = () => {
    if (!gstinNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a GSTIN number",
        variant: "destructive",
      });
      return;
    }
    setGstinResult(null);
    verifyGstinMutation.mutate({
      gstin: gstinNumber.trim(),
      financialYear,
      filingStatus: filingStatusEnabled,
      hsnInfo: hsnInfoEnabled,
      filingFrequency: filingFrequencyEnabled,
      splitAddress: splitAddressEnabled,
    });
  };

  // PDF Download function for GSTIN result
  const handleDownloadGstinPdf = async () => {
    if (!gstinResultRef.current || !gstinResult) return;
    
    setIsDownloadingPdf(true);
    try {
      const element = gstinResultRef.current;
      
      // Add print mode class to hide elements and fix styles
      element.classList.add('pdf-export-mode');
      
      // Hide download button
      const downloadBtn = element.querySelector('[data-pdf-hide]') as HTMLElement;
      if (downloadBtn) {
        downloadBtn.style.display = 'none';
      }
      
      // Hide debug accordion
      const accordion = element.querySelector('[data-pdf-hide-debug]') as HTMLElement;
      if (accordion) {
        accordion.style.display = 'none';
      }
      
      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename: `GSTIN_${gstinResult.gstin}_Verification.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      };
      
      await html2pdf().set(opt).from(element).save();
      
      // Restore hidden elements
      if (downloadBtn) {
        downloadBtn.style.display = '';
      }
      if (accordion) {
        accordion.style.display = '';
      }
      element.classList.remove('pdf-export-mode');
      
      toast({
        title: "PDF Downloaded",
        description: `GSTIN verification report saved as PDF`,
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      // Restore on error
      const element = gstinResultRef.current;
      if (element) {
        element.classList.remove('pdf-export-mode');
        const downloadBtn = element.querySelector('[data-pdf-hide]') as HTMLElement;
        if (downloadBtn) downloadBtn.style.display = '';
        const accordion = element.querySelector('[data-pdf-hide-debug]') as HTMLElement;
        if (accordion) accordion.style.display = '';
      }
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleVerifyTds = () => {
    if (!tanNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a TAN number",
        variant: "destructive",
      });
      return;
    }
    setTdsResult(null);
    verifyTdsMutation.mutate(tanNumber.trim());
  };

  const handleGetCreditReport = () => {
    if (!creditName.trim()) {
      toast({
        title: "Error",
        description: "Please enter the name",
        variant: "destructive",
      });
      return;
    }
    setCreditResult(null);
    getCreditReportMutation.mutate({
      name: creditName.trim(),
      pan: creditPan.trim() || undefined,
      mobile: creditMobile.trim() || undefined,
      dob: creditDob.trim() || undefined,
      address: creditAddress.trim() || undefined,
      pincode: creditPincode.trim() || undefined,
    });
  };

  const handleDownloadCreditPdf = () => {
    if (!creditName.trim()) {
      toast({
        title: "Error",
        description: "Please enter the name",
        variant: "destructive",
      });
      return;
    }
    getCreditReportPdfMutation.mutate({
      name: creditName.trim(),
      pan: creditPan.trim() || undefined,
      mobile: creditMobile.trim() || undefined,
      dob: creditDob.trim() || undefined,
      address: creditAddress.trim() || undefined,
      pincode: creditPincode.trim() || undefined,
    });
  };

  // Check if Surepass is configured
  if (!surepassConfig?.exists || !surepassConfig?.config?.isEnabled) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            <div>
              <h3 className="font-semibold text-orange-700 dark:text-orange-300">KYC Verification Not Configured</h3>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Please configure Surepass KYC in Settings to use verification features.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = surepassConfig.config;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          KYC Verification
        </CardTitle>
        <CardDescription>
          Verify customer details using Surepass KYC APIs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gstin" disabled={!config.gstinEnabled}>
              <Building2 className="h-4 w-4 mr-2" />
              GSTIN
            </TabsTrigger>
            <TabsTrigger value="tds" disabled={!config.tdsEnabled}>
              <FileText className="h-4 w-4 mr-2" />
              TDS Check
            </TabsTrigger>
            <TabsTrigger value="credit" disabled={!config.creditReportEnabled}>
              <CreditCard className="h-4 w-4 mr-2" />
              Credit Report
            </TabsTrigger>
          </TabsList>

          {/* GSTIN Verification Tab */}
          <TabsContent value="gstin" className="space-y-4">
            {/* Input Section - Like Surepass Portal */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gstin">GSTIN Number</Label>
                  <Input
                    id="gstin"
                    placeholder="Enter 15-digit GSTIN (e.g., 27AAPFU0939F1ZV)"
                    value={gstinNumber}
                    onChange={(e) => setGstinNumber(e.target.value.toUpperCase())}
                    maxLength={15}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="financial-year">Financial Year</Label>
                  <Select value={financialYear} onValueChange={setFinancialYear}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2021">2021</SelectItem>
                      <SelectItem value="2020">2020</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Options Checkboxes - Like Surepass Portal */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="filing-status" 
                    checked={filingStatusEnabled}
                    onCheckedChange={(checked) => setFilingStatusEnabled(checked === true)}
                  />
                  <Label htmlFor="filing-status" className="text-sm cursor-pointer">Filing Status</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hsn-info" 
                    checked={hsnInfoEnabled}
                    onCheckedChange={(checked) => setHsnInfoEnabled(checked === true)}
                  />
                  <Label htmlFor="hsn-info" className="text-sm cursor-pointer">HSN Info</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="filing-frequency" 
                    checked={filingFrequencyEnabled}
                    onCheckedChange={(checked) => setFilingFrequencyEnabled(checked === true)}
                  />
                  <Label htmlFor="filing-frequency" className="text-sm cursor-pointer">Filing Frequency</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="split-address" 
                    checked={splitAddressEnabled}
                    onCheckedChange={(checked) => setSplitAddressEnabled(checked === true)}
                  />
                  <Label htmlFor="split-address" className="text-sm cursor-pointer">Split Address</Label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleVerifyGstin}
                  disabled={verifyGstinMutation.isPending || !gstinNumber.trim()}
                  size="lg"
                >
                  {verifyGstinMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Verify GSTIN
                </Button>
              </div>
            </div>

            {gstinResult && (
              <div ref={gstinResultRef} className="mt-6 rounded-2xl overflow-hidden shadow-xl border">
                {/* Beautiful Header */}
                <div className="bg-gradient-to-r from-[#1e3c72] to-[#2a5298] p-6 md:p-8 text-white relative overflow-hidden">
                  <div className="absolute -top-20 -right-10 w-72 h-72 bg-white/10 rounded-full" />
                  <div className="relative z-10">
                    {/* Header with Badge and Download Button */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      {/* Verification Badge */}
                      <div className="inline-flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border-2 border-green-400">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span className="font-semibold text-green-400">GSTIN Verified</span>
                      </div>
                      {/* Download PDF Button */}
                      <Button
                        onClick={handleDownloadGstinPdf}
                        disabled={isDownloadingPdf}
                        variant="secondary"
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                        data-pdf-hide="true"
                      >
                        {isDownloadingPdf ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download PDF
                      </Button>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">{gstinResult.business_name || gstinResult.legal_name}</h1>
                    <p className="text-white/90 text-lg">GST Identification Number: {gstinResult.gstin}</p>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6 md:p-8 bg-card space-y-8">
                  {/* Basic Information */}
                  <div>
                    <h2 className="text-xl font-bold text-primary mb-6 pb-3 border-b-[3px] border-primary inline-block">
                      Basic Information
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">GSTIN</p>
                        <p className="font-semibold text-foreground">{gstinResult.gstin}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">PAN Number</p>
                        <p className="font-semibold text-foreground">{gstinResult.pan_number || gstinResult.gstin?.substring(2, 12) || '-'}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Status</p>
                        <Badge className={gstinResult.gstin_status === "Active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800"}>
                          {gstinResult.gstin_status}
                        </Badge>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Legal Name</p>
                        <p className="font-semibold text-foreground text-sm">{gstinResult.legal_name || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  {/* Business Details */}
                  <div>
                    <h2 className="text-xl font-bold text-primary mb-6 pb-3 border-b-[3px] border-primary inline-block">
                      Business Details
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Taxpayer Type</p>
                        <p className="font-semibold text-foreground">{gstinResult.taxpayer_type || '-'}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Constitution</p>
                        <p className="font-semibold text-foreground">{gstinResult.constitution_of_business || '-'}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Registration Date</p>
                        <p className="font-semibold text-foreground">{gstinResult.date_of_registration || '-'}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Business Activity</p>
                        <p className="font-semibold text-foreground">{gstinResult.nature_of_core_business_activity_description || '-'}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Activity Code</p>
                        <p className="font-semibold text-foreground">{gstinResult.nature_of_core_business_activity_code || '-'}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">E-Invoice Status</p>
                        <Badge className={gstinResult.einvoice_status === true || gstinResult.einvoice_status === "Yes" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : "bg-gray-100 text-gray-800"}>
                          {gstinResult.einvoice_status === true ? "Enabled" : gstinResult.einvoice_status === false ? "Disabled" : gstinResult.einvoice_status || '-'}
                        </Badge>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Field Visit</p>
                        <Badge className={gstinResult.field_visit_conducted === "Yes" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}>
                          {gstinResult.field_visit_conducted || '-'}
                        </Badge>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Aadhaar Validation</p>
                        <Badge className={gstinResult.aadhaar_validation === "Yes" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}>
                          {gstinResult.aadhaar_validation || '-'}
                        </Badge>
                      </div>
                      {gstinResult.nature_bus_activities && gstinResult.nature_bus_activities.length > 0 && (
                        <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                          <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Nature of Business</p>
                          <p className="font-semibold text-foreground">{gstinResult.nature_bus_activities.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  {/* Jurisdiction */}
                  <div>
                    <h2 className="text-xl font-bold text-primary mb-6 pb-3 border-b-[3px] border-primary inline-block">
                      Jurisdiction
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Center Jurisdiction</p>
                        <p className="font-semibold text-foreground text-sm">{gstinResult.center_jurisdiction || '-'}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                        <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">State Jurisdiction</p>
                        <p className="font-semibold text-foreground text-sm">{gstinResult.state_jurisdiction || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  {/* Address Details */}
                  <div>
                    <h2 className="text-xl font-bold text-primary mb-6 pb-3 border-b-[3px] border-primary inline-block">
                      Address Details
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                      {gstinResult.address_details?.building_number && (
                        <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                          <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Building No.</p>
                          <p className="font-semibold text-foreground">{gstinResult.address_details.building_number}</p>
                        </div>
                      )}
                      {gstinResult.address_details?.street && (
                        <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                          <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Street</p>
                          <p className="font-semibold text-foreground">{gstinResult.address_details.street}</p>
                        </div>
                      )}
                      {gstinResult.address_details?.locality && (
                        <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                          <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Locality</p>
                          <p className="font-semibold text-foreground">{gstinResult.address_details.locality}</p>
                        </div>
                      )}
                      {gstinResult.address_details?.district && (
                        <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                          <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">District</p>
                          <p className="font-semibold text-foreground">{gstinResult.address_details.district}</p>
                        </div>
                      )}
                      {gstinResult.address_details?.state && (
                        <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                          <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">State</p>
                          <p className="font-semibold text-foreground">{gstinResult.address_details.state}</p>
                        </div>
                      )}
                      {gstinResult.address_details?.pincode && (
                        <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                          <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">Pincode</p>
                          <p className="font-semibold text-foreground">{gstinResult.address_details.pincode}</p>
                        </div>
                      )}
                    </div>

                    {/* Beautiful Address Card */}
                    <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white p-6 rounded-xl mt-4">
                      <h3 className="text-lg font-medium mb-3 opacity-90">Complete Address</h3>
                      <p className="text-xl font-semibold leading-relaxed">{gstinResult.address || '-'}</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  {/* Filing Frequency */}
                  <div>
                    <h2 className="text-xl font-bold text-primary mb-6 pb-3 border-b-[3px] border-primary inline-block">
                      Filing Frequency
                    </h2>
                    {gstinResult.filing_frequency && !Array.isArray(gstinResult.filing_frequency) && (gstinResult.filing_frequency.gstr1 || gstinResult.filing_frequency.gstr3b) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {gstinResult.filing_frequency.gstr1 && (
                          <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                            <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">GSTR-1</p>
                            <Badge variant="outline" className="text-base px-3 py-1">{gstinResult.filing_frequency.gstr1}</Badge>
                          </div>
                        )}
                        {gstinResult.filing_frequency.gstr3b && (
                          <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all">
                            <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">GSTR-3B</p>
                            <Badge variant="outline" className="text-base px-3 py-1">{gstinResult.filing_frequency.gstr3b}</Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                        <p className="text-orange-700 dark:text-orange-300">
                          Filing frequency data not available.
                          {surepassConfig?.config?.environment === 'sandbox' && (
                            <span className="block mt-1 text-sm">(Sandbox API returns limited data - use Production for full details)</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  {/* GST Filing Status */}
                  <div>
                    <h2 className="text-xl font-bold text-primary mb-6 pb-3 border-b-[3px] border-primary inline-block">
                      GST Filing Status
                    </h2>
                    {gstinResult.filing_status && gstinResult.filing_status.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Return Type</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tax Period</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filing Date</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mode</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gstinResult.filing_status.slice(0, 12).map((filing, index) => (
                              <tr key={index} className="border-t hover:bg-muted/30 transition-colors">
                                <td className="py-3 px-4">
                                  <Badge variant="outline">{filing.return_type}</Badge>
                                </td>
                                <td className="py-3 px-4 text-sm">{filing.tax_period || filing.financial_year || '-'}</td>
                                <td className="py-3 px-4 text-sm font-medium">{filing.date_of_filing || '-'}</td>
                                <td className="py-3 px-4">
                                  <Badge className={filing.status === 'Filed' ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800"}>
                                    {filing.status || '-'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-sm">{filing.mode_of_filing || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                        <p className="text-orange-700 dark:text-orange-300">
                          No filing status data available.
                          {surepassConfig?.config?.environment === 'sandbox' && (
                            <span className="block mt-1 text-sm">(Sandbox API returns empty filing_status - use Production for full details)</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  {/* HSN Codes */}
                  <div>
                    <h2 className="text-xl font-bold text-primary mb-6 pb-3 border-b-[3px] border-primary inline-block">
                      HSN Codes
                    </h2>
                    {gstinResult.hsn_info && Array.isArray(gstinResult.hsn_info) && gstinResult.hsn_info.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {gstinResult.hsn_info.map((hsn: any, index: number) => (
                          <div key={index} className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all flex items-center gap-3">
                            <Badge variant="outline" className="text-sm px-3 py-1">{hsn.hsn_code}</Badge>
                            <span className="text-sm text-muted-foreground">{hsn.description}</span>
                          </div>
                        ))}
                      </div>
                    ) : gstinResult.hsn_info && typeof gstinResult.hsn_info === 'object' && Object.keys(gstinResult.hsn_info).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(gstinResult.hsn_info).map(([code, desc], index) => (
                          <div key={index} className="bg-muted/50 p-4 rounded-xl border-l-4 border-primary hover:shadow-md transition-all flex items-center gap-3">
                            <Badge variant="outline" className="text-sm px-3 py-1">{code}</Badge>
                            <span className="text-sm text-muted-foreground">{String(desc)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                        <p className="text-orange-700 dark:text-orange-300">
                          No HSN data available.
                          {surepassConfig?.config?.environment === 'sandbox' && (
                            <span className="block mt-1 text-sm">(Sandbox API returns empty hsn_info - use Production for full details)</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Debug Accordion */}
                  <Accordion type="single" collapsible className="mt-6" data-pdf-hide-debug="true">
                    <AccordionItem value="raw-data" className="border rounded-xl px-4">
                      <AccordionTrigger className="text-sm font-semibold text-muted-foreground hover:no-underline">
                        View Full API Response (Debug)
                      </AccordionTrigger>
                      <AccordionContent>
                        <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
                          {JSON.stringify(gstinResult, null, 2)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TDS Verification Tab */}
          <TabsContent value="tds" className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="tan">TAN Number</Label>
                <Input
                  id="tan"
                  placeholder="Enter 10-digit TAN (e.g., DELS12345A)"
                  value={tanNumber}
                  onChange={(e) => setTanNumber(e.target.value.toUpperCase())}
                  maxLength={10}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleVerifyTds}
                  disabled={verifyTdsMutation.isPending}
                >
                  {verifyTdsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Verify
                </Button>
              </div>
            </div>

            {tdsResult && (
              <Card className="mt-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    TAN Verified
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">TAN</Label>
                      <p className="font-medium">{tdsResult.tan}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge variant={tdsResult.status === "Active" ? "default" : "destructive"}>
                        {tdsResult.status}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{tdsResult.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Category</Label>
                      <p className="font-medium">{tdsResult.category}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">PAN of Deductor</Label>
                      <p className="font-medium">{tdsResult.pan_of_deductor}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">AO Details</Label>
                      <p className="font-medium">{tdsResult.ao_details}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Credit Report Tab */}
          <TabsContent value="credit" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="credit-name">Name *</Label>
                <Input
                  id="credit-name"
                  placeholder="Enter full name"
                  value={creditName}
                  onChange={(e) => setCreditName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="credit-pan">PAN Number</Label>
                <Input
                  id="credit-pan"
                  placeholder="Enter PAN (e.g., ABCDE1234F)"
                  value={creditPan}
                  onChange={(e) => setCreditPan(e.target.value.toUpperCase())}
                  maxLength={10}
                />
              </div>
              <div>
                <Label htmlFor="credit-mobile">Mobile Number</Label>
                <Input
                  id="credit-mobile"
                  placeholder="Enter 10-digit mobile"
                  value={creditMobile}
                  onChange={(e) => setCreditMobile(e.target.value)}
                  maxLength={10}
                />
              </div>
              <div>
                <Label htmlFor="credit-dob">Date of Birth</Label>
                <Input
                  id="credit-dob"
                  placeholder="DD-MM-YYYY"
                  value={creditDob}
                  onChange={(e) => setCreditDob(e.target.value)}
                  maxLength={10}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="credit-address">Address</Label>
                <Input
                  id="credit-address"
                  placeholder="Enter full address"
                  value={creditAddress}
                  onChange={(e) => setCreditAddress(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="credit-pincode">Pincode</Label>
                <Input
                  id="credit-pincode"
                  placeholder="Enter 6-digit pincode"
                  value={creditPincode}
                  onChange={(e) => setCreditPincode(e.target.value)}
                  maxLength={6}
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleGetCreditReport}
                disabled={getCreditReportMutation.isPending}
              >
                {getCreditReportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Get Credit Report
              </Button>
              <Button 
                variant="outline"
                onClick={handleDownloadCreditPdf}
                disabled={getCreditReportPdfMutation.isPending}
              >
                {getCreditReportPdfMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
            </div>

            {creditResult && (
              <Card className="mt-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                    Credit Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{creditResult.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Credit Score</Label>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${
                          creditResult.credit_score >= 750 ? "text-green-500" :
                          creditResult.credit_score >= 650 ? "text-yellow-500" :
                          "text-red-500"
                        }`}>
                          {creditResult.credit_score}
                        </span>
                        <Badge variant={
                          creditResult.credit_score >= 750 ? "default" :
                          creditResult.credit_score >= 650 ? "secondary" :
                          "destructive"
                        }>
                          {creditResult.credit_score >= 750 ? "Excellent" :
                           creditResult.credit_score >= 650 ? "Good" :
                           creditResult.credit_score >= 550 ? "Fair" : "Poor"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {creditResult.credit_report && (
                    <Accordion type="single" collapsible className="mt-4">
                      <AccordionItem value="details">
                        <AccordionTrigger>View Full Report Details</AccordionTrigger>
                        <AccordionContent>
                          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
                            {JSON.stringify(creditResult.credit_report, null, 2)}
                          </pre>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
