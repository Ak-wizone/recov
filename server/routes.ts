import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertPaymentSchema, insertFollowUpSchema, insertMasterCustomerSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import * as XLSX from "xlsx";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
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
          "State": "Maharashtra",
          "GST Number": "27AABCU9603R1ZM",
          "PAN Number": "AABCU9603R",
          "Payment Terms (Days)": "30",
        },
        {
          "Client Name": "XYZ Industries Limited",
          "Category": "Beta",
          "Billing Address": "456 Industrial Estate, Sector 5",
          "City": "Bangalore",
          "State": "Karnataka",
          "GST Number": "29AAFCD5862R1Z5",
          "PAN Number": "AAFCD5862R",
          "Payment Terms (Days)": "45",
        },
        {
          "Client Name": "Tech Solutions India",
          "Category": "Gamma",
          "Billing Address": "789 IT Park, Phase 2",
          "City": "Pune",
          "State": "Maharashtra",
          "GST Number": "27AACCT1234E1Z1",
          "PAN Number": "AACCT1234E",
          "Payment Terms (Days)": "60",
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
        billingAddress: String(row["Billing Address"] || row.billingAddress || row.BillingAddress || "").trim() || undefined,
        city: String(row["City"] || row.city || "").trim() || undefined,
        state: String(row["State"] || row.state || "").trim() || undefined,
        gstNumber: String(row["GST Number"] || row.gstNumber || row.GSTNumber || row.GST || "").trim() || undefined,
        panNumber: String(row["PAN Number"] || row.panNumber || row.PANNumber || row.PAN || "").trim() || undefined,
        paymentTermsDays: String(row["Payment Terms (Days)"] || row["Payment Terms"] || row.paymentTermsDays || row.PaymentTerms || "").trim(),
      }));

      const results = [];
      const errors = [];

      for (let i = 0; i < customers.length; i++) {
        const result = insertMasterCustomerSchema.safeParse(customers[i]);
        if (result.success) {
          const customer = await storage.createMasterCustomer(result.data);
          results.push(customer);
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

  // Create master customer
  app.post("/api/masters/customers", async (req, res) => {
    try {
      const result = insertMasterCustomerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
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

  const httpServer = createServer(app);
  return httpServer;
}
