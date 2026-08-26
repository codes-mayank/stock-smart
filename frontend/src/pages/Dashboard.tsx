import { useState } from "react";
import { Package, AlertTriangle, TrendingUp, ShoppingBag, Clock, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useProducts, useSales } from "@/hooks/useData";
import { motion, Variants } from "framer-motion";
import CountUp from "react-countup";

function getExpiryDetails(expiryDate: string) {
  const diff = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  let status = "safe";
  if (diff < 0) status = "expired";
  else if (diff <= 3) status = "danger"; // <= 3 days
  else if (diff <= 7) status = "warning"; // <= 7 days
  else if (diff <= 30) status = "upcoming"; // <= 30 days
  return { status, daysLeft: diff };
}

function RecommendationItem({ rec, dayText, orderQty }: { rec: any, dayText: string, orderQty: number }) {
  const [ordering, setOrdering] = useState(false);
  
  const handleOrder = () => {
    setOrdering(true);
    setTimeout(() => {
      setOrdering(false);
      toast.success(`Order placed for ${orderQty} units of ${rec.name}`, {
        description: "Your distributor has been notified. Expected delivery: Tomorrow.",
      });
    }, 1500);
  };

  return (
    <div className="bg-background/80 backdrop-blur-sm border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="font-semibold text-foreground mb-1 text-base">{rec.name}</div>
        <div className="text-xs text-muted-foreground mb-3">
          You sell ~{rec.avgDaily.toFixed(1)}/day. Current stock: {rec.stock}
        </div>
        <div className="text-sm mb-1">
          Will run out by <span className="font-semibold text-rose-500">{dayText}</span>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Suggested: {orderQty} units</span>
        <Button 
          size="sm" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs px-3 shadow-sm transition-all"
          onClick={handleOrder}
          disabled={ordering}
        >
          {ordering ? "Ordering..." : "Order Now"}
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: sales = [], isLoading: loadingSales } = useSales();

  const totalProducts = products.length;
  const outOfStock = products.filter(p => p.quantity === 0).length;
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 10).length;
  const expiringSoon = products.filter(p => {
    const { daysLeft } = getExpiryDetails(p.expiry_date);
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);

  // --- AI Demand Forecasting Logic ---
  const now = new Date();
  const nowTime = now.getTime();
  const productStockMap: Record<string, number> = {};
  products.forEach(p => productStockMap[p.name] = (productStockMap[p.name] || 0) + p.quantity);

  const productSalesLife: Record<string, { qtySold: number; minDate: number }> = {};
  sales.forEach(sale => {
    const time = new Date(sale.created_at).getTime();
    if (!productSalesLife[sale.product_name]) {
      productSalesLife[sale.product_name] = { qtySold: 0, minDate: time };
    }
    productSalesLife[sale.product_name].qtySold += sale.quantity;
    if (time < productSalesLife[sale.product_name].minDate) {
      productSalesLife[sale.product_name].minDate = time;
    }
  });

  const aiRecommendations = Object.keys(productStockMap)
    .map(name => {
      const stock = productStockMap[name];
      const sData = productSalesLife[name];
      
      let avgDaily = 0;
      let daysUntilEmpty = Number.POSITIVE_INFINITY;
      
      if (sData && sData.qtySold > 0) {
        const daysActive = Math.max(1, (nowTime - sData.minDate) / (1000 * 60 * 60 * 24));
        avgDaily = sData.qtySold / daysActive;
        daysUntilEmpty = avgDaily > 0 ? stock / avgDaily : Number.POSITIVE_INFINITY;
      }
      
      return { name, stock, avgDaily, daysUntilEmpty };
    })
    .filter(r => r.avgDaily > 0.1 && r.daysUntilEmpty <= 14) // Only show items running out in <= 14 days
    .sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty)
    .slice(0, 3); // Top 3 most urgent

  const alertProducts = products.filter(p => {
    const { daysLeft } = getExpiryDetails(p.expiry_date);
    return (p.quantity > 0 && p.quantity <= 10) || p.quantity === 0 || daysLeft <= 7;
  }).sort((a, b) => {
    return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
  });

  if (loadingProducts || loadingSales) {
    return (
      <div className="space-y-8 w-full">
        <div className="h-16 w-64 bg-muted rounded-xl skeleton-shimmer"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-xl skeleton-shimmer"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px] bg-muted rounded-xl skeleton-shimmer"></div>
          <div className="h-[400px] bg-muted rounded-xl skeleton-shimmer"></div>
        </div>
      </div>
    );
  }

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item: Variants = {
    hidden: { y: 20, scale: 0.98, opacity: 0 },
    show: { y: 0, scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };
  
  const iconAnimation = {
    hover: { scale: 1.15, rotate: 5, transition: { type: "spring", stiffness: 400, damping: 10 } }
  };

  return (
    <div className="w-full">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your store's performance</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Products Card */}
        <motion.div variants={item} whileHover={{ y: -3, scale: 1.01 }} className="bg-card border border-border rounded-xl shadow-sm dark:shadow-soft-dark p-6 flex flex-col justify-between transition-colors duration-250 border-b-4 border-b-primary group">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <motion.div variants={iconAnimation} className="inline-flex">
                <Package className="h-6 w-6 text-primary group-hover:text-primary-hover transition-colors" />
              </motion.div>
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold font-display text-foreground count-up">
              <CountUp end={totalProducts} duration={2} separator="," enableScrollSpy scrollSpyOnce />
            </p>
            <span className="text-sm text-muted-foreground font-medium mt-1 block">Total Products</span>
          </div>
        </motion.div>

        {/* Low Stock Alerts Card */}
        <motion.div variants={item} whileHover={{ y: -3, scale: 1.01 }} className="bg-card border border-border rounded-xl shadow-sm dark:shadow-soft-dark p-6 flex flex-col justify-between transition-colors duration-250 border-b-4 border-b-warning group">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
              <motion.div variants={iconAnimation} className="inline-flex">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </motion.div>
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold font-display text-foreground count-up">
              <CountUp end={lowStock} duration={2.5} enableScrollSpy scrollSpyOnce />
            </p>
            <span className="text-sm text-muted-foreground font-medium mt-1 block">Low Stock Alerts</span>
          </div>
        </motion.div>

        {/* Expiring Soon Card */}
        <motion.div variants={item} whileHover={{ y: -3, scale: 1.01 }} className="bg-card border border-border rounded-xl shadow-sm dark:shadow-soft-dark p-6 flex flex-col justify-between transition-colors duration-250 border-b-4 border-b-destructive group">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <motion.div variants={iconAnimation} className="inline-flex">
                <Clock className="h-6 w-6 text-destructive" />
              </motion.div>
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold font-display text-foreground count-up">
              <CountUp end={expiringSoon} duration={2.5} enableScrollSpy scrollSpyOnce />
            </p>
            <span className="text-sm text-muted-foreground font-medium mt-1 block">Expiring Soon</span>
          </div>
        </motion.div>

        {/* Total Revenue Card */}
        <motion.div variants={item} whileHover={{ y: -3, scale: 1.01 }} className="bg-card border border-border rounded-xl shadow-sm dark:shadow-soft-dark p-6 flex flex-col justify-between transition-colors duration-250 border-b-4 border-b-success group">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
              <motion.div variants={iconAnimation} className="inline-flex">
                <TrendingUp className="h-6 w-6 text-success" />
              </motion.div>
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold font-display text-foreground count-up">
              ₹<CountUp end={totalRevenue} duration={3} separator="," decimals={0} enableScrollSpy scrollSpyOnce />
            </p>
            <span className="text-sm text-muted-foreground font-medium mt-1 block">Total Revenue</span>
          </div>
        </motion.div>
      </motion.div>

      {/* AI Demand Forecasting */}
      {aiRecommendations.length > 0 && (
        <motion.div variants={container} initial="hidden" animate="show" className="mb-8">
          <motion.div variants={item}>
            <Card className="border-indigo-500/30 shadow-md bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Sparkles className="h-32 w-32 text-indigo-500" />
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-5 w-5" />
                  AI Predictive Restocking
                </CardTitle>
                <p className="text-sm text-muted-foreground">Based on your recent sales velocity, here is what you need to order before you run out.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {aiRecommendations.map(rec => {
                    const runOutDate = new Date(nowTime + rec.daysUntilEmpty * 24 * 60 * 60 * 1000);
                    // Use tomorrow/today if applicable, otherwise weekday
                    let dayText = runOutDate.toLocaleDateString('en-US', { weekday: 'long' });
                    if (rec.daysUntilEmpty <= 1) dayText = "Tomorrow";
                    if (rec.daysUntilEmpty <= 0.2) dayText = "Today";

                    const orderQty = Math.ceil(rec.avgDaily * 14); // order for 14 days
                    
                    return (
                      <RecommendationItem key={rec.name} rec={rec} dayText={dayText} orderQty={orderQty} />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="h-full hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Stock & Expiry Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertProducts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No alerts — your inventory looks great!</p>
                ) : (
                  alertProducts.map(product => {
                    const { status, daysLeft } = getExpiryDetails(product.expiry_date);

                    let bgClass = "bg-muted/50";
                    if (status === "expired") bgClass = "bg-destructive/10 border border-destructive/20";
                    else if (status === "danger") bgClass = "bg-rose-500/10 border border-rose-500/20";
                    else if (status === "warning") bgClass = "bg-amber-500/10 border border-amber-500/20";
                    else if (product.quantity === 0) bgClass = "bg-destructive/10 border border-destructive/20";
                    else if (product.quantity <= 10) bgClass = "bg-amber-500/10 border border-amber-500/20";

                    let expiryText = `Expires: ${product.expiry_date}`;
                    if (status === "expired") expiryText = "Batch expired!";
                    else if (status === "danger" || status === "warning") expiryText = `Batch expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`;

                    let textClass = "text-muted-foreground";
                    if (status === "expired") textClass = "text-destructive font-semibold";
                    else if (status === "danger") textClass = "text-rose-600 font-medium";
                    else if (status === "warning") textClass = "text-amber-600 font-medium";

                    return (
                      <div key={product.id} className={`flex items-center justify-between p-3 rounded-lg ${bgClass} transition-colors`}>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className={`text-xs ${textClass}`}>
                            Qty: {product.quantity} · {expiryText}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {product.quantity === 0 && <Badge variant="destructive" className="text-[10px] shadow-none">Out of Stock</Badge>}
                          {product.quantity > 0 && product.quantity <= 10 && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200/50 text-[10px] shadow-none">Low Stock</Badge>}
                          {status === "expired" && (
                            <Badge variant="destructive" className="text-[10px] shadow-none">Expired</Badge>
                          )}
                          {status === "danger" && (
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200/50 text-[10px] shadow-none">Near Expiry</Badge>
                          )}
                          {status === "warning" && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200/50 text-[10px] shadow-none">Expires Soon</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Recent Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sales.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No sales recorded yet.</p>
                ) : (
                  sales.slice(0, 5).map(sale => (
                    <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{sale.product_name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {sale.quantity} · {sale.sale_date}</p>
                      </div>
                      <span className="font-semibold text-sm text-primary">₹{Number(sale.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
