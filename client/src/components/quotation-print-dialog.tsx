import { useQuery } from "@tanstack/react-query";
import { Quotation } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer, Mail, X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

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
  companyName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  logoUrl: string | null;
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
    window.print();
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
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Action Bar - Not printed */}
        <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex justify-between items-center">
          <h3 className="font-semibold">Print Preview</h3>
          <div className="flex gap-2">
            <Button onClick={handlePrint} size="sm" className="gap-2 bg-orange-500 hover:bg-orange-600" data-testid="button-print-modal">
              <Printer className="h-4 w-4" />
              Print
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

              {/* Header Section */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  {profile.logoUrl && (
                    <img src={profile.logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
                  )}
                  <div>
                    <h1 className="text-xl font-bold">{profile.companyName}</h1>
                  </div>
                </div>
                <div className="text-center flex-1">
                  <h2 className="text-2xl font-bold">QUOTATION</h2>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">#{quotation.quotationNumber}</p>
                </div>
              </div>

              {/* Amount Due Bar */}
              <div className="bg-orange-500 text-white px-4 py-2 mb-4 flex justify-between items-center">
                <span className="font-semibold">Amount Due:</span>
                <span className="text-xl font-bold">INR {parseFloat(quotation.grandTotal).toFixed(2)}</span>
              </div>

              {/* Company and Client Details */}
              <div className="grid grid-cols-2 gap-8 mb-4">
                <div>
                  <p className="font-bold text-sm mb-1">{profile.companyName}</p>
                  <p className="text-xs">{profile.address}</p>
                  <p className="text-xs">{profile.city}, {profile.state} {profile.pincode}, IN</p>
                  <p className="text-xs">+91{profile.phone}</p>
                  <p className="text-xs">{profile.email}</p>
                  <p className="text-xs font-semibold mt-1">GSTIN: {profile.gstin || '-'}</p>
                </div>
                <div className="text-right text-xs">
                  <div className="mb-3">
                    <p className="mb-1"><span className="inline-block w-24 text-left">Issue Date:</span> {new Date(quotation.quotationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p className="mb-1"><span className="inline-block w-24 text-left">Valid Until:</span> {new Date(quotation.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p><span className="inline-block w-24 text-left">Place of Supply:</span> {profile.state}</p>
                  </div>
                </div>
              </div>

              {/* Quote To Section */}
              <div className="mb-4">
                <p className="font-bold text-sm mb-1">Quote To</p>
                <p className="font-semibold text-sm">{quotation.leadName}</p>
                <p className="text-xs">{quotation.leadEmail}</p>
                <p className="text-xs">{quotation.leadMobile}</p>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse mb-4 text-xs">
                <thead>
                  <tr className="bg-orange-500 text-white">
                    <th className="border border-gray-300 px-2 py-2 text-left">S.No</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Item<br/>Description</th>
                    <th className="border border-gray-300 px-2 py-2 text-center">HSN/SAC</th>
                    <th className="border border-gray-300 px-2 py-2 text-center">Qty<br/>UoM</th>
                    <th className="border border-gray-300 px-2 py-2 text-right">Price<br/>(INR)</th>
                    <th className="border border-gray-300 px-2 py-2 text-right">Taxable Value<br/>(INR)</th>
                    <th className="border border-gray-300 px-2 py-2 text-right">IGST<br/>(INR)</th>
                    <th className="border border-gray-300 px-2 py-2 text-right">Amount<br/>(INR)</th>
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
                        <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                        <td className="border border-gray-300 px-2 py-2">
                          <div className="font-semibold">{item.itemName}</div>
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center">-</td>
                        <td className="border border-gray-300 px-2 py-2 text-center">{item.quantity}<br/>{item.unit}</td>
                        <td className="border border-gray-300 px-2 py-2 text-right">{rate.toFixed(2)}</td>
                        <td className="border border-gray-300 px-2 py-2 text-right">{taxableValue.toFixed(2)}</td>
                        <td className="border border-gray-300 px-2 py-2 text-right">
                          {taxAmount.toFixed(2)}
                          {tax > 0 && <div className="text-[10px]">{tax}%</div>}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-right font-semibold">{totalAmount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="flex justify-end mb-4">
                <div className="w-96">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total @{items[0] ? items[0].taxPercent : '0'}%</span>
                    <span>{parseFloat(quotation.subtotal).toFixed(2)}</span>
                    <span>{parseFloat(quotation.totalTax).toFixed(2)}</span>
                    <span className="font-semibold">{parseFloat(quotation.grandTotal).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="border-t-2 border-gray-300 pt-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">Total Taxable Value</span>
                  <span className="font-semibold">INR {parseFloat(quotation.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">Rounded Off</span>
                  <span className="font-semibold">(-) INR {(parseFloat(quotation.grandTotal) - Math.round(parseFloat(quotation.grandTotal))).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
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
                <div className="mt-6 border-t-2 border-gray-300 pt-3">
                  <p className="font-bold text-sm mb-2">Terms & Conditions</p>
                  <div className="text-xs whitespace-pre-wrap italic">{quotation.termsAndConditions}</div>
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
