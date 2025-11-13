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

const pricingPlans = [
  {
    name: "STANDARD",
    price: "₹10,000",
    period: "per month",
    features: [
      "Up to 10 Users",
      "Basic CRM Features",
      "Email Support",
      "Invoice Management",
      "Payment Tracking",
      "Basic Reports"
    ],
    highlighted: false,
    items: "10",
  },
  {
    name: "PREMIUM",
    price: "₹25,000",
    period: "per month",
    features: [
      "Up to 25 Users",
      "Advanced CRM Features",
      "Priority Support",
      "Automated Follow-ups",
      "WhatsApp Integration",
      "Advanced Analytics",
      "Credit Management",
      "Risk Assessment"
    ],
    highlighted: true,
    badge: "HIGHEST SELLING",
    items: "25",
  },
  {
    name: "STAR",
    price: "₹35,000",
    period: "per month",
    features: [
      "Up to 35 Users",
      "All Premium Features",
      "AI Voice Calling",
      "Custom Workflows",
      "Dedicated Manager",
      "API Access",
      "Custom Reports",
      "Multi-branch Support"
    ],
    highlighted: false,
    items: "35",
  },
  {
    name: "PLATINUM",
    price: "Contact Us",
    period: "custom pricing",
    features: [
      "Unlimited Users",
      "All Star Features",
      "White Label Solution",
      "Custom Integrations",
      "24/7 Support",
      "Training Sessions",
      "Custom Development",
      "SLA Guarantee"
    ],
    highlighted: false,
    items: "Unlimited",
  }
];

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
    icon: TrendingUp,
    title: "Boost Collections by 40%",
    description: "Our clients see an average 40% improvement in payment collection rates within 3 months",
    color: "bg-green-100 text-green-600"
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
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 12, minutes: 30, seconds: 45 });
  const [contactForm, setContactForm] = useState({ name: "", email: "", mobile: "", message: "" });
  const [paymentForm, setPaymentForm] = useState({ name: "", email: "", mobile: "", plan: "" });

  // Countdown timer for price increment
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 24 hours.",
    });
    setContactForm({ name: "", email: "", mobile: "", message: "" });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentForm.plan) {
      toast({
        title: "Please select a plan",
        variant: "destructive",
      });
      return;
    }

    // Get selected plan details
    const selectedPlan = pricingPlans.find(p => p.name === paymentForm.plan);
    if (!selectedPlan) {
      toast({
        title: "Invalid plan selected",
        variant: "destructive",
      });
      return;
    }

    // For "Contact Us" plans
    if (selectedPlan.price === "Contact Us") {
      toast({
        title: "Please Contact Sales",
        description: "For custom pricing, please reach out to our sales team.",
      });
      return;
    }

    // Extract amount from price string (e.g., "₹9,999/month" -> 9999)
    const amount = parseFloat(selectedPlan.price.replace(/[₹,]/g, ""));

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
            setPaymentForm({ name: "", email: "", mobile: "", plan: "" });
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
              <a href="#contact" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 font-medium" data-testid="link-nav-contact">Contact</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="outline" data-testid="link-login">Login</Button>
              </Link>
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
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 border-2"
                data-testid="button-watch-demo"
              >
                Watch Demo Video
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 justify-center text-base text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">40% Faster Collections</span>
              </div>
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

      {/* Scroll to Pricing CTA */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 py-4">
        <div className="container mx-auto text-center">
          <Button 
            variant="ghost" 
            className="text-black font-bold hover:bg-white/20"
            onClick={scrollToPricing}
            data-testid="button-cta-view-plans-1"
          >
            View Plans <ChevronDown className="ml-2 h-4 w-4 animate-bounce" />
          </Button>
        </div>
      </div>

      {/* Video Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-950">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
              See It In Action
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Watch How RECOV{" "}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Works
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              2-minute overview of our automated payment recovery system
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative aspect-video rounded-xl overflow-hidden shadow-2xl border-4 border-gray-200 dark:border-gray-800"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:scale-110 transition-transform">
                  <div className="w-0 h-0 border-l-[20px] border-l-blue-600 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1"></div>
                </div>
                <p className="text-white text-lg font-semibold">Click to Watch Demo</p>
                <p className="text-white/80 text-sm">(YouTube video will be embedded here)</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Scroll to Pricing CTA */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 py-4">
        <div className="container mx-auto text-center">
          <Button 
            variant="ghost" 
            className="text-black font-bold hover:bg-white/20"
            onClick={scrollToPricing}
            data-testid="button-cta-view-pricing"
          >
            View Pricing Plans <ChevronDown className="ml-2 h-4 w-4 animate-bounce" />
          </Button>
        </div>
      </div>

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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold px-4 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <Card className={`h-full ${plan.highlighted ? 'border-4 border-yellow-400 shadow-2xl scale-105' : 'border-2'}`} data-testid={`card-plan-${index}`}>
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                    <div className="mb-4">
                      <div className="text-4xl font-bold text-blue-600">{plan.price}</div>
                      <div className="text-sm text-gray-500">{plan.period}</div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <strong>{plan.items}</strong> Items Included
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    <Button 
                      className={`w-full mt-6 ${plan.highlighted ? 'bg-yellow-400 text-black hover:bg-yellow-300 font-bold' : 'bg-blue-600 hover:bg-blue-700'}`}
                      onClick={scrollToPricing}
                      data-testid={`button-select-plan-${index}`}
                    >
                      Select {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Razorpay Payment Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 max-w-2xl mx-auto"
          >
            <Card className="border-2 border-yellow-400 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-400 text-center">
                <CardTitle className="text-2xl font-bold text-black">
                  DIRECT RAZORPAY PAYMENT
                </CardTitle>
                <p className="text-black/80">Enter your details to proceed</p>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="payment-name">Name *</Label>
                    <Input
                      id="payment-name"
                      value={paymentForm.name}
                      onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                      required
                      data-testid="input-payment-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-email">Email *</Label>
                    <Input
                      id="payment-email"
                      type="email"
                      value={paymentForm.email}
                      onChange={(e) => setPaymentForm({ ...paymentForm, email: e.target.value })}
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
                      required
                      data-testid="input-payment-mobile"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-plan">Select Plan *</Label>
                    <select
                      id="payment-plan"
                      value={paymentForm.plan}
                      onChange={(e) => setPaymentForm({ ...paymentForm, plan: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                      data-testid="select-payment-plan"
                    >
                      <option value="">Choose a plan...</option>
                      {pricingPlans.map((plan, i) => (
                        <option key={i} value={plan.name}>{plan.name} - {plan.price}</option>
                      ))}
                    </select>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-black hover:from-yellow-300 hover:to-orange-300 font-bold text-lg py-6"
                    data-testid="button-proceed-payment"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Proceed to Payment
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
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

      {/* Scroll to Pricing CTA */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 py-4">
        <div className="container mx-auto text-center">
          <Button 
            variant="ghost" 
            className="text-black font-bold hover:bg-white/20"
            onClick={scrollToPricing}
            data-testid="button-cta-explore-plans"
          >
            Explore Plans <ChevronDown className="ml-2 h-4 w-4 animate-bounce" />
          </Button>
        </div>
      </div>

      {/* Contact Us Section */}
      <section id="contact" className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400">
              Get In Touch
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Contact{" "}
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Our Team
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Have questions? We're here to help 24/7
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Send Us a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="contact-name">Name *</Label>
                      <Input
                        id="contact-name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-email">Email *</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                        data-testid="input-contact-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-mobile">Mobile Number *</Label>
                      <Input
                        id="contact-mobile"
                        type="tel"
                        pattern="[0-9]{10}"
                        value={contactForm.mobile}
                        onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })}
                        required
                        data-testid="input-contact-mobile"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-message">Message *</Label>
                      <Textarea
                        id="contact-message"
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        required
                        data-testid="textarea-contact-message"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                      data-testid="button-send-message"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Phone</h3>
                      <p className="text-gray-600 dark:text-gray-400">+91 98765 43210</p>
                      <p className="text-gray-600 dark:text-gray-400">+91 98765 43211</p>
                      <p className="text-sm text-gray-500 mt-1">Mon-Sat, 9AM-7PM IST</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Email</h3>
                      <p className="text-gray-600 dark:text-gray-400">support@recov.in</p>
                      <p className="text-gray-600 dark:text-gray-400">sales@recov.in</p>
                      <p className="text-sm text-gray-500 mt-1">24/7 Support</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Office</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        123 Business Park, MG Road<br />
                        Bangalore, Karnataka - 560001<br />
                        India
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to Get Your Payments On Time?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join 500+ businesses already using RECOV to boost collections by 40%
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-yellow-400 text-black hover:bg-yellow-300 text-lg px-8 font-bold shadow-xl"
                onClick={scrollToPricing}
                data-testid="button-final-cta"
              >
                START FREE TRIAL NOW <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-white text-white hover:bg-white/10 text-lg px-8"
                onClick={scrollToPricing}
                data-testid="button-final-pricing"
              >
                View Pricing Plans
              </Button>
            </div>
            <p className="mt-6 text-sm opacity-75">
              ⏰ Limited time offer - Lock current prices before they increase!
            </p>
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
                <li><a href="#contact" className="hover:text-white" data-testid="link-footer-contact">Contact Us</a></li>
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
