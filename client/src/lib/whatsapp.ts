/**
 * WhatsApp utility functions for sending messages via WhatsApp Web
 */

/**
 * Cleans a phone number by removing spaces, dashes, parentheses, and other non-numeric characters
 * @param phoneNumber - The phone number to clean
 * @returns Cleaned phone number with only digits
 */
function cleanPhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[\s\-\(\)\+]/g, "");
}

/**
 * Generates a WhatsApp Web link with a pre-filled message
 * @param phoneNumber - The recipient's phone number (can include country code)
 * @param message - The message to send
 * @returns WhatsApp Web URL
 */
export function getWhatsAppLink(phoneNumber: string, message: string): string {
  const cleanNumber = cleanPhoneNumber(phoneNumber);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}

/**
 * Opens WhatsApp Web in a new window with a pre-filled message
 * @param phoneNumber - The recipient's phone number (can include country code)
 * @param message - The message to send
 */
export function openWhatsApp(phoneNumber: string, message: string): void {
  const link = getWhatsAppLink(phoneNumber, message);
  window.open(link, "_blank");
}

/**
 * Data structure for WhatsApp message templates
 */
interface WhatsAppMessageData {
  customerName?: string;
  invoiceNumber?: string;
  quotationNumber?: string;
  voucherNumber?: string;
  voucherType?: string;
  amount?: string | number;
  [key: string]: any;
}

/**
 * Gets a pre-formatted WhatsApp message template based on module type
 * Replaces template variables with actual data from the provided object
 * @param moduleType - The module type (invoices, quotations, receipts, etc.)
 * @param data - Object containing data to replace in the template
 * @returns Formatted message string with variables replaced
 */
export function getWhatsAppMessageTemplate(
  moduleType: string,
  data: WhatsAppMessageData
): string {
  const customerName = data.customerName || "Customer";
  const amount = data.amount || "0";
  
  let template = "";

  switch (moduleType) {
    case "invoices":
      template = `Hello ${customerName}, your invoice #${data.invoiceNumber || "N/A"} for ₹${amount} is ready. Thank you!`;
      break;

    case "quotations":
      template = `Hello ${customerName}, please find your quotation #${data.quotationNumber || "N/A"} for ₹${amount}.`;
      break;

    case "proforma_invoices":
      template = `Hello ${customerName}, your proforma invoice #${data.invoiceNumber || "N/A"} for ₹${amount} is ready. Please review.`;
      break;

    case "receipts":
      template = `Hello ${customerName}, we confirm receipt of payment ₹${amount} for ${data.voucherType || "receipt"} #${data.voucherNumber || "N/A"}.`;
      break;

    case "debtors":
      template = `Hello ${customerName}, this is a reminder regarding your outstanding balance of ₹${amount}. Please make the payment at your earliest convenience.`;
      break;

    case "credit_management":
      template = `Hello ${customerName}, this is regarding your credit account. Your current balance is ₹${amount}. Please contact us for any queries.`;
      break;

    case "leads":
      template = `Hello ${customerName}, thank you for your interest! We're excited to discuss your requirements. Please let us know a convenient time to connect.`;
      break;

    default:
      template = `Hello ${customerName}, we wanted to reach out regarding your account. Please contact us if you have any questions.`;
      break;
  }

  return template;
}
