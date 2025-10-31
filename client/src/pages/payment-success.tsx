import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PaymentSuccess() {
  const [txnId, setTxnId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setTxnId(urlParams.get('txnid') || '');
    setRequestId(urlParams.get('requestId') || '');
    setWarning(urlParams.get('warning') || '');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-green-700 dark:text-green-400" data-testid="heading-payment-success">
            Payment Successful!
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Your subscription payment has been processed successfully
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {warning === 'provisioning_delayed' && (
            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <AlertDescription className="text-yellow-900 dark:text-yellow-100">
                Payment received! Your account setup is in progress. You'll receive an email shortly with your login credentials.
              </AlertDescription>
            </Alert>
          )}

          {txnId && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Transaction ID</p>
              <p className="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="text-transaction-id">
                {txnId}
              </p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              What's Next?
            </h3>
            
            <div className="space-y-3 text-blue-900 dark:text-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">Check Your Email</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    We've sent two emails:
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside ml-2 mt-1">
                    <li>Payment Receipt with transaction details</li>
                    <li>Login Credentials for your RECOV. account</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Login to Your Account</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Use the credentials from your email to access your dashboard
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">Start Managing Your Business</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Begin using RECOV. to streamline your business operations
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100 flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Security Note:</strong> Your temporary password has been sent to your registered email. 
                Please change it after your first login for enhanced security.
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => window.location.href = '/login'}
              data-testid="button-go-to-login"
            >
              Go to Login
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = '/pricing'}
              data-testid="button-back-to-pricing"
            >
              Back to Pricing
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
            Need help? Contact us at support@recov.com or call +91 7500 22 33 55
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
