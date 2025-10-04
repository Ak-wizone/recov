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
    Alpha: <AlertTriangle className="h-5 w-5" />,
    Beta: <Clock className="h-5 w-5" />,
    Gamma: <Info className="h-5 w-5" />,
    Delta: <CheckCircle className="h-5 w-5" />,
  };

  const categoryColors = {
    Alpha: {
      bg: "bg-green-50 dark:bg-green-950",
      icon: "bg-green-500",
      text: "text-green-700 dark:text-green-400",
    },
    Beta: {
      bg: "bg-blue-50 dark:bg-blue-950",
      icon: "bg-blue-500",
      text: "text-blue-700 dark:text-blue-400",
    },
    Gamma: {
      bg: "bg-yellow-50 dark:bg-yellow-950",
      icon: "bg-yellow-500",
      text: "text-yellow-700 dark:text-yellow-400",
    },
    Delta: {
      bg: "bg-red-50 dark:bg-red-950",
      icon: "bg-red-500",
      text: "text-red-700 dark:text-red-400",
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {categoryStats.map(({ category, count, total }, index) => (
        <Card 
          key={category} 
          className={`${categoryColors[category].bg} border-0 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer animate-in fade-in slide-in-from-bottom-3`}
          style={{ animationDelay: `${index * 100}ms` }}
          data-testid={`card-category-${category.toLowerCase()}`}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={`${categoryColors[category].icon} p-3 rounded-xl text-white shadow-md flex-shrink-0`}>
                {categoryIcons[category]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  {category}
                </p>
                <p className={`text-2xl font-bold ${categoryColors[category].text}`} data-testid={`text-amount-${category.toLowerCase()}`}>
                  ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-1" data-testid={`text-count-${category.toLowerCase()}`}>
                  {count}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
