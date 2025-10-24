import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { format } from "date-fns";
import html2pdf from "html2pdf.js";

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
  gstin?: string;
  primaryContactMobile?: string;
  regAddressLine1?: string;
  regAddressLine2?: string;
  regCity?: string;
  regState?: string;
  regPincode?: string;
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
  const { data: profile, isLoading: profileLoading } = useQuery<CompanyProfile>({
    queryKey: ["/api/company-profile"],
    enabled: !!invoiceId,
  });

  const { data: breakdown, isLoading: breakdownLoading } = useQuery<InterestBreakdown>({
    queryKey: [`/api/invoices/${invoiceId}/interest-breakdown`],
    enabled: !!invoiceId,
  });

  const handleDownloadPDF = () => {
    const element = document.getElementById('interest-calculator-content');
    if (!element || !breakdown) return;

    const opt = {
      margin: [12, 10, 12, 10],
      filename: `Interest_Calculation_${breakdown.invoice.invoiceNumber}_${format(new Date(), 'ddMMyyyy')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
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
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} data-testid="button-download-pdf">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close">
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
          <div className="space-y-3 print:space-y-2" id="interest-calculator-content">
            {/* Dashboard-Style Header with Complete Business Details */}
            <div className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30 p-4 print:p-3 rounded-lg shadow-sm print:shadow-none border-2 border-blue-200 dark:border-blue-800">
              <div className="text-center">
                <div className="flex justify-center items-center gap-2 mb-1">
                  {profile?.logoUrl && (
                    <img 
                      src={profile.logoUrl} 
                      alt="Company Logo" 
                      className="h-12 w-12 print:h-10 print:w-10 bg-white rounded p-1 shadow-sm object-contain"
                    />
                  )}
                  <div>
                    <h1 className="text-2xl print:text-xl font-extrabold text-blue-900 dark:text-blue-100">
                      {profile?.companyName || "Company Name"}
                    </h1>
                  </div>
                </div>
                
                {/* Complete Address */}
                {(profile?.regAddressLine1 || profile?.address) && (
                  <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 font-medium">
                    {profile?.regAddressLine1 && (
                      <>
                        {profile.regAddressLine1}
                        {profile.regAddressLine2 && `, ${profile.regAddressLine2}`}
                        {profile.regCity && `, ${profile.regCity}`}
                        {profile.regState && `, ${profile.regState}`}
                        {profile.regPincode && ` - ${profile.regPincode}`}
                      </>
                    )}
                    {!profile?.regAddressLine1 && profile?.address && profile.address}
                  </div>
                )}
                
                {/* Contact Details Row */}
                <div className="flex justify-center flex-wrap gap-3 text-xs text-gray-700 dark:text-gray-300 mt-2 font-semibold">
                  {profile?.gstin && <span>📋 GSTIN: {profile.gstin}</span>}
                  {profile?.primaryContactMobile && <span>📱 {profile.primaryContactMobile}</span>}
                  {profile?.phone && !profile?.primaryContactMobile && <span>📱 {profile.phone}</span>}
                  {profile?.email && <span>✉️ {profile.email}</span>}
                </div>
                
                {/* Report Title */}
                <div className="mt-2 pt-2 border-t border-blue-300 dark:border-blue-700">
                  <h2 className="text-lg print:text-base font-bold text-purple-800 dark:text-purple-300">Interest Calculation Report</h2>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">Generated on {format(new Date(), "dd MMM yyyy hh:mm a")}</p>
                </div>
              </div>
            </div>

            {/* Customer & Invoice Details - Dashboard Style */}
            <div className="grid grid-cols-2 gap-3 print:gap-2">
              {/* Customer Card */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 print:p-2 shadow-sm print:shadow-none">
                <h3 className="text-base print:text-sm font-bold text-green-800 dark:text-green-300 mb-2 pb-1 border-b border-green-300 dark:border-green-700">
                  👤 Customer Details
                </h3>
                <div className="space-y-1.5 print:space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Name:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{breakdown.invoice.customerName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Status:</span>
                    <span className="font-bold text-green-700 dark:text-green-400">{breakdown.invoice.status}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Card */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 print:p-2 shadow-sm print:shadow-none">
                <h3 className="text-base print:text-sm font-bold text-orange-800 dark:text-orange-300 mb-2 pb-1 border-b border-orange-300 dark:border-orange-700">
                  📄 Invoice Details
                </h3>
                <div className="space-y-1.5 print:space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Invoice #:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{breakdown.invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Date:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{format(new Date(breakdown.invoice.invoiceDate), "dd MMM yyyy")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Due Date:</span>
                    <span className="font-bold text-red-700 dark:text-red-400">{format(new Date(breakdown.invoice.dueDate), "dd MMM yyyy")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Payment Terms:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{breakdown.invoice.paymentTerms} days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Summary - Dashboard Cards */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 print:p-2 shadow-sm print:shadow-none">
              <h3 className="text-base print:text-sm font-bold text-purple-800 dark:text-purple-300 mb-2 pb-1 border-b border-purple-300 dark:border-purple-700">
                💰 Invoice Summary
              </h3>
              <div className="grid grid-cols-3 gap-1.5 print:gap-1">
                <div className="text-center p-1.5 print:p-1 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border border-blue-300 dark:border-blue-700 rounded shadow-sm">
                  <p className="text-[9px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-0.5">Invoice Amount</p>
                  <p className="text-sm print:text-xs font-extrabold text-blue-900 dark:text-blue-100">
                    ₹{breakdown.invoice.invoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center p-1.5 print:p-1 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-300 dark:border-green-700 rounded shadow-sm">
                  <p className="text-[9px] font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-0.5">Base G.P.</p>
                  <p className="text-sm print:text-xs font-extrabold text-green-900 dark:text-green-100">
                    ₹{breakdown.calculation.baseGp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center p-1.5 print:p-1 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-300 dark:border-purple-700 rounded shadow-sm">
                  <p className="text-[9px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-0.5">Interest Rate</p>
                  <p className="text-sm print:text-xs font-extrabold text-purple-900 dark:text-purple-100">
                    {breakdown.invoice.interestRate}% p.a.
                  </p>
                </div>
              </div>
              <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded">
                <p className="text-xs font-bold text-yellow-900 dark:text-yellow-100">
                  📅 Interest Applicable From: <span className="font-extrabold">{breakdown.invoice.interestApplicableFrom}</span>
                </p>
              </div>
            </div>

            {/* Receipt Allocation & Balance Based Interest - Dashboard Table */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg overflow-hidden shadow-sm print:shadow-none">
              <div className="p-3 print:p-2 bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 border-b border-indigo-300 dark:border-indigo-700">
                <h3 className="text-base print:text-sm font-bold text-indigo-900 dark:text-indigo-100">
                  📊 Period-wise Interest Breakdown
                </h3>
                <p className="text-xs text-indigo-800 dark:text-indigo-200 mt-1 font-semibold">
                  Interest charged on outstanding balance for the days BETWEEN each payment (after due date)
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-800 dark:to-slate-700 text-white">
                    <tr>
                      <th className="px-2 py-2 print:py-1.5 text-left font-bold">Receipt Date</th>
                      <th className="px-2 py-2 print:py-1.5 text-right font-bold">Receipt Amount</th>
                      <th className="px-2 py-2 print:py-1.5 text-right font-bold">Balance Amount</th>
                      <th className="px-2 py-2 print:py-1.5 text-center font-bold">Days in Period</th>
                      <th className="px-2 py-2 print:py-1.5 text-center font-bold">Status</th>
                      <th className="px-2 py-2 print:py-1.5 text-right font-bold">Interest for Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {breakdown.allocation.receiptAllocations.map((allocation, index) => {
                      // Handle DUE DATE row
                      if (allocation.isDueDateRow) {
                        return (
                          <tr key={`due-date-${index}`} className="bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 font-bold border border-red-300 dark:border-red-700">
                            <td className="px-2 py-1.5 print:py-1">
                              <span className="font-extrabold text-red-900 dark:text-red-100">{format(new Date(allocation.receiptDate), "dd MMM yyyy")}</span>
                            </td>
                            <td className="px-2 py-1.5 print:py-1 text-right text-gray-500">—</td>
                            <td className="px-2 py-1.5 print:py-1 text-right font-extrabold text-red-900 dark:text-red-100">₹{allocation.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-2 py-1.5 print:py-1 text-center font-extrabold text-red-900 dark:text-red-100">DUE DATE</td>
                            <td className="px-2 py-1.5 print:py-1 text-center" colSpan={2}>
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
                          <td className="px-2 py-1.5 print:py-1 font-bold text-gray-900 dark:text-gray-100">{format(new Date(allocation.receiptDate), "dd MMM yyyy")}</td>
                          <td className="px-2 py-1.5 print:py-1 text-right font-bold text-gray-900 dark:text-gray-100">₹{(allocation.receiptAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-2 py-1.5 print:py-1 text-right font-extrabold text-blue-900 dark:text-blue-100">₹{allocation.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-2 py-1.5 print:py-1 text-center font-bold text-gray-900 dark:text-gray-100">
                            {(allocation.daysInPeriod || 0) === 0 ? "—" : `${allocation.daysInPeriod} days`}
                          </td>
                          <td className="px-2 py-1.5 print:py-1 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 print:py-1 text-right font-extrabold text-orange-700 dark:text-orange-300">
                            ₹{(allocation.interestAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* TOTAL Row */}
                    <tr className="bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-800 dark:to-slate-700 text-white font-extrabold border-t-2 border-slate-900">
                      <td className="px-2 py-2 print:py-1.5 text-sm">TOTAL</td>
                      <td className="px-2 py-2 print:py-1.5 text-right text-sm">₹{breakdown.allocation.totalReceiptAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-2 py-2 print:py-1.5 text-right text-sm">₹{breakdown.allocation.unpaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-2 py-2 print:py-1.5 text-center">—</td>
                      <td className="px-2 py-2 print:py-1.5 text-center">—</td>
                      <td className="px-2 py-2 print:py-1.5 text-right text-sm">₹{breakdown.allocation.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Final G.P. Calculation - Small Cards */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 print:p-2 shadow-sm print:shadow-none">
              <h3 className="text-base print:text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2 pb-1 border-b border-emerald-300 dark:border-emerald-700">
                💵 Final G.P. Calculation
              </h3>
              <div className="grid grid-cols-2 gap-2 print:gap-1.5">
                {/* Base G.P. Card */}
                <div className="bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-700 rounded p-2 print:p-1.5 shadow-sm">
                  <p className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-0.5">Base G.P.</p>
                  <p className="text-sm print:text-xs font-extrabold text-green-700 dark:text-green-300">
                    ₹{breakdown.calculation.baseGp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                
                {/* Less: Total Interest Card */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-700 rounded p-2 print:p-1.5 shadow-sm">
                  <p className="text-[9px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-0.5">Less: Total Interest</p>
                  <p className="text-sm print:text-xs font-extrabold text-red-700 dark:text-red-300">
                    - ₹{breakdown.calculation.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                
                {/* FINAL G.P. Card */}
                <div className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-800 dark:to-teal-800 border-2 border-emerald-400 dark:border-emerald-600 rounded p-2 print:p-1.5 shadow-sm">
                  <p className="text-[9px] font-semibold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide mb-0.5">FINAL G.P.</p>
                  <p className="text-lg print:text-base font-extrabold text-emerald-900 dark:text-emerald-100">
                    ₹{breakdown.calculation.finalGp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                
                {/* FINAL G.P. % Card */}
                <div className="bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-800/80 dark:to-cyan-800/80 border border-teal-300 dark:border-teal-600 rounded p-2 print:p-1.5 shadow-sm">
                  <p className="text-[9px] font-semibold text-teal-800 dark:text-teal-200 uppercase tracking-wide mb-0.5">FINAL G.P. %</p>
                  <p className="text-lg print:text-base font-extrabold text-teal-900 dark:text-teal-100">
                    {breakdown.calculation.finalGpPercentage.toFixed(2)}%
                  </p>
                </div>
              </div>
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
