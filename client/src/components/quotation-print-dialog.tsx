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
        <div className="print-content bg-white p-8">
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

              {/* Header Section - Logo and Quotation Number */}
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-start gap-4">
                  {profile.logo && (
                    <img src={profile.logo} alt="Logo" className="h-20 w-20 object-contain" />
                  )}
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold">QUOTATION -{quotation.quotationNumber.split('-').pop()}</h2>
                </div>
              </div>

              {/* Company Information */}
              <div className="mb-6">
                <p className="font-bold text-lg mb-2">{profile.legalName}</p>
                <p className="text-base">{profile.regAddressLine1}</p>
                {profile.regAddressLine2 && <p className="text-base">{profile.regAddressLine2}</p>}
                <p className="text-base">{profile.regCity}, {profile.regState} {profile.regPincode}, IN</p>
                <p className="text-base">+91{profile.primaryContactMobile}</p>
                <p className="text-base">{profile.primaryContactEmail}</p>
                <p className="text-base font-semibold mt-2">GSTIN: {profile.gstin || '-'}</p>
              </div>

              {/* Quote To Section */}
              <div className="mb-6">
                <p className="font-bold text-base mb-2">Quote To</p>
                <p className="font-semibold text-base">{quotation.leadName}</p>
                <p className="text-base">{quotation.leadEmail}</p>
                <p className="text-base">{quotation.leadMobile}</p>
              </div>

              {/* Quotation Details - Issue Date, Valid Until, Place of Supply */}
              <div className="mb-6 text-base">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="font-semibold">Issue Date:</p>
                    <p>{new Date(quotation.quotationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Valid Until:</p>
                    <p>{new Date(quotation.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Place of Supply:</p>
                    <p>{profile.regState}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse mb-6 text-sm">
                <thead>
                  <tr className="text-white" style={{ backgroundColor: profile.brandColor || "#ea580c" }}>
                    <th className="border border-gray-300 px-3 py-3 text-left">S.No</th>
                    <th className="border border-gray-300 px-3 py-3 text-left">Item<br/>Description</th>
                    <th className="border border-gray-300 px-3 py-3 text-center">HSN/SAC</th>
                    <th className="border border-gray-300 px-3 py-3 text-center">Qty<br/>UoM</th>
                    <th className="border border-gray-300 px-3 py-3 text-right">Price<br/>(INR)</th>
                    <th className="border border-gray-300 px-3 py-3 text-right">Taxable Value<br/>(INR)</th>
                    <th className="border border-gray-300 px-3 py-3 text-right">IGST<br/>(INR)</th>
                    <th className="border border-gray-300 px-3 py-3 text-right">Amount<br/>(INR)</th>
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
                      <tr key={item.id}>
                        <td className="border border-gray-300 px-3 py-3">{index + 1}</td>
                        <td className="border border-gray-300 px-3 py-3">
                          <div className="font-semibold">{item.itemName}</div>
                        </td>
                        <td className="border border-gray-300 px-3 py-3 text-center">-</td>
                        <td className="border border-gray-300 px-3 py-3 text-center">{item.quantity}<br/>{item.unit}</td>
                        <td className="border border-gray-300 px-3 py-3 text-right">{rate.toFixed(2)}</td>
                        <td className="border border-gray-300 px-3 py-3 text-right">{taxableValue.toFixed(2)}</td>
                        <td className="border border-gray-300 px-3 py-3 text-right">
                          {taxAmount.toFixed(2)}
                          {tax > 0 && <div className="text-xs">{tax}%</div>}
                        </td>
                        <td className="border border-gray-300 px-3 py-3 text-right font-semibold">{totalAmount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="flex justify-end mb-6">
                <div className="w-96">
                  <div className="flex justify-between text-base mb-2">
                    <span>Total @{items[0] ? items[0].taxPercent : '0'}%</span>
                    <span>{parseFloat(quotation.subtotal).toFixed(2)}</span>
                    <span>{parseFloat(quotation.totalTax).toFixed(2)}</span>
                    <span className="font-semibold">{parseFloat(quotation.grandTotal).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="border-t-2 border-gray-300 pt-4 text-base">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Total Taxable Value</span>
                  <span className="font-semibold">INR {parseFloat(quotation.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Rounded Off</span>
                  <span className="font-semibold">(-) INR {(parseFloat(quotation.grandTotal) - Math.round(parseFloat(quotation.grandTotal))).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Total Value (in figure)</span>
                  <span className="font-semibold">INR {Math.round(parseFloat(quotation.grandTotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Total Value (in words)</span>
                  <span className="font-semibold">{numberToWords(Math.round(parseFloat(quotation.grandTotal)))}</span>
                </div>
              </div>

              {/* Terms & Conditions */}
              {quotation.termsAndConditions && (
                <div className="mt-6 border-t-2 border-gray-300 pt-4">
                  <p className="font-bold text-base mb-3">Terms & Conditions</p>
                  <div className="text-sm whitespace-pre-wrap italic">{quotation.termsAndConditions}</div>
                </div>
              )}

              {/* Banking Details Footer */}
              {(profile.bankName || profile.accountNumber) && (
                <div className="mt-6 border-t-2 border-gray-300 pt-4">
                  <p className="font-bold text-base mb-3">Banking Details</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="font-semibold">Bank Name:</span> {profile.bankName || '-'}</p>
                      <p><span className="font-semibold">Branch:</span> {profile.branchName || '-'}</p>
                    </div>
                    <div>
                      <p><span className="font-semibold">Account Name:</span> {profile.accountName || '-'}</p>
                      <p><span className="font-semibold">Account Number:</span> {profile.accountNumber || '-'}</p>
                      <p><span className="font-semibold">IFSC Code:</span> {profile.ifscCode || '-'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-red-600">Unable to load company profile</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
