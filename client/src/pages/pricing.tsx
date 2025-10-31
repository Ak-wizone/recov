import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, Zap, Crown } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  billingCycle: string;
  allowedModules: string[];
  isActive: boolean;
  color: string;
}

const planFeatures: Record<string, string[]> = {
  "Starter": [
    "Business Overview Dashboard",
    "Customer Management",
    "Basic Invoice Generation",
    "Payment Tracking",
    "Email Support",
    "7 Days Free Trial"
  ],
  "Professional": [
    "Everything in Starter",
    "Advanced Analytics",
    "Quotation Management",
    "Proforma Invoices",
    "Receipt Management",
    "Credit Control",
    "WhatsApp Integration",
    "Priority Support"
  ],
  "Enterprise": [
    "Everything in Professional",
    "AI Voice Assistant",
    "Team Performance Tracking",
    "Advanced Risk & Recovery",
    "Custom Workflows",
    "API Access",
    "Dedicated Account Manager",
    "24/7 Premium Support"
  ]
};

const planIcons: Record<string, any> = {
  "Starter": Star,
  "Professional": Zap,
  "Enterprise": Crown
};

export default function Pricing() {
  const [, setLocation] = useLocation();
  
  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/public/plans'],
  });

  const handleGetStarted = (plan: SubscriptionPlan) => {
    setLocation(`/register?plan=${plan.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4" data-testid="heading-pricing">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Transform your business with RECOV. Select the perfect plan for your needs.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-green-700 dark:text-green-300 font-medium">7 Days Free Trial on Starter Plan</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans?.map((plan, index) => {
            const Icon = planIcons[plan.name] || Star;
            const features = planFeatures[plan.name] || [];
            const isPopular = plan.name === "Professional";
            
            return (
              <Card 
                key={plan.id}
                className={`relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
                  isPopular 
                    ? 'border-2 border-blue-500 dark:border-blue-400 shadow-xl scale-105' 
                    : 'border border-gray-200 dark:border-gray-700'
                }`}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 mx-auto`}
                    style={{ backgroundColor: `${plan.color}20` }}>
                    <Icon className="h-8 w-8" style={{ color: plan.color }} />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400 mt-2">
                    {plan.name === "Starter" && "Perfect for getting started"}
                    {plan.name === "Professional" && "Best for growing businesses"}
                    {plan.name === "Enterprise" && "For large organizations"}
                  </CardDescription>
                  <div className="mt-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        ₹{parseInt(plan.price).toLocaleString('en-IN')}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">/{plan.billingCycle}</span>
                    </div>
                    {plan.name === "Starter" && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
                        First 7 days free!
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="pt-6">
                  <Button
                    className={`w-full py-6 text-lg font-semibold ${
                      isPopular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900'
                    }`}
                    onClick={() => handleGetStarted(plan)}
                    data-testid={`button-get-started-${plan.name.toLowerCase()}`}
                  >
                    Get Started
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Already have an account?{" "}
            <button
              onClick={() => setLocation('/login')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              data-testid="link-login"
            >
              Sign In
            </button>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>No credit card required for trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Secure payment via PayU</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
