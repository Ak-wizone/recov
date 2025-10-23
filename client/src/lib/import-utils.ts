import * as XLSX from "xlsx";

export interface ImportRow {
  clientName?: string;
  category?: string;
  primaryContactName?: string;
  primaryMobile?: string;
  primaryEmail?: string;
  secondaryContactName?: string;
  secondaryMobile?: string;
  secondaryEmail?: string;
  gstNumber?: string;
  billingAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  paymentTermsDays?: string;
  creditLimit?: string;
  openingBalance?: string;
  interestApplicableFrom?: string;
  interestRate?: string;
  salesPerson?: string;
  isActive?: string;
}

export interface ImportItemRow {
  itemType?: string;
  name?: string;
  description?: string;
  unit?: string;
  tax?: string;
  sku?: string;
  saleUnitPrice?: string;
  buyUnitPrice?: string;
  openingQuantity?: string;
  hsn?: string;
  sac?: string;
  isActive?: string;
}

export interface ImportInvoiceRow {
  invoiceNumber?: string;
  customerName?: string;
  invoiceDate?: string;
  invoiceAmount?: string;
  grossProfit?: string;
  status?: string;
  assignedUser?: string;
  remarks?: string;
}

export interface ImportReceiptRow {
  voucherNumber?: string;
  voucherType?: string;
  customerName?: string;
  date?: string;
  amount?: string;
  remarks?: string;
}

export interface ValidationError {
  row: number;
  message: string;
  field?: string;
}

export interface DuplicateInfo {
  row: number;
  isDuplicate: boolean;
  duplicateKey?: string;
  duplicateRows?: number[];
}

// Normalize text for deduplication (lowercase, trim, remove extra spaces)
function normalizeText(text?: string): string {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Generate a unique key for deduplication (based on customer name only)
export function generateCustomerDuplicateKey(row: ImportRow): string {
  const name = normalizeText(row.clientName);
  return name;
}

// Detect duplicates within the import batch
export function detectDuplicatesInBatch(rows: ImportRow[]): Map<number, DuplicateInfo> {
  const duplicateMap = new Map<number, DuplicateInfo>();
  const keyToRows = new Map<string, number[]>();
  
  // Build map of keys to row numbers
  rows.forEach((row, index) => {
    const key = generateCustomerDuplicateKey(row);
    if (!keyToRows.has(key)) {
      keyToRows.set(key, []);
    }
    keyToRows.get(key)!.push(index);
  });
  
  // Mark duplicates
  keyToRows.forEach((rowNumbers, key) => {
    if (rowNumbers.length > 1) {
      // All rows with this key are duplicates
      rowNumbers.forEach(rowNum => {
        duplicateMap.set(rowNum, {
          row: rowNum,
          isDuplicate: true,
          duplicateKey: key,
          duplicateRows: rowNumbers.filter(r => r !== rowNum),
        });
      });
    }
  });
  
  return duplicateMap;
}

export async function parseImportFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const rows: ImportRow[] = jsonData.map((row: any) => ({
          clientName: String(row["CLIENT NAME"] || row["Client Name"] || row.clientName || row.ClientName || "").trim(),
          category: String(row["CATEGORY"] || row["Category"] || row.category || "").trim(),
          primaryContactName: String(row["PRIMARY CONTACT"] || row["Primary Contact"] || row.primaryContactName || row.PrimaryContactName || "").trim(),
          primaryMobile: String(row["PRIMARY MOBILE"] || row["Primary Mobile"] || row.primaryMobile || row.PrimaryMobile || row["Mobile"] || "").trim(),
          primaryEmail: String(row["PRIMARY EMAIL"] || row["Primary Email"] || row.primaryEmail || row.PrimaryEmail || row["Email"] || "").trim(),
          secondaryContactName: String(row["SECONDARY CONTACT"] || row["Secondary Contact"] || row.secondaryContactName || row.SecondaryContactName || "").trim(),
          secondaryMobile: String(row["SECONDARY MOBILE"] || row["Secondary Mobile"] || row.secondaryMobile || row.SecondaryMobile || "").trim(),
          secondaryEmail: String(row["SECONDARY EMAIL"] || row["Secondary Email"] || row.secondaryEmail || row.SecondaryEmail || "").trim(),
          gstNumber: String(row["GSTIN"] || row["GST Number"] || row.gstNumber || row.GSTNumber || row.GST || "").trim(),
          billingAddress: String(row["BILLING ADDRESS"] || row["Billing Address"] || row.billingAddress || row.BillingAddress || "").trim(),
          city: String(row["CITY"] || row["City"] || row.city || "").trim(),
          state: String(row["STATE"] || row["State"] || row.state || "").trim(),
          pincode: String(row["PINCODE"] || row["Pin Code"] || row["Pincode"] || row.pincode || row.PinCode || "").trim(),
          paymentTermsDays: String(row["PAYMENT TERMS (DAYS)"] || row["Payment Terms (Days)"] || row["Payment Terms"] || row.paymentTermsDays || row.PaymentTerms || "").trim(),
          creditLimit: String(row["CREDIT LIMIT"] || row["Credit Limit"] || row.creditLimit || row.CreditLimit || "").trim(),
          openingBalance: String(row["OPENING BALANCE"] || row["Opening Balance"] || row.openingBalance || row.OpeningBalance || "").trim(),
          interestApplicableFrom: String(row["INTEREST APPLICABLE FROM"] || row["Interest Applicable From"] || row.interestApplicableFrom || row.InterestApplicableFrom || "").trim(),
          interestRate: String(row["INTEREST RATE"] || row["Interest Rate"] || row.interestRate || row.InterestRate || "").trim(),
          salesPerson: String(row["SALES PERSON"] || row["Sales Person"] || row.salesPerson || row.SalesPerson || "").trim(),
          isActive: (() => {
            const value = row["STATUS"] || row["Status"] || row["Is Active"] || row.isActive || row.status;
            if (value === undefined || value === null) return "Active";
            if (typeof value === 'boolean') return value ? "Active" : "Inactive";
            const strValue = String(value).trim().toLowerCase();
            if (strValue === 'true' || strValue === 'active' || strValue === '1') return "Active";
            if (strValue === 'false' || strValue === 'inactive' || strValue === '0') return "Inactive";
            return "Active";
          })(),
        }));

        resolve(rows);
      } catch (error: any) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsBinaryString(file);
  });
}

export async function parseItemsFile(file: File): Promise<ImportItemRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const rows: ImportItemRow[] = jsonData.map((row: any) => ({
          itemType: String(row["Item Type"] || row.itemType || row.ItemType || "").trim(),
          name: String(row["Name"] || row.name || row["Item Name"] || row.itemName || "").trim(),
          description: String(row["Description"] || row.description || "").trim(),
          unit: String(row["Unit"] || row.unit || "").trim(),
          tax: String(row["Tax"] || row.tax || row["Tax Rate"] || row.taxRate || "").trim(),
          sku: String(row["SKU"] || row.sku || row["SKU Code"] || row.skuCode || "").trim(),
          saleUnitPrice: String(row["Sale Unit Price"] || row.saleUnitPrice || row.SaleUnitPrice || row["Sale Price"] || "").trim(),
          buyUnitPrice: String(row["Buy Unit Price"] || row.buyUnitPrice || row.BuyUnitPrice || row["Buy Price"] || "").trim(),
          openingQuantity: String(row["Opening Quantity"] || row.openingQuantity || row.OpeningQuantity || "").trim(),
          hsn: String(row["HSN"] || row.hsn || row["HSN Code"] || row.hsnCode || "").trim(),
          sac: String(row["SAC"] || row.sac || row["SAC Code"] || row.sacCode || "").trim(),
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

        resolve(rows);
      } catch (error: any) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsBinaryString(file);
  });
}

export async function parseInvoicesFile(file: File): Promise<ImportInvoiceRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const rows: ImportInvoiceRow[] = jsonData.map((row: any) => ({
          invoiceNumber: String(row["Invoice Number"] || row.invoiceNumber || row.InvoiceNumber || "").trim(),
          customerName: String(row["Customer Name"] || row.customerName || row.CustomerName || "").trim(),
          invoiceDate: String(row["Invoice Date"] || row.invoiceDate || row.InvoiceDate || row.Date || "").trim(),
          invoiceAmount: String(row["Invoice Amount"] || row.invoiceAmount || row.InvoiceAmount || row.Amount || "").trim(),
          grossProfit: String(row["Gross Profit"] || row.grossProfit || row.GrossProfit || row["Net Profit"] || row.netProfit || row.NetProfit || "").trim(),
          status: String(row["Status"] || row.status || "Unpaid").trim(),
          assignedUser: String(row["Assigned User"] || row.assignedUser || row.AssignedUser || "").trim(),
          remarks: String(row["Remarks"] || row.remarks || row.Notes || row.notes || "").trim(),
        }));

        resolve(rows);
      } catch (error: any) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsBinaryString(file);
  });
}

export async function parseReceiptsFile(file: File): Promise<ImportReceiptRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const rows: ImportReceiptRow[] = jsonData.map((row: any) => ({
          voucherNumber: String(row["Voucher Number"] || row.voucherNumber || row.VoucherNumber || "").trim(),
          voucherType: String(row["Voucher Type"] || row.voucherType || row.VoucherType || "").trim(),
          customerName: String(row["Customer Name"] || row.customerName || row.CustomerName || "").trim(),
          date: String(row["Date"] || row.date || row["Receipt Date"] || row.receiptDate || "").trim(),
          amount: String(row["Amount"] || row.amount || "").trim(),
          remarks: String(row["Remarks"] || row.remarks || row.Notes || row.notes || "").trim(),
        }));

        resolve(rows);
      } catch (error: any) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsBinaryString(file);
  });
}

export function validateMasterCustomerRow(row: ImportRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  if (!row.clientName || row.clientName === "") {
    errors.push({
      row: rowNumber,
      message: "Client Name is required",
      field: "clientName",
    });
  }

  if (!row.category || row.category === "") {
    errors.push({
      row: rowNumber,
      message: "Category is required",
      field: "category",
    });
  } else {
    const validCategories = ["Alpha", "Beta", "Gamma", "Delta"];
    if (!validCategories.includes(row.category)) {
      errors.push({
        row: rowNumber,
        message: `Category must be one of: Alpha, Beta, Gamma, Delta`,
        field: "category",
      });
    }
  }

  if (!row.gstNumber || row.gstNumber === "") {
    errors.push({
      row: rowNumber,
      message: "GST Number is required",
      field: "gstNumber",
    });
  }

  if (!row.primaryMobile || row.primaryMobile === "") {
    errors.push({
      row: rowNumber,
      message: "Primary Mobile is required",
      field: "primaryMobile",
    });
  } else if (!/^[0-9]{10}$/.test(row.primaryMobile)) {
    errors.push({
      row: rowNumber,
      message: `Must be exactly 10 digits`,
      field: "primaryMobile",
    });
  }

  if (!row.primaryEmail || row.primaryEmail === "") {
    errors.push({
      row: rowNumber,
      message: "Primary Email is required",
      field: "primaryEmail",
    });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.primaryEmail)) {
    errors.push({
      row: rowNumber,
      message: `Invalid email format`,
      field: "primaryEmail",
    });
  }

  if (!row.paymentTermsDays || row.paymentTermsDays === "") {
    errors.push({
      row: rowNumber,
      message: "Payment Terms (Days) is required",
      field: "paymentTermsDays",
    });
  } else {
    const paymentTerms = parseFloat(row.paymentTermsDays);
    if (isNaN(paymentTerms) || paymentTerms < 0) {
      errors.push({
        row: rowNumber,
        message: `Must be a valid non-negative number`,
        field: "paymentTermsDays",
      });
    }
  }

  if (!row.creditLimit || row.creditLimit === "") {
    errors.push({
      row: rowNumber,
      message: "Credit Limit is required",
      field: "creditLimit",
    });
  }

  if (!row.billingAddress || row.billingAddress === "") {
    errors.push({
      row: rowNumber,
      message: "Billing Address is required",
      field: "billingAddress",
    });
  }

  if (!row.pincode || row.pincode === "") {
    errors.push({
      row: rowNumber,
      message: "Pin Code is required",
      field: "pincode",
    });
  }

  if (!row.city || row.city === "") {
    errors.push({
      row: rowNumber,
      message: "City is required",
      field: "city",
    });
  }

  if (!row.interestRate || row.interestRate === "") {
    errors.push({
      row: rowNumber,
      message: "Interest Rate is required",
      field: "interestRate",
    });
  }

  // Validate optional fields if provided
  if (row.secondaryMobile && row.secondaryMobile !== "" && !/^[0-9]{10}$/.test(row.secondaryMobile)) {
    errors.push({
      row: rowNumber,
      message: `Must be exactly 10 digits`,
      field: "secondaryMobile",
    });
  }

  if (row.secondaryEmail && row.secondaryEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.secondaryEmail)) {
    errors.push({
      row: rowNumber,
      message: `Invalid email format`,
      field: "secondaryEmail",
    });
  }

  return errors;
}

// Flexible validation - only clientName is required, all other fields are optional
export function validateMasterCustomerRowFlexible(row: ImportRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Only validate clientName as required
  if (!row.clientName || row.clientName === "") {
    errors.push({
      row: rowNumber,
      message: "Client Name is required",
      field: "clientName",
    });
  }

  // Validate optional fields only if provided
  if (row.category && row.category !== "") {
    const validCategories = ["Alpha", "Beta", "Gamma", "Delta"];
    if (!validCategories.includes(row.category)) {
      errors.push({
        row: rowNumber,
        message: `Category must be one of: Alpha, Beta, Gamma, Delta`,
        field: "category",
      });
    }
  }

  if (row.primaryMobile && row.primaryMobile !== "" && !/^[0-9]{10}$/.test(row.primaryMobile)) {
    errors.push({
      row: rowNumber,
      message: `Must be exactly 10 digits`,
      field: "primaryMobile",
    });
  }

  if (row.primaryEmail && row.primaryEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.primaryEmail)) {
    errors.push({
      row: rowNumber,
      message: `Invalid email format`,
      field: "primaryEmail",
    });
  }

  if (row.secondaryMobile && row.secondaryMobile !== "" && !/^[0-9]{10}$/.test(row.secondaryMobile)) {
    errors.push({
      row: rowNumber,
      message: `Must be exactly 10 digits`,
      field: "secondaryMobile",
    });
  }

  if (row.secondaryEmail && row.secondaryEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.secondaryEmail)) {
    errors.push({
      row: rowNumber,
      message: `Invalid email format`,
      field: "secondaryEmail",
    });
  }

  if (row.paymentTermsDays && row.paymentTermsDays !== "") {
    const paymentTerms = parseFloat(row.paymentTermsDays);
    if (isNaN(paymentTerms) || paymentTerms < 0) {
      errors.push({
        row: rowNumber,
        message: `Must be a valid non-negative number`,
        field: "paymentTermsDays",
      });
    }
  }

  return errors;
}

export function validateItemRow(row: ImportItemRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!row.itemType || row.itemType === "") {
    errors.push({
      row: rowNumber,
      message: "Item Type is required",
      field: "itemType",
    });
  } else {
    const validTypes = ["product", "service"];
    if (!validTypes.includes(row.itemType.toLowerCase())) {
      errors.push({
        row: rowNumber,
        message: "Item Type must be 'product' or 'service'",
        field: "itemType",
      });
    }
  }

  if (!row.name || row.name === "") {
    errors.push({
      row: rowNumber,
      message: "Name is required",
      field: "name",
    });
  }

  if (!row.unit || row.unit === "") {
    errors.push({
      row: rowNumber,
      message: "Unit is required",
      field: "unit",
    });
  }

  if (!row.tax || row.tax === "") {
    errors.push({
      row: rowNumber,
      message: "Tax is required",
      field: "tax",
    });
  }

  if (!row.sku || row.sku === "") {
    errors.push({
      row: rowNumber,
      message: "SKU is required",
      field: "sku",
    });
  }

  if (!row.saleUnitPrice || row.saleUnitPrice === "") {
    errors.push({
      row: rowNumber,
      message: "Sale Unit Price is required",
      field: "saleUnitPrice",
    });
  } else {
    const price = parseFloat(row.saleUnitPrice);
    if (isNaN(price) || price < 0) {
      errors.push({
        row: rowNumber,
        message: "Must be a valid non-negative number",
        field: "saleUnitPrice",
      });
    }
  }

  if (row.buyUnitPrice && row.buyUnitPrice !== "") {
    const price = parseFloat(row.buyUnitPrice);
    if (isNaN(price) || price < 0) {
      errors.push({
        row: rowNumber,
        message: "Must be a valid non-negative number",
        field: "buyUnitPrice",
      });
    }
  }

  if (row.openingQuantity && row.openingQuantity !== "") {
    const qty = parseFloat(row.openingQuantity);
    if (isNaN(qty) || qty < 0) {
      errors.push({
        row: rowNumber,
        message: "Must be a valid non-negative number",
        field: "openingQuantity",
      });
    }
  }

  return errors;
}

export function validateInvoiceRow(row: ImportInvoiceRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!row.invoiceNumber || row.invoiceNumber === "") {
    errors.push({
      row: rowNumber,
      message: "Invoice Number is required",
      field: "invoiceNumber",
    });
  }

  if (!row.customerName || row.customerName === "") {
    errors.push({
      row: rowNumber,
      message: "Customer Name is required",
      field: "customerName",
    });
  }

  if (!row.invoiceDate || row.invoiceDate === "") {
    errors.push({
      row: rowNumber,
      message: "Invoice Date is required",
      field: "invoiceDate",
    });
  }

  if (!row.invoiceAmount || row.invoiceAmount === "") {
    errors.push({
      row: rowNumber,
      message: "Invoice Amount is required",
      field: "invoiceAmount",
    });
  } else {
    const amount = parseFloat(row.invoiceAmount);
    if (isNaN(amount) || amount < 0) {
      errors.push({
        row: rowNumber,
        message: "Must be a valid non-negative number",
        field: "invoiceAmount",
      });
    }
  }

  if (!row.grossProfit || row.grossProfit === "") {
    errors.push({
      row: rowNumber,
      message: "Gross Profit is required",
      field: "grossProfit",
    });
  } else {
    const profit = parseFloat(row.grossProfit);
    if (isNaN(profit)) {
      errors.push({
        row: rowNumber,
        message: "Must be a valid number",
        field: "grossProfit",
      });
    }
  }

  if (row.status && row.status !== "") {
    const validStatuses = ["Paid", "Unpaid", "Partial"];
    if (!validStatuses.includes(row.status)) {
      errors.push({
        row: rowNumber,
        message: "Status must be 'Paid', 'Unpaid', or 'Partial'",
        field: "status",
      });
    }
  }

  return errors;
}

export function validateReceiptRow(row: ImportReceiptRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!row.voucherNumber || row.voucherNumber === "") {
    errors.push({
      row: rowNumber,
      message: "Voucher Number is required",
      field: "voucherNumber",
    });
  }

  if (!row.voucherType || row.voucherType === "") {
    errors.push({
      row: rowNumber,
      message: "Voucher Type is required",
      field: "voucherType",
    });
  }

  if (!row.customerName || row.customerName === "") {
    errors.push({
      row: rowNumber,
      message: "Customer Name is required",
      field: "customerName",
    });
  }

  if (!row.date || row.date === "") {
    errors.push({
      row: rowNumber,
      message: "Date is required",
      field: "date",
    });
  }

  if (!row.amount || row.amount === "") {
    errors.push({
      row: rowNumber,
      message: "Amount is required",
      field: "amount",
    });
  } else {
    const amount = parseFloat(row.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push({
        row: rowNumber,
        message: "Must be a valid positive number",
        field: "amount",
      });
    }
  }

  return errors;
}

export function generateSampleTemplate(): any[] {
  return [
    {
      "CLIENT NAME": "ABC Corporation Pvt Ltd",
      "CATEGORY": "Alpha",
      "PRIMARY CONTACT": "Rajesh Kumar",
      "PRIMARY MOBILE": "9876543210",
      "PRIMARY EMAIL": "contact@abccorp.com",
      "SECONDARY CONTACT": "Priya Sharma",
      "SECONDARY MOBILE": "9876543211",
      "SECONDARY EMAIL": "priya@abccorp.com",
      "GSTIN": "27AABCU9603R1ZM",
      "BILLING ADDRESS": "123 Business Park, MG Road",
      "CITY": "Mumbai",
      "STATE": "Maharashtra",
      "PINCODE": "400001",
      "PAYMENT TERMS (DAYS)": "30",
      "CREDIT LIMIT": "500000",
      "OPENING BALANCE": "50000",
      "INTEREST APPLICABLE FROM": "After Due Date",
      "INTEREST RATE": "18",
      "SALES PERSON": "Manpreet Bedi",
      "STATUS": "Active",
    },
    {
      "CLIENT NAME": "XYZ Industries Limited",
      "CATEGORY": "Beta",
      "PRIMARY CONTACT": "Amit Patel",
      "PRIMARY MOBILE": "9123456789",
      "PRIMARY EMAIL": "info@xyzind.com",
      "SECONDARY CONTACT": "",
      "SECONDARY MOBILE": "",
      "SECONDARY EMAIL": "",
      "GSTIN": "29AAFCD5862R1Z5",
      "BILLING ADDRESS": "456 Industrial Estate, Sector 5",
      "CITY": "Bangalore",
      "STATE": "Karnataka",
      "PINCODE": "560001",
      "PAYMENT TERMS (DAYS)": "45",
      "CREDIT LIMIT": "750000",
      "OPENING BALANCE": "",
      "INTEREST APPLICABLE FROM": "30 Days After Invoice",
      "INTEREST RATE": "15",
      "SALES PERSON": "Bilal Ahamad",
      "STATUS": "Active",
    },
    {
      "CLIENT NAME": "Tech Solutions India",
      "CATEGORY": "Gamma",
      "PRIMARY CONTACT": "Sunita Desai",
      "PRIMARY MOBILE": "9988776655",
      "PRIMARY EMAIL": "sales@techsolutions.in",
      "SECONDARY CONTACT": "Vikram Rao",
      "SECONDARY MOBILE": "9988776656",
      "SECONDARY EMAIL": "vikram@techsolutions.in",
      "GSTIN": "27AACCT1234E1Z1",
      "BILLING ADDRESS": "789 IT Park, Phase 2",
      "CITY": "Pune",
      "STATE": "Maharashtra",
      "PINCODE": "411001",
      "PAYMENT TERMS (DAYS)": "60",
      "CREDIT LIMIT": "1000000",
      "OPENING BALANCE": "25000",
      "INTEREST APPLICABLE FROM": "Immediate",
      "INTEREST RATE": "12",
      "SALES PERSON": "Anjali Dhiman",
      "STATUS": "Active",
    },
  ];
}

export function generateItemsTemplate(): any[] {
  return [
    {
      "Item Type": "product",
      "Name": "Laptop - Dell Inspiron 15",
      "Description": "15.6 inch laptop with Intel i5 processor, 8GB RAM, 512GB SSD",
      "Unit": "PCS",
      "Tax": "18%",
      "SKU": "LAP-DELL-INS-15",
      "Sale Unit Price": "45000",
      "Buy Unit Price": "38000",
      "Opening Quantity": "10",
      "HSN": "8471",
      "SAC": "",
      "Is Active": "Active",
    },
    {
      "Item Type": "service",
      "Name": "IT Consulting - Hourly",
      "Description": "Professional IT consulting services billed hourly",
      "Unit": "Hour",
      "Tax": "18%",
      "SKU": "SRV-IT-CONS-HR",
      "Sale Unit Price": "1500",
      "Buy Unit Price": "",
      "Opening Quantity": "",
      "HSN": "",
      "SAC": "998314",
      "Is Active": "Active",
    },
    {
      "Item Type": "product",
      "Name": "Wireless Mouse",
      "Description": "Ergonomic wireless mouse with USB receiver",
      "Unit": "PCS",
      "Tax": "12%",
      "SKU": "ACC-MOUSE-WL",
      "Sale Unit Price": "650",
      "Buy Unit Price": "450",
      "Opening Quantity": "50",
      "HSN": "8471",
      "SAC": "",
      "Is Active": "Active",
    },
  ];
}

export function generateInvoicesTemplate(): any[] {
  return [
    {
      "Invoice Number": "INV-2025-001",
      "Customer Name": "ABC Corporation Pvt Ltd",
      "Invoice Date": "2025-01-15",
      "Invoice Amount": "125000",
      "Net Profit": "25000",
      "Status": "Unpaid",
      "Assigned User": "Manpreet Bedi",
      "Remarks": "Q1 software licensing fees",
    },
    {
      "Invoice Number": "INV-2025-002",
      "Customer Name": "XYZ Industries Limited",
      "Invoice Date": "2025-01-20",
      "Invoice Amount": "75000",
      "Net Profit": "15000",
      "Status": "Paid",
      "Assigned User": "Bilal Ahamad",
      "Remarks": "Hardware supplies - January batch",
    },
    {
      "Invoice Number": "INV-2025-003",
      "Customer Name": "Tech Solutions India",
      "Invoice Date": "2025-02-01",
      "Invoice Amount": "200000",
      "Net Profit": "50000",
      "Status": "Partial",
      "Assigned User": "Anjali Dhiman",
      "Remarks": "Annual maintenance contract - paid 50%",
    },
  ];
}

export function generateReceiptsTemplate(): any[] {
  return [
    {
      "Voucher Number": "RCP-2025-001",
      "Invoice Number": "INV-2025-002",
      "Customer Name": "XYZ Industries Limited",
      "Date": "2025-01-25",
      "Amount": "75000",
      "Remarks": "Full payment received via NEFT",
    },
    {
      "Voucher Number": "RCP-2025-002",
      "Invoice Number": "INV-2025-003",
      "Customer Name": "Tech Solutions India",
      "Date": "2025-02-05",
      "Amount": "100000",
      "Remarks": "Partial payment - 50% advance",
    },
    {
      "Voucher Number": "RCP-2025-003",
      "Invoice Number": "INV-2025-001",
      "Customer Name": "ABC Corporation Pvt Ltd",
      "Date": "2025-02-10",
      "Amount": "125000",
      "Remarks": "Full payment via cheque",
    },
  ];
}

export interface ImportRoleRow {
  name?: string;
  description?: string;
  permissions?: string;
}

export interface ImportUserRow {
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  status?: string;
}

export async function parseRolesFile(file: File): Promise<ImportRoleRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const rows: ImportRoleRow[] = jsonData.map((row: any) => ({
          name: String(row["Name"] || row.name || row.Name || "").trim(),
          description: String(row["Description"] || row.description || row.Description || "").trim(),
          permissions: String(row["Permissions"] || row.permissions || row.Permissions || "").trim(),
        }));

        resolve(rows);
      } catch (error: any) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsBinaryString(file);
  });
}

export function validateRoleRow(row: ImportRoleRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!row.name || row.name === "") {
    errors.push({
      row: rowNumber,
      message: "Role Name is required",
      field: "name",
    });
  }

  if (!row.permissions || row.permissions === "") {
    errors.push({
      row: rowNumber,
      message: "Permissions are required",
      field: "permissions",
    });
  }

  return errors;
}

export async function parseUsersFile(file: File): Promise<ImportUserRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const rows: ImportUserRow[] = jsonData.map((row: any) => ({
          name: String(row["Name"] || row.name || row.Name || "").trim(),
          email: String(row["Email"] || row.email || row.EMAIL || "").trim(),
          mobile: String(row["Mobile"] || row.mobile || row.Mobile || "").trim(),
          role: String(row["Role"] || row.role || row.Role || "").trim(),
          status: String(row["Status"] || row.status || row.Status || "Active").trim(),
        }));

        resolve(rows);
      } catch (error: any) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsBinaryString(file);
  });
}

export function validateUserRow(row: ImportUserRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!row.name || row.name === "") {
    errors.push({
      row: rowNumber,
      message: "User Name is required",
      field: "name",
    });
  }

  if (!row.email || row.email === "") {
    errors.push({
      row: rowNumber,
      message: "Email is required",
      field: "email",
    });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      errors.push({
        row: rowNumber,
        message: "Invalid email format",
        field: "email",
      });
    }
  }

  if (row.mobile && row.mobile !== "") {
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(row.mobile)) {
      errors.push({
        row: rowNumber,
        message: "Mobile must be exactly 10 digits",
        field: "mobile",
      });
    }
  }

  if (row.status && row.status !== "") {
    const validStatuses = ["Active", "Inactive"];
    if (!validStatuses.includes(row.status)) {
      errors.push({
        row: rowNumber,
        message: "Status must be 'Active' or 'Inactive'",
        field: "status",
      });
    }
  }

  return errors;
}
