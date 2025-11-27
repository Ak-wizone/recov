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
  AlertCircle,
  RefreshCw,
  DollarSign,
  UserPlus,
  FileText,
  UserCheck,
  Calculator,
  Bot,
  Mic,
  PhoneCall,
  TrendingDown,
  Users2,
  AlertTriangle,
  LineChart,
} from "lucide-react";
import recovLogo from "@assets/image_1763577879371.png";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const benefits = [
  {
    icon: DollarSign,
    title: "Recovery From Defaulters",
    description: "Automated system to recover payments from customers with outstanding dues efficiently",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: UserPlus,
    title: "Auto-Connect Defaulters",
    description: "Automatically identify and connect with defaulters through multiple channels",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: FileText,
    title: "Online Click Payment Collection Reports",
    description: "Generate comprehensive payment collection reports with a single click",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: UserCheck,
    title: "One Click Client Cibil Check",
    description: "Instantly verify client credit scores and payment history",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: Calculator,
    title: "Profit Per Invoice Calculator",
    description: "Calculate exact profit margins for each invoice automatically",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: Bot,
    title: "Smart AI Collection Follow Ups",
    description: "AI-powered intelligent follow-ups based on customer behavior patterns",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: Mic,
    title: "Recorded Collection Calls",
    description: "All collection calls are recorded and stored for quality and compliance",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: PhoneCall,
    title: "Strict AI Collection Calls",
    description: "Automated professional AI calls for strict payment recovery",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: Target,
    title: "Recovery-X Collections",
    description: "Advanced recovery system designed for maximum collection efficiency",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: TrendingDown,
    title: "Auto Segregate bad Payers",
    description: "Identify and manage customers with poor payment track records",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: AlertTriangle,
    title: "Cheque Bounce Control",
    description: "Track and manage cheque bounce incidents with automated alerts",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: LineChart,
    title: "Collection Forecast",
    description: "Predict future cash flow based on payment patterns and trends",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: Mic,
    title: "Use your own AI voice for collection formula",
    description: "Customize AI voice calls with your own voice for personalized collections",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
  },
  {
    icon: Zap,
    title: "30-40% Faster Collection",
    description: "Accelerate your payment recovery with AI-powered automation and smart follow-ups",
    color: "bg-orange-100 text-[#FF6D1F] dark:bg-orange-900/30 dark:text-orange-400"
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
  const [timeLeft, setTimeLeft] = useState({ minutes: 5, seconds: 0 });
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
      setTimeLeft((prev: { minutes: number; seconds: number }) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
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
          color: "#FF6D1F", // Orange color matching the brand
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
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#FF6D1F] to-[#FF8C42] text-white py-3 px-4 pointer-events-none">
        <div className="container mx-auto flex items-center justify-between gap-3 md:gap-6 text-sm md:text-base flex-wrap">
          {/* Logo */}
          <div className="flex-shrink-0 pointer-events-auto">
            <img src={recovLogo} alt="RECOV Logo" className="h-8 md:h-10 w-auto" data-testid="img-logo-header" />
          </div>
          
          {/* Timer and CTA */}
          <div className="flex items-center justify-center gap-3 md:gap-6 flex-wrap flex-1">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 md:h-5 md:w-5 animate-pulse" />
              <span className="font-semibold text-xs md:text-base">PRICE INCREASE IN:</span>
            </div>
            <div className="flex gap-2">
              <div className="bg-white/20 px-4 py-2 rounded-lg">
                <span className="font-bold text-lg md:text-2xl">{timeLeft.minutes}</span>
                <span className="text-xs md:text-sm ml-1">MIN</span>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg">
                <span className="font-bold text-lg md:text-2xl">{timeLeft.seconds}</span>
                <span className="text-xs md:text-sm ml-1">SEC</span>
              </div>
            </div>
            <Button 
              size="sm" 
              className="bg-yellow-400 text-black hover:bg-yellow-300 font-bold text-xs md:text-sm pointer-events-auto"
              onClick={scrollToPricing}
              data-testid="button-timer-cta"
            >
              LOCK CURRENT PRICE
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="pt-32 md:pt-40 pb-12 md:pb-20 px-4 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-5xl mx-auto"
          >
            <Badge className="mb-4 md:mb-6 bg-yellow-400 text-black hover:bg-yellow-300 text-sm md:text-base px-3 md:px-4 py-1.5 md:py-2" data-testid="badge-hero">
              <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-2" />
              India's #1 Payment Recovery Platform
            </Badge>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight px-2">
              <span className="bg-gradient-to-r from-[#FF6D1F] via-[#FF8C42] to-[#FF6D1F] bg-clip-text text-transparent">
                GET YOUR PAYMENTS
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">
                ON TIME - ALWAYS
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl md:text-3xl text-gray-700 dark:text-gray-300 mb-3 md:mb-4 font-semibold px-2">
              INDIA'S FIRST FULLY AUTOMATED
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl text-gray-700 dark:text-gray-300 mb-6 md:mb-8 font-semibold px-2">
              PAYMENT RECOVERY SOFTWARE
            </p>

            {/* YouTube Portrait Video */}
            <div className="mb-6 md:mb-8 max-w-md mx-auto">
              <div className="relative bg-gray-900 dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl aspect-[9/16]">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/K6-ozfSX5hk?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3"
                  title="RECOV Payment Recovery Platform Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  data-testid="video-hero"
                ></iframe>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 md:gap-4 justify-center mb-8 md:mb-12 px-2">
              <Button 
                size="lg" 
                className="bg-[#FF6D1F] hover:bg-[#E65D1A] text-white text-base md:text-lg px-6 md:px-8 py-4 md:py-6 font-bold shadow-lg w-full sm:w-auto"
                onClick={scrollToPricing}
                data-testid="button-hero-cta"
              >
                START YOUR PAYMENT COLLECTION <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 md:gap-6 justify-center text-sm md:text-base text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#FF6D1F]" />
                <span className="font-medium">100% Automated</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 md:py-20 px-4 bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 md:mb-16"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block mb-4"
            >
              <Badge className="bg-gradient-to-r from-[#FF6D1F] to-[#FF8C42] text-white hover:from-[#E65D1A] hover:to-[#FF7D32] text-sm md:text-base px-4 py-2 shadow-lg">
                ✓ 7-Day Money-Back Guarantee
              </Badge>
            </motion.div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold px-2">
              Choose Your{" "}
              <span className="bg-gradient-to-r from-[#FF6D1F] to-[#FF8C42] bg-clip-text text-transparent">
                Perfect Plan
              </span>
            </h2>
          </motion.div>

          {plansLoading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-full relative overflow-hidden" data-testid={`skeleton-plan-${i}`}>
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <CardHeader className="text-center space-y-4">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-3/4 mx-auto" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-1/2 mx-auto" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-5/6" />
                    ))}
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mt-6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {plansError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-12"
            >
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 max-w-md mx-auto shadow-lg">
                <div className="mb-4 flex justify-center">
                  <div className="bg-red-100 dark:bg-red-900 rounded-full p-4">
                    <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                  Oops! Plans Aren't Loading
                </h3>
                <p className="text-red-600/80 dark:text-red-400/80 mb-6">
                  Please check your connection and try again
                </p>
                <Button 
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105" 
                  onClick={() => window.location.reload()}
                  data-testid="button-retry-plans"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}

          {!plansLoading && !plansError && subscriptionPlans.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {subscriptionPlans.map((plan, index) => {
                const planColors = [
                  { gradient: 'from-[#FF6D1F] to-[#E65D1A]', border: 'border-orange-300', bg: 'bg-orange-50 dark:bg-orange-950' },
                  { gradient: 'from-[#FF8C42] to-[#FF6D1F]', border: 'border-orange-300', bg: 'bg-orange-50 dark:bg-orange-950' },
                  { gradient: 'from-[#FFA55E] to-[#FF8C42]', border: 'border-orange-300', bg: 'bg-orange-50 dark:bg-orange-950' }
                ];
                const colors = planColors[index % 3];
                const moduleCount = (plan.allowedModules ?? []).length;
                
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    className="relative"
                  >
                    {index === 1 && (
                      <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold px-4 py-1 shadow-lg animate-pulse">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          MOST POPULAR
                        </Badge>
                      </div>
                    )}
                    <Card 
                      className={`h-full transition-all duration-300 hover:shadow-2xl ${
                        index === 1 
                          ? 'border-4 border-yellow-400 shadow-2xl scale-105' 
                          : `border-2 ${colors.border} hover:${colors.border}`
                      }`} 
                      data-testid={`card-plan-${index}`}
                    >
                      <CardHeader className={`text-center ${colors.bg} rounded-t-lg pb-6`}>
                        <div className="mb-2">
                          <Badge className={`bg-gradient-to-r ${colors.gradient} text-white px-3 py-1`}>
                            <Sparkles className="h-3 w-3 mr-1" />
                            {moduleCount} Modules
                          </Badge>
                        </div>
                        <CardTitle className="text-2xl font-bold mb-2">{plan.name.toUpperCase()}</CardTitle>
                        <div className="mb-2">
                          <div className={`text-5xl font-bold bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`}>
                            ₹{plan.price}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">per month</div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-6">
                        <div className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center justify-center gap-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          Full Access To:
                        </div>
                        {(plan.allowedModules ?? []).slice(0, 8).map((module: string, i: number) => (
                          <motion.div 
                            key={i} 
                            className="flex items-start gap-2"
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm font-medium">{module}</span>
                          </motion.div>
                        ))}
                        {moduleCount > 8 && (
                          <div className="text-sm text-gray-500 text-center italic font-semibold">
                            +{moduleCount - 8} more modules
                          </div>
                        )}
                        
                        <div className={`pt-4 border-t-2 ${colors.border} mt-4`}>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Shield className="h-5 w-5 text-green-600" />
                            <p className="text-sm text-center text-green-600 dark:text-green-400 font-bold">
                              7-Day Money-Back Guarantee
                            </p>
                          </div>
                          <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                            Full refund, no questions asked
                          </p>
                        </div>
                        
                        <Button 
                          className={`w-full mt-6 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-xl ${
                            index === 1 
                              ? 'bg-yellow-400 text-black hover:bg-yellow-300 font-bold' 
                              : `bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white font-semibold`
                          }`}
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
                          <Zap className="h-4 w-4 mr-2" />
                          Select {plan.name.toUpperCase()}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
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
                    <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">Selected Plan:</span>
                        <span className="text-[#FF6D1F] dark:text-orange-400 font-bold">{selectedPlan.name.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Amount:</span>
                        <span className="text-2xl font-bold text-[#FF6D1F] dark:text-orange-400">₹{selectedPlan.price}/month</span>
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

      {/* Benefits Section - Honeycomb Layout */}
      <section id="benefits" className="py-12 md:py-20 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 overflow-hidden">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 md:mb-6 px-2">
              <span className="text-gray-900 dark:text-white">Why Choose </span>
              <span className="bg-gradient-to-r from-[#FF6D1F] to-[#FF8C42] bg-clip-text text-transparent">
                RECOV
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
              Make your slow payments fast, and start recovering your blocked payments today.
            </p>
          </motion.div>

          {/* Honeycomb Grid */}
          <div className="hidden lg:block">
            {/* Row 1 - 3 hexagons */}
            <div className="flex justify-center gap-4 mb-[-30px]">
              {benefits.slice(0, 3).map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="group"
                >
                  <div 
                    className="w-[220px] h-[250px] bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center p-6 cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-[#FF6D1F] dark:hover:border-[#FF6D1F]"
                    style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                    data-testid={`hexagon-benefit-${index}`}
                  >
                    <motion.div 
                      className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3 group-hover:bg-[#FF6D1F] transition-colors duration-300"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <benefit.icon className="h-7 w-7 text-[#FF6D1F] group-hover:text-white transition-colors duration-300" />
                    </motion.div>
                    <h3 className="text-sm font-bold text-center text-gray-900 dark:text-white group-hover:text-[#FF6D1F] transition-colors duration-300 leading-tight px-2">
                      {benefit.title}
                    </h3>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Row 2 - 4 hexagons (offset) */}
            <div className="flex justify-center gap-4 mb-[-30px]">
              {benefits.slice(3, 7).map((benefit, index) => (
                <motion.div
                  key={index + 3}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: (index + 3) * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="group"
                >
                  <div 
                    className="w-[220px] h-[250px] bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center p-6 cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-[#FF6D1F] dark:hover:border-[#FF6D1F]"
                    style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                    data-testid={`hexagon-benefit-${index + 3}`}
                  >
                    <motion.div 
                      className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3 group-hover:bg-[#FF6D1F] transition-colors duration-300"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <benefit.icon className="h-7 w-7 text-[#FF6D1F] group-hover:text-white transition-colors duration-300" />
                    </motion.div>
                    <h3 className="text-sm font-bold text-center text-gray-900 dark:text-white group-hover:text-[#FF6D1F] transition-colors duration-300 leading-tight px-2">
                      {benefit.title}
                    </h3>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Row 3 - 4 hexagons */}
            <div className="flex justify-center gap-4 mb-[-30px]">
              {benefits.slice(7, 11).map((benefit, index) => (
                <motion.div
                  key={index + 7}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: (index + 7) * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="group"
                >
                  <div 
                    className="w-[220px] h-[250px] bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center p-6 cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-[#FF6D1F] dark:hover:border-[#FF6D1F]"
                    style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                    data-testid={`hexagon-benefit-${index + 7}`}
                  >
                    <motion.div 
                      className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3 group-hover:bg-[#FF6D1F] transition-colors duration-300"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <benefit.icon className="h-7 w-7 text-[#FF6D1F] group-hover:text-white transition-colors duration-300" />
                    </motion.div>
                    <h3 className="text-sm font-bold text-center text-gray-900 dark:text-white group-hover:text-[#FF6D1F] transition-colors duration-300 leading-tight px-2">
                      {benefit.title}
                    </h3>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Row 4 - 3 hexagons (offset) */}
            <div className="flex justify-center gap-4">
              {benefits.slice(11, 14).map((benefit, index) => (
                <motion.div
                  key={index + 11}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: (index + 11) * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="group"
                >
                  <div 
                    className="w-[220px] h-[250px] bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center p-6 cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-[#FF6D1F] dark:hover:border-[#FF6D1F]"
                    style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                    data-testid={`hexagon-benefit-${index + 11}`}
                  >
                    <motion.div 
                      className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3 group-hover:bg-[#FF6D1F] transition-colors duration-300"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <benefit.icon className="h-7 w-7 text-[#FF6D1F] group-hover:text-white transition-colors duration-300" />
                    </motion.div>
                    <h3 className="text-sm font-bold text-center text-gray-900 dark:text-white group-hover:text-[#FF6D1F] transition-colors duration-300 leading-tight px-2">
                      {benefit.title}
                    </h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile/Tablet Grid - Regular cards for smaller screens */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                whileHover={{ y: -5 }}
                className="group"
              >
                <div 
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-center border border-gray-100 dark:border-gray-700 hover:border-[#FF6D1F] dark:hover:border-[#FF6D1F]"
                  data-testid={`card-benefit-mobile-${index}`}
                >
                  <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#FF6D1F] transition-colors duration-300">
                    <benefit.icon className="h-7 w-7 text-[#FF6D1F] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-[#FF6D1F] transition-colors duration-300">
                    {benefit.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-12 md:py-20 px-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 md:mb-16"
          >
            <Badge className="mb-4 bg-orange-100 text-[#FF6D1F] hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400">
              Customer Success Stories
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 px-2">
              What Our{" "}
              <span className="bg-gradient-to-r from-[#FF6D1F] to-[#FF8C42] bg-clip-text text-transparent">
                Clients Say
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 px-2">
              Join our success stories
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
                        <div className="text-sm text-[#FF6D1F] dark:text-orange-400">{testimonial.company}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <img src={recovLogo} alt="RECOV Logo" className="h-10 md:h-12 w-auto" data-testid="img-logo-footer" />
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
