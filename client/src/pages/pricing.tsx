import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, Zap, Crown, X, Sparkles } from "lucide-react";
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

// Module display names mapping
const moduleNames: Record<string, string> = {
  "business_overview": "Business Overview Dashboard",
  "customer_analytics": "Customer Analytics",
  "leads": "Lead Management",
  "quotations": "Quotation Management",
  "proforma_invoices": "Proforma Invoices",
  "invoices": "Invoice Generation",
  "receipts": "Receipt Management",
  "payment_tracking": "Payment Tracking",
  "action_center": "Action Center & Tasks",
  "team_performance": "Team Performance",
  "risk_recovery": "Risk & Recovery",
  "credit_control": "Credit Control System",
  "masters": "Master Data Management",
  "settings": "Settings & Configuration",
  "email_integration": "Email Integration",
  "whatsapp_integration": "WhatsApp Integration",
  "call_integration": "AI Voice Call Integration"
};

const planIcons: Record<string, any> = {
  "Starter": Star,
  "Professional": Zap,
  "Enterprise": Crown
};

// Pastel color schemes for each plan
const planColors = {
  "Starter": {
    bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
    border: "border-blue-200",
    icon: "bg-blue-100",
    iconColor: "text-blue-600",
    badge: "bg-blue-500",
    button: "bg-blue-600 hover:bg-blue-700"
  },
  "Professional": {
    bg: "bg-gradient-to-br from-purple-50 to-pink-50",
    border: "border-purple-300",
    icon: "bg-purple-100",
    iconColor: "text-purple-600",
    badge: "bg-purple-600",
    button: "bg-purple-600 hover:bg-purple-700"
  },
  "Enterprise": {
    bg: "bg-gradient-to-br from-amber-50 to-orange-50",
    border: "border-amber-200",
    icon: "bg-amber-100",
    iconColor: "text-amber-600",
    badge: "bg-amber-600",
    button: "bg-amber-600 hover:bg-amber-700"
  }
};

export default function Pricing() {
  const [, setLocation] = useLocation();
  
  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/public/plans'],
  });

  const handleGetStarted = (plan: SubscriptionPlan) => {
    setLocation(`/register?plan=${plan.id}`);
  };

  // Get all unique modules from all plans
  const allModules = plans ? Array.from(new Set(plans.flatMap(p => p.allowedModules))) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-blue-50/50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Simple, transparent pricing</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight" data-testid="heading-pricing">
              Choose Your Perfect Plan
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed">
              Transform your business with RECOV. All plans include secure payment processing, 
              automated workflows, and dedicated support.
            </p>

            <div className="mt-8 inline-flex items-center gap-2 px-5 py-3 bg-green-50 border border-green-200 rounded-full">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-green-700 font-semibold">7 Days Free Trial on Starter Plan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-20 -mt-8">
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans?.map((plan, index) => {
            const Icon = planIcons[plan.name] || Star;
            const colors = planColors[plan.name as keyof typeof planColors] || planColors.Starter;
            const isPopular = plan.name === "Professional";
            
            return (
              <div key={plan.id} className={`relative ${isPopular ? 'md:-mt-4' : ''}`}>
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg z-10">
                    ⭐ Most Popular
                  </div>
                )}
                
                <Card 
                  className={`h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 ${
                    isPopular 
                      ? `${colors.border} shadow-xl scale-[1.02]` 
                      : 'border-gray-200'
                  } ${colors.bg}`}
                  data-testid={`card-plan-${plan.name.toLowerCase()}`}
                >
                  <CardHeader className="text-center pb-6 pt-8">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 mx-auto ${colors.icon} shadow-md`}>
                      <Icon className={`h-10 w-10 ${colors.iconColor}`} />
                    </div>
                    
                    <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </CardTitle>
                    
                    <CardDescription className="text-gray-600 text-base">
                      {plan.name === "Starter" && "Perfect for small businesses starting their journey"}
                      {plan.name === "Professional" && "Ideal for growing businesses with advanced needs"}
                      {plan.name === "Enterprise" && "Complete solution for large organizations"}
                    </CardDescription>
                    
                    <div className="mt-8">
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-sm font-medium text-gray-600">₹</span>
                        <span className="text-5xl font-bold text-gray-900">
                          {parseInt(plan.price).toLocaleString('en-IN')}
                        </span>
                        <span className="text-gray-600 text-base">/{plan.billingCycle}</span>
                      </div>
                      {plan.name === "Starter" && (
                        <p className="text-sm text-green-600 mt-3 font-semibold bg-green-50 inline-block px-4 py-1 rounded-full">
                          First 7 days free!
                        </p>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="px-6 pb-6">
                    <div className="space-y-4">
                      <div className="border-t border-gray-200 pt-6">
                        <p className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                          Included Features
                        </p>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {plan.allowedModules.map((module, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className={`${colors.icon} rounded-full p-1 mt-0.5`}>
                                <Check className={`h-3.5 w-3.5 ${colors.iconColor}`} />
                              </div>
                              <span className="text-gray-700 text-sm leading-relaxed">
                                {moduleNames[module] || module}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Email Support</span>
                        </div>
                        {plan.name !== "Starter" && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span>Priority Support</span>
                          </div>
                        )}
                        {plan.name === "Enterprise" && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span>24/7 Dedicated Support</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4 pb-8 px-6">
                    <Button
                      className={`w-full py-6 text-base font-semibold ${colors.button} text-white shadow-lg hover:shadow-xl transition-all duration-200`}
                      onClick={() => handleGetStarted(plan)}
                      data-testid={`button-get-started-${plan.name.toLowerCase()}`}
                    >
                      Get Started {plan.name === "Starter" && "- Free Trial"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-20 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Compare All Features</h2>
            <p className="text-gray-600">See what's included in each plan</p>
          </div>

          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-6 px-6 text-gray-900 font-semibold">Features</th>
                    {plans?.map(plan => (
                      <th key={plan.id} className="text-center py-6 px-6">
                        <div className="font-bold text-gray-900 text-lg">{plan.name}</div>
                        <div className="text-sm text-gray-600 mt-1">₹{parseInt(plan.price).toLocaleString('en-IN')}/{plan.billingCycle}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allModules.map((module, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="py-4 px-6 text-gray-700 font-medium">
                        {moduleNames[module] || module}
                      </td>
                      {plans?.map(plan => (
                        <td key={plan.id} className="py-4 px-6 text-center">
                          {plan.allowedModules.includes(module) ? (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100">
                              <X className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-12 max-w-4xl mx-auto border border-blue-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Already have an account?
            </h3>
            <p className="text-gray-600 mb-6">
              Sign in to access your dashboard and manage your business
            </p>
            <Button
              onClick={() => setLocation('/login')}
              variant="outline"
              className="px-8 py-6 text-base font-semibold border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
              data-testid="link-login"
            >
              Sign In to Your Account
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200">
              <Check className="h-4 w-4 text-green-600" />
              <span>No credit card for trial</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200">
              <Check className="h-4 w-4 text-green-600" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200">
              <Check className="h-4 w-4 text-green-600" />
              <span>Secure PayU payments</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200">
              <Check className="h-4 w-4 text-green-600" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
