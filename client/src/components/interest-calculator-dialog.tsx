import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";
import { format } from "date-fns";

interface InterestCalculatorDialogProps {
  invoiceId: string | null;
  onClose: () => void;
}

interface CompanyProfile {
  companyName: string;
  logoUrl?: string;
  brandColor?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface InterestBreakdown {
  invoice: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    invoiceDate: string;
    invoiceAmount: number;
    gp: number;
    interestRate: number;
    interestApplicableFrom: string;
    paymentTerms: number;
    dueDate: string;
    applicableDate: string;
    status: string;
  };
  allocation: {
    paidAmount: number;
    unpaidAmount: number;
    receiptAllocations: Array<{
      receiptId: string;
      voucherNumber: string;
      receiptDate: string;
      receiptAmount: number;
      allocatedAmount: number;
      daysFromDue: number;
      interestRate: number;
      interestAmount: number;
    }>;
    unpaidInterest: number;
  };
  calculation: {
    baseGp: number;
    totalInterestFromReceipts: number;
    totalInterestFromUnpaid: number;
    totalInterest: number;
    finalGp: number;
    finalGpPercentage: number;
  };
}

export function InterestCalculatorDialog({ invoiceId, onClose }: InterestCalculatorDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<CompanyProfile>({
    queryKey: ["/api/company-profile"],
    enabled: !!invoiceId,
  });

  const { data: breakdown, isLoading: breakdownLoading } = useQuery<InterestBreakdown>({
    queryKey: [`/api/invoices/${invoiceId}/interest-breakdown`],
    enabled: !!invoiceId,
  });

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  if (!invoiceId) return null;

  const isLoading = profileLoading || breakdownLoading;
  const brandColor = profile?.brandColor || "#2563eb";

  const getStatusColor = (daysFromDue: number) => {
    if (daysFromDue < 0) return "text-green-600 dark:text-green-400";
    if (daysFromDue <= 30) return "text-yellow-600 dark:text-yellow-400";
    if (daysFromDue <= 60) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getStatusBadge = (daysFromDue: number) => {
    if (daysFromDue < 0) return { label: "Early", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" };
    if (daysFromDue <= 30) return { label: "On Time", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" };
    if (daysFromDue <= 60) return { label: "Delayed", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" };
    return { label: "Overdue", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" };
  };

  return (
    <Dialog open={!!invoiceId} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Interest Calculation Breakdown</DialogTitle>
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: brandColor }}></div>
          </div>
        ) : !breakdown ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">Failed to load interest breakdown data</div>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-6" id="interest-calculator-content">
            {/* Company Header */}
            <div 
              className="p-6 rounded-lg text-white print:rounded-none"
              style={{ backgroundColor: brandColor }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {profile?.logoUrl && (
                    <img 
                      src={profile.logoUrl} 
                      alt="Company Logo" 
                      className="h-16 w-16 bg-white rounded p-1 object-contain"
                    />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold">{profile?.companyName || "Interest Calculation"}</h1>
                    {profile?.address && <p className="text-sm opacity-90 mt-1">{profile.address}</p>}
                    <div className="flex gap-4 text-sm opacity-90 mt-1">
                      {profile?.phone && <span>📞 {profile.phone}</span>}
                      {profile?.email && <span>✉️ {profile.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-90">Generated on</p>
                  <p className="font-semibold">{format(new Date(), "MMM dd, yyyy hh:mm a")}</p>
                </div>
              </div>
            </div>

            {/* Customer & Invoice Details */}
            <div className="grid grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3" style={{ color: brandColor }}>Customer Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Customer Name:</span>
                    <span className="font-medium">{breakdown.invoice.customerName}</span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3" style={{ color: brandColor }}>Invoice Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Invoice #:</span>
                    <span className="font-medium">{breakdown.invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="font-medium">{format(new Date(breakdown.invoice.invoiceDate), "MMM dd, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                    <span className="font-medium">{format(new Date(breakdown.invoice.dueDate), "MMM dd, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Payment Terms:</span>
                    <span className="font-medium">{breakdown.invoice.paymentTerms} days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3" style={{ color: brandColor }}>Invoice Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Invoice Amount</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ₹{breakdown.invoice.invoiceAmount.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Base G.P.</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ₹{breakdown.calculation.baseGp.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Interest Rate</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {breakdown.invoice.interestRate}% p.a.
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                Interest Applicable From: <span className="font-medium">{breakdown.invoice.interestApplicableFrom}</span>
              </p>
            </div>

            {/* Receipt Allocation Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="p-4" style={{ backgroundColor: brandColor + "15" }}>
                <h3 className="font-semibold text-lg" style={{ color: brandColor }}>Receipt Allocation Breakdown (FIFO)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  First-In-First-Out allocation showing how each receipt contributes to this invoice
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Receipt Date</th>
                      <th className="px-4 py-3 text-right font-medium">Receipt Amount</th>
                      <th className="px-4 py-3 text-right font-medium">Allocated Amount</th>
                      <th className="px-4 py-3 text-center font-medium">Days from Due</th>
                      <th className="px-4 py-3 text-center font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Interest Calculated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {breakdown.allocation.receiptAllocations.map((allocation, index) => {
                      const status = getStatusBadge(allocation.daysFromDue);
                      return (
                        <tr key={allocation.receiptId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3">{format(new Date(allocation.receiptDate), "MMM dd, yyyy")}</td>
                          <td className="px-4 py-3 text-right">₹{allocation.receiptAmount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium">₹{allocation.allocatedAmount.toFixed(2)}</td>
                          <td className={`px-4 py-3 text-center font-medium ${getStatusColor(allocation.daysFromDue)}`}>
                            {allocation.daysFromDue > 0 ? `+${allocation.daysFromDue}` : allocation.daysFromDue} days
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-600 dark:text-orange-400">
                            ₹{allocation.interestAmount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Unpaid Balance Row */}
                    {breakdown.allocation.unpaidAmount > 0 && (
                      <tr className="bg-red-50 dark:bg-red-900/20 font-medium">
                        <td className="px-4 py-3">
                          <span className="text-red-600 dark:text-red-400">UNPAID BALANCE</span>
                        </td>
                        <td className="px-4 py-3 text-right">—</td>
                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                          ₹{breakdown.allocation.unpaidAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">
                          +{Math.floor((new Date().getTime() - new Date(breakdown.invoice.applicableDate).getTime()) / (1000 * 60 * 60 * 24))} days
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            Overdue
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                          ₹{breakdown.allocation.unpaidInterest.toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Final Calculation Summary */}
            <div className="border-2 rounded-lg p-6" style={{ borderColor: brandColor }}>
              <h3 className="font-semibold text-xl mb-4 text-center" style={{ color: brandColor }}>
                Final G.P. Calculation
              </h3>
              
              <div className="space-y-3 max-w-2xl mx-auto">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">Base G.P.</span>
                  <span className="text-lg font-semibold">₹{breakdown.calculation.baseGp.toFixed(2)}</span>
                </div>
                
                {breakdown.calculation.totalInterestFromReceipts > 0 && (
                  <div className="flex justify-between items-center py-2 text-orange-600 dark:text-orange-400">
                    <span>Less: Interest on Paid Amount</span>
                    <span className="text-lg font-semibold">- ₹{breakdown.calculation.totalInterestFromReceipts.toFixed(2)}</span>
                  </div>
                )}
                
                {breakdown.calculation.totalInterestFromUnpaid > 0 && (
                  <div className="flex justify-between items-center py-2 text-red-600 dark:text-red-400">
                    <span>Less: Interest on Unpaid Amount</span>
                    <span className="text-lg font-semibold">- ₹{breakdown.calculation.totalInterestFromUnpaid.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t-2 pt-3 mt-3" style={{ borderColor: brandColor }}>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-400">Total Interest Deducted</span>
                    <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                      ₹{breakdown.calculation.totalInterest.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="border-t-2 pt-3" style={{ borderColor: brandColor, borderWidth: '3px' }}>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xl font-bold" style={{ color: brandColor }}>FINAL G.P.</span>
                    <span className="text-2xl font-bold" style={{ color: brandColor }}>
                      ₹{breakdown.calculation.finalGp.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-lg font-semibold" style={{ color: brandColor }}>FINAL G.P. %</span>
                    <span className="text-xl font-bold" style={{ color: brandColor }}>
                      {breakdown.calculation.finalGpPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Formula Explanation */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm">
              <h4 className="font-semibold mb-2">Calculation Formula:</h4>
              <p className="text-gray-600 dark:text-gray-400 font-mono">
                Interest = (Amount × Rate × Days) / (100 × 365)
              </p>
              <p className="text-gray-600 dark:text-gray-400 font-mono mt-1">
                Final G.P. = Base G.P. - Total Interest
              </p>
              <p className="text-gray-600 dark:text-gray-400 font-mono mt-1">
                Final G.P. % = (Final G.P. / Invoice Amount) × 100
              </p>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #interest-calculator-content,
          #interest-calculator-content * {
            visibility: visible;
          }
          #interest-calculator-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
