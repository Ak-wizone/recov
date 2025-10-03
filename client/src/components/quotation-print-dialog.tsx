import { useQuery, useMutation } from "@tanstack/react-query";
import { Quotation, ProformaInvoice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer, Mail, X, Download, FileText } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import html2pdf from "html2pdf.js";
import { useState } from "react";
import { ProformaInvoicePrintDialog } from "./proforma-invoice-print-dialog";
import { useToast } from "@/hooks/use-toast";

interface QuotationItem {
  id: string;
  quotationId: string;
  itemId: string;
  itemName: string;
  quantity: string;
  unit: string;
  rate: string;
  discountPercent: string;
  taxPercent: string;
  amount: string;
  displayOrder: string;
}

interface CompanyProfile {
  id: string;
  logo: string | null;
  legalName: string;
  entityType: string;
  gstin: string | null;
  regAddressLine1: string;
  regAddressLine2: string | null;
  regCity: string;
  regState: string;
  regPincode: string;
  primaryContactName: string;
  primaryContactMobile: string;
  primaryContactEmail: string;
  bankName: string | null;
  branchName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  brandColor: string | null;
}

interface QuotationPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation | null;
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  
  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const hundreds = Math.floor((num % 1000) / 100);
  const remainder = Math.floor(num % 100);
  
  let words = '';
  
  if (crores > 0) {
    words += (crores < 10 ? ones[crores] : tens[Math.floor(crores / 10)] + ' ' + ones[crores % 10]) + ' Crore ';
  }
  if (lakhs > 0) {
    words += (lakhs < 10 ? ones[lakhs] : (lakhs < 20 ? teens[lakhs - 10] : tens[Math.floor(lakhs / 10)] + ' ' + ones[lakhs % 10])) + ' Lakh ';
  }
  if (thousands > 0) {
    words += (thousands < 10 ? ones[thousands] : (thousands < 20 ? teens[thousands - 10] : tens[Math.floor(thousands / 10)] + ' ' + ones[thousands % 10])) + ' Thousand ';
  }
  if (hundreds > 0) {
    words += ones[hundreds] + ' Hundred ';
  }
  if (remainder > 0) {
    if (remainder < 10) {
      words += ones[remainder];
    } else if (remainder < 20) {
      words += teens[remainder - 10];
    } else {
      words += tens[Math.floor(remainder / 10)] + ' ' + ones[remainder % 10];
    }
  }
  
  return 'INR ' + words.trim() + ' Only';
}

export function QuotationPrintDialog({ open, onOpenChange, quotation }: QuotationPrintDialogProps) {
  const [piDialogOpen, setPiDialogOpen] = useState(false);
  const [generatedPI, setGeneratedPI] = useState<ProformaInvoice | null>(null);
  const { toast } = useToast();

  const { data: items = [], isLoading: itemsLoading } = useQuery<QuotationItem[]>({
    queryKey: [`/api/quotations/${quotation?.id}/items`],
    enabled: !!quotation?.id && open,
  });

  const { data: profile, isLoading: profileLoading } = useQuery<CompanyProfile>({
    queryKey: ["/api/company-profile"],
    enabled: open,
  });

  const generatePIMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      const response = await fetch(`/api/quotations/${quotationId}/generate-pi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to generate proforma invoice");
      return response.json() as Promise<ProformaInvoice>;
    },
    onSuccess: (data: ProformaInvoice) => {
      setGeneratedPI(data);
      setPiDialogOpen(true);
      toast({
        title: "Proforma Invoice Generated",
        description: `PI ${data.invoiceNumber} has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate proforma invoice",
        variant: "destructive",
      });
    },
  });

  const handleGeneratePI = () => {
    if (quotation) {
      generatePIMutation.mutate(quotation.id);
    }
  };

  const handlePrint = () => {
    // Wait for content to render before printing
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleEmail = () => {
    if (quotation) {
      window.location.href = `mailto:${quotation.leadEmail}?subject=Quotation ${quotation.quotationNumber}`;
    }
  };

  const handleWhatsApp = () => {
    if (quotation) {
      const message = `Hi, please find your quotation ${quotation.quotationNumber} for ₹${quotation.grandTotal}`;
      window.open(`https://wa.me/${quotation.leadMobile.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleDownloadPDF = () => {
    if (!quotation) return;
    
    const element = document.querySelector('.print-content') as HTMLElement;
    if (!element) return;

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `Quotation-${quotation.quotationNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (!quotation) return null;

  const validUntilDate = new Date(quotation.validUntil);
  const isExpired = validUntilDate < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0" data-testid="dialog-print-preview">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-content, .print-content * {
              visibility: visible;
            }
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .no-print {
              display: none !important;
            }
            @page {
              margin: 0.5in;
              size: A4 portrait;
            }
          }
          
          .print-content {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            background: white;
            padding: 0.5in;
            box-sizing: border-box;
          }
        `}</style>

        {/* Action Bar - Not printed */}
        <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex justify-between items-center">
          <h3 className="font-semibold">Print Preview</h3>
          <div className="flex gap-2">
            <Button 
              onClick={handleGeneratePI} 
              size="sm" 
              className="gap-2" 
              style={{ backgroundColor: profile?.brandColor || "#ea580c" }}
              data-testid="button-generate-pi"
              disabled={generatePIMutation.isPending}
            >
              <FileText className="h-4 w-4" />
              {generatePIMutation.isPending ? "Generating..." : "Generate PI"}
            </Button>
            <Button 
              onClick={handlePrint} 
              size="sm" 
              variant="outline"
              className="gap-2" 
              data-testid="button-print-modal"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleDownloadPDF} size="sm" variant="outline" className="gap-2" data-testid="button-download-pdf-modal">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button onClick={handleEmail} size="sm" variant="outline" className="gap-2" data-testid="button-email-modal">
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button onClick={handleWhatsApp} size="sm" variant="outline" className="gap-2 text-green-600" data-testid="button-whatsapp-modal">
              <FaWhatsapp className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button onClick={() => onOpenChange(false)} size="sm" variant="ghost" data-testid="button-close-modal">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Print Content */}
        <div className="print-content bg-white">
          {(itemsLoading || profileLoading) ? (
            <Skeleton className="h-96 w-full" />
          ) : profile ? (
            <div className="relative">
              {/* Expired Ribbon */}
              {isExpired && (
                <div className="absolute top-0 left-0 w-24 h-24 overflow-hidden no-print">
                  <div className="absolute transform -rotate-45 bg-red-500 text-white text-center font-bold py-1 left-[-34px] top-[20px] w-40 shadow-md text-xs">
                    Expired
                  </div>
                </div>
              )}

              {/* Compact Header - Fits within 4 inches */}
              <div style={{ height: '4in' }} className="flex flex-col">
                {/* Top Bar with Brand Color */}
                <div 
                  className="h-1 w-full mb-3" 
                  style={{ backgroundColor: profile.brandColor || "#ea580c" }}
                ></div>
                
                {/* Header Row: Logo, Company Name, Quotation Title */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {profile.logo && (
                      <img src={profile.logo} alt="Logo" className="h-14 w-14 object-contain" />
                    )}
                    <div>
                      <h1 className="text-lg font-bold text-gray-800 leading-tight">{profile.legalName}</h1>
                      <p className="text-xs text-gray-600">{profile.entityType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 
                      className="text-xl font-bold" 
                      style={{ color: profile.brandColor || "#ea580c" }}
                    >
                      QUOTATION
                    </h2>
                    <p className="text-sm font-semibold text-gray-700">#{quotation.quotationNumber.split('-').pop()}</p>
                  </div>
                </div>

                {/* Two Column: Company Info & Client Info */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="text-xs">
                    <p className="font-bold text-gray-700 mb-1">From:</p>
                    <p className="text-gray-600">{profile.regAddressLine1}{profile.regAddressLine2 ? ', ' + profile.regAddressLine2 : ''}</p>
                    <p className="text-gray-600">{profile.regCity}, {profile.regState} {profile.regPincode}</p>
                    <p className="text-gray-600">Ph: +91{profile.primaryContactMobile} | {profile.primaryContactEmail}</p>
                    <p className="font-semibold text-gray-700 mt-1">GSTIN: {profile.gstin || 'N/A'}</p>
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-gray-700 mb-1">Bill To:</p>
                    <p className="font-semibold text-gray-800">{quotation.leadName}</p>
                    <p className="text-gray-600">{quotation.leadEmail}</p>
                    <p className="text-gray-600">{quotation.leadMobile}</p>
                  </div>
                </div>

                {/* Date Details Row */}
                <div className="grid grid-cols-3 gap-4 text-xs bg-gray-50 p-2 rounded">
                  <div>
                    <span className="font-semibold text-gray-700">Issue: </span>
                    <span className="text-gray-600">{new Date(quotation.quotationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Valid: </span>
                    <span className="text-gray-600">{new Date(quotation.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Place: </span>
                    <span className="text-gray-600">{profile.regState}</span>
                  </div>
                </div>
              </div>

              {/* Compact Items Table */}
              <div className="mb-4">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-white" style={{ backgroundColor: profile.brandColor || "#ea580c" }}>
                      <th className="px-2 py-2 text-left">No</th>
                      <th className="px-2 py-2 text-left">Item</th>
                      <th className="px-2 py-2 text-center">HSN</th>
                      <th className="px-2 py-2 text-center">Qty</th>
                      <th className="px-2 py-2 text-right">Rate</th>
                      <th className="px-2 py-2 text-right">Taxable</th>
                      <th className="px-2 py-2 text-right">IGST</th>
                      <th className="px-2 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const qty = parseFloat(item.quantity || "0");
                      const rate = parseFloat(item.rate || "0");
                      const discount = parseFloat(item.discountPercent || "0");
                      const tax = parseFloat(item.taxPercent || "0");
                      
                      const subtotal = qty * rate;
                      const discountAmount = (subtotal * discount) / 100;
                      const taxableValue = subtotal - discountAmount;
                      const taxAmount = (taxableValue * tax) / 100;
                      const totalAmount = taxableValue + taxAmount;
                      
                      return (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td className="px-2 py-2 text-gray-600">{index + 1}</td>
                          <td className="px-2 py-2 font-semibold text-gray-800">{item.itemName}</td>
                          <td className="px-2 py-2 text-center text-gray-600">-</td>
                          <td className="px-2 py-2 text-center text-gray-600">{item.quantity} {item.unit}</td>
                          <td className="px-2 py-2 text-right text-gray-700">₹{rate.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-gray-700">₹{taxableValue.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-gray-700">₹{taxAmount.toFixed(2)}<br/><span className="text-[10px]">@{tax}%</span></td>
                          <td className="px-2 py-2 text-right font-bold">₹{totalAmount.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Compact Summary */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs">
                    <span className="font-semibold">Amount in Words: </span>
                    <span className="text-gray-700">{numberToWords(Math.round(parseFloat(quotation.grandTotal)))}</span>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold">₹{parseFloat(quotation.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">IGST @{items[0] ? items[0].taxPercent : '0'}%:</span>
                      <span className="font-semibold">₹{parseFloat(quotation.totalTax).toFixed(2)}</span>
                    </div>
                    <div 
                      className="flex justify-between gap-4 text-white font-bold py-1 px-2 rounded mt-1"
                      style={{ backgroundColor: profile.brandColor || "#ea580c" }}
                    >
                      <span>TOTAL:</span>
                      <span>₹{Math.round(parseFloat(quotation.grandTotal)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Terms & Banking Side by Side */}
              <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-gray-300">
                {/* Terms & Conditions */}
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase mb-2">Terms & Conditions</p>
                  {quotation.termsAndConditions ? (
                    <div className="text-[10px] text-gray-600 whitespace-pre-wrap leading-relaxed">{quotation.termsAndConditions}</div>
                  ) : (
                    <p className="text-[10px] text-gray-500">No terms specified</p>
                  )}
                </div>

                {/* Banking Details */}
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase mb-2">Banking Information</p>
                  {(profile.bankName || profile.accountNumber) ? (
                    <div className="text-[10px] space-y-1">
                      <p><span className="font-semibold">Bank:</span> {profile.bankName || '-'}</p>
                      <p><span className="font-semibold">Branch:</span> {profile.branchName || '-'}</p>
                      <p><span className="font-semibold">Account:</span> {profile.accountName || '-'}</p>
                      <p><span className="font-semibold">A/C No:</span> {profile.accountNumber || '-'}</p>
                      <p><span className="font-semibold">IFSC:</span> {profile.ifscCode || '-'}</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500">No banking details</p>
                  )}
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center text-[10px] text-gray-500 mt-2">
                This is a computer-generated quotation and does not require a signature.
              </div>
            </div>
          ) : (
            <p className="text-center text-red-600">Unable to load company profile</p>
          )}
        </div>
      </DialogContent>

      {/* Proforma Invoice Print Dialog */}
      {generatedPI && (
        <ProformaInvoicePrintDialog
          open={piDialogOpen}
          onOpenChange={setPiDialogOpen}
          invoice={generatedPI}
        />
      )}
    </Dialog>
  );
}
