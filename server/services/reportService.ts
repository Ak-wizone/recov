import type { IStorage } from "../storage";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

export interface ReportResult {
  type: string;
  data: any;
  summary?: string;
}

export class ReportService {
  constructor(private storage: IStorage) {}

  async generateReport(
    reportType: string,
    tenantId: string,
    limit: number = 5
  ): Promise<ReportResult> {
    switch (reportType) {
      case "top_debtors":
        return this.getTopDebtors(tenantId, limit);
      case "top_customers_month":
        return this.getTopCustomersMonth(tenantId, limit);
      case "top_payments_month":
        return this.getTopPaymentsMonth(tenantId, limit);
      case "today_collection":
        return this.getTodayCollection(tenantId);
      case "weekly_revenue":
        return this.getWeeklyRevenue(tenantId);
      case "monthly_revenue":
        return this.getMonthlyRevenue(tenantId);
      case "pending_invoices":
        return this.getPendingInvoices(tenantId);
      case "overdue_invoices":
        return this.getOverdueInvoices(tenantId);
      case "total_outstanding":
        return this.getTotalOutstanding(tenantId);
      case "recent_leads":
        return this.getRecentLeads(tenantId, limit);
      case "conversion_rate":
        return this.getConversionRate(tenantId);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  private async getTopDebtors(tenantId: string, limit: number): Promise<ReportResult> {
    // Calculate debtors from invoices and receipts
    const invoices = await this.storage.getInvoices(tenantId);
    const receipts = await this.storage.getReceipts(tenantId);
    
    // Group by customer name
    const debtorMap = new Map<string, { invoiceTotal: number; paymentTotal: number; count: number }>();
    
    invoices.forEach(inv => {
      const customerName = inv.customerName || "Unknown";
      const existing = debtorMap.get(customerName) || { invoiceTotal: 0, paymentTotal: 0, count: 0 };
      existing.invoiceTotal += parseFloat(inv.invoiceAmount as string) || 0;
      existing.count += 1;
      debtorMap.set(customerName, existing);
    });
    
    receipts.forEach(receipt => {
      const customerName = receipt.customerName || "Unknown";
      const existing = debtorMap.get(customerName) || { invoiceTotal: 0, paymentTotal: 0, count: 0 };
      existing.paymentTotal += parseFloat(receipt.amount as string) || 0;
      debtorMap.set(customerName, existing);
    });
    
    const debtors = Array.from(debtorMap.entries()).map(([name, data]) => ({
      customerName: name,
      outstandingBalance: data.invoiceTotal - data.paymentTotal,
      invoiceCount: data.count,
    }));
    
    const sorted = debtors
      .filter(d => d.outstandingBalance > 0)
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
      .slice(0, limit);

    const total = sorted.reduce((sum, d) => sum + d.outstandingBalance, 0);

    return {
      type: "top_debtors",
      data: sorted.map(d => ({
        customerName: d.customerName,
        outstanding: d.outstandingBalance,
        invoiceCount: d.invoiceCount,
      })),
      summary: `Top ${sorted.length} debtors with total outstanding: ₹${total.toFixed(2)}`,
    };
  }

  private async getTopCustomersMonth(tenantId: string, limit: number): Promise<ReportResult> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const invoices = await this.storage.getInvoices(tenantId);
    
    const customerRevenue = new Map<string, { name: string; total: number; count: number }>();

    invoices
      .filter(inv => {
        const invDate = new Date(inv.invoiceDate);
        return invDate >= monthStart && invDate <= monthEnd;
      })
      .forEach(inv => {
        const customerName = inv.customerName || "Unknown";
        const existing = customerRevenue.get(customerName) || { 
          name: customerName, 
          total: 0, 
          count: 0 
        };
        existing.total += parseFloat(inv.invoiceAmount as string) || 0;
        existing.count += 1;
        customerRevenue.set(customerName, existing);
      });

    const sorted = Array.from(customerRevenue.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    const total = sorted.reduce((sum, c) => sum + c.total, 0);

    return {
      type: "top_customers_month",
      data: sorted.map(c => ({
        customerName: c.name,
        revenue: c.total,
        invoiceCount: c.count,
      })),
      summary: `Top ${sorted.length} customers this month with total revenue: ₹${total.toFixed(2)}`,
    };
  }

  private async getTopPaymentsMonth(tenantId: string, limit: number): Promise<ReportResult> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const allPayments = await this.storage.getReceipts(tenantId);
    
    const filtered = allPayments
      .filter(p => {
        const payDate = new Date(p.date);
        return payDate >= monthStart && payDate <= monthEnd;
      })
      .sort((a, b) => parseFloat(b.amount as string) - parseFloat(a.amount as string))
      .slice(0, limit);

    const total = filtered.reduce((sum, p) => sum + (parseFloat(p.amount as string) || 0), 0);

    return {
      type: "top_payments_month",
      data: filtered.map(p => ({
        customerName: p.customerName,
        amount: parseFloat(p.amount as string),
        paymentDate: p.date,
        paymentMode: p.voucherType || "Cash",
      })),
      summary: `Top ${filtered.length} payments this month totaling: ₹${total.toFixed(2)}`,
    };
  }

  private async getTodayCollection(tenantId: string): Promise<ReportResult> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const allPayments = await this.storage.getReceipts(tenantId);
    
    const todayPayments = allPayments.filter(p => {
      const payDate = new Date(p.date);
      return payDate >= todayStart && payDate <= todayEnd;
    });

    const total = todayPayments.reduce((sum, p) => sum + (parseFloat(p.amount as string) || 0), 0);

    return {
      type: "today_collection",
      data: {
        total,
        count: todayPayments.length,
        payments: todayPayments.map(p => ({
          customerName: p.customerName,
          amount: parseFloat(p.amount as string),
          paymentMode: p.voucherType || "Cash",
        })),
      },
      summary: `Today's collection: ₹${total.toFixed(2)} from ${todayPayments.length} payments`,
    };
  }

  private async getWeeklyRevenue(tenantId: string): Promise<ReportResult> {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const invoices = await this.storage.getInvoices(tenantId);
    
    const weekInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate);
      return invDate >= weekStart && invDate <= weekEnd;
    });

    const total = weekInvoices.reduce((sum, inv) => sum + (parseFloat(inv.invoiceAmount as string) || 0), 0);

    return {
      type: "weekly_revenue",
      data: {
        total,
        invoiceCount: weekInvoices.length,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
      },
      summary: `This week's revenue: ₹${total.toFixed(2)} from ${weekInvoices.length} invoices`,
    };
  }

  private async getMonthlyRevenue(tenantId: string): Promise<ReportResult> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const invoices = await this.storage.getInvoices(tenantId);
    
    const monthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate);
      return invDate >= monthStart && invDate <= monthEnd;
    });

    const total = monthInvoices.reduce((sum, inv) => sum + (parseFloat(inv.invoiceAmount as string) || 0), 0);

    return {
      type: "monthly_revenue",
      data: {
        total,
        invoiceCount: monthInvoices.length,
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
      },
      summary: `This month's revenue: ₹${total.toFixed(2)} from ${monthInvoices.length} invoices`,
    };
  }

  private async getPendingInvoices(tenantId: string): Promise<ReportResult> {
    const invoices = await this.storage.getInvoices(tenantId);
    
    const pending = invoices.filter(inv => inv.status !== "Paid");
    const total = pending.reduce((sum, inv) => sum + (parseFloat(inv.invoiceAmount as string) || 0), 0);

    return {
      type: "pending_invoices",
      data: {
        count: pending.length,
        total,
        invoices: pending.slice(0, 10).map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          amount: parseFloat(inv.invoiceAmount as string),
          invoiceDate: inv.invoiceDate,
          status: inv.status,
        })),
      },
      summary: `${pending.length} pending invoices totaling: ₹${total.toFixed(2)}`,
    };
  }

  private async getOverdueInvoices(tenantId: string): Promise<ReportResult> {
    const now = new Date();
    const invoices = await this.storage.getInvoices(tenantId);
    
    // Calculate overdue based on payment terms (if available) and invoice date
    const overdue = invoices.filter(inv => {
      if (inv.status === "Paid") return false;
      const invDate = new Date(inv.invoiceDate);
      const paymentTermsDays = inv.paymentTerms || 30; // Default 30 days
      const dueDate = new Date(invDate.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);
      return dueDate < now;
    });

    const total = overdue.reduce((sum, inv) => sum + (parseFloat(inv.invoiceAmount as string) || 0), 0);

    return {
      type: "overdue_invoices",
      data: {
        count: overdue.length,
        total,
        invoices: overdue.slice(0, 10).map(inv => {
          const invDate = new Date(inv.invoiceDate);
          const paymentTermsDays = inv.paymentTerms || 30;
          const dueDate = new Date(invDate.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);
          return {
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName,
            amount: parseFloat(inv.invoiceAmount as string),
            invoiceDate: inv.invoiceDate,
            daysPastDue: Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
          };
        }),
      },
      summary: `${overdue.length} overdue invoices totaling: ₹${total.toFixed(2)}`,
    };
  }

  private async getTotalOutstanding(tenantId: string): Promise<ReportResult> {
    // Calculate from invoices and receipts
    const invoices = await this.storage.getInvoices(tenantId);
    const receipts = await this.storage.getReceipts(tenantId);
    
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.invoiceAmount as string) || 0), 0);
    const totalPaid = receipts.reduce((sum, r) => sum + (parseFloat(r.amount as string) || 0), 0);
    const total = totalInvoiced - totalPaid;
    
    // Count unique customers with outstanding balance
    const debtorMap = new Map<string, number>();
    invoices.forEach(inv => {
      const customerName = inv.customerName || "Unknown";
      debtorMap.set(customerName, (debtorMap.get(customerName) || 0) + (parseFloat(inv.invoiceAmount as string) || 0));
    });
    receipts.forEach(receipt => {
      const customerName = receipt.customerName || "Unknown";
      debtorMap.set(customerName, (debtorMap.get(customerName) || 0) - (parseFloat(receipt.amount as string) || 0));
    });
    const customerCount = Array.from(debtorMap.values()).filter(balance => balance > 0).length;

    return {
      type: "total_outstanding",
      data: {
        total,
        customerCount,
      },
      summary: `Total outstanding: ₹${total.toFixed(2)} from ${customerCount} customers`,
    };
  }

  private async getRecentLeads(tenantId: string, limit: number): Promise<ReportResult> {
    const leads = await this.storage.getLeads(tenantId);
    
    const recent = leads
      .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
      .slice(0, limit);

    return {
      type: "recent_leads",
      data: recent.map(l => ({
        companyName: l.companyName,
        contactPerson: l.contactPerson,
        status: l.leadStatus,
        source: l.leadSource,
        createdAt: l.dateCreated,
      })),
      summary: `${recent.length} recent leads`,
    };
  }

  private async getConversionRate(tenantId: string): Promise<ReportResult> {
    const leads = await this.storage.getLeads(tenantId);
    const customers = await this.storage.getCustomers(tenantId);

    const last30Days = subDays(new Date(), 30);
    
    const recentLeads = leads.filter(l => new Date(l.dateCreated) >= last30Days);
    const convertedLeads = recentLeads.filter(l => l.leadStatus === "Converted");
    
    const rate = recentLeads.length > 0 
      ? (convertedLeads.length / recentLeads.length) * 100 
      : 0;

    return {
      type: "conversion_rate",
      data: {
        totalLeads: recentLeads.length,
        convertedLeads: convertedLeads.length,
        conversionRate: rate,
        period: "Last 30 days",
      },
      summary: `Conversion rate: ${rate.toFixed(1)}% (${convertedLeads.length}/${recentLeads.length} leads converted in last 30 days)`,
    };
  }
}
