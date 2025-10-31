import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, MapPin, FileText, Phone, CreditCard } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";

const registrationSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Invalid email address"),
  mobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  businessAddress: z.string().min(1, "Business address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  pincode: z.string().min(1, "Pincode is required"),
  panNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  industryType: z.string().optional(),
  planType: z.enum(["6_months_demo", "annual_subscription", "lifetime"]),
  selectedPlanId: z.string().min(1, "Please select a subscription plan"),
  existingAccountingSoftware: z.string().optional(),
  paymentMethod: z.enum(["qr_code", "payu", "bank_transfer"]),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  billingCycle: string;
  isActive: boolean;
}

export default function RegisterTenant() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Get plan ID from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const planIdFromUrl = urlParams.get('plan');

  // Fetch active subscription plans
  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/public/plans'],
  });

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      businessName: "",
      email: "",
      mobileNumber: "",
      businessAddress: "",
      city: "",
      state: "",
      pincode: "",
      panNumber: "",
      gstNumber: "",
      industryType: "",
      planType: "6_months_demo",
      selectedPlanId: planIdFromUrl || "",
      existingAccountingSoftware: "",
      paymentMethod: "payu",
    },
  });

  // Pre-select plan if provided in URL
  useEffect(() => {
    if (planIdFromUrl && plans && plans.length > 0) {
      const selectedPlan = plans.find(p => p.id === planIdFromUrl);
      if (selectedPlan) {
        form.setValue('selectedPlanId', planIdFromUrl);
      }
    }
  }, [planIdFromUrl, plans, form]);

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
      const response = await fetch("/api/register-tenant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        try {
          const error = await response.json();
          throw new Error(error.message || "Registration failed");
        } catch {
          throw new Error("Registration failed");
        }
      }

      // Check if response is HTML (PayU payment form) or JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        // Return the HTML to be rendered
        const html = await response.text();
        return { type: 'html', content: html };
      } else {
        // Return JSON response
        const json = await response.json();
        return { type: 'json', content: json };
      }
    },
    onSuccess: (data) => {
      if (data.type === 'html') {
        // Inject the PayU payment form HTML and it will auto-submit
        const container = document.createElement('div');
        container.innerHTML = data.content;
        document.body.appendChild(container);
      } else if (data.type === 'json' && data.content.paymentUrl) {
        window.location.href = data.content.paymentUrl;
      } else {
        toast({
          title: "Registration Submitted!",
          description: "Proceeding to payment...",
        });
      }
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
    if (emailExists) {
      toast({
        title: "Email Already Registered",
        description: "This email is already registered. Please use a different email or login.",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate(data);
  };

  const selectedPlan = plans?.find(p => p.id === form.watch('selectedPlanId'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-3xl font-bold" data-testid="heading-registration">
            Tenant Registration
          </CardTitle>
          <CardDescription className="text-base">
            Complete the form below and proceed to payment
          </CardDescription>
        </CardHeader>

        <CardContent>
          {selectedPlan && (
            <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <strong>Selected Plan:</strong> {selectedPlan.name} - ₹{parseInt(selectedPlan.price).toLocaleString('en-IN')}/{selectedPlan.billingCycle}
                {selectedPlan.name === "Starter" && <span className="ml-2 text-green-600 dark:text-green-400 font-semibold">(7 Days Free Trial)</span>}
              </AlertDescription>
            </Alert>
          )}

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
                        Business Name *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your business name" {...field} data-testid="input-business-name" />
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
                        Business Email *
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="business@example.com" {...field} data-testid="input-email" />
                      </FormControl>
                      {emailExists && (
                        <p className="text-sm text-red-600 dark:text-red-400">This email is already registered</p>
                      )}
                      {checkingEmail && (
                        <p className="text-sm text-gray-500">Checking...</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Mobile Number *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="10-digit mobile number" {...field} maxLength={10} data-testid="input-mobile" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="selectedPlanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Subscription Plan *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-plan">
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {plans?.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - ₹{parseInt(plan.price).toLocaleString('en-IN')}/{plan.billingCycle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      Business Address *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Full business address" {...field} data-testid="input-address" />
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
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} data-testid="input-city" />
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
                        <Input placeholder="State" {...field} data-testid="input-state" />
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
                      <FormLabel>Pincode *</FormLabel>
                      <FormControl>
                        <Input placeholder="Pincode" {...field} data-testid="input-pincode" />
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
                        PAN Number (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="PAN Number" {...field} data-testid="input-pan" />
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
                      <FormLabel>GST Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="GST Number" {...field} data-testid="input-gst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between items-center pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.href = '/pricing'}
                  data-testid="button-back"
                >
                  Back to Plans
                </Button>
                <Button
                  type="submit"
                  disabled={registerMutation.isPending || emailExists}
                  className="bg-blue-600 hover:bg-blue-700 min-w-[200px]"
                  data-testid="button-proceed-payment"
                >
                  {registerMutation.isPending ? "Processing..." : "Proceed to Payment"}
                </Button>
              </div>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                By proceeding, you agree to our Terms of Service and Privacy Policy. 
                You'll be redirected to a secure PayU payment page.
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
