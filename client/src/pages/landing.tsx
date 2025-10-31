import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  FileText,
  Receipt,
  Users,
  TrendingUp,
  Zap,
  Mail,
  MessageSquare,
  Phone,
  Shield,
  Target,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Calendar,
  DollarSign,
  AlertCircle,
  BookOpen,
  Activity,
  Award,
  Bell,
  CreditCard,
  Database,
  Eye,
  Filter,
  Globe,
  Heart,
  Layers,
  Lock,
  PieChart,
  RefreshCw,
  Search,
  Settings,
  Smartphone,
  TrendingDown,
  UserCheck,
  Wallet,
  XCircle
} from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const features = [
  {
    icon: BarChart3,
    title: "Business Overview",
    description: "Real-time analytics dashboard with financial snapshots and KPIs",
    color: "bg-blue-100 text-blue-600"
  },
  {
    icon: Users,
    title: "Lead Management",
    description: "Capture, track, and convert leads with intelligent assignment",
    color: "bg-purple-100 text-purple-600"
  },
  {
    icon: FileText,
    title: "Smart Invoicing",
    description: "Auto-calculated invoices with FIFO allocation and interest tracking",
    color: "bg-green-100 text-green-600"
  },
  {
    icon: Receipt,
    title: "Receipt Tracking",
    description: "Seamless payment collection with multiple voucher types",
    color: "bg-amber-100 text-amber-600"
  },
  {
    icon: Wallet,
    title: "Credit Management",
    description: "Monitor credit limits, utilization, and customer behavior",
    color: "bg-pink-100 text-pink-600"
  },
  {
    icon: BookOpen,
    title: "Customer Ledger",
    description: "Complete transaction history with PDF export and sharing",
    color: "bg-indigo-100 text-indigo-600"
  },
  {
    icon: Target,
    title: "Action Center",
    description: "Daily tasks, call queues, and priority follow-ups",
    color: "bg-red-100 text-red-600"
  },
  {
    icon: Award,
    title: "Team Performance",
    description: "Leaderboards, targets, and achievement tracking",
    color: "bg-orange-100 text-orange-600"
  },
  {
    icon: AlertCircle,
    title: "Risk Assessment",
    description: "Client risk thermometer and payment forecasting",
    color: "bg-cyan-100 text-cyan-600"
  },
  {
    icon: Bell,
    title: "Smart Automation",
    description: "Automated follow-ups via Email, WhatsApp, and AI calls",
    color: "bg-teal-100 text-teal-600"
  },
  {
    icon: PieChart,
    title: "Customer Analytics",
    description: "Deep insights into payment patterns and behavior",
    color: "bg-violet-100 text-violet-600"
  },
  {
    icon: Shield,
    title: "Credit Control",
    description: "Automated category upgrades and recovery management",
    color: "bg-emerald-100 text-emerald-600"
  }
];

const benefits = [
  {
    icon: Zap,
    title: "Lightning Fast Setup",
    description: "Get started in minutes with automatic tenant provisioning and guided onboarding"
  },
  {
    icon: Database,
    title: "Bulk Operations",
    description: "Import thousands of records via Excel with inline editing and duplicate detection"
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    description: "Role-based access control with granular permissions across all modules"
  },
  {
    icon: RefreshCw,
    title: "Real-time Sync",
    description: "WebSocket integration ensures live data updates across all users"
  },
  {
    icon: Globe,
    title: "Multi-tenant SaaS",
    description: "Built for scale with complete tenant isolation and custom module access"
  },
  {
    icon: Smartphone,
    title: "Mobile Responsive",
    description: "Works perfectly on all devices with adaptive layouts and dark mode"
  }
];

const integrations = [
  {
    icon: Mail,
    name: "Email Integration",
    description: "Gmail OAuth2/SMTP with customizable templates",
    color: "text-blue-600"
  },
  {
    icon: MessageSquare,
    name: "WhatsApp Business",
    description: "Multi-provider support with automated messaging",
    color: "text-green-600"
  },
  {
    icon: Phone,
    name: "AI Voice Calling",
    description: "Ringg.ai integration for automated outbound calls",
    color: "text-purple-600"
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
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
            <div className="flex items-center gap-4">
              <Link href="/pricing">
                <Button variant="ghost" data-testid="link-pricing">Pricing</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" data-testid="link-login">Login</Button>
              </Link>
              <Link href="/register-tenant">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" data-testid="button-get-started">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400" data-testid="badge-hero">
              <Sparkles className="h-3 w-3 mr-1" />
              AI-Powered Business Management
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Transform Your Business with{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Smart Recovery
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              All-in-one platform for invoicing, payment tracking, automated follow-ups, 
              and intelligent credit management. Powered by AI voice assistants.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/register-tenant">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8" data-testid="button-start-free">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8" data-testid="button-view-pricing">
                  View Pricing
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-6 justify-center text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Setup in 5 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white dark:bg-gray-950">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
              Powerful Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Manage Growth
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              15+ integrated modules designed to streamline operations and boost productivity
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={fadeIn}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200 dark:hover:border-blue-800 group" data-testid={`card-feature-${index}`}>
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
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
              Built for{" "}
              <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Modern Businesses
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-4"
                data-testid={`benefit-${index}`}
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <benefit.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Communication Integrations */}
      <section className="py-20 px-4 bg-white dark:bg-gray-950">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
              Smart Automation
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Automated{" "}
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Communication
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Reach customers across multiple channels with intelligent automation
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {integrations.map((integration, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 hover:border-amber-200 dark:hover:border-amber-800" data-testid={`card-integration-${index}`}>
                  <CardHeader>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mx-auto mb-4">
                      <integration.icon className={`h-8 w-8 ${integration.color}`} />
                    </div>
                    <CardTitle className="text-xl">{integration.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400">{integration.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 text-center"
          >
            <Card className="max-w-3xl mx-auto bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-2 border-amber-200 dark:border-amber-800">
              <CardContent className="py-8">
                <h3 className="text-2xl font-bold mb-4">Automated Follow-up Schedules</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  Set unlimited reminder schedules with flexible triggers: before due date, after due date, 
                  fixed weekly, or monthly. Each schedule can use Email, WhatsApp, or AI voice calls with 
                  custom templates mapped to specific customer categories.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Badge variant="secondary" className="text-sm">Days Before Due</Badge>
                  <Badge variant="secondary" className="text-sm">Days After Due</Badge>
                  <Badge variant="secondary" className="text-sm">Fixed Weekly</Badge>
                  <Badge variant="secondary" className="text-sm">Fixed Monthly</Badge>
                  <Badge variant="secondary" className="text-sm">Category Filtering</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join hundreds of businesses using RECOV to streamline operations 
              and boost collections by up to 40%
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/register-tenant">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8" data-testid="button-cta-start">
                  Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8" data-testid="button-cta-pricing">
                  View Pricing Plans
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold">R</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  RECOV
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                AI-powered business management platform for modern enterprises.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/pricing"><a className="hover:text-blue-600 dark:hover:text-blue-400">Pricing</a></Link></li>
                <li><a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400">Features</a></li>
                <li><a href="#integrations" className="hover:text-blue-600 dark:hover:text-blue-400">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">About Us</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Contact</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>© 2025 RECOV. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
