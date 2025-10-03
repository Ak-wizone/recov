import * as XLSX from "xlsx";

export interface ImportRow {
  // Required fields
  clientName?: string;
  category?: string;
  gstNumber?: string;
  primaryMobile?: string;
  primaryEmail?: string;
  paymentTermsDays?: string;
  creditLimit?: string;
  billingAddress?: string;
  pincode?: string;
  city?: string;
  interestRate?: string;
  
  // Optional fields
  state?: string;
  country?: string;
  panNumber?: string;
  msmeNumber?: string;
  incorporationCertNumber?: string;
  incorporationDate?: string;
  companyType?: string;
  primaryContactName?: string;
  secondaryContactName?: string;
  secondaryMobile?: string;
  secondaryEmail?: string;
  interestApplicableFrom?: string;
  salesPerson?: string;
  isActive?: string;
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
          // Required fields - handle different column name variations
          clientName: String(row["Client Name"] || row.clientName || row.ClientName || "").trim(),
          category: String(row["Category"] || row.category || "").trim(),
          gstNumber: String(row["GST Number"] || row.gstNumber || row.GSTNumber || row.GST || "").trim(),
          primaryMobile: String(row["Primary Mobile"] || row.primaryMobile || row.PrimaryMobile || row["Mobile"] || "").trim(),
          primaryEmail: String(row["Primary Email"] || row.primaryEmail || row.PrimaryEmail || row["Email"] || "").trim(),
          paymentTermsDays: String(row["Payment Terms (Days)"] || row["Payment Terms"] || row.paymentTermsDays || row.PaymentTerms || "").trim(),
          creditLimit: String(row["Credit Limit"] || row.creditLimit || row.CreditLimit || "").trim(),
          billingAddress: String(row["Billing Address"] || row.billingAddress || row.BillingAddress || "").trim(),
          pincode: String(row["Pin Code"] || row["Pincode"] || row.pincode || row.PinCode || "").trim(),
          city: String(row["City"] || row.city || "").trim(),
          interestRate: String(row["Interest Rate"] || row.interestRate || row.InterestRate || "").trim(),
          
          // Optional fields - handle different column name variations
          state: String(row["State"] || row.state || "").trim(),
          country: String(row["Country"] || row.country || "").trim(),
          panNumber: String(row["PAN Number"] || row.panNumber || row.PANNumber || row.PAN || "").trim(),
          msmeNumber: String(row["MSME Number"] || row.msmeNumber || row.MSMENumber || row.MSME || "").trim(),
          incorporationCertNumber: String(row["Incorporation Cert Number"] || row.incorporationCertNumber || row.IncorporationCertNumber || "").trim(),
          incorporationDate: String(row["Incorporation Date"] || row.incorporationDate || row.IncorporationDate || "").trim(),
          companyType: String(row["Company Type"] || row.companyType || row.CompanyType || "").trim(),
          primaryContactName: String(row["Primary Contact Name"] || row.primaryContactName || row.PrimaryContactName || "").trim(),
          secondaryContactName: String(row["Secondary Contact Name"] || row.secondaryContactName || row.SecondaryContactName || "").trim(),
          secondaryMobile: String(row["Secondary Mobile"] || row.secondaryMobile || row.SecondaryMobile || "").trim(),
          secondaryEmail: String(row["Secondary Email"] || row.secondaryEmail || row.SecondaryEmail || "").trim(),
          interestApplicableFrom: String(row["Interest Applicable From"] || row.interestApplicableFrom || row.InterestApplicableFrom || "").trim(),
          salesPerson: String(row["Sales Person"] || row.salesPerson || row.SalesPerson || "").trim(),
          isActive: String(row["Status"] || row.status || row.isActive || row.IsActive || "Active").trim(),
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

  if (!row.gstNumber || row.gstNumber === "") {
    errors.push({
      row: rowNumber,
      message: "GST Number is required",
    });
  }

  if (!row.primaryMobile || row.primaryMobile === "") {
    errors.push({
      row: rowNumber,
      message: "Primary Mobile is required",
    });
  } else if (!/^[0-9]{10}$/.test(row.primaryMobile)) {
    errors.push({
      row: rowNumber,
      message: `Primary Mobile must be exactly 10 digits (got: ${row.primaryMobile})`,
    });
  }

  if (!row.primaryEmail || row.primaryEmail === "") {
    errors.push({
      row: rowNumber,
      message: "Primary Email is required",
    });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.primaryEmail)) {
    errors.push({
      row: rowNumber,
      message: `Invalid Primary Email format (got: ${row.primaryEmail})`,
    });
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

  if (!row.creditLimit || row.creditLimit === "") {
    errors.push({
      row: rowNumber,
      message: "Credit Limit is required",
    });
  }

  if (!row.billingAddress || row.billingAddress === "") {
    errors.push({
      row: rowNumber,
      message: "Billing Address is required",
    });
  }

  if (!row.pincode || row.pincode === "") {
    errors.push({
      row: rowNumber,
      message: "Pin Code is required",
    });
  }

  if (!row.city || row.city === "") {
    errors.push({
      row: rowNumber,
      message: "City is required",
    });
  }

  if (!row.interestRate || row.interestRate === "") {
    errors.push({
      row: rowNumber,
      message: "Interest Rate is required",
    });
  }

  // Validate optional fields if provided
  if (row.secondaryMobile && row.secondaryMobile !== "" && !/^[0-9]{10}$/.test(row.secondaryMobile)) {
    errors.push({
      row: rowNumber,
      message: `Secondary Mobile must be exactly 10 digits (got: ${row.secondaryMobile})`,
    });
  }

  if (row.secondaryEmail && row.secondaryEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.secondaryEmail)) {
    errors.push({
      row: rowNumber,
      message: `Invalid Secondary Email format (got: ${row.secondaryEmail})`,
    });
  }

  return errors;
}

export function generateSampleTemplate(): any[] {
  return [
    {
      // Required fields
      "Client Name": "ABC Corporation Pvt Ltd",
      "Category": "Alpha",
      "GST Number": "27AABCU9603R1ZM",
      "Primary Mobile": "9876543210",
      "Primary Email": "contact@abccorp.com",
      "Payment Terms (Days)": "30",
      "Credit Limit": "500000",
      "Billing Address": "123 Business Park, MG Road",
      "Pin Code": "400001",
      "City": "Mumbai",
      "Interest Rate": "18",
      
      // Optional fields
      "State": "Maharashtra",
      "Country": "India",
      "PAN Number": "AABCU9603R",
      "MSME Number": "UDYAM-MH-12-1234567",
      "Incorporation Cert Number": "U12345MH2020PTC123456",
      "Incorporation Date": "2020-01-15",
      "Company Type": "Private Limited",
      "Primary Contact Name": "Rajesh Kumar",
      "Secondary Contact Name": "Priya Sharma",
      "Secondary Mobile": "9876543211",
      "Secondary Email": "priya@abccorp.com",
      "Interest Applicable From": "After Due Date",
      "Sales Person": "Manpreet Bedi",
      "Status": "Active",
    },
    {
      // Required fields  
      "Client Name": "XYZ Industries Limited",
      "Category": "Beta",
      "GST Number": "29AAFCD5862R1Z5",
      "Primary Mobile": "9123456789",
      "Primary Email": "info@xyzind.com",
      "Payment Terms (Days)": "45",
      "Credit Limit": "750000",
      "Billing Address": "456 Industrial Estate, Sector 5",
      "Pin Code": "560001",
      "City": "Bangalore",
      "Interest Rate": "15",
      
      // Optional fields
      "State": "Karnataka",
      "Country": "India",
      "PAN Number": "AAFCD5862R",
      "MSME Number": "",
      "Incorporation Cert Number": "",
      "Incorporation Date": "",
      "Company Type": "Public Limited",
      "Primary Contact Name": "Amit Patel",
      "Secondary Contact Name": "",
      "Secondary Mobile": "",
      "Secondary Email": "",
      "Interest Applicable From": "30 Days After Invoice",
      "Sales Person": "Bilal Ahamad",
      "Status": "Active",
    },
    {
      // Required fields
      "Client Name": "Tech Solutions India",
      "Category": "Gamma",
      "GST Number": "27AACCT1234E1Z1",
      "Primary Mobile": "9988776655",
      "Primary Email": "sales@techsolutions.in",
      "Payment Terms (Days)": "60",
      "Credit Limit": "1000000",
      "Billing Address": "789 IT Park, Phase 2",
      "Pin Code": "411001",
      "City": "Pune",
      "Interest Rate": "12",
      
      // Optional fields
      "State": "Maharashtra",
      "Country": "India",
      "PAN Number": "AACCT1234E",
      "MSME Number": "UDYAM-MH-27-7654321",
      "Incorporation Cert Number": "",
      "Incorporation Date": "2018-06-20",
      "Company Type": "LLP",
      "Primary Contact Name": "Sunita Desai",
      "Secondary Contact Name": "Vikram Rao",
      "Secondary Mobile": "9988776656",
      "Secondary Email": "vikram@techsolutions.in",
      "Interest Applicable From": "Immediate",
      "Sales Person": "Anjali Dhiman",
      "Status": "Active",
    },
  ];
}
