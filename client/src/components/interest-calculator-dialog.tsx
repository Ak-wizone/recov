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
      isDueDateRow?: boolean;
      message?: string;
      receiptId?: string;
      voucherNumber?: string;
      receiptDate: string;
      receiptAmount?: number;
      balanceAmount: number;
      balanceBeforeReceipt?: number;
      daysInPeriod?: number;
      interestRate?: number;
      interestAmount?: number;
      status?: string;
    }>;
    totalReceiptAmount: number;
    totalInterest: number;
  };
  calculation: {
    baseGp: number;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "On Time":
        return { label: "On Time", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" };
      case "Delayed":
        return { label: "Delayed", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" };
      case "Overdue":
        return { label: "Overdue", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" };
      default:
        return { label: status, className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" };
    }
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
          <div className="space-y-6 print:space-y-4" id="interest-calculator-content">
            {/* Dashboard-Style Header with Business Name */}
            <div className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30 p-8 print:p-6 rounded-xl print:rounded-lg shadow-sm print:shadow-none border-2 border-blue-200 dark:border-blue-800">
              <div className="text-center">
                <div className="flex justify-center items-center gap-3 mb-2">
                  {profile?.logoUrl && (
                    <img 
                      src={profile.logoUrl} 
                      alt="Company Logo" 
                      className="h-20 w-20 print:h-16 print:w-16 bg-white rounded-lg p-2 shadow-md object-contain"
                    />
                  )}
                  <div>
                    <h1 className="text-4xl print:text-3xl font-extrabold text-blue-900 dark:text-blue-100">
                      {profile?.companyName || "Company Name"}
                    </h1>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{profile?.address || ""}</p>
                  </div>
                </div>
                <div className="flex justify-center gap-6 text-sm text-gray-700 dark:text-gray-300 mt-2">
                  {profile?.phone && <span className="font-medium">📞 {profile.phone}</span>}
                  {profile?.email && <span className="font-medium">✉️ {profile.email}</span>}
                </div>
                <div className="mt-4 pt-4 border-t-2 border-blue-300 dark:border-blue-700">
                  <h2 className="text-2xl print:text-xl font-bold text-purple-800 dark:text-purple-300">Interest Calculation Report</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Generated on {format(new Date(), "MMM dd, yyyy hh:mm a")}</p>
                </div>
              </div>
            </div>

            {/* Customer & Invoice Details - Dashboard Style */}
            <div className="grid grid-cols-2 gap-6 print:gap-4">
              {/* Customer Card */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl print:rounded-lg p-6 print:p-4 shadow-md print:shadow-none">
                <h3 className="text-xl print:text-lg font-bold text-green-800 dark:text-green-300 mb-4 pb-2 border-b-2 border-green-300 dark:border-green-700">
                  👤 Customer Details
                </h3>
                <div className="space-y-3 print:space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Name:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{breakdown.invoice.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Status:</span>
                    <span className="font-bold text-green-700 dark:text-green-400">{breakdown.invoice.status}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Card */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl print:rounded-lg p-6 print:p-4 shadow-md print:shadow-none">
                <h3 className="text-xl print:text-lg font-bold text-orange-800 dark:text-orange-300 mb-4 pb-2 border-b-2 border-orange-300 dark:border-orange-700">
                  📄 Invoice Details
                </h3>
                <div className="space-y-3 print:space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Invoice #:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{breakdown.invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Date:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{format(new Date(breakdown.invoice.invoiceDate), "dd MMM yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Due Date:</span>
                    <span className="font-bold text-red-700 dark:text-red-400">{format(new Date(breakdown.invoice.dueDate), "dd MMM yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Payment Terms:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{breakdown.invoice.paymentTerms} days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Summary - Dashboard Cards */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl print:rounded-lg p-6 print:p-4 shadow-md print:shadow-none">
              <h3 className="text-xl print:text-lg font-bold text-purple-800 dark:text-purple-300 mb-4 pb-2 border-b-2 border-purple-300 dark:border-purple-700">
                💰 Invoice Summary
              </h3>
              <div className="grid grid-cols-3 gap-4 print:gap-3">
                <div className="text-center p-5 print:p-3 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg shadow-sm">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-2">Invoice Amount</p>
                  <p className="text-3xl print:text-2xl font-extrabold text-blue-900 dark:text-blue-100">
                    ₹{breakdown.invoice.invoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center p-5 print:p-3 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700 rounded-lg shadow-sm">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-2">Base G.P.</p>
                  <p className="text-3xl print:text-2xl font-extrabold text-green-900 dark:text-green-100">
                    ₹{breakdown.calculation.baseGp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center p-5 print:p-3 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-300 dark:border-purple-700 rounded-lg shadow-sm">
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-2">Interest Rate</p>
                  <p className="text-3xl print:text-2xl font-extrabold text-purple-900 dark:text-purple-100">
                    {breakdown.invoice.interestRate}% p.a.
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                <p className="text-sm font-bold text-yellow-900 dark:text-yellow-100">
                  📅 Interest Applicable From: <span className="font-extrabold">{breakdown.invoice.interestApplicableFrom}</span>
                </p>
              </div>
            </div>

            {/* Receipt Allocation & Balance Based Interest - Dashboard Table */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl print:rounded-lg overflow-hidden shadow-md print:shadow-none">
              <div className="p-6 print:p-4 bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 border-b-2 border-indigo-300 dark:border-indigo-700">
                <h3 className="text-xl print:text-lg font-bold text-indigo-900 dark:text-indigo-100">
                  📊 Period-wise Interest Breakdown
                </h3>
                <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-2 font-semibold">
                  Interest charged on outstanding balance for the days BETWEEN each payment (after due date)
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-800 dark:to-slate-700 text-white">
                    <tr>
                      <th className="px-4 py-4 print:py-3 text-left font-bold">Receipt Date</th>
                      <th className="px-4 py-4 print:py-3 text-right font-bold">Receipt Amount</th>
                      <th className="px-4 py-4 print:py-3 text-right font-bold">Balance Amount</th>
                      <th className="px-4 py-4 print:py-3 text-center font-bold">Days in Period</th>
                      <th className="px-4 py-4 print:py-3 text-center font-bold">Status</th>
                      <th className="px-4 py-4 print:py-3 text-right font-bold">Interest for Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {breakdown.allocation.receiptAllocations.map((allocation, index) => {
                      // Handle DUE DATE row
                      if (allocation.isDueDateRow) {
                        return (
                          <tr key={`due-date-${index}`} className="bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 font-bold border-2 border-red-300 dark:border-red-700">
                            <td className="px-4 py-4 print:py-3">
                              <span className="font-extrabold text-red-900 dark:text-red-100">{format(new Date(allocation.receiptDate), "dd MMM yyyy")}</span>
                            </td>
                            <td className="px-4 py-4 print:py-3 text-right text-gray-500">—</td>
                            <td className="px-4 py-4 print:py-3 text-right font-extrabold text-red-900 dark:text-red-100">₹{allocation.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-4 print:py-3 text-center font-extrabold text-red-900 dark:text-red-100">DUE DATE</td>
                            <td className="px-4 py-4 print:py-3 text-center" colSpan={2}>
                              <span className="text-red-800 dark:text-red-200 font-extrabold">{allocation.message}</span>
                            </td>
                          </tr>
                        );
                      }
                      
                      // Regular receipt row with alternating pastel colors
                      const status = getStatusBadge(allocation.status || "On Time");
                      const rowBg = index % 2 === 0 
                        ? "bg-blue-50 dark:bg-blue-900/10" 
                        : "bg-green-50 dark:bg-green-900/10";
                      return (
                        <tr key={allocation.receiptId || index} className={`${rowBg} hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors`}>
                          <td className="px-4 py-4 print:py-3 font-bold text-gray-900 dark:text-gray-100">{format(new Date(allocation.receiptDate), "dd MMM yyyy")}</td>
                          <td className="px-4 py-4 print:py-3 text-right font-bold text-gray-900 dark:text-gray-100">₹{(allocation.receiptAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-4 print:py-3 text-right font-extrabold text-blue-900 dark:text-blue-100">₹{allocation.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-4 print:py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                            {(allocation.daysInPeriod || 0) === 0 ? "—" : `${allocation.daysInPeriod} days`}
                          </td>
                          <td className="px-4 py-4 print:py-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 print:py-3 text-right font-extrabold text-orange-700 dark:text-orange-300">
                            ₹{(allocation.interestAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* TOTAL Row */}
                    <tr className="bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-800 dark:to-slate-700 text-white font-extrabold border-t-4 border-slate-900">
                      <td className="px-4 py-5 print:py-4 text-lg">TOTAL</td>
                      <td className="px-4 py-5 print:py-4 text-right text-lg">₹{breakdown.allocation.totalReceiptAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-5 print:py-4 text-right text-lg">₹{breakdown.allocation.unpaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-5 print:py-4 text-center">—</td>
                      <td className="px-4 py-5 print:py-4 text-center">—</td>
                      <td className="px-4 py-5 print:py-4 text-right text-lg">₹{breakdown.allocation.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Final Calculation Summary - Dashboard Style */}
            <div className="bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-cyan-900/30 border-4 border-emerald-300 dark:border-emerald-700 rounded-2xl print:rounded-xl p-8 print:p-6 shadow-xl print:shadow-lg">
              <h3 className="text-3xl print:text-2xl font-extrabold text-center text-emerald-900 dark:text-emerald-100 mb-6 pb-3 border-b-4 border-emerald-400 dark:border-emerald-600">
                💵 Final G.P. Calculation
              </h3>
              
              <div className="space-y-4 print:space-y-3 max-w-3xl mx-auto">
                <div className="flex justify-between items-center py-4 print:py-3 px-6 print:px-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
                  <span className="text-lg font-bold text-gray-700 dark:text-gray-300">Base G.P.</span>
                  <span className="text-2xl print:text-xl font-extrabold text-green-700 dark:text-green-300">
                    ₹{breakdown.calculation.baseGp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-4 print:py-3 px-6 print:px-4 bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-lg border-2 border-red-300 dark:border-red-700">
                  <span className="text-lg font-bold text-red-800 dark:text-red-200">Less: Total Interest (Period-Based)</span>
                  <span className="text-2xl print:text-xl font-extrabold text-red-700 dark:text-red-300">
                    - ₹{breakdown.calculation.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="border-t-4 border-emerald-500 dark:border-emerald-400 pt-5 mt-6">
                  <div className="flex justify-between items-center py-5 print:py-4 px-8 print:px-6 bg-gradient-to-r from-emerald-200 to-teal-200 dark:from-emerald-800 dark:to-teal-800 rounded-xl border-4 border-emerald-400 dark:border-emerald-600 shadow-lg">
                    <span className="text-2xl print:text-xl font-extrabold text-emerald-900 dark:text-emerald-100">FINAL G.P.</span>
                    <span className="text-4xl print:text-3xl font-extrabold text-emerald-900 dark:text-emerald-100">
                      ₹{breakdown.calculation.finalGp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 print:py-3 px-8 print:px-6 bg-gradient-to-r from-teal-100 to-cyan-100 dark:from-teal-800/50 dark:to-cyan-800/50 rounded-xl border-2 border-teal-300 dark:border-teal-600 mt-3">
                    <span className="text-xl print:text-lg font-extrabold text-teal-900 dark:text-teal-100">FINAL G.P. %</span>
                    <span className="text-3xl print:text-2xl font-extrabold text-teal-900 dark:text-teal-100">
                      {breakdown.calculation.finalGpPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Formula Explanation */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm">
              <h4 className="font-semibold mb-2">Interest Calculation Method:</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                <span className="font-semibold">Period-wise Interest:</span> Interest is calculated on the outstanding balance for the days BETWEEN each payment (after due date). 
                Each payment creates a new period, and interest is calculated only for the days in that specific period.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-semibold">Example:</span> Invoice ₹1,00,000, Due Date: 30 Apr 2025, Interest Rate: 18%
              </p>
              <ul className="text-gray-600 dark:text-gray-400 text-xs space-y-1 ml-4 mb-3">
                <li>• Receipt on 15 May (15 days after due date): Balance ₹90,000</li>
                <li>• Interest for Period 1 = (₹90,000 × 18% × 15 days) / 36,500 = ₹665.75</li>
                <li>• After ₹10,000 receipt: Balance becomes ₹80,000</li>
                <li>• Next receipt on 18 Jun (34 days after 15 May): Balance ₹80,000</li>
                <li>• Interest for Period 2 = (₹80,000 × 18% × 34 days) / 36,500 = ₹1,341.37</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                Interest = (Balance × Rate × Days in Period) / (100 × 365)
              </p>
              <p className="text-gray-600 dark:text-gray-400 font-mono text-xs mt-1">
                Final G.P. = Base G.P. - Total Interest
              </p>
              <p className="text-gray-600 dark:text-gray-400 font-mono text-xs mt-1">
                Final G.P. % = (Final G.P. / Invoice Amount) × 100
              </p>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Print Styles - A4 Format with Dashboard Colors */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 10mm;
          }
          
          /* Show only the interest calculator content */
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
            max-width: 210mm;
          }
          
          /* Hide dialog controls */
          .print\\:hidden {
            display: none !important;
          }
          
          /* Enable color printing for all backgrounds and borders */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Ensure all gradient backgrounds print */
          .bg-gradient-to-r,
          .bg-gradient-to-br,
          .bg-gradient-to-l,
          [class*="bg-gradient"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Ensure pastel colors print */
          [class*="bg-blue"],
          [class*="bg-green"],
          [class*="bg-purple"],
          [class*="bg-pink"],
          [class*="bg-orange"],
          [class*="bg-yellow"],
          [class*="bg-teal"],
          [class*="bg-cyan"],
          [class*="bg-emerald"],
          [class*="bg-indigo"],
          [class*="bg-red"],
          [class*="bg-slate"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Ensure all borders print */
          [class*="border"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Table print optimization */
          table {
            page-break-inside: auto;
            border-collapse: collapse;
            width: 100%;
          }
          
          thead {
            display: table-header-group;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          tbody {
            display: table-row-group;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          td, th {
            page-break-inside: avoid;
          }
          
          /* Ensure table header colors print */
          thead tr {
            background: linear-gradient(to right, #475569, #64748b) !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          thead th {
            color: white !important;
          }
          
          /* Ensure alternating row colors print */
          .bg-blue-50 {
            background-color: #eff6ff !important;
          }
          
          .bg-green-50 {
            background-color: #f0fdf4 !important;
          }
          
          /* Ensure shadows don't interfere */
          .shadow-md,
          .shadow-lg,
          .shadow-xl {
            box-shadow: none !important;
          }
          
          /* Optimize spacing for A4 */
          .print\\:space-y-4 > * + * {
            margin-top: 0.75rem !important;
          }
          
          .print\\:p-6 {
            padding: 1rem !important;
          }
          
          .print\\:p-4 {
            padding: 0.75rem !important;
          }
          
          .print\\:p-3 {
            padding: 0.5rem !important;
          }
          
          .print\\:py-4 {
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
          }
          
          .print\\:py-3 {
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }
          
          .print\\:px-6 {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          
          .print\\:px-4 {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
          }
          
          .print\\:gap-4 {
            gap: 0.75rem !important;
          }
          
          .print\\:gap-3 {
            gap: 0.5rem !important;
          }
          
          .print\\:rounded-lg {
            border-radius: 0.5rem !important;
          }
          
          .print\\:rounded-xl {
            border-radius: 0.75rem !important;
          }
          
          .print\\:text-3xl {
            font-size: 1.5rem !important;
            line-height: 2rem !important;
          }
          
          .print\\:text-2xl {
            font-size: 1.25rem !important;
            line-height: 1.75rem !important;
          }
          
          .print\\:text-xl {
            font-size: 1.125rem !important;
            line-height: 1.75rem !important;
          }
          
          .print\\:text-lg {
            font-size: 1rem !important;
            line-height: 1.5rem !important;
          }
          
          .print\\:h-16 {
            height: 4rem !important;
          }
          
          .print\\:w-16 {
            width: 4rem !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:shadow-lg {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          }
          
          /* Ensure overflow is visible */
          .overflow-x-auto {
            overflow: visible !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
