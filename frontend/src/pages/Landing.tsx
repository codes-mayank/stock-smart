import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Box, BarChart3, Users, ShieldCheck, Zap, Package, ShoppingCart, Clock, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    id: 'inventory',
    icon: Clock,
    title: "Inventory & Expiry",
    howItWorks: "ShopSphere automates your inventory tracking. Add products via barcode scanning or manual entry. The system actively monitors shelf life and automatically categorizes items by their expiration risk.",
    bullets: ["7-day advance push notifications for expiring items", "Real-time stock level monitoring", "One-click reporting for near-expiry products"],
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: 'sales',
    icon: ShoppingCart,
    title: "Sales Tracking",
    howItWorks: "Turn your device into a powerful Point of Sale (POS) system. Process transactions swiftly, and the app will instantly update your inventory and log the sale in your daily ledger.",
    bullets: ["Instant inventory deduction upon sale", "Digital invoice generation", "Historical transaction search"],
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: 'khata',
    icon: BookOpen,
    title: "Credit Book (Khata)",
    howItWorks: "Maintain healthy relationships with regular customers by offering store credit. Log their purchases against their profile, record partial payments, and manage outstanding balances seamlessly.",
    bullets: ["Customer-specific credit limits", "Partial payment tracking", "Automated WhatsApp payment reminders"],
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: 'combos',
    icon: Layers,
    title: "Combo Offers",
    howItWorks: "Move slow-moving stock by bundling it with popular items. Create custom combo offers, set a special discounted price, and display them prominently to increase your average order value.",
    bullets: ["Custom bundle creation", "Automated profit margin calculation", "Promotional display on storefront"],
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: 'marketplace',
    icon: Package,
    title: "Global Marketplace",
    howItWorks: "Connect with a broader ecosystem of shopkeepers and suppliers. Browse wholesale catalogs, compare prices, and order stock directly through the ShopSphere network.",
    bullets: ["Direct supplier networking", "In-app purchase orders", "Wholesale price comparison"],
    image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: "Advanced Analytics",
    howItWorks: "Make data-driven decisions without needing a finance degree. Our dashboard automatically generates interactive charts showing your revenue, top-selling items, and peak business hours.",
    bullets: ["Daily, weekly, and monthly revenue charts", "Top 10 best-selling products list", "Peak hours traffic analysis"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: 'dashboards',
    icon: Users,
    title: "Multi-Role Dashboards",
    howItWorks: "Provide the right access to the right people. Create staff accounts for cashiers with limited permissions, while keeping full administrative and financial control for yourself.",
    bullets: ["Role-based access control (Admin/Staff/Customer)", "Cashier-specific POS view", "Action audit logs"],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: 'security',
    icon: ShieldCheck,
    title: "Secure Data",
    howItWorks: "Never worry about losing your ledger book or hardware crashes. All your business data is encrypted and synced to the cloud in real-time, accessible from any device, anywhere.",
    bullets: ["Real-time cloud synchronization", "End-to-end data encryption", "Automated daily backups"],
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=800&auto=format&fit=crop"
  }
];

const Landing = () => {
  const [activeFeature, setActiveFeature] = useState(features[0].id);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-xl backdrop-blur-md border border-primary/20">
            <Box className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight">ShopSphere</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/auth">
            <Button variant="ghost" className="hidden sm:inline-flex">Log in</Button>
          </Link>
          <Link to="/auth">
            <Button className="rounded-full shadow-lg shadow-primary/25">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 pt-12 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center px-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
            <Zap className="w-4 h-4" />
            <span>The Ultimate Platform for Shopkeepers</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Streamline your Shop with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">ShopSphere</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            More than just inventory management. From tracking expiry dates to managing credit books, creating combo offers, and connecting with a wider marketplace—we handle everything so you can focus on growing your business.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-full text-base px-8 py-6 h-auto shadow-xl shadow-primary/25 group">
                Start for free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/marketplace" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full text-base px-8 py-6 h-auto backdrop-blur-md bg-background/50 border-border/50 hover:bg-muted/50">
                Explore Marketplace
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Interactive Features Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-24 max-w-7xl mx-auto w-full px-6"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to run your shop</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Tap on any feature below to see exactly how it works in ShopSphere.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Tabs List */}
            <div className="flex flex-col gap-3 lg:col-span-1 h-[600px] overflow-y-auto pr-2 pb-4 scrollbar-hide">
              {features.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={`text-left p-5 rounded-2xl transition-all border outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    activeFeature === feature.id
                      ? 'bg-primary/10 border-primary/30 shadow-sm'
                      : 'bg-card/30 border-transparent hover:bg-card/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${activeFeature === feature.id ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-primary/10 text-primary'}`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold transition-colors ${activeFeature === feature.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {feature.title}
                      </h3>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Content Display */}
            <div className="lg:col-span-2 relative min-h-[600px] bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-2xl">
              <AnimatePresence mode="wait">
                {features.map((feature) => (
                  feature.id === activeFeature && (
                    <motion.div
                      key={feature.id}
                      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 flex flex-col"
                    >
                      <div className="h-64 w-full relative bg-muted/50 overflow-hidden">
                         <img 
                           src={feature.image} 
                           alt={feature.title} 
                           className="w-full h-full object-cover opacity-70 hover:scale-105 transition-transform duration-700" 
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                      </div>
                      <div className="p-8 md:p-12 flex-1 flex flex-col justify-start -mt-20 relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-background border border-border shadow-sm text-primary text-sm font-semibold mb-6 w-fit">
                          <feature.icon className="w-4 h-4" />
                          <span>{feature.title}</span>
                        </div>
                        <h3 className="text-3xl font-bold mb-4 tracking-tight">How it works</h3>
                        <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                          {feature.howItWorks}
                        </p>
                        <div className="space-y-4">
                           {feature.bullets.map((bullet, idx) => (
                             <div key={idx} className="flex items-start gap-3">
                               <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                               <span className="text-muted-foreground font-medium">{bullet}</span>
                             </div>
                           ))}
                        </div>
                      </div>
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-background/50 backdrop-blur-md py-8 mt-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} ShopSphere. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
