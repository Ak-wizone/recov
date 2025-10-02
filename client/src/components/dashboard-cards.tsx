import { Customer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, Info, CheckCircle } from "lucide-react";

interface DashboardCardsProps {
  customers: Customer[];
}

export function DashboardCards({ customers }: DashboardCardsProps) {
  const categories = ["Alpha", "Beta", "Gamma", "Delta"] as const;

  const categoryStats = categories.map((category) => {
    const categoryCustomers = customers.filter((c) => c.category === category);
    const totalAmount = categoryCustomers.reduce(
      (sum, c) => sum + parseFloat(c.amountOwed),
      0
    );
    return {
      category,
      count: categoryCustomers.length,
      total: totalAmount,
    };
  });

  const categoryIcons = {
    Alpha: <AlertTriangle className="h-6 w-6" />,
    Beta: <Clock className="h-6 w-6" />,
    Gamma: <Info className="h-6 w-6" />,
    Delta: <CheckCircle className="h-6 w-6" />,
  };

  const categoryColors = {
    Alpha: "from-emerald-500 to-teal-600",
    Beta: "from-blue-500 to-indigo-600",
    Gamma: "from-amber-500 to-orange-600",
    Delta: "from-rose-500 to-pink-600",
  };

  const categoryBgColors = {
    Alpha: "bg-gradient-to-br from-emerald-50 to-teal-50",
    Beta: "bg-gradient-to-br from-blue-50 to-indigo-50",
    Gamma: "bg-gradient-to-br from-amber-50 to-orange-50",
    Delta: "bg-gradient-to-br from-rose-50 to-pink-50",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {categoryStats.map(({ category, count, total }, index) => (
        <Card 
          key={category} 
          className={`border-2 border-transparent hover:border-current transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl ${categoryBgColors[category]} animate-in fade-in slide-in-from-bottom-4 cursor-pointer`}
          style={{ animationDelay: `${index * 100}ms` }}
          data-testid={`card-category-${category.toLowerCase()}`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  {category} Category
                </p>
                <p className={`text-3xl font-bold bg-gradient-to-r ${categoryColors[category]} bg-clip-text text-transparent animate-pulse`} data-testid={`text-amount-${category.toLowerCase()}`}>
                  ₹{total.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-2 font-medium" data-testid={`text-count-${category.toLowerCase()}`}>
                  {count} {count === 1 ? 'client' : 'clients'}
                </p>
              </div>
              <div className={`bg-gradient-to-br ${categoryColors[category]} p-4 rounded-2xl text-white shadow-lg transform transition-transform duration-300 hover:rotate-12 hover:scale-110`}>
                {categoryIcons[category]}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
