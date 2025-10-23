import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calendar, DollarSign, TrendingDown, Percent } from "lucide-react";
import { type Invoice } from "@shared/schema";

interface InvoiceInterestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice;
}

interface PaymentDetail {
  paymentId: string;
  receiptId: string;
  paymentAmount: string;
  paymentDate: string;
  daysOverdue: number;
  interestAmount: string;
}

interface InterestDetails {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: string;
  grossProfit: string;
  interestRate: string;
  paymentBreakdown: PaymentDetail[];
  totalInterest: string;
  finalGrossProfit: string;
  grossProfitPercentage: string;
}

export default function InvoiceInterestDialog({ open, onOpenChange, invoice }: InvoiceInterestDialogProps) {
  const { data: interestDetails, isLoading } = useQuery<InterestDetails>({
    queryKey: ['/api/invoices', invoice?.id, 'interest-details'],
    enabled: open && !!invoice?.id,
  });

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interest Calculation Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : interestDetails ? (
          <div className="space-y-6">
            {/* Invoice Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Summary</CardTitle>
                <CardDescription>Invoice #{interestDetails.invoiceNumber}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Invoice Date
                  </div>
                  <div className="font-medium">{interestDetails.invoiceDate}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Due Date
                  </div>
                  <div className="font-medium">{interestDetails.dueDate}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Invoice Amount
                  </div>
                  <div className="font-semibold text-lg">₹{parseFloat(interestDetails.invoiceAmount).toLocaleString('en-IN')}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Percent className="h-4 w-4" />
                    Interest Rate
                  </div>
                  <div className="font-medium">{interestDetails.interestRate}% p.a.</div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Breakdown */}
            {interestDetails.paymentBreakdown.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Breakdown</CardTitle>
                  <CardDescription>Interest calculated on overdue payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Days Overdue</TableHead>
                          <TableHead className="text-right">Interest</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interestDetails.paymentBreakdown.map((payment, index) => (
                          <TableRow key={payment.paymentId || index}>
                            <TableCell>{payment.paymentDate}</TableCell>
                            <TableCell className="text-right font-medium">
                              ₹{parseFloat(payment.paymentAmount).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right">
                              {payment.daysOverdue > 0 ? (
                                <span className="text-orange-600 font-medium">{payment.daysOverdue} days</span>
                              ) : (
                                <span className="text-green-600">On time</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {parseFloat(payment.interestAmount) > 0 ? (
                                <span className="text-red-600 font-medium">
                                  -₹{parseFloat(payment.interestAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">₹0.00</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    <p>No payments recorded for this invoice yet.</p>
                    <p className="text-sm mt-2">Interest will be calculated when payments are received.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profit Summary */}
            <Card className="border-2 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-lg">Profit Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">Gross Profit</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      ₹{parseFloat(interestDetails.grossProfit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <span className="text-sm font-medium text-red-900 dark:text-red-100">Total Interest</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">
                      -₹{parseFloat(interestDetails.totalInterest).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-blue-900 dark:text-blue-100">Final Gross Profit</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ₹{parseFloat(interestDetails.finalGrossProfit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Percent className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <span className="font-semibold text-purple-900 dark:text-purple-100">Gross Profit %</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {parseFloat(interestDetails.grossProfitPercentage).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {parseFloat(interestDetails.totalInterest) > 0 && (
                  <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      <strong>Note:</strong> Interest of ₹{parseFloat(interestDetails.totalInterest).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                      {' '}has been deducted from the gross profit due to delayed payments (at {interestDetails.interestRate}% annual rate).
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No interest details available for this invoice.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
