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
    Alpha: <AlertTriangle className="h-5 w-5 text-green-600" />,
    Beta: <Clock className="h-5 w-5 text-blue-600" />,
    Gamma: <Info className="h-5 w-5 text-yellow-600" />,
    Delta: <CheckCircle className="h-5 w-5 text-red-600" />,
  };

  const categoryColors = {
    Alpha: "bg-green-100",
    Beta: "bg-blue-100",
    Gamma: "bg-yellow-100",
    Delta: "bg-red-100",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {categoryStats.map(({ category, count, total }) => (
        <Card key={category} className="border border-[#E2E8F0]" data-testid={`card-category-${category.toLowerCase()}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {category} Category
                </p>
                <p className="text-2xl font-bold text-[#1E293B]" data-testid={`text-amount-${category.toLowerCase()}`}>
                  ₹{total.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1" data-testid={`text-count-${category.toLowerCase()}`}>
                  {count} clients
                </p>
              </div>
              <div className={`${categoryColors[category]} p-3 rounded-full`}>
                {categoryIcons[category]}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
