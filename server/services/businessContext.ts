import { IStorage } from "../storage";
import type { SelectMasterCustomer, SelectInvoice, SelectReceipt } from "@shared/schema";

export interface TenantSnapshot {
  totalCustomers: number;
  totalInvoices: number;
  totalRevenue: number;
  totalReceipts: number;
  totalReceived: number;
  totalOutstanding: number;
  topDebtors: Array<{
    name: string;
    amount: number;
  }>;
  recentInvoices: Array<{
    invoiceNumber: string;
    customerName: string;
    amount: number;
    date: string;
  }>;
  overdueInvoices: number;
  overdueAmount: number;
}

export interface BusinessContext {
  snapshot: TenantSnapshot;
  customerCount?: number;
  invoiceDetails?: any[];
  receiptDetails?: any[];
  debtorDetails?: any[];
}

interface CachedSnapshot {
  data: TenantSnapshot;
  timestamp: number;
}

/**
 * BusinessContextService aggregates tenant business data for AI consumption
 * Provides both high-level snapshots and query-specific detailed lookups
 * Uses caching to prevent repeated full-table scans
 */
export class BusinessContextService {
  private snapshotCache: Map<string, CachedSnapshot> = new Map();
  private CACHE_TTL = 60000; // 60 seconds

  constructor(private storage: IStorage) {}

  /**
   * Get high-level tenant business snapshot for AI context
   * Uses cache to prevent repeated full-table scans (60s TTL)
   */
  async getTenantSnapshot(tenantId: string, forceRefresh: boolean = false): Promise<TenantSnapshot> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.snapshotCache.get(tenantId);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
        return cached.data;
      }
    }

    try {
      // Fetch all data in parallel
      const [customers, invoices, receipts] = await Promise.all([
        this.storage.getMasterCustomers(tenantId),
        this.storage.getInvoices(tenantId),
        this.storage.getReceipts(tenantId),
      ]);

      // Calculate totals
      const totalCustomers = customers.length;
      const totalInvoices = invoices.length;
      const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0);
      
      const totalReceipts = receipts.length;
      const totalReceived = receipts.reduce((sum, rec) => sum + parseFloat(rec.amount), 0);
      
      const totalOutstanding = totalRevenue - totalReceived;

      // Calculate debtor amounts
      const debtorMap: Record<string, number> = {};
      
      invoices.forEach(invoice => {
        const customerName = invoice.customerName;
        const invoiceAmount = parseFloat(invoice.invoiceAmount);
        
        if (!debtorMap[customerName]) {
          debtorMap[customerName] = 0;
        }
        debtorMap[customerName] += invoiceAmount;
      });

      receipts.forEach(receipt => {
        const customerName = receipt.customerName;
        const receiptAmount = parseFloat(receipt.amount);
        
        if (!debtorMap[customerName]) {
          debtorMap[customerName] = 0;
        }
        debtorMap[customerName] -= receiptAmount;
      });

      // Top 5 debtors
      const topDebtors = Object.entries(debtorMap)
        .filter(([_, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({
          name,
          amount: Math.round(amount * 100) / 100,
        }));

      // Recent 5 invoices
      const recentInvoices = invoices
        .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
        .slice(0, 5)
        .map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          amount: parseFloat(inv.invoiceAmount),
          date: inv.invoiceDate,
        }));

      // Overdue invoices (due date passed)
      const today = new Date();
      const overdueInvs = invoices.filter(inv => {
        const dueDate = new Date(inv.dueDate);
        return dueDate < today;
      });
      
      const overdueInvoices = overdueInvs.length;
      const overdueAmount = overdueInvs.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0);

      const snapshot = {
        totalCustomers,
        totalInvoices,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalReceipts,
        totalReceived: Math.round(totalReceived * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        topDebtors,
        recentInvoices,
        overdueInvoices,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
      };

      // Cache the snapshot
      this.snapshotCache.set(tenantId, {
        data: snapshot,
        timestamp: Date.now()
      });

      return snapshot;
    } catch (error: any) {
      console.error("[BusinessContext] Error fetching tenant snapshot:", error);
      throw new Error("Failed to fetch business snapshot");
    }
  }

  /**
   * Get detailed customer information for specific queries
   */
  async getCustomerDetails(tenantId: string, limit: number = 10): Promise<SelectMasterCustomer[]> {
    const customers = await this.storage.getMasterCustomers(tenantId);
    return customers.slice(0, limit);
  }

  /**
   * Get invoice details with optional filters
   */
  async getInvoiceDetails(
    tenantId: string,
    options: {
      limit?: number;
      customerName?: string;
      minAmount?: number;
      overdue?: boolean;
    } = {}
  ): Promise<SelectInvoice[]> {
    const invoices = await this.storage.getInvoices(tenantId);
    
    let filtered = invoices;

    if (options.customerName) {
      filtered = filtered.filter(inv => 
        inv.customerName.toLowerCase().includes(options.customerName!.toLowerCase())
      );
    }

    if (options.minAmount !== undefined) {
      filtered = filtered.filter(inv => parseFloat(inv.invoiceAmount) >= options.minAmount!);
    }

    if (options.overdue) {
      const today = new Date();
      filtered = filtered.filter(inv => new Date(inv.dueDate) < today);
    }

    return filtered
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
      .slice(0, options.limit || 10);
  }

  /**
   * Get receipt details
   */
  async getReceiptDetails(
    tenantId: string,
    options: {
      limit?: number;
      customerName?: string;
    } = {}
  ): Promise<SelectReceipt[]> {
    const receipts = await this.storage.getReceipts(tenantId);
    
    let filtered = receipts;

    if (options.customerName) {
      filtered = filtered.filter(rec => 
        rec.customerName.toLowerCase().includes(options.customerName!.toLowerCase())
      );
    }

    return filtered
      .sort((a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime())
      .slice(0, options.limit || 10);
  }

  /**
   * Get debtor analysis
   */
  async getDebtorAnalysis(
    tenantId: string,
    options: {
      limit?: number;
      minAmount?: number;
    } = {}
  ): Promise<Array<{ customerName: string; outstandingAmount: number; invoiceCount: number }>> {
    const [invoices, receipts] = await Promise.all([
      this.storage.getInvoices(tenantId),
      this.storage.getReceipts(tenantId),
    ]);

    const debtorMap: Record<string, { total: number; invoiceCount: number; received: number }> = {};

    invoices.forEach(invoice => {
      const customer = invoice.customerName;
      if (!debtorMap[customer]) {
        debtorMap[customer] = { total: 0, invoiceCount: 0, received: 0 };
      }
      debtorMap[customer].total += parseFloat(invoice.invoiceAmount);
      debtorMap[customer].invoiceCount += 1;
    });

    receipts.forEach(receipt => {
      const customer = receipt.customerName;
      if (debtorMap[customer]) {
        debtorMap[customer].received += parseFloat(receipt.amount);
      }
    });

    let debtors = Object.entries(debtorMap)
      .map(([customerName, data]) => ({
        customerName,
        outstandingAmount: Math.round((data.total - data.received) * 100) / 100,
        invoiceCount: data.invoiceCount,
      }))
      .filter(d => d.outstandingAmount > 0);

    if (options.minAmount !== undefined) {
      debtors = debtors.filter(d => d.outstandingAmount >= options.minAmount!);
    }

    return debtors
      .sort((a, b) => b.outstandingAmount - a.outstandingAmount)
      .slice(0, options.limit || 10);
  }
}
