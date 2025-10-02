import * as XLSX from "xlsx";

export interface ImportRow {
  clientName?: string;
  category?: string;
  billingAddress?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  panNumber?: string;
  paymentTermsDays?: string;
}

export interface ValidationError {
  row: number;
  message: string;
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
          clientName: String(row["Client Name"] || row.clientName || row.ClientName || "").trim(),
          category: String(row["Category"] || row.category || "").trim(),
          billingAddress: String(row["Billing Address"] || row.billingAddress || row.BillingAddress || "").trim(),
          city: String(row["City"] || row.city || "").trim(),
          state: String(row["State"] || row.state || "").trim(),
          gstNumber: String(row["GST Number"] || row.gstNumber || row.GSTNumber || row.GST || "").trim(),
          panNumber: String(row["PAN Number"] || row.panNumber || row.PANNumber || row.PAN || "").trim(),
          paymentTermsDays: String(row["Payment Terms (Days)"] || row["Payment Terms"] || row.paymentTermsDays || row.PaymentTerms || "").trim(),
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

  if (!row.clientName || row.clientName === "") {
    errors.push({
      row: rowNumber,
      message: "Client Name is required",
    });
  }

  if (!row.category || row.category === "") {
    errors.push({
      row: rowNumber,
      message: "Category is required",
    });
  } else {
    const validCategories = ["Alpha", "Beta", "Gamma", "Delta"];
    if (!validCategories.includes(row.category)) {
      errors.push({
        row: rowNumber,
        message: `Category must be one of: Alpha, Beta, Gamma, Delta (got: ${row.category})`,
      });
    }
  }

  if (!row.paymentTermsDays || row.paymentTermsDays === "") {
    errors.push({
      row: rowNumber,
      message: "Payment Terms (Days) is required",
    });
  } else {
    const paymentTerms = parseFloat(row.paymentTermsDays);
    if (isNaN(paymentTerms) || paymentTerms < 0) {
      errors.push({
        row: rowNumber,
        message: `Payment Terms must be a valid non-negative number (got: ${row.paymentTermsDays})`,
      });
    }
  }

  return errors;
}

export function generateSampleTemplate(): any[] {
  return [
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
}
