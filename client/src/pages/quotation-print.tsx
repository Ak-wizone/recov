import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Quotation } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer, Mail } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
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

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  
  const numStr = Math.floor(num).toString();
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
  
  return words.trim() + ' Rupees Only';
}

export default function QuotationPrint() {
  const params = useParams();
  const quotationId = params.id;

  const { data: quotation, isLoading: quotationLoading } = useQuery<Quotation>({
    queryKey: ["/api/quotations", quotationId],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<QuotationItem[]>({
    queryKey: [`/api/quotations/${quotationId}/items`],
    enabled: !!quotationId,
  });

  const { data: profile, isLoading: profileLoading } = useQuery<CompanyProfile>({
    queryKey: ["/api/company-profile"],
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

  if (quotationLoading || itemsLoading || profileLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!quotation || !profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Quotation not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Action Buttons - Hidden when printing */}
      <div className="print:hidden bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-end gap-2">
          <Button onClick={handlePrint} className="gap-2" data-testid="button-print">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleEmail} variant="outline" className="gap-2" data-testid="button-email">
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button onClick={handleWhatsApp} variant="outline" className="gap-2 text-green-600 hover:text-green-700" data-testid="button-whatsapp">
            <FaWhatsapp className="h-4 w-4" />
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Printable Content */}
      <div className="container mx-auto p-8 max-w-5xl">
        <div className="bg-white shadow-lg print:shadow-none">
          {/* Header */}
          <div className="border-b-2 border-gray-900 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {profile.logoUrl && (
                  <img src={profile.logoUrl} alt="Company Logo" className="h-16 w-16 object-contain" />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{profile.companyName}</h1>
                  <p className="text-sm text-gray-600 mt-1">{profile.address}</p>
                  <p className="text-sm text-gray-600">{profile.city}, {profile.state} - {profile.pincode}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quotation Info and Bill To */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h2 className="text-xl font-bold mb-3">QUOTATION</h2>
              <div className="space-y-1 text-sm">
                <div className="flex">
                  <span className="font-semibold w-32">Quotation No:</span>
                  <span>{quotation.quotationNumber}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-32">Date:</span>
                  <span>{new Date(quotation.quotationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-32">Valid Until:</span>
                  <span>{new Date(quotation.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <h3 className="font-bold mb-3">BILL TO:</h3>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{quotation.leadName}</p>
                {quotation.leadEmail && <p>Attn: {quotation.leadEmail.split('@')[0]}</p>}
                {quotation.leadEmail && <p>Email: {quotation.leadEmail}</p>}
                {quotation.leadMobile && <p>Phone: {quotation.leadMobile}</p>}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-y border-gray-900">
                  <th className="text-left py-2 px-2 text-sm font-semibold">Sr. No.</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold">Description</th>
                  <th className="text-center py-2 px-2 text-sm font-semibold">Unit</th>
                  <th className="text-center py-2 px-2 text-sm font-semibold">Qty</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold">Rate (₹)</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const qty = parseFloat(item.quantity || "0");
                  const rate = parseFloat(item.rate || "0");
                  const amount = qty * rate;
                  
                  return (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-2 px-2 text-sm">{index + 1}</td>
                      <td className="py-2 px-2 text-sm">{item.itemName}</td>
                      <td className="py-2 px-2 text-sm text-center">{item.unit}</td>
                      <td className="py-2 px-2 text-sm text-center">{item.quantity}</td>
                      <td className="py-2 px-2 text-sm text-right">₹{rate.toFixed(2)}</td>
                      <td className="py-2 px-2 text-sm text-right">₹{amount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-80 border border-gray-900">
              <div className="flex justify-between px-4 py-2 border-b border-gray-300">
                <span className="font-semibold">Subtotal:</span>
                <span>₹{parseFloat(quotation.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(quotation.totalTax) > 0 && (
                <div className="flex justify-between px-4 py-2 border-b border-gray-300">
                  <span className="font-semibold">Tax (GST):</span>
                  <span>₹{parseFloat(quotation.totalTax).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-2 bg-gray-100 font-bold">
                <span>Total Amount:</span>
                <span>₹{parseFloat(quotation.grandTotal).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="border border-gray-900 p-3 mb-6">
            <div className="flex gap-2">
              <span className="font-semibold">Amount in Words:</span>
              <span className="italic">{numberToWords(parseFloat(quotation.grandTotal))}</span>
            </div>
          </div>

          {/* Terms & Conditions */}
          {quotation.termsAndConditions && (
            <div className="border border-gray-900 p-4 mb-6">
              <h3 className="font-bold mb-2">Terms & Conditions</h3>
              <div className="text-sm whitespace-pre-wrap">{quotation.termsAndConditions}</div>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-16 mb-6">
            <div className="text-center">
              <div className="border-t border-gray-900 pt-2 inline-block min-w-[200px]">
                <p className="font-semibold">Customer Signature</p>
                <p className="text-sm text-gray-600">Date: _______</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-900 pt-2 inline-block min-w-[200px]">
                <p className="font-semibold">Authorized Signatory</p>
                <p className="text-sm">{profile.companyName}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center border-t-2 border-gray-900 pt-4 mt-6">
            <p className="font-bold text-lg">Thank you for your business!</p>
            <p className="text-sm text-gray-600 mt-2">{profile.companyName}</p>
            <p className="text-sm text-gray-600">
              For any queries, please contact us at {profile.email} | {profile.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
