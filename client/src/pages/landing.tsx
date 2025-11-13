import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Star,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Phone,
  Mail,
  MapPin,
  Quote,
  Target,
  Award,
  Bell,
  BarChart3,
  MessageSquare,
  CreditCard,
  Sparkles,
  Timer,
  ChevronDown,
} from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const benefits = [
  {
    icon: Zap,
    title: "Automated Payment Recovery",
    description: "India's first fully automated system that follows up with customers via Email, WhatsApp, and AI calls",
    color: "bg-yellow-100 text-yellow-600"
  },
  {
    icon: Shield,
    title: "Credit Risk Management",
    description: "Advanced AI algorithms predict payment delays and categorize customers automatically",
    color: "bg-blue-100 text-blue-600"
  },
  {
    icon: Users,
    title: "Multi-Channel Communication",
    description: "Reach customers on their preferred channel - Email, WhatsApp, SMS, or Voice calls",
    color: "bg-purple-100 text-purple-600"
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Live dashboards showing payment trends, debtor analysis, and recovery performance",
    color: "bg-pink-100 text-pink-600"
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Intelligent reminder system that adapts based on customer behavior and payment history",
    color: "bg-orange-100 text-orange-600"
  }
];

const testimonials = [
  {
    name: "Rajesh Kumar",
    company: "VIJAY SALES",
    role: "Finance Director",
    content: "RECOV transformed our collections process. We reduced overdue payments by 45% in just 2 months. The automated follow-ups are a game-changer!",
    rating: 5,
    image: "https://ui-avatars.com/api/?name=Rajesh+Kumar&background=0D8ABC&color=fff"
  },
  {
    name: "Priya Sharma",
    company: "Phoenix Life Science",
    role: "CEO",
    content: "The AI voice calling feature is incredible. It handles 100+ calls daily, allowing our team to focus on strategic tasks. ROI achieved in 1 month!",
    rating: 5,
    image: "https://ui-avatars.com/api/?name=Priya+Sharma&background=7C3AED&color=fff"
  },
  {
    name: "Amit Patel",
    company: "Enerforth Pvt Ltd",
    role: "Operations Head",
    content: "Best investment we made this year. The credit management module helps us make better lending decisions. Support team is outstanding!",
    rating: 5,
    image: "https://ui-avatars.com/api/?name=Amit+Patel&background=059669&color=fff"
  }
];

export default function Landing() {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 5, seconds: 0 });
  const [paymentForm, setPaymentForm] = useState({ name: "", email: "", mobile: "", plan: "" });
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");

  // Fetch subscription plans from platform admin
  useEffect(() => {
    const fetchPlans = async () => {
      setPlansLoading(true);
      setPlansError("");
      try {
        const response = await fetch("/api/subscription-plans/active");
        if (response.ok) {
          const plans = await response.json();
          // Exclude Platinum plan and limit to 3 plans
          const filteredPlans = plans
            .filter((p: any) => p.name !== "Platinum")
            .slice(0, 3);
          
          if (filteredPlans.length === 0) {
            setPlansError("No active subscription plans available");
            setSubscriptionPlans([]);
          } else {
            setSubscriptionPlans(filteredPlans);
          }
        } else {
          setPlansError("Failed to load pricing plans");
          setSubscriptionPlans([]);
        }
      } catch (error) {
        console.error("Failed to fetch plans:", error);
        setPlansError("Unable to connect to server");
        setSubscriptionPlans([]);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Countdown timer for price increment (5 minutes)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev: { days: number; hours: number; minutes: number; seconds: number }) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlan) {
      toast({
        title: "Please select a plan",
        variant: "destructive",
      });
      return;
    }

    // Get amount from selected plan (price is a decimal string from database)
    const amount = parseFloat(selectedPlan.price);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid plan price",
        description: "Unable to process payment. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create Razorpay order
      const response = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: paymentForm.name,
          email: paymentForm.email,
          mobile: paymentForm.mobile,
          plan: paymentForm.plan,
          amount: amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create order");
      }

      const { orderId, amount: orderAmount, currency, keyId } = await response.json();

      // Load Razorpay script if not already loaded
      if (!(window as any).Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => { script.onload = resolve; });
      }

      // Initialize Razorpay checkout
      const options = {
        key: keyId,
        amount: orderAmount,
        currency: currency,
        name: "RECOV",
        description: `${paymentForm.plan} Plan Subscription`,
        order_id: orderId,
        prefill: {
          name: paymentForm.name,
          email: paymentForm.email,
          contact: paymentForm.mobile,
        },
        theme: {
          color: "#3B82F6", // Blue color matching the brand
        },
        handler: async function (response: any) {
          // Verify payment on backend
          const verifyResponse = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          if (verifyResponse.ok) {
            toast({
              title: "Payment Successful!",
              description: "Thank you for subscribing. We'll contact you shortly to set up your account.",
            });
            // Reset all form state
            setPaymentForm({ name: "", email: "", mobile: "", plan: "" });
            setShowRegistrationForm(false);
            setSelectedPlan(null);
          } else {
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support with your payment details.",
              variant: "destructive",
            });
          }
        },
        modal: {
          ondismiss: function () {
            toast({
              title: "Payment Cancelled",
              description: "You can try again anytime.",
            });
            // Reset all form state on payment cancellation
            setPaymentForm({ name: "", email: "", mobile: "", plan: "" });
            setShowRegistrationForm(false);
            setSelectedPlan(null);
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Price Increment Timer - Sticky Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-orange-600 text-white py-2 px-4">
        <div className="container mx-auto flex items-center justify-center gap-4 text-sm md:text-base flex-wrap">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 animate-pulse" />
            <span className="font-semibold">PRICE INCREASE IN:</span>
          </div>
          <div className="flex gap-2">
            <div className="bg-white/20 px-3 py-1 rounded">
              <span className="font-bold">{timeLeft.days}d</span>
            </div>
            <div className="bg-white/20 px-3 py-1 rounded">
              <span className="font-bold">{timeLeft.hours}h</span>
            </div>
            <div className="bg-white/20 px-3 py-1 rounded">
              <span className="font-bold">{timeLeft.minutes}m</span>
            </div>
            <div className="bg-white/20 px-3 py-1 rounded">
              <span className="font-bold">{timeLeft.seconds}s</span>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-yellow-400 text-black hover:bg-yellow-300 font-bold"
            onClick={scrollToPricing}
            data-testid="button-timer-cta"
          >
            LOCK CURRENT PRICE
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-12 left-0 right-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                RECOV
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#pricing" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 font-medium" data-testid="link-nav-pricing">Pricing</a>
              <a href="#benefits" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 font-medium" data-testid="link-nav-benefits">Benefits</a>
              <a href="#testimonials" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 font-medium" data-testid="link-nav-testimonials">Testimonials</a>
              <a href="#about" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 font-medium" data-testid="link-nav-about">About</a>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={scrollToPricing}
                data-testid="button-get-started"
              >
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-5xl mx-auto"
          >
            <Badge className="mb-6 bg-yellow-400 text-black hover:bg-yellow-300 text-base px-4 py-2" data-testid="badge-hero">
              <Sparkles className="h-4 w-4 mr-2" />
              India's #1 Payment Recovery Platform
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                GET YOUR PAYMENTS
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">
                ON TIME ALWAYS
              </span>
            </h1>
            
            <p className="text-2xl md:text-3xl text-gray-700 dark:text-gray-300 mb-4 font-semibold">
              INDIA'S FIRST FULLY AUTOMATED
            </p>
            <p className="text-2xl md:text-3xl text-gray-700 dark:text-gray-300 mb-8 font-semibold">
              PAYMENT RECOVERY SOFTWARE
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                className="bg-yellow-400 text-black hover:bg-yellow-300 text-lg px-8 font-bold shadow-lg"
                onClick={scrollToPricing}
                data-testid="button-hero-cta"
              >
                START YOUR PAYMENT COLLECTION <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 justify-center text-base text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">100% Automated</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">Free Trial Available</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Animated Scroll to Pricing CTA */}
      <motion.div 
        className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 py-4 overflow-hidden relative"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          backgroundSize: "200% 100%"
        }}
      >
        <div className="container mx-auto text-center relative z-10">
          <Button 
            variant="ghost" 
            className="text-black font-bold hover:bg-white/20"
            onClick={scrollToPricing}
            data-testid="button-cta-view-plans-1"
          >
            View Plans <ChevronDown className="ml-2 h-4 w-4 animate-bounce" />
          </Button>
        </div>
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            x: ["0%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent" />
        </motion.div>
      </motion.div>

      {/* Animated Scroll to Pricing CTA */}
      <motion.div 
        className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 py-4 overflow-hidden relative"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          backgroundSize: "200% 100%"
        }}
      >
        <div className="container mx-auto text-center relative z-10">
          <Button 
            variant="ghost" 
            className="text-black font-bold hover:bg-white/20"
            onClick={scrollToPricing}
            data-testid="button-cta-view-pricing"
          >
            View Pricing Plans <ChevronDown className="ml-2 h-4 w-4 animate-bounce" />
          </Button>
        </div>
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            x: ["0%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent" />
        </motion.div>
      </motion.div>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-yellow-400 text-black hover:bg-yellow-300">
              Flexible Pricing
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Choose Your{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Perfect Plan
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              START YOUR PAYMENT COLLECTION TODAY
            </p>
          </motion.div>

          {plansLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading pricing plans...</p>
            </div>
          )}

          {plansError && (
            <div className="text-center py-12">
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Unable to load pricing plans</p>
                <p className="text-red-600/80 dark:text-red-400/80 text-sm">{plansError}</p>
                <Button 
                  className="mt-4" 
                  onClick={() => window.location.reload()}
                  data-testid="button-retry-plans"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {!plansLoading && !plansError && subscriptionPlans.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {subscriptionPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {index === 1 && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold px-4 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      MOST POPULAR
                    </Badge>
                  </div>
                )}
                <Card className={`h-full ${index === 1 ? 'border-4 border-yellow-400 shadow-2xl scale-105' : 'border-2'}`} data-testid={`card-plan-${index}`}>
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold mb-2">{plan.name.toUpperCase()}</CardTitle>
                    <div className="mb-4">
                      <div className="text-4xl font-bold text-blue-600">₹{plan.price}</div>
                      <div className="text-sm text-gray-500">per month</div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      Available Modules:
                    </div>
                    {(plan.allowedModules ?? []).slice(0, 8).map((module: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{module}</span>
                      </div>
                    ))}
                    {(plan.allowedModules ?? []).length > 8 && (
                      <div className="text-sm text-gray-500 text-center italic">
                        +{(plan.allowedModules ?? []).length - 8} more modules
                      </div>
                    )}
                    
                    <div className="pt-4 border-t">
                      <p className="text-xs text-center text-green-600 dark:text-green-400 font-semibold">
                        ✓ 7 days on the spot refund guaranteed<br/>no questions asked
                      </p>
                    </div>
                    
                    <Button 
                      className={`w-full mt-6 ${index === 1 ? 'bg-yellow-400 text-black hover:bg-yellow-300 font-bold' : 'bg-blue-600 hover:bg-blue-700'}`}
                      onClick={() => {
                        setSelectedPlan(plan);
                        setPaymentForm({ ...paymentForm, plan: plan.name });
                        setShowRegistrationForm(true);
                        setTimeout(() => {
                          document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      data-testid={`button-select-plan-${index}`}
                    >
                      Select {plan.name.toUpperCase()}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
              ))}
            </div>
          )}

          {/* Registration Form - Shows after plan selection */}
          {showRegistrationForm && selectedPlan && (
            <motion.div
              id="registration-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-16 max-w-2xl mx-auto"
            >
              <Card className="border-2 border-yellow-400 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-400 text-center">
                  <CardTitle className="text-2xl font-bold text-black">
                    REGISTER FOR {selectedPlan.name.toUpperCase()} PLAN
                  </CardTitle>
                  <p className="text-black/80">Enter your details to proceed to payment</p>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="payment-name">Full Name *</Label>
                      <Input
                        id="payment-name"
                        value={paymentForm.name}
                        onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                        placeholder="Enter your full name"
                        required
                        data-testid="input-payment-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment-email">Email Address *</Label>
                      <Input
                        id="payment-email"
                        type="email"
                        value={paymentForm.email}
                        onChange={(e) => setPaymentForm({ ...paymentForm, email: e.target.value })}
                        placeholder="your.email@company.com"
                        required
                        data-testid="input-payment-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment-mobile">Mobile Number *</Label>
                      <Input
                        id="payment-mobile"
                        type="tel"
                        pattern="[0-9]{10}"
                        value={paymentForm.mobile}
                        onChange={(e) => setPaymentForm({ ...paymentForm, mobile: e.target.value })}
                        placeholder="10-digit mobile number"
                        required
                        data-testid="input-payment-mobile"
                      />
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">Selected Plan:</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedPlan.name.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Amount:</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{selectedPlan.price}/month</span>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-black hover:from-yellow-300 hover:to-orange-300 font-bold text-lg py-6"
                      data-testid="button-proceed-payment"
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      Proceed to Payment
                    </Button>
                    <p className="text-xs text-center text-gray-500 mt-2">
                      Secure payment powered by Razorpay
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </section>

      {/* Scroll to Pricing CTA */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 py-4">
        <div className="container mx-auto text-center">
          <Button 
            variant="ghost" 
            className="text-black font-bold hover:bg-white/20"
            onClick={scrollToPricing}
            data-testid="button-cta-back-to-plans"
          >
            Go Back to Plans <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4 bg-white dark:bg-gray-950">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
              Why Choose RECOV
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Benefits of{" "}
              <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                This Software
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Transform your payment recovery process with cutting-edge automation
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-yellow-400" data-testid={`card-benefit-${index}`}>
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-lg ${benefit.color} flex items-center justify-center mb-4`}>
                      <benefit.icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scroll to Pricing CTA */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 py-4">
        <div className="container mx-auto text-center">
          <Button 
            variant="ghost" 
            className="text-black font-bold hover:bg-white/20"
            onClick={scrollToPricing}
            data-testid="button-cta-start-trial"
          >
            Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400">
              Customer Success Stories
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              What Our{" "}
              <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Clients Say
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Join 500+ businesses transforming their payment recovery
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full bg-white dark:bg-gray-900 hover:shadow-xl transition-all" data-testid={`card-testimonial-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <Quote className="h-8 w-8 text-gray-300 dark:text-gray-700 mb-4" />
                    <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center gap-3">
                      <img 
                        src={testimonial.image} 
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{testimonial.role}</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">{testimonial.company}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scroll to Pricing CTA */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 py-4">
        <div className="container mx-auto text-center">
          <Button 
            variant="ghost" 
            className="text-black font-bold hover:bg-white/20"
            onClick={scrollToPricing}
            data-testid="button-cta-join-success"
          >
            Join Our Success Stories <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* About Us Section */}
      <section id="about" className="py-20 px-4 bg-white dark:bg-gray-950">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
              About RECOV
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              India's Most{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Trusted Platform
              </span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="prose prose-lg dark:prose-invert max-w-none"
          >
            <Card className="border-2">
              <CardContent className="p-8">
                <div className="space-y-6 text-gray-700 dark:text-gray-300">
                  <p className="text-xl leading-relaxed">
                    RECOV is India's first fully automated payment recovery software, revolutionizing how businesses 
                    manage their receivables. Founded in 2023, we've helped over 500+ companies recover millions 
                    in outstanding payments through intelligent automation.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6 my-8">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Active Clients</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">₹100Cr+</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Recovered</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-purple-600 mb-2">40%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Avg. Improvement</div>
                    </div>
                  </div>

                  <p className="text-lg leading-relaxed">
                    <strong>Our Mission:</strong> To eliminate payment delays and help businesses grow by ensuring 
                    timely cash flow through cutting-edge AI technology and multi-channel communication.
                  </p>

                  <p className="text-lg leading-relaxed">
                    <strong>Our Vision:</strong> To become the #1 payment recovery platform globally, empowering 
                    millions of businesses to achieve financial stability and predictable cash flows.
                  </p>

                  <div className="flex flex-wrap gap-4 justify-center mt-8">
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 px-4 py-2 rounded-full">
                      <Award className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">ISO Certified</span>
                    </div>
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 px-4 py-2 rounded-full">
                      <Shield className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Bank-Level Security</span>
                    </div>
                    <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950 px-4 py-2 rounded-full">
                      <Target className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold">24/7 Support</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">R</span>
                </div>
                <span className="text-2xl font-bold">RECOV</span>
              </div>
              <p className="text-gray-400 text-sm">
                India's #1 Automated Payment Recovery Platform
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#pricing" className="hover:text-white" data-testid="link-footer-pricing">Pricing</a></li>
                <li><a href="#benefits" className="hover:text-white" data-testid="link-footer-benefits">Benefits</a></li>
                <li><a href="#testimonials" className="hover:text-white" data-testid="link-footer-testimonials">Testimonials</a></li>
                <li><a href="#about" className="hover:text-white" data-testid="link-footer-about">About Us</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/login" className="hover:text-white" data-testid="link-footer-login">Login</Link></li>
                <li><a href="#" className="hover:text-white" data-testid="link-footer-help">Help Center</a></li>
                <li><a href="#" className="hover:text-white" data-testid="link-footer-docs">Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white" data-testid="link-footer-privacy">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white" data-testid="link-footer-terms">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white" data-testid="link-footer-refund">Refund Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>© 2025 RECOV by WizOne IT. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
