import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, RefreshCcw, HelpCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PaymentFailed() {
  const [txnId, setTxnId] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setTxnId(urlParams.get('txnid') || '');
    setReason(urlParams.get('reason') || '');
  }, []);

  const getErrorMessage = (errorCode: string): string => {
    const messages: Record<string, string> = {
      'invalid_hash': 'Payment verification failed due to security mismatch',
      'missing_registration_id': 'Registration information not found',
      'server_error': 'An unexpected error occurred on our server',
      'payment_failed': 'Payment was declined or cancelled',
      'user_cancelled': 'You cancelled the payment',
    };
    return messages[errorCode] || 'Payment could not be processed';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-700 dark:text-red-400" data-testid="heading-payment-failed">
            Payment Failed
          </CardTitle>
          <CardDescription className="text-base mt-2">
            We couldn't process your payment
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertDescription className="text-red-900 dark:text-red-100">
              <strong>Reason:</strong> {getErrorMessage(reason)}
            </AlertDescription>
          </Alert>

          {txnId && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Transaction ID (for reference)</p>
              <p className="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="text-transaction-id">
                {txnId}
              </p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              What Should You Do?
            </h3>
            
            <div className="space-y-3 text-blue-900 dark:text-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">Check Payment Details</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Ensure your card has sufficient funds and is enabled for online transactions
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Try Again</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You can retry the payment with the same or different payment method
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">Contact Support</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    If the problem persists, reach out to our support team for assistance
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Note:</strong> No money has been deducted from your account. 
              If you see a hold on your card, it will be automatically released by your bank within 3-5 business days.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => window.location.href = '/pricing'}
              data-testid="button-try-again"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = '/'}
              data-testid="button-back-to-home"
            >
              Back to Home
            </Button>
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Need Assistance?</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
              <span className="text-gray-900 dark:text-gray-100">📧 support@recov.com</span>
              <span className="text-gray-900 dark:text-gray-100">📞 +91 7500 22 33 55</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
