import { useQuery } from "@tanstack/react-query";
import { Quotation } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer, Mail, X, Download } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import html2pdf from "html2pdf.js";

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
  const { data: items = [], isLoading: itemsLoading } = useQuery<QuotationItem[]>({
    queryKey: [`/api/quotations/${quotation?.id}/items`],
    enabled: !!quotation?.id && open,
  });

  const { data: profile, isLoading: profileLoading } = useQuery<CompanyProfile>({
    queryKey: ["/api/company-profile"],
    enabled: open,
  });

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
              margin: 15mm;
              size: A4 portrait;
            }
          }
          
          .print-content {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
          }
        `}</style>

        {/* Action Bar - Not printed */}
        <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex justify-between items-center">
          <h3 className="font-semibold">Print Preview</h3>
          <div className="flex gap-2">
            <Button 
              onClick={handlePrint} 
              size="sm" 
              className="gap-2" 
              style={{ backgroundColor: profile?.brandColor || "#ea580c" }}
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
        <div className="print-content bg-white p-12">
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

              {/* Professional Header with Brand Color Bar */}
              <div className="mb-8">
                <div 
                  className="h-2 w-full mb-6" 
                  style={{ backgroundColor: profile.brandColor || "#ea580c" }}
                ></div>
                
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-6">
                    {profile.logo && (
                      <img src={profile.logo} alt="Logo" className="h-24 w-24 object-contain" />
                    )}
                    <div>
                      <h1 className="text-3xl font-bold text-gray-800">{profile.legalName}</h1>
                      <p className="text-sm text-gray-600 mt-1">{profile.entityType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 
                      className="text-3xl font-bold mb-1" 
                      style={{ color: profile.brandColor || "#ea580c" }}
                    >
                      QUOTATION
                    </h2>
                    <p className="text-xl font-semibold text-gray-700">#{quotation.quotationNumber.split('-').pop()}</p>
                  </div>
                </div>
              </div>

              {/* Two Column Layout - Company & Client Info */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                {/* From Section */}
                <div className="border-l-4 pl-4" style={{ borderColor: profile.brandColor || "#ea580c" }}>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-3">From</p>
                  <p className="text-sm font-medium text-gray-600">{profile.regAddressLine1}</p>
                  {profile.regAddressLine2 && <p className="text-sm text-gray-600">{profile.regAddressLine2}</p>}
                  <p className="text-sm text-gray-600">{profile.regCity}, {profile.regState} {profile.regPincode}</p>
                  <p className="text-sm text-gray-600 mt-2">Phone: +91{profile.primaryContactMobile}</p>
                  <p className="text-sm text-gray-600">Email: {profile.primaryContactEmail}</p>
                  <p className="text-sm font-semibold text-gray-700 mt-3">GSTIN: {profile.gstin || 'N/A'}</p>
                </div>

                {/* To Section */}
                <div className="border-l-4 border-gray-300 pl-4">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-3">Bill To</p>
                  <p className="text-base font-bold text-gray-800">{quotation.leadName}</p>
                  <p className="text-sm text-gray-600 mt-2">{quotation.leadEmail}</p>
                  <p className="text-sm text-gray-600">{quotation.leadMobile}</p>
                </div>
              </div>

              {/* Quotation Details Bar */}
              <div className="bg-gray-50 rounded-lg p-4 mb-8">
                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Issue Date</p>
                    <p className="font-semibold text-gray-800">{new Date(quotation.quotationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Valid Until</p>
                    <p className="font-semibold text-gray-800">{new Date(quotation.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Place of Supply</p>
                    <p className="font-semibold text-gray-800">{profile.regState}</p>
                  </div>
                </div>
              </div>

              {/* Items Table - Modern Design */}
              <div className="mb-8">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-white text-sm" style={{ backgroundColor: profile.brandColor || "#ea580c" }}>
                      <th className="px-4 py-3 text-left font-semibold">S.No</th>
                      <th className="px-4 py-3 text-left font-semibold">Item Description</th>
                      <th className="px-4 py-3 text-center font-semibold">HSN/SAC</th>
                      <th className="px-4 py-3 text-center font-semibold">Qty/UoM</th>
                      <th className="px-4 py-3 text-right font-semibold">Rate</th>
                      <th className="px-4 py-3 text-right font-semibold">Taxable</th>
                      <th className="px-4 py-3 text-right font-semibold">IGST</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
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
                        <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-800">{item.itemName}</div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">-</td>
                          <td className="px-4 py-3 text-center text-gray-600">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">₹{rate.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">₹{taxableValue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            ₹{taxAmount.toFixed(2)}
                            {tax > 0 && <div className="text-xs text-gray-500">@{tax}%</div>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">₹{totalAmount.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Grid */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Left Side - Amount in Words */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Amount in Words</p>
                  <p className="text-sm font-semibold text-gray-800">{numberToWords(Math.round(parseFloat(quotation.grandTotal)))}</p>
                </div>

                {/* Right Side - Summary */}
                <div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-semibold">₹{parseFloat(quotation.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>IGST @{items[0] ? items[0].taxPercent : '0'}%</span>
                      <span className="font-semibold">₹{parseFloat(quotation.totalTax).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Round Off</span>
                      <span className="font-semibold">{(parseFloat(quotation.grandTotal) - Math.round(parseFloat(quotation.grandTotal))).toFixed(2)}</span>
                    </div>
                    <div 
                      className="flex justify-between text-white text-lg font-bold py-3 px-4 rounded-lg mt-3"
                      style={{ backgroundColor: profile.brandColor || "#ea580c" }}
                    >
                      <span>TOTAL</span>
                      <span>₹{Math.round(parseFloat(quotation.grandTotal)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions - Modern Card */}
              {quotation.termsAndConditions && (
                <div className="mb-6 bg-gray-50 rounded-lg p-6 border-l-4" style={{ borderColor: profile.brandColor || "#ea580c" }}>
                  <p className="text-sm font-bold text-gray-700 uppercase mb-3">Terms & Conditions</p>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{quotation.termsAndConditions}</div>
                </div>
              )}

              {/* Banking Details - Professional Footer */}
              {(profile.bankName || profile.accountNumber) && (
                <div className="bg-gray-100 rounded-lg p-6 border-t-4" style={{ borderColor: profile.brandColor || "#ea580c" }}>
                  <p className="text-sm font-bold text-gray-700 uppercase mb-4">Banking Information</p>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Bank Name</p>
                        <p className="font-semibold text-gray-800">{profile.bankName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Branch</p>
                        <p className="font-semibold text-gray-800">{profile.branchName || '-'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Account Name</p>
                        <p className="font-semibold text-gray-800">{profile.accountName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Account Number</p>
                        <p className="font-semibold text-gray-800">{profile.accountNumber || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">IFSC Code</p>
                        <p className="font-semibold text-gray-800">{profile.ifscCode || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional Footer Bar */}
              <div className="mt-8 pt-6 border-t border-gray-300">
                <p className="text-center text-xs text-gray-500">
                  This is a computer-generated quotation and does not require a signature.
                </p>
                <div 
                  className="h-1 w-24 mx-auto mt-4" 
                  style={{ backgroundColor: profile.brandColor || "#ea580c" }}
                ></div>
              </div>
            </div>
          ) : (
            <p className="text-center text-red-600">Unable to load company profile</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
