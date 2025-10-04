import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertPaymentSchema, insertFollowUpSchema, insertMasterCustomerSchema, insertMasterItemSchema, insertInvoiceSchema, insertReceiptSchema, insertLeadSchema, insertLeadFollowUpSchema, insertCompanyProfileSchema, insertQuotationSchema, insertQuotationItemSchema, insertQuotationSettingsSchema, insertProformaInvoiceSchema, insertProformaInvoiceItemSchema, insertDebtorsFollowUpSchema, insertRoleSchema, insertUserSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      });

      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ message: error.message });
      }

      const { email, password } = result.data;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.status !== "Active") {
        return res.status(401).json({ message: "Your account is inactive. Please contact administrator." });
      }

      if (!user.password) {
        return res.status(401).json({ message: "Password not set for this account" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Store user in session
      (req.session as any).user = {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        roleName: user.roleName,
      };

      // Save session before responding
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to save session" });
        }
        
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Fetch fresh user data
      const user = await storage.getUser(sessionUser.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (user.status !== "Active") {
        return res.status(401).json({ message: "Account is inactive" });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard statistics
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const [
        leads,
        quotations,
        proformaInvoices,
        invoices,
        receipts,
        customers,
        masterCustomers,
        masterItems,
        users,
        roles
      ] = await Promise.all([
        storage.getLeads(),
        storage.getQuotations(),
        storage.getProformaInvoices(),
        storage.getInvoices(),
        storage.getReceipts(),
        storage.getCustomers(),
        storage.getMasterCustomers(),
        storage.getMasterItems(),
        storage.getUsers(),
        storage.getRoles()
      ]);

      // Calculate totals
      const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0);
      const totalReceiptAmount = receipts.reduce((sum, rec) => sum + parseFloat(rec.amount), 0);
      const totalDebtorAmount = customers.reduce((sum, cust) => sum + parseFloat(cust.amountOwed), 0);
      const totalQuotationAmount = quotations.reduce((sum, quot) => sum + parseFloat(quot.grandTotal), 0);

      // Get today's data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayLeads = leads.filter(l => {
        const createdAt = new Date(l.createdAt);
        return createdAt >= today && createdAt < tomorrow;
      }).length;

      const todayQuotations = quotations.filter(q => {
        const createdAt = new Date(q.createdAt);
        return createdAt >= today && createdAt < tomorrow;
      }).length;

      const todayInvoices = invoices.filter(i => {
        const createdAt = new Date(i.createdAt);
        return createdAt >= today && createdAt < tomorrow;
      }).length;

      const todayReceipts = receipts.filter(r => {
        const createdAt = new Date(r.createdAt);
        return createdAt >= today && createdAt < tomorrow;
      }).length;

      // Recent activity (last 5 items)
      const recentLeads = leads.slice(0, 5);
      const recentQuotations = quotations.slice(0, 5);
      const recentInvoices = invoices.slice(0, 5);

      res.json({
        totals: {
          leads: leads.length,
          quotations: quotations.length,
          proformaInvoices: proformaInvoices.length,
          invoices: invoices.length,
          receipts: receipts.length,
          customers: masterCustomers.length,
          items: masterItems.length,
          users: users.length,
          roles: roles.length,
          debtors: customers.length,
        },
        amounts: {
          totalInvoices: totalInvoiceAmount,
          totalReceipts: totalReceiptAmount,
          totalDebtors: totalDebtorAmount,
          totalQuotations: totalQuotationAmount,
          outstandingBalance: totalInvoiceAmount - totalReceiptAmount,
        },
        today: {
          leads: todayLeads,
          quotations: todayQuotations,
          invoices: todayInvoices,
          receipts: todayReceipts,
        },
        recent: {
          leads: recentLeads,
          quotations: recentQuotations,
          invoices: recentInvoices,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all customers
  app.get("/api/customers", async (_req, res) => {
    try {
      const customers = await storage.getCustomers();
      
      // Fetch the most recent past and next future follow-ups for each customer
      const customersWithFollowUps = await Promise.all(
        customers.map(async (customer) => {
          const followUps = await storage.getFollowUpsByCustomer(customer.id);
          const now = new Date();
          
          // Split follow-ups into past and future
          const pastFollowUps = followUps.filter(f => new Date(f.followUpDateTime) < now);
          const futureFollowUps = followUps.filter(f => new Date(f.followUpDateTime) >= now);
          
          // Get the most recent past follow-up (first in DESC sorted array)
          const lastFollowUp = pastFollowUps.length > 0 ? pastFollowUps[0] : null;
          
          // Get the nearest future follow-up (last in DESC sorted array)
          const nextFollowUp = futureFollowUps.length > 0 ? futureFollowUps[futureFollowUps.length - 1] : null;
          
          return {
            ...customer,
            lastFollowUpRemarks: lastFollowUp?.remarks || null,
            lastFollowUpDate: lastFollowUp?.followUpDateTime || null,
            lastFollowUpType: lastFollowUp?.type || null,
            nextFollowUpDate: nextFollowUp?.followUpDateTime || null,
            nextFollowUpType: nextFollowUp?.type || null,
          };
        })
      );
      
      res.json(customersWithFollowUps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download sample import template (must be before :id route)
  app.get("/api/customers/sample-template", async (_req, res) => {
    try {
      const sampleData = [
        {
          Name: "John Doe",
          "Amount Owed": "15000.00",
          Category: "Alpha",
          "Assigned User": "Manpreet Bedi",
          Mobile: "+919876543210",
          Email: "john.doe@example.com",
        },
        {
          Name: "Jane Smith",
          "Amount Owed": "25000.50",
          Category: "Beta",
          "Assigned User": "Bilal Ahamad",
          Mobile: "+918765432109",
          Email: "jane.smith@example.com",
        },
        {
          Name: "Robert Johnson",
          "Amount Owed": "10500.75",
          Category: "Gamma",
          "Assigned User": "Anjali Dhiman",
          Mobile: "+917654321098",
          Email: "robert.j@example.com",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sample Data");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=customer_import_template.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single customer
  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create customer
  app.post("/api/customers", async (req, res) => {
    try {
      const result = insertCustomerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const customer = await storage.createCustomer(result.data);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update customer
  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const result = insertCustomerSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const customer = await storage.updateCustomer(req.params.id, result.data);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete customer
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const success = await storage.deleteCustomer(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get payments for a customer
  app.get("/api/customers/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByCustomer(req.params.id);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create payment
  app.post("/api/payments", async (req, res) => {
    try {
      const result = insertPaymentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const payment = await storage.createPayment(result.data);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update payment
  app.patch("/api/payments/:id", async (req, res) => {
    try {
      const result = insertPaymentSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const payment = await storage.updatePayment(req.params.id, result.data);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete payment
  app.delete("/api/payments/:id", async (req, res) => {
    try {
      const success = await storage.deletePayment(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get follow-ups for a customer
  app.get("/api/customers/:id/followups", async (req, res) => {
    try {
      const followUps = await storage.getFollowUpsByCustomer(req.params.id);
      res.json(followUps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create follow-up
  app.post("/api/followups", async (req, res) => {
    try {
      const result = insertFollowUpSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const followUp = await storage.createFollowUp(result.data);
      res.status(201).json(followUp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update follow-up
  app.patch("/api/followups/:id", async (req, res) => {
    try {
      const result = insertFollowUpSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const followUp = await storage.updateFollowUp(req.params.id, result.data);
      if (!followUp) {
        return res.status(404).json({ message: "Follow-up not found" });
      }
      res.json(followUp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete follow-up
  app.delete("/api/followups/:id", async (req, res) => {
    try {
      const success = await storage.deleteFollowUp(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Follow-up not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete customers
  app.post("/api/customers/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid request: ids array required" });
      }

      const count = await storage.deleteCustomers(ids);
      res.json({ deleted: count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Excel import
  app.post("/api/customers/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const customers = data.map((row: any) => ({
        name: row.name || row.Name || "",
        amountOwed: String(row.amountOwed || row["Amount Owed"] || row.amount || 0),
        category: row.category || row.Category || "Alpha",
        assignedUser: row.assignedUser || row["Assigned User"] || undefined,
        mobile: row.mobile || row.Mobile || row.phone || "",
        email: row.email || row.Email || "",
      }));

      const results = [];
      const errors = [];

      for (let i = 0; i < customers.length; i++) {
        const result = insertCustomerSchema.safeParse(customers[i]);
        if (result.success) {
          const customer = await storage.createCustomer(result.data);
          results.push(customer);
        } else {
          errors.push({ row: i + 1, error: fromZodError(result.error).message });
        }
      }

      res.json({ 
        success: results.length, 
        errors: errors.length,
        customers: results,
        errorDetails: errors
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Excel export
  app.get("/api/customers/export", async (_req, res) => {
    try {
      const customers = await storage.getCustomers();
      
      const data = customers.map(customer => ({
        Name: customer.name,
        "Amount Owed": customer.amountOwed,
        Category: customer.category,
        "Assigned User": customer.assignedUser || "",
        Mobile: customer.mobile,
        Email: customer.email,
        "Created At": customer.createdAt.toISOString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=customers.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== MASTER CUSTOMERS ROUTES ====================
  
  // Get all master customers
  app.get("/api/masters/customers", async (_req, res) => {
    try {
      const customers = await storage.getMasterCustomers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download sample import template for master customers (MUST BE BEFORE /:id)
  app.get("/api/masters/customers/template", async (_req, res) => {
    try {
      const sampleData = [
        {
          "Client Name": "ABC Corporation Pvt Ltd",
          "Category": "Alpha",
          "Billing Address": "123 Business Park, MG Road",
          "City": "Mumbai",
          "Pin Code": "400001",
          "State": "Maharashtra",
          "Country": "India",
          "GST Number": "27AABCU9603R1ZM",
          "PAN Number": "AABCU9603R",
          "MSME Number": "UDYAM-MH-12-1234567",
          "Incorporation Cert Number": "U12345MH2020PTC123456",
          "Incorporation Date": "2020-01-15",
          "Company Type": "Private Limited",
          "Primary Contact Name": "Rajesh Kumar",
          "Primary Mobile": "9876543210",
          "Primary Email": "rajesh@abccorp.com",
          "Secondary Contact Name": "Priya Sharma",
          "Secondary Mobile": "9876543211",
          "Secondary Email": "priya@abccorp.com",
          "Payment Terms (Days)": "30",
          "Credit Limit": "500000",
          "Interest Applicable From": "60",
          "Interest Rate (%)": "18",
          "Sales Person": "John Doe",
          "Is Active": "Active",
        },
        {
          "Client Name": "XYZ Industries Limited",
          "Category": "Beta",
          "Billing Address": "456 Industrial Estate, Sector 5",
          "City": "Bangalore",
          "Pin Code": "560001",
          "State": "Karnataka",
          "Country": "India",
          "GST Number": "29AAFCD5862R1Z5",
          "PAN Number": "AAFCD5862R",
          "MSME Number": "",
          "Incorporation Cert Number": "U12345KA2018PTC654321",
          "Incorporation Date": "2018-06-20",
          "Company Type": "Public Limited",
          "Primary Contact Name": "Amit Patel",
          "Primary Mobile": "9123456789",
          "Primary Email": "amit@xyzindustries.com",
          "Secondary Contact Name": "",
          "Secondary Mobile": "",
          "Secondary Email": "",
          "Payment Terms (Days)": "45",
          "Credit Limit": "1000000",
          "Interest Applicable From": "90",
          "Interest Rate (%)": "15",
          "Sales Person": "Jane Smith",
          "Is Active": "Active",
        },
        {
          "Client Name": "Tech Solutions India",
          "Category": "Gamma",
          "Billing Address": "789 IT Park, Phase 2",
          "City": "Pune",
          "Pin Code": "411001",
          "State": "Maharashtra",
          "Country": "India",
          "GST Number": "27AACCT1234E1Z1",
          "PAN Number": "AACCT1234E",
          "MSME Number": "",
          "Incorporation Cert Number": "",
          "Incorporation Date": "",
          "Company Type": "Partnership",
          "Primary Contact Name": "Suresh Menon",
          "Primary Mobile": "9988776655",
          "Primary Email": "suresh@techsolutions.in",
          "Secondary Contact Name": "",
          "Secondary Mobile": "",
          "Secondary Email": "",
          "Payment Terms (Days)": "60",
          "Credit Limit": "250000",
          "Interest Applicable From": "",
          "Interest Rate (%)": "12",
          "Sales Person": "",
          "Is Active": "Active",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sample Data");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=master_customers_template.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export all master customers to Excel (MUST BE BEFORE /:id)
  app.get("/api/masters/customers/export", async (_req, res) => {
    try {
      const customers = await storage.getMasterCustomers();
      
      const data = customers.map(customer => ({
        "Client Name": customer.clientName,
        "Category": customer.category,
        "Billing Address": customer.billingAddress || "",
        "City": customer.city || "",
        "Pincode": customer.pincode || "",
        "State": customer.state || "",
        "Country": customer.country || "",
        "GST Number": customer.gstNumber || "",
        "PAN Number": customer.panNumber || "",
        "MSME Number": customer.msmeNumber || "",
        "Incorporation Cert Number": customer.incorporationCertNumber || "",
        "Incorporation Date": customer.incorporationDate ? new Date(customer.incorporationDate).toLocaleDateString() : "",
        "Company Type": customer.companyType || "",
        "Primary Contact Name": customer.primaryContactName || "",
        "Primary Mobile": customer.primaryMobile || "",
        "Primary Email": customer.primaryEmail || "",
        "Secondary Contact Name": customer.secondaryContactName || "",
        "Secondary Mobile": customer.secondaryMobile || "",
        "Secondary Email": customer.secondaryEmail || "",
        "Payment Terms (Days)": customer.paymentTermsDays,
        "Credit Limit": customer.creditLimit || "",
        "Interest Applicable From": customer.interestApplicableFrom || "",
        "Interest Rate": customer.interestRate || "",
        "Sales Person": customer.salesPerson || "",
        "Status": customer.isActive,
        "Created At": customer.createdAt.toISOString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Master Customers");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=master_customers_export.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import master customers from Excel (MUST BE BEFORE /:id)
  app.post("/api/masters/customers/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const customers = data.map((row: any) => ({
        clientName: String(row["Client Name"] || row.clientName || row.ClientName || "").trim(),
        category: String(row["Category"] || row.category || "").trim(),
        billingAddress: String(row["Billing Address"] || row.billingAddress || row.BillingAddress || "").trim(),
        city: String(row["City"] || row.city || "").trim(),
        pincode: String(row["Pin Code"] || row["Pincode"] || row.pincode || "").trim() || undefined,
        state: String(row["State"] || row.state || "").trim() || undefined,
        country: String(row["Country"] || row.country || "").trim() || undefined,
        gstNumber: String(row["GST Number"] || row.gstNumber || row.GSTNumber || row.GST || "").trim(),
        panNumber: String(row["PAN Number"] || row.panNumber || row.PANNumber || row.PAN || "").trim() || undefined,
        msmeNumber: String(row["MSME Number"] || row.msmeNumber || row.MSMENumber || "").trim() || undefined,
        incorporationCertNumber: String(row["Incorporation Cert Number"] || row.incorporationCertNumber || row.IncorporationCertNumber || "").trim() || undefined,
        incorporationDate: String(row["Incorporation Date"] || row.incorporationDate || row.IncorporationDate || "").trim() || undefined,
        companyType: String(row["Company Type"] || row.companyType || row.CompanyType || "").trim() || undefined,
        primaryContactName: String(row["Primary Contact Name"] || row.primaryContactName || row.PrimaryContactName || "").trim() || undefined,
        primaryMobile: String(row["Primary Mobile"] || row.primaryMobile || row.PrimaryMobile || "").trim(),
        primaryEmail: String(row["Primary Email"] || row.primaryEmail || row.PrimaryEmail || "").trim(),
        secondaryContactName: String(row["Secondary Contact Name"] || row.secondaryContactName || row.SecondaryContactName || "").trim() || undefined,
        secondaryMobile: String(row["Secondary Mobile"] || row.secondaryMobile || row.SecondaryMobile || "").trim() || undefined,
        secondaryEmail: String(row["Secondary Email"] || row.secondaryEmail || row.SecondaryEmail || "").trim() || undefined,
        paymentTermsDays: String(row["Payment Terms (Days)"] || row["Payment Terms"] || row.paymentTermsDays || row.PaymentTerms || "").trim(),
        creditLimit: String(row["Credit Limit"] || row.creditLimit || row.CreditLimit || "").trim(),
        interestApplicableFrom: String(row["Interest Applicable From"] || row.interestApplicableFrom || row.InterestApplicableFrom || "").trim() || undefined,
        interestRate: String(row["Interest Rate (%)"] || row["Interest Rate"] || row.interestRate || row.InterestRate || "").trim(),
        salesPerson: String(row["Sales Person"] || row.salesPerson || row.SalesPerson || "").trim() || undefined,
        isActive: (() => {
          const value = row["Is Active"] || row.isActive || row.status || row.Status;
          if (value === undefined || value === null) return "Active";
          if (typeof value === 'boolean') return value ? "Active" : "Inactive";
          const strValue = String(value).trim().toLowerCase();
          if (strValue === 'true' || strValue === 'active' || strValue === '1') return "Active";
          if (strValue === 'false' || strValue === 'inactive' || strValue === '0') return "Inactive";
          return "Active";
        })(),
      }));

      const results = [];
      const errors = [];
      
      // Get existing customers to check for duplicates
      const existingCustomers = await storage.getMasterCustomers();
      const existingNames = new Set(
        existingCustomers.map(c => c.clientName.toLowerCase().trim())
      );

      for (let i = 0; i < customers.length; i++) {
        const result = insertMasterCustomerSchema.safeParse(customers[i]);
        if (result.success) {
          // Check for duplicate name
          const normalizedName = result.data.clientName.toLowerCase().trim();
          if (existingNames.has(normalizedName)) {
            errors.push({ 
              row: i + 2, 
              error: `Duplicate customer name: "${result.data.clientName}" already exists in database`
            });
          } else {
            const customer = await storage.createMasterCustomer(result.data);
            results.push(customer);
            // Add to existing names to prevent duplicates within the import batch
            existingNames.add(normalizedName);
          }
        } else {
          errors.push({ row: i + 2, error: fromZodError(result.error).message });
        }
      }

      res.json({ 
        success: results.length, 
        errors: errors.length,
        customers: results,
        errorDetails: errors
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete master customers (MUST BE BEFORE /:id)
  app.post("/api/masters/customers/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "ids must be an array" });
      }
      const deleted = await storage.deleteMasterCustomers(ids);
      res.json({ deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk update interest rate for all customers
  app.post("/api/masters/customers/bulk-update-interest", async (req, res) => {
    try {
      const { interestRate } = req.body;
      if (interestRate === undefined || interestRate === null) {
        return res.status(400).json({ message: "Interest rate is required" });
      }
      const customers = await storage.getMasterCustomers();
      const updates = await Promise.all(
        customers.map(customer => 
          storage.updateMasterCustomer(customer.id, { interestRate: interestRate.toString() })
        )
      );
      res.json({ updated: updates.length, message: "Interest rate updated for all customers" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create master customer
  app.post("/api/masters/customers", async (req, res) => {
    try {
      const result = insertMasterCustomerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      // Check for duplicate customer name
      const existingCustomers = await storage.getMasterCustomers();
      const normalizedName = result.data.clientName.toLowerCase().trim();
      const duplicate = existingCustomers.find(
        c => c.clientName.toLowerCase().trim() === normalizedName
      );
      
      if (duplicate) {
        return res.status(400).json({ 
          message: `Customer with name "${result.data.clientName}" already exists` 
        });
      }
      
      const customer = await storage.createMasterCustomer(result.data);
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update master customer
  app.put("/api/masters/customers/:id", async (req, res) => {
    try {
      const result = insertMasterCustomerSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      // If updating clientName, check for duplicates
      if (result.data.clientName) {
        const existingCustomers = await storage.getMasterCustomers();
        const normalizedName = result.data.clientName.toLowerCase().trim();
        const duplicate = existingCustomers.find(
          c => c.id !== req.params.id && c.clientName.toLowerCase().trim() === normalizedName
        );
        
        if (duplicate) {
          return res.status(400).json({ 
            message: `Customer with name "${result.data.clientName}" already exists` 
          });
        }
      }
      
      const customer = await storage.updateMasterCustomer(req.params.id, result.data);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete master customer
  app.delete("/api/masters/customers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMasterCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json({ message: "Customer deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single master customer (MUST BE AFTER specific routes)
  app.get("/api/masters/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getMasterCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== MASTER ITEMS ROUTES =====

  // Get all master items
  app.get("/api/masters/items", async (_req, res) => {
    try {
      const items = await storage.getMasterItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download sample template for import (MUST BE BEFORE /:id)
  app.get("/api/masters/items/template", async (_req, res) => {
    try {
      const sampleData = [
        {
          "Item Type": "product",
          "Name": "Laptop - Dell XPS 15",
          "Description": "High-performance laptop for professionals",
          "Unit": "PCS",
          "Tax": "18%",
          "SKU": "LAP-DEL-001",
          "Sale Unit Price": "85000",
          "Buy Unit Price": "70000",
          "Opening Quantity": "10",
          "HSN": "8471",
          "SAC": ""
        },
        {
          "Item Type": "service",
          "Name": "IT Consulting",
          "Description": "Professional IT consultation services",
          "Unit": "Hour",
          "Tax": "18%",
          "SKU": "SRV-IT-001",
          "Sale Unit Price": "2500",
          "Buy Unit Price": "",
          "Opening Quantity": "",
          "HSN": "",
          "SAC": "998314"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Master Items Template");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=master_items_template.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export master items (MUST BE BEFORE /:id)
  app.get("/api/masters/items/export", async (_req, res) => {
    try {
      const items = await storage.getMasterItems();
      
      const data = items.map(item => ({
        "Item Type": item.itemType,
        "Name": item.name,
        "Description": item.description || "",
        "Unit": item.unit,
        "Tax": item.tax,
        "SKU": item.sku,
        "Sale Unit Price": item.saleUnitPrice,
        "Buy Unit Price": item.buyUnitPrice || "",
        "Opening Quantity": item.openingQuantity || "",
        "HSN": item.hsn || "",
        "SAC": item.sac || "",
        "Status": item.isActive,
        "Created At": item.createdAt.toISOString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Master Items");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=master_items_export.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import master items from Excel (MUST BE BEFORE /:id)
  app.post("/api/masters/items/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const items = data.map((row: any) => ({
        itemType: String(row["Item Type"] || row.itemType || row.ItemType || "").trim().toLowerCase(),
        name: String(row["Name"] || row.name || "").trim(),
        description: String(row["Description"] || row.description || "").trim() || undefined,
        unit: String(row["Unit"] || row.unit || "").trim(),
        tax: String(row["Tax"] || row.tax || "").trim(),
        sku: String(row["SKU"] || row.sku || "").trim(),
        saleUnitPrice: String(row["Sale Unit Price"] || row.saleUnitPrice || row.SaleUnitPrice || "").trim(),
        buyUnitPrice: String(row["Buy Unit Price"] || row.buyUnitPrice || row.BuyUnitPrice || "").trim() || undefined,
        openingQuantity: String(row["Opening Quantity"] || row.openingQuantity || row.OpeningQuantity || "").trim() || undefined,
        hsn: String(row["HSN"] || row.hsn || "").trim() || undefined,
        sac: String(row["SAC"] || row.sac || "").trim() || undefined,
      }));

      const results = [];
      const errors = [];
      
      // Get existing items to check for duplicates
      const existingItems = await storage.getMasterItems();
      const existingNames = new Set(
        existingItems.map(item => item.name.toLowerCase().trim())
      );

      for (let i = 0; i < items.length; i++) {
        const result = insertMasterItemSchema.safeParse(items[i]);
        if (result.success) {
          // Check for duplicate name
          const normalizedName = result.data.name.toLowerCase().trim();
          if (existingNames.has(normalizedName)) {
            errors.push({ 
              row: i + 2, 
              error: `Duplicate item name: "${result.data.name}" already exists in database`
            });
          } else {
            const item = await storage.createMasterItem(result.data);
            results.push(item);
            // Add to existing names to prevent duplicates within the import batch
            existingNames.add(normalizedName);
          }
        } else {
          errors.push({ row: i + 2, error: fromZodError(result.error).message });
        }
      }

      res.json({ 
        success: results.length, 
        errors: errors.length,
        items: results,
        errorDetails: errors
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete master items (MUST BE BEFORE /:id)
  app.post("/api/masters/items/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "ids must be an array" });
      }
      const deleted = await storage.deleteMasterItems(ids);
      res.json({ deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create master item
  app.post("/api/masters/items", async (req, res) => {
    try {
      const result = insertMasterItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      // Check for duplicate item name
      const existingItems = await storage.getMasterItems();
      const normalizedName = result.data.name.toLowerCase().trim();
      const duplicate = existingItems.find(
        item => item.name.toLowerCase().trim() === normalizedName
      );
      
      if (duplicate) {
        return res.status(400).json({ 
          message: `Item with name "${result.data.name}" already exists` 
        });
      }
      
      const item = await storage.createMasterItem(result.data);
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update master item
  app.put("/api/masters/items/:id", async (req, res) => {
    try {
      const result = insertMasterItemSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      // If updating name, check for duplicates
      if (result.data.name) {
        const existingItems = await storage.getMasterItems();
        const normalizedName = result.data.name.toLowerCase().trim();
        const duplicate = existingItems.find(
          item => item.id !== req.params.id && item.name.toLowerCase().trim() === normalizedName
        );
        
        if (duplicate) {
          return res.status(400).json({ 
            message: `Item with name "${result.data.name}" already exists` 
          });
        }
      }
      
      const item = await storage.updateMasterItem(req.params.id, result.data);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete master item
  app.delete("/api/masters/items/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMasterItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json({ message: "Item deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single master item (MUST BE AFTER specific routes)
  app.get("/api/masters/items/:id", async (req, res) => {
    try {
      const item = await storage.getMasterItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== INVOICE ROUTES =====

  // Get all invoices
  app.get("/api/invoices", async (_req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download sample template for import (MUST BE BEFORE /:id)
  app.get("/api/invoices/template", async (_req, res) => {
    try {
      const sampleData = [
        {
          "Invoice Number": "INV-2025-001",
          "Customer Name": "ABC Corporation Pvt Ltd",
          "Invoice Date": "2025-01-15",
          "Invoice Amount": "150000",
          "Net Profit": "45000",
          "Status": "Unpaid",
          "Assigned User": "Manpreet Bedi",
          "Remarks": "Q1 Services - Payment due in 30 days"
        },
        {
          "Invoice Number": "INV-2025-002",
          "Customer Name": "XYZ Industries Limited",
          "Invoice Date": "2025-01-20",
          "Invoice Amount": "250000",
          "Net Profit": "75000",
          "Status": "Paid",
          "Assigned User": "Bilal Ahamad",
          "Remarks": "Hardware supply - Paid on delivery"
        },
        {
          "Invoice Number": "INV-2025-003",
          "Customer Name": "Tech Solutions India",
          "Invoice Date": "2025-01-25",
          "Invoice Amount": "180000",
          "Net Profit": "50000",
          "Status": "Partial",
          "Assigned User": "Anjali Dhiman",
          "Remarks": "Consulting services - Partial payment received"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices Template");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=invoices_template.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export invoices (MUST BE BEFORE /:id)
  app.get("/api/invoices/export", async (_req, res) => {
    try {
      const invoices = await storage.getInvoices();
      
      const data = invoices.map(invoice => ({
        "Invoice Number": invoice.invoiceNumber,
        "Customer Name": invoice.customerName,
        "Invoice Date": invoice.invoiceDate.toISOString().split('T')[0],
        "Invoice Amount": invoice.invoiceAmount,
        "Net Profit": invoice.netProfit,
        "Status": invoice.status,
        "Assigned User": invoice.assignedUser || "",
        "Remarks": invoice.remarks || "",
        "Created At": invoice.createdAt.toISOString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=invoices_export.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import invoices from Excel (MUST BE BEFORE /:id)
  app.post("/api/invoices/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const results = [];
      const errors = [];
      const duplicates = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Parse date - Excel exports dates as serial numbers or formatted strings
        let dateValue = (row as any)["Invoice Date"];
        let parsedDate = "";
        
        if (typeof dateValue === 'number') {
          // Excel serial date number (days since 1/1/1900)
          const excelEpoch = new Date(1900, 0, 1);
          const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
          parsedDate = date.toISOString().split('T')[0];
        } else if (dateValue) {
          // Try to parse as string
          parsedDate = String(dateValue).trim();
        }
        
        const invoiceData = {
          invoiceNumber: String((row as any)["Invoice Number"] || "").trim(),
          customerName: String((row as any)["Customer Name"] || "").trim(),
          invoiceDate: parsedDate,
          invoiceAmount: String((row as any)["Invoice Amount"] || "0").trim(),
          netProfit: String((row as any)["Net Profit"] || "0").trim(),
          status: String((row as any)["Status"] || "Unpaid").trim() as "Paid" | "Unpaid" | "Partial",
          assignedUser: String((row as any)["Assigned User"] || "").trim() || undefined,
          remarks: String((row as any)["Remarks"] || "").trim() || undefined,
        };

        const result = insertInvoiceSchema.safeParse(invoiceData);
        if (result.success) {
          // Check if invoice number already exists
          const existingInvoice = await storage.getInvoiceByNumber(result.data.invoiceNumber);
          if (existingInvoice) {
            duplicates.push({ 
              row: i + 2, 
              invoiceNumber: result.data.invoiceNumber,
              error: `Duplicate invoice number: ${result.data.invoiceNumber}` 
            });
          } else {
            const invoice = await storage.createInvoice(result.data);
            results.push(invoice);
          }
        } else {
          errors.push({ row: i + 2, error: fromZodError(result.error).message });
        }
      }

      res.json({ 
        success: results.length, 
        errors: errors.length,
        duplicates: duplicates.length,
        invoices: results,
        errorDetails: errors,
        duplicateDetails: duplicates
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete invoices (MUST BE BEFORE /:id)
  app.post("/api/invoices/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "ids must be an array" });
      }
      const deleted = await storage.deleteInvoices(ids);
      res.json({ deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create invoice
  app.post("/api/invoices", async (req, res) => {
    try {
      const result = insertInvoiceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const invoice = await storage.createInvoice(result.data);
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update invoice
  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const result = insertInvoiceSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const invoice = await storage.updateInvoice(req.params.id, result.data);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete invoice
  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json({ message: "Invoice deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single invoice (MUST BE AFTER specific routes)
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ RECEIPT ROUTES ============

  // Get all receipts
  app.get("/api/receipts", async (req, res) => {
    try {
      const receipts = await storage.getReceipts();
      res.json(receipts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download receipt template (MUST BE BEFORE /:id)
  app.get("/api/receipts/template", async (req, res) => {
    try {
      const headers = ["Voucher Number", "Invoice Number", "Customer Name", "Date", "Amount", "Remarks"];
      const sampleData = [
        {
          "Voucher Number": "RCPT001",
          "Invoice Number": "INV001",
          "Customer Name": "ABC Company",
          "Date": "2024-01-15",
          "Amount": "50000",
          "Remarks": "Payment received"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Receipts Template");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=receipts_template.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export receipts to Excel (MUST BE BEFORE /:id)
  app.get("/api/receipts/export", async (req, res) => {
    try {
      const receipts = await storage.getReceipts();
      
      const data = receipts.map((receipt) => ({
        "Voucher Number": receipt.voucherNumber,
        "Invoice Number": receipt.invoiceNumber,
        "Customer Name": receipt.customerName,
        "Date": receipt.date.toISOString().split('T')[0],
        "Amount": receipt.amount,
        "Remarks": receipt.remarks || "",
        "Created At": receipt.createdAt.toISOString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Receipts");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=receipts_export.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import receipts from Excel (MUST BE BEFORE /:id)
  app.post("/api/receipts/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const results = [];
      const errors = [];
      const duplicates = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Parse date - Excel exports dates as serial numbers or formatted strings
        let dateValue = (row as any)["Date"];
        let parsedDate = "";
        
        if (typeof dateValue === 'number') {
          // Excel serial date number (days since 1/1/1900)
          const excelEpoch = new Date(1900, 0, 1);
          const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
          parsedDate = date.toISOString().split('T')[0];
        } else if (dateValue) {
          // Try to parse as string
          parsedDate = String(dateValue).trim();
        }
        
        const receiptData = {
          voucherNumber: String((row as any)["Voucher Number"] || "").trim(),
          invoiceNumber: String((row as any)["Invoice Number"] || "").trim(),
          customerName: String((row as any)["Customer Name"] || "").trim(),
          date: parsedDate,
          amount: String((row as any)["Amount"] || "0").trim(),
          remarks: String((row as any)["Remarks"] || "").trim() || undefined,
        };

        const result = insertReceiptSchema.safeParse(receiptData);
        if (result.success) {
          // Check if voucher number already exists
          const existingReceipt = await storage.getReceiptByVoucherNumber(result.data.voucherNumber);
          if (existingReceipt) {
            duplicates.push({ 
              row: i + 2, 
              voucherNumber: result.data.voucherNumber,
              error: `Duplicate voucher number: ${result.data.voucherNumber}` 
            });
          } else {
            const receipt = await storage.createReceipt(result.data);
            results.push(receipt);
          }
        } else {
          errors.push({ row: i + 2, error: fromZodError(result.error).message });
        }
      }

      res.json({ 
        success: results.length, 
        errors: errors.length,
        duplicates: duplicates.length,
        receipts: results,
        errorDetails: errors,
        duplicateDetails: duplicates
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete receipts (MUST BE BEFORE /:id)
  app.post("/api/receipts/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "ids must be an array" });
      }
      const deleted = await storage.deleteReceipts(ids);
      res.json({ deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create receipt
  app.post("/api/receipts", async (req, res) => {
    try {
      const result = insertReceiptSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const receipt = await storage.createReceipt(result.data);
      res.json(receipt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update receipt
  app.put("/api/receipts/:id", async (req, res) => {
    try {
      const result = insertReceiptSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const receipt = await storage.updateReceipt(req.params.id, result.data);
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      res.json(receipt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete receipt
  app.delete("/api/receipts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteReceipt(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      res.json({ message: "Receipt deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single receipt (MUST BE AFTER specific routes)
  app.get("/api/receipts/:id", async (req, res) => {
    try {
      const receipt = await storage.getReceipt(req.params.id);
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      res.json(receipt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ LEAD ROUTES ============

  // Get all leads
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download lead template (MUST BE BEFORE /:id)
  app.get("/api/leads/template", async (req, res) => {
    try {
      const sampleData = [
        {
          "Company Name": "Tech Solutions Pvt Ltd",
          "Contact Person": "Rajesh Kumar",
          "Mobile": "9876543210",
          "Email": "rajesh@techsolutions.com",
          "Lead Source": "Website",
          "Lead Status": "New Lead",
          "Estimated Deal Amount": "150000",
          "Address": "123 Business Park, Sector 18",
          "City": "Noida",
          "State": "Uttar Pradesh",
          "Pincode": "201301",
          "Remarks": "Interested in web development services",
          "Industry": "IT Services",
          "Priority": "High",
          "Assigned User": "Manpreet Bedi",
          "Date Created": "2024-01-15",
          "Last Follow Up": "2024-01-20",
          "Next Follow Up": "2024-01-25"
        },
        {
          "Company Name": "Digital Marketing Hub",
          "Contact Person": "Priya Sharma",
          "Mobile": "8765432109",
          "Email": "priya@digitalmarketing.com",
          "Lead Source": "Instagram",
          "Lead Status": "In Progress",
          "Estimated Deal Amount": "75000",
          "Address": "456 Tower B, Cyber City",
          "City": "Gurgaon",
          "State": "Haryana",
          "Pincode": "122002",
          "Remarks": "Needs social media management",
          "Industry": "Marketing",
          "Priority": "Medium",
          "Assigned User": "Bilal Ahamad",
          "Date Created": "2024-01-10",
          "Last Follow Up": "2024-01-18",
          "Next Follow Up": "2024-01-22"
        },
        {
          "Company Name": "E-commerce Solutions",
          "Contact Person": "Amit Patel",
          "Mobile": "7654321098",
          "Email": "amit@ecommerce.com",
          "Lead Source": "Reference",
          "Lead Status": "Quotation Sent",
          "Estimated Deal Amount": "250000",
          "Address": "789 Business Center, MG Road",
          "City": "Bangalore",
          "State": "Karnataka",
          "Pincode": "560001",
          "Remarks": "Looking for complete e-commerce platform",
          "Industry": "Retail",
          "Priority": "High",
          "Assigned User": "Anjali Dhiman",
          "Date Created": "2024-01-05",
          "Last Follow Up": "2024-01-19",
          "Next Follow Up": "2024-01-26"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads Template");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=leads_template.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export leads to Excel (MUST BE BEFORE /:id)
  app.get("/api/leads/export", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      
      const data = leads.map((lead) => ({
        "Company Name": lead.companyName,
        "Contact Person": lead.contactPerson,
        "Mobile": lead.mobile,
        "Email": lead.email,
        "Lead Source": lead.leadSource,
        "Lead Status": lead.leadStatus,
        "Estimated Deal Amount": lead.estimatedDealAmount || "",
        "Address": lead.address || "",
        "City": lead.city || "",
        "State": lead.state || "",
        "Pincode": lead.pincode || "",
        "Remarks": lead.remarks || "",
        "Industry": lead.industry || "",
        "Priority": lead.priority || "",
        "Assigned User": lead.assignedUser || "",
        "Date Created": lead.dateCreated ? lead.dateCreated.toISOString().split('T')[0] : "",
        "Last Follow Up": lead.lastFollowUp ? lead.lastFollowUp.toISOString().split('T')[0] : "",
        "Next Follow Up": lead.nextFollowUp ? lead.nextFollowUp.toISOString().split('T')[0] : "",
        "Created At": lead.createdAt.toISOString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=leads_export.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import leads from Excel (MUST BE BEFORE /:id)
  app.post("/api/leads/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const results = [];
      const errors = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Parse dates - Excel exports dates as serial numbers or formatted strings
        const parseDateField = (dateValue: any): string | undefined => {
          if (!dateValue) return undefined;
          
          if (typeof dateValue === 'number') {
            // Excel serial date number (days since 1/1/1900)
            const excelEpoch = new Date(1900, 0, 1);
            const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
            return date.toISOString().split('T')[0];
          } else {
            // Try to parse as string
            return String(dateValue).trim();
          }
        };
        
        const estimatedDealAmountValue = (row as any)["Estimated Deal Amount"];
        const estimatedDealAmount = estimatedDealAmountValue 
          ? String(estimatedDealAmountValue).trim() 
          : undefined;
        
        const leadData = {
          companyName: String((row as any)["Company Name"] || "").trim(),
          contactPerson: String((row as any)["Contact Person"] || "").trim(),
          mobile: String((row as any)["Mobile"] || "").trim(),
          email: String((row as any)["Email"] || "").trim(),
          leadSource: String((row as any)["Lead Source"] || "").trim(),
          leadStatus: String((row as any)["Lead Status"] || "New Lead").trim(),
          estimatedDealAmount: estimatedDealAmount,
          address: String((row as any)["Address"] || "").trim() || undefined,
          city: String((row as any)["City"] || "").trim() || undefined,
          state: String((row as any)["State"] || "").trim() || undefined,
          pincode: String((row as any)["Pincode"] || "").trim() || undefined,
          remarks: String((row as any)["Remarks"] || "").trim() || undefined,
          industry: String((row as any)["Industry"] || "").trim() || undefined,
          priority: String((row as any)["Priority"] || "").trim() || undefined,
          assignedUser: String((row as any)["Assigned User"] || "").trim() || undefined,
          dateCreated: parseDateField((row as any)["Date Created"]),
          lastFollowUp: parseDateField((row as any)["Last Follow Up"]),
          nextFollowUp: parseDateField((row as any)["Next Follow Up"]),
        };

        const result = insertLeadSchema.safeParse(leadData);
        if (result.success) {
          // Check for duplicate mobile or email
          const existingLeads = await storage.getLeads();
          const duplicateMobile = existingLeads.find(
            (existing) => existing.mobile === result.data.mobile
          );
          const duplicateEmail = existingLeads.find(
            (existing) => existing.email.toLowerCase() === result.data.email.toLowerCase()
          );

          if (duplicateMobile) {
            errors.push({
              rowNumber: i + 2,
              field: 'mobile',
              message: `Duplicate entry: Mobile number ${result.data.mobile} already exists for ${duplicateMobile.companyName}`
            });
          } else if (duplicateEmail) {
            errors.push({
              rowNumber: i + 2,
              field: 'email',
              message: `Duplicate entry: Email ${result.data.email} already exists for ${duplicateEmail.companyName}`
            });
          } else {
            const lead = await storage.createLead(result.data);
            results.push(lead);
          }
        } else {
          // Extract field and message from Zod error
          const zodError = result.error;
          const firstError = zodError.errors[0];
          errors.push({ 
            rowNumber: i + 2, 
            field: firstError.path.join('.') || 'unknown',
            message: firstError.message 
          });
        }
      }

      res.json({ 
        imported: results.length,
        errors: errors
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete leads (MUST BE BEFORE /:id)
  app.post("/api/leads/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "ids must be an array" });
      }
      const deleted = await storage.deleteLeads(ids);
      res.json({ deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create lead
  app.post("/api/leads", async (req, res) => {
    try {
      const result = insertLeadSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const lead = await storage.createLead(result.data);
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update lead
  app.put("/api/leads/:id", async (req, res) => {
    try {
      const result = insertLeadSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const lead = await storage.updateLead(req.params.id, result.data);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Partial update lead (for inline editing)
  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const result = insertLeadSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const lead = await storage.updateLead(req.params.id, result.data);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete lead
  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLead(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json({ message: "Lead deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single lead (MUST BE AFTER specific routes)
  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lead Follow-up Routes
  
  // Get follow-ups for a specific lead
  app.get("/api/leads/:id/followups", async (req, res) => {
    try {
      const followUps = await storage.getLeadFollowUpsByLead(req.params.id);
      res.json(followUps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new lead follow-up
  app.post("/api/leads/followups", async (req, res) => {
    try {
      const result = insertLeadFollowUpSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const followUp = await storage.createLeadFollowUp(result.data);
      res.json(followUp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update a lead follow-up
  app.put("/api/leads/followups/:id", async (req, res) => {
    try {
      const result = insertLeadFollowUpSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const followUp = await storage.updateLeadFollowUp(req.params.id, result.data);
      if (!followUp) {
        return res.status(404).json({ message: "Follow-up not found" });
      }
      res.json(followUp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a lead follow-up
  app.delete("/api/leads/followups/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLeadFollowUp(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Follow-up not found" });
      }
      res.json({ message: "Follow-up deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Company Profile Routes
  
  // Upload company logo
  app.post("/api/company-profile/upload-logo", upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Store as base64 data URL for simplicity
      const base64Logo = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      res.json({ logoUrl: base64Logo });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get company profile
  app.get("/api/company-profile", async (_req, res) => {
    try {
      const profile = await storage.getCompanyProfile();
      res.json(profile || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update/Create company profile
  app.post("/api/company-profile", async (req, res) => {
    try {
      const result = insertCompanyProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const profile = await storage.updateCompanyProfile(result.data);
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ QUOTATION ROUTES ============

  // Get all quotations
  app.get("/api/quotations", async (_req, res) => {
    try {
      const quotations = await storage.getQuotations();
      res.json(quotations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get next quotation number (must be before :id route)
  app.get("/api/quotations/next-number", async (_req, res) => {
    try {
      const nextNumber = await storage.getNextQuotationNumber();
      res.json({ quotationNumber: nextNumber });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export quotations to Excel
  app.get("/api/quotations/export", async (_req, res) => {
    try {
      const quotations = await storage.getQuotations();
      
      const exportData = quotations.map((q: any) => ({
        "Quotation Number": q.quotationNumber,
        "Date": new Date(q.quotationDate).toLocaleDateString(),
        "Valid Until": new Date(q.validUntil).toLocaleDateString(),
        "Lead Name": q.leadName,
        "Lead Email": q.leadEmail,
        "Lead Mobile": q.leadMobile,
        "Subtotal": parseFloat(q.subtotal || "0").toFixed(2),
        "Discount": parseFloat(q.totalDiscount || "0").toFixed(2),
        "Tax": parseFloat(q.totalTax || "0").toFixed(2),
        "Grand Total": parseFloat(q.grandTotal || "0").toFixed(2),
        "Created At": new Date(q.createdAt).toLocaleDateString(),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Quotations");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename=quotations.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single quotation
  app.get("/api/quotations/:id", async (req, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      res.json(quotation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get quotation items
  app.get("/api/quotations/:id/items", async (req, res) => {
    try {
      const items = await storage.getQuotationItems(req.params.id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new quotation
  app.post("/api/quotations", async (req, res) => {
    try {
      const result = insertQuotationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const quotation = await storage.createQuotation(result.data);
      res.status(201).json(quotation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create quotation item
  app.post("/api/quotations/:id/items", async (req, res) => {
    try {
      const result = insertQuotationItemSchema.safeParse({
        ...req.body,
        quotationId: req.params.id,
      });
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const item = await storage.createQuotationItem(result.data);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update quotation
  app.put("/api/quotations/:id", async (req, res) => {
    try {
      const result = insertQuotationSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const quotation = await storage.updateQuotation(req.params.id, result.data);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      res.json(quotation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete quotation
  app.delete("/api/quotations/:id", async (req, res) => {
    try {
      const success = await storage.deleteQuotation(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete quotations
  app.post("/api/quotations/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ message: "Invalid request: ids array required" });
      }
      const count = await storage.deleteQuotations(ids);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete all items for a quotation (bulk delete)
  app.delete("/api/quotations/:quotationId/items", async (req, res) => {
    try {
      const count = await storage.deleteQuotationItems(req.params.quotationId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete quotation item
  app.delete("/api/quotations/:quotationId/items/:itemId", async (req, res) => {
    try {
      const success = await storage.deleteQuotationItem(req.params.itemId);
      if (!success) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get quotation settings (Terms & Conditions)
  app.get("/api/quotation-settings", async (_req, res) => {
    try {
      const settings = await storage.getQuotationSettings();
      res.json(settings || { termsAndConditions: "" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update quotation settings
  app.post("/api/quotation-settings", async (req, res) => {
    try {
      const result = insertQuotationSettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const settings = await storage.updateQuotationSettings(result.data.termsAndConditions);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ PROFORMA INVOICE ROUTES ============

  // Generate Proforma Invoice from Quotation
  app.post("/api/quotations/:id/generate-pi", async (req, res) => {
    try {
      // Get the quotation
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      // Check if a PI already exists for this quotation
      const existingPI = await storage.getProformaInvoiceByQuotationId(req.params.id);
      if (existingPI) {
        return res.status(400).json({ 
          message: "A Proforma Invoice already exists for this quotation",
          existingInvoice: existingPI
        });
      }

      // Get quotation items
      const quotationItems = await storage.getQuotationItems(req.params.id);

      // Get next PI number
      const nextNumber = await storage.getNextProformaInvoiceNumber();

      // Calculate due date (30 days from now by default)
      const invoiceDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Create proforma invoice
      const piData = {
        invoiceNumber: nextNumber,
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        quotationId: quotation.id,
        leadId: quotation.leadId,
        leadName: quotation.leadName,
        leadEmail: quotation.leadEmail,
        leadMobile: quotation.leadMobile,
        subtotal: quotation.subtotal,
        totalDiscount: quotation.totalDiscount,
        totalTax: quotation.totalTax,
        grandTotal: quotation.grandTotal,
        termsAndConditions: quotation.termsAndConditions || "",
      };

      const result = insertProformaInvoiceSchema.safeParse(piData);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const proformaInvoice = await storage.createProformaInvoice(result.data);

      // Copy quotation items to proforma invoice items
      for (const item of quotationItems) {
        const itemData = {
          invoiceId: proformaInvoice.id,
          itemId: item.itemId || undefined,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
          amount: item.amount,
          displayOrder: item.displayOrder,
        };

        const itemResult = insertProformaInvoiceItemSchema.safeParse(itemData);
        if (itemResult.success) {
          await storage.createProformaInvoiceItem(itemResult.data);
        }
      }

      res.status(201).json(proformaInvoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all proforma invoices
  app.get("/api/proforma-invoices", async (_req, res) => {
    try {
      const invoices = await storage.getProformaInvoices();
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get next proforma invoice number
  app.get("/api/proforma-invoices/next-number", async (_req, res) => {
    try {
      const nextNumber = await storage.getNextProformaInvoiceNumber();
      res.json({ invoiceNumber: nextNumber });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single proforma invoice
  app.get("/api/proforma-invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getProformaInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Proforma invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get proforma invoice items
  app.get("/api/proforma-invoices/:id/items", async (req, res) => {
    try {
      const items = await storage.getProformaInvoiceItems(req.params.id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete proforma invoice
  app.delete("/api/proforma-invoices/:id", async (req, res) => {
    try {
      const success = await storage.deleteProformaInvoice(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Proforma invoice not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete proforma invoices
  app.post("/api/proforma-invoices/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid ids array" });
      }
      const count = await storage.deleteProformaInvoices(ids);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export proforma invoices to Excel
  app.get("/api/proforma-invoices/export", async (_req, res) => {
    try {
      const invoices = await storage.getProformaInvoices();
      
      const exportData = invoices.map((inv: any) => ({
        "PI Number": inv.invoiceNumber,
        "Invoice Date": new Date(inv.invoiceDate).toLocaleDateString(),
        "Due Date": new Date(inv.dueDate).toLocaleDateString(),
        "Customer Name": inv.leadName,
        "Customer Email": inv.leadEmail,
        "Customer Mobile": inv.leadMobile,
        "Subtotal": parseFloat(inv.subtotal || "0").toFixed(2),
        "Discount": parseFloat(inv.totalDiscount || "0").toFixed(2),
        "Tax": parseFloat(inv.totalTax || "0").toFixed(2),
        "Grand Total": parseFloat(inv.grandTotal || "0").toFixed(2),
        "Created At": new Date(inv.createdAt).toLocaleDateString(),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Proforma Invoices");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename=proforma_invoices.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get debtors list with category-wise breakdown
  app.get("/api/debtors", async (_req, res) => {
    try {
      const data = await storage.getDebtorsList();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get debtors follow-ups by customer
  app.get("/api/debtors/followups/:customerId", async (req, res) => {
    try {
      const { customerId } = req.params;
      const followUps = await storage.getDebtorsFollowUpsByCustomer(customerId);
      res.json(followUps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create debtors follow-up
  app.post("/api/debtors/followup", async (req, res) => {
    try {
      const validation = insertDebtorsFollowUpSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }
      const followUp = await storage.createDebtorsFollowUp(validation.data);
      res.status(201).json(followUp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get debtors follow-ups by category
  app.get("/api/debtors/followups/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const followUps = await storage.getDebtorsFollowUpsByCategory(category);
      res.json(followUps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ ROLES ROUTES ============
  
  // Get all roles
  app.get("/api/roles", async (_req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get roles template
  app.get("/api/roles/template", async (_req, res) => {
    try {
      const sampleData = [
        {
          Name: "Admin",
          Description: "Full system access",
          Permissions: "Dashboard,Leads,Quotations,Invoices,Receipts,Debtors,Masters,Settings",
        },
        {
          Name: "Sales Manager",
          Description: "Manage leads and quotations",
          Permissions: "Dashboard,Leads,Quotations",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Roles");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=roles_template.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export roles
  app.get("/api/roles/export", async (_req, res) => {
    try {
      const roles = await storage.getRoles();
      const exportData = roles.map(role => ({
        Name: role.name,
        Description: role.description || "",
        Permissions: role.permissions.join(","),
        "Created At": new Date(role.createdAt).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Roles");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=roles.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import roles
  app.post("/api/roles/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const roles = data.map((row: any) => ({
        name: row.Name || row.name,
        description: row.Description || row.description || "",
        permissions: (row.Permissions || row.permissions || "").split(",").map((p: string) => p.trim()).filter(Boolean),
      }));

      const createdRoles = await Promise.all(
        roles.map(role => storage.createRole(role))
      );

      res.status(201).json({ 
        message: `Successfully imported ${createdRoles.length} roles`,
        count: createdRoles.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single role
  app.get("/api/roles/:id", async (req, res) => {
    try {
      const role = await storage.getRole(req.params.id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create role
  app.post("/api/roles", async (req, res) => {
    try {
      const validation = insertRoleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const role = await storage.createRole(validation.data);
      res.status(201).json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update role
  app.put("/api/roles/:id", async (req, res) => {
    try {
      const validation = insertRoleSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const role = await storage.updateRole(req.params.id, validation.data);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete role
  app.delete("/api/roles/:id", async (req, res) => {
    try {
      const success = await storage.deleteRole(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json({ message: "Role deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete roles
  app.post("/api/roles/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid IDs array" });
      }

      const count = await storage.bulkDeleteRoles(ids);
      res.json({ message: `Successfully deleted ${count} roles`, count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ USERS ROUTES ============
  
  // Get all users
  app.get("/api/users", async (_req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get users template
  app.get("/api/users/template", async (_req, res) => {
    try {
      const sampleData = [
        {
          Name: "John Doe",
          Email: "john.doe@example.com",
          Mobile: "9876543210",
          Role: "Admin",
          Status: "Active",
        },
        {
          Name: "Jane Smith",
          Email: "jane.smith@example.com",
          Mobile: "9876543211",
          Role: "Sales Manager",
          Status: "Active",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=users_template.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export users
  app.get("/api/users/export", async (_req, res) => {
    try {
      const users = await storage.getUsers();
      const exportData = users.map(user => ({
        Name: user.name,
        Email: user.email,
        Mobile: user.mobile || "",
        Role: user.roleName || "",
        Status: user.status,
        "Created At": new Date(user.createdAt).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=users.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import users
  app.post("/api/users/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const allRoles = await storage.getRoles();

      const users = data.map((row: any) => {
        const roleName = row.Role || row.role;
        const role = allRoles.find(r => r.name === roleName);

        return {
          name: row.Name || row.name,
          email: row.Email || row.email,
          mobile: row.Mobile || row.mobile || "",
          roleId: role?.id,
          status: row.Status || row.status || "Active",
        };
      });

      const createdUsers = await Promise.all(
        users.map(user => storage.createUser(user))
      );

      res.status(201).json({ 
        message: `Successfully imported ${createdUsers.length} users`,
        count: createdUsers.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single user
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create user
  app.post("/api/users", async (req, res) => {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const user = await storage.createUser(validation.data);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update user
  app.put("/api/users/:id", async (req, res) => {
    try {
      const validation = insertUserSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const user = await storage.updateUser(req.params.id, validation.data);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete user
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete users
  app.post("/api/users/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid IDs array" });
      }

      const count = await storage.bulkDeleteUsers(ids);
      res.json({ message: `Successfully deleted ${count} users`, count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
