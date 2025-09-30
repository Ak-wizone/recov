import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertPaymentSchema, insertFollowUpSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import * as XLSX from "xlsx";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all customers
  app.get("/api/customers", async (_req, res) => {
    try {
      const customers = await storage.getCustomers();
      
      // Fetch the most recent follow-up for each customer
      const customersWithFollowUps = await Promise.all(
        customers.map(async (customer) => {
          const followUps = await storage.getFollowUpsByCustomer(customer.id);
          const mostRecent = followUps.length > 0 ? followUps[0] : null;
          
          return {
            ...customer,
            lastFollowUpRemarks: mostRecent?.remarks || null,
            nextFollowUpDate: mostRecent?.followUpDateTime || null,
            nextFollowUpType: mostRecent?.type || null,
          };
        })
      );
      
      res.json(customersWithFollowUps);
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

  const httpServer = createServer(app);
  return httpServer;
}
