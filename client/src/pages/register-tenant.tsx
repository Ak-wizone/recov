import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, MapPin, FileText, CreditCard, Upload, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

const registrationSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Invalid email address"),
  businessAddress: z.string().min(1, "Business address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  pincode: z.string().min(1, "Pincode is required"),
  panNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  industryType: z.string().optional(),
  planType: z.enum(["6_months_demo", "annual_subscription", "lifetime"]),
  existingAccountingSoftware: z.string().optional(),
  paymentMethod: z.enum(["qr_code", "payu", "bank_transfer"]),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

export default function RegisterTenant() {
  const { toast } = useToast();
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      businessName: "",
      email: "",
      businessAddress: "",
      city: "",
      state: "",
      pincode: "",
      panNumber: "",
      gstNumber: "",
      industryType: "",
      planType: "6_months_demo",
      existingAccountingSoftware: "",
      paymentMethod: "qr_code",
    },
  });

  // Watch email field for changes
  const emailValue = form.watch("email");

  // Check if email exists when it changes
  useEffect(() => {
    const checkEmail = async () => {
      if (!emailValue || !emailValue.includes("@")) {
        setEmailExists(false);
        return;
      }

      setCheckingEmail(true);
      try {
        const response = await fetch(`/api/check-email-exists?email=${encodeURIComponent(emailValue)}`);
        const data = await response.json();
        setEmailExists(data.exists);
      } catch (error) {
        console.error("Email check error:", error);
      } finally {
        setCheckingEmail(false);
      }
    };

    // Debounce the check
    const timer = setTimeout(checkEmail, 500);
    return () => clearTimeout(timer);
  }, [emailValue]);

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormValues) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      if (paymentReceipt) {
        formData.append("paymentReceipt", paymentReceipt);
      }

      const response = await fetch("/api/register-tenant", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Registration Submitted!",
        description: "We'll review your application and get back to you soon.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationFormValues) => {
    registerMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl">Registration Submitted!</CardTitle>
            <CardDescription className="text-base mt-2">
              Thank you for registering. We'll review your application and activate your account within 24-48 hours.
              You'll receive an email confirmation once your account is ready.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-3xl font-bold">Client Registration</CardTitle>
          <CardDescription className="text-base">
            Complete the form below to register your company
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Business Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your business name"
                          {...field}
                          data-testid="input-business-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Address
                        {checkingEmail && <span className="text-xs text-gray-500">(checking...)</span>}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="enter your email"
                          {...field}
                          data-testid="input-email"
                          className={emailExists ? "border-red-500" : ""}
                        />
                      </FormControl>
                      {emailExists && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            This email is already registered. Please use a different email or contact support.
                          </AlertDescription>
                        </Alert>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Business Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="enter your address"
                        {...field}
                        data-testid="input-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City"
                          {...field}
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="State"
                          {...field}
                          data-testid="input-state"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Pincode"
                          {...field}
                          data-testid="input-pincode"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="panNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        PAN Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ABCDE1234F"
                          {...field}
                          data-testid="input-pan"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gstNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        GST Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="22ABCDE1234F1Z5"
                          {...field}
                          data-testid="input-gst"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="industryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-industry">
                            <SelectValue placeholder="Select your industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="it">IT & Software</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="planType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Plan Type
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-plan">
                            <SelectValue placeholder="6 months demo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="6_months_demo">6 months demo</SelectItem>
                          <SelectItem value="annual_subscription">Annual Subscription</SelectItem>
                          <SelectItem value="lifetime">Lifetime</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="existingAccountingSoftware"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Existing Accounting Software</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Tally, QuickBooks, Zoho Books"
                        {...field}
                        data-testid="input-accounting-software"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Payment Information</h3>

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Payment Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="qr_code" id="qr_code" data-testid="radio-qr-code" />
                            <Label htmlFor="qr_code" className="flex items-center gap-2 cursor-pointer">
                              <span className="text-2xl">📱</span>
                              Pay via QR Code
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="payu" id="payu" data-testid="radio-payu" />
                            <Label htmlFor="payu" className="flex items-center gap-2 cursor-pointer">
                              <CreditCard className="w-5 h-5" />
                              Pay via PayU
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("paymentMethod") === "qr_code" && (
                  <div className="mt-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <p className="text-sm font-medium mb-3">Scan this QR code to make payment:</p>
                    <div className="flex justify-center bg-white dark:bg-gray-900 p-4 rounded">
                      <div className="w-64 h-64 border-2 border-gray-300 flex items-center justify-center">
                        <p className="text-gray-400 text-sm text-center">
                          QR Code<br />Placeholder
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <Label className="flex items-center gap-2 mb-2">
                        <Upload className="w-4 h-4" />
                        Upload Payment Receipt/Screenshot *
                      </Label>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setPaymentReceipt(e.target.files?.[0] || null)}
                        data-testid="input-receipt-upload"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={registerMutation.isPending || emailExists}
                data-testid="button-complete-registration"
              >
                {registerMutation.isPending ? "Submitting..." : "Complete Registration"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
