import { db } from "./db";
import { emailTemplates } from "@shared/schema";
import { sql } from "drizzle-orm";

const templates = [
  // LEADS MODULE (2 templates)
  {
    module: "leads",
    name: "Lead Welcome Email",
    subject: "Thank you for your interest - {companyName}",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <td style="padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">{companyName}</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 22px;">Hello {leadName},</h2>
              
              <p style="margin: 0 0 15px; color: #555555; font-size: 16px; line-height: 1.6;">
                Thank you for showing interest in our services! We're excited to help you achieve your business goals.
              </p>
              
              <p style="margin: 0 0 15px; color: #555555; font-size: 16px; line-height: 1.6;">
                <strong>Lead Details:</strong><br>
                Source: {leadSource}<br>
                Status: {leadStatus}<br>
                Contact Person: {contactPerson}<br>
                Date: {leadDate}
              </p>
              
              <p style="margin: 0 0 25px; color: #555555; font-size: 16px; line-height: 1.6;">
                Our team will reach out to you shortly to discuss how we can assist you. In the meantime, feel free to explore our website or contact us directly.
              </p>
              
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #667eea; border-radius: 5px; padding: 12px 30px;">
                    <a href="{companyWebsite}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Visit Our Website</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">
                {companyAddress}
              </p>
              <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">
                <strong>Phone:</strong> {companyPhone} | <strong>Email:</strong> {companyEmail}
              </p>
              <p style="margin: 0; color: #888888; font-size: 12px;">
                © 2025 {companyName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{leadName}", "{leadSource}", "{leadStatus}", "{contactPerson}", "{leadDate}", "{companyWebsite}", "{companyAddress}", "{companyPhone}", "{companyEmail}"],
    isDefault: "Yes",
  },
  {
    module: "leads",
    name: "Lead Follow-up Email",
    subject: "Following up on your inquiry - {companyName}",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0;">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr style="background-color: #764ba2;">
            <td style="padding: 25px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px;">{companyName}</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 20px;">Dear {leadName},</h2>
              
              <p style="margin: 0 0 15px; color: #555555; font-size: 16px; line-height: 1.6;">
                We wanted to follow up on your recent inquiry from {leadDate}. We're here to answer any questions you might have.
              </p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #764ba2; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; color: #333333; font-size: 15px; line-height: 1.5;">
                  <strong>Your Contact:</strong> {contactPerson}<br>
                  <strong>Status:</strong> {leadStatus}
                </p>
              </div>
              
              <p style="margin: 0 0 25px; color: #555555; font-size: 16px; line-height: 1.6;">
                Please don't hesitate to reach out if you need any assistance. We're committed to providing you with the best service possible.
              </p>
              
              <p style="margin: 0; color: #555555; font-size: 16px;">
                Best regards,<br>
                <strong>{companyName} Team</strong>
              </p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 20px 40px; text-align: center; color: #888888; font-size: 13px;">
              <p style="margin: 0 0 5px;">{companyAddress}</p>
              <p style="margin: 0;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{leadName}", "{leadDate}", "{contactPerson}", "{leadStatus}", "{companyAddress}", "{companyPhone}", "{companyEmail}"],
    isDefault: "No",
  },

  // QUOTATIONS MODULE (2 templates)
  {
    module: "quotations",
    name: "Quotation Submission",
    subject: "Your Quotation {quotationNumber} from {companyName}",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);">
            <td style="padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">{companyName}</h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px;">GST: {companyGST}</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 22px;">Dear {customerName},</h2>
              
              <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                Thank you for your interest! Please find your quotation details below:
              </p>
              
              <table width="100%" cellpadding="10" style="background-color: #f8f9fa; border-radius: 5px; margin: 20px 0;">
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Quotation Number:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{quotationNumber}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Date:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{quotationDate}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Valid Until:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{validityDays} days</td>
                </tr>
                <tr style="background-color: #e0e7ff;">
                  <td style="color: #1e40af; font-size: 16px;"><strong>Total Amount:</strong></td>
                  <td style="color: #1e40af; font-size: 16px; text-align: right;"><strong>{totalAmount}</strong></td>
                </tr>
              </table>
              
              <div style="margin: 25px 0;">
                {itemsTable}
              </div>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                This quotation is valid for <strong>{validityDays} days</strong> from the date of issue. Please feel free to reach out if you have any questions.
              </p>
              
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #3b82f6; border-radius: 5px; padding: 12px 30px;">
                    <a href="{quotationLink}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">View Full Quotation</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">{companyAddress}</p>
              <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">
                Phone: {companyPhone} | Email: {companyEmail} | Website: {companyWebsite}
              </p>
              <p style="margin: 0; color: #888888; font-size: 12px;">© 2025 {companyName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{companyGST}", "{customerName}", "{quotationNumber}", "{quotationDate}", "{validityDays}", "{totalAmount}", "{itemsTable}", "{quotationLink}", "{companyAddress}", "{companyPhone}", "{companyEmail}", "{companyWebsite}"],
    isDefault: "Yes",
  },
  {
    module: "quotations",
    name: "Quotation Reminder",
    subject: "Reminder: Quotation {quotationNumber} expires soon",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr style="background-color: #1e40af;">
            <td style="padding: 25px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px;">{companyName}</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: bold;">
                  ⏰ Your quotation {quotationNumber} will expire in {validityDays} days!
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                We wanted to remind you that your quotation dated <strong>{quotationDate}</strong> for <strong>{totalAmount}</strong> will expire soon.
              </p>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Please review and let us know if you'd like to proceed or if you have any questions.
              </p>
              
              <table cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  <td style="background-color: #3b82f6; border-radius: 5px; padding: 12px 30px;">
                    <a href="{quotationLink}" style="color: #ffffff; text-decoration: none; font-weight: bold;">Review Quotation</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #555555; font-size: 16px;">Best regards,<br><strong>{companyName}</strong></p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 20px 40px; text-align: center; color: #888888; font-size: 13px;">
              <p style="margin: 0;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{quotationNumber}", "{validityDays}", "{quotationDate}", "{totalAmount}", "{quotationLink}", "{companyPhone}", "{companyEmail}"],
    isDefault: "No",
  },

  // PROFORMA INVOICES MODULE (2 templates)
  {
    module: "proforma_invoices",
    name: "Proforma Invoice Notification",
    subject: "Proforma Invoice {piNumber} - {companyName}",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);">
            <td style="padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">{companyName}</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                Please find your Proforma Invoice details below:
              </p>
              
              <table width="100%" cellpadding="12" style="background-color: #f3f4f6; border-radius: 5px; margin: 20px 0;">
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>PI Number:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{piNumber}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>PI Date:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{piDate}</td>
                </tr>
                <tr style="background-color: #ddd6fe;">
                  <td style="color: #6d28d9; font-size: 18px;"><strong>Total Amount:</strong></td>
                  <td style="color: #6d28d9; font-size: 18px; text-align: right;"><strong>{totalAmount}</strong></td>
                </tr>
              </table>
              
              <div style="margin: 25px 0;">
                {itemsTable}
              </div>
              
              <div style="background-color: #fef3c7; border-radius: 5px; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Payment Terms:</strong> {paymentTerms}
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Please review and confirm. Feel free to contact us if you have any questions.
              </p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">{companyAddress}</p>
              <p style="margin: 0; color: #888888; font-size: 13px;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{piNumber}", "{piDate}", "{totalAmount}", "{itemsTable}", "{paymentTerms}", "{companyAddress}", "{companyPhone}", "{companyEmail}"],
    isDefault: "Yes",
  },
  {
    module: "proforma_invoices",
    name: "PI Payment Request",
    subject: "Payment request for PI {piNumber}",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr style="background-color: #6d28d9;">
            <td style="padding: 25px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px;">{companyName}</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                We kindly request payment for Proforma Invoice <strong>{piNumber}</strong> issued on <strong>{piDate}</strong>.
              </p>
              
              <table width="100%" style="border: 2px solid #8b5cf6; border-radius: 5px; margin: 25px 0;">
                <tr style="background-color: #8b5cf6;">
                  <td colspan="2" style="padding: 15px; text-align: center; color: #ffffff; font-size: 18px; font-weight: bold;">
                    Payment Summary
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #333; font-size: 16px; border-bottom: 1px solid #e5e7eb;"><strong>Amount Due:</strong></td>
                  <td style="padding: 15px; color: #8b5cf6; font-size: 20px; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">{totalAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #555; font-size: 14px;"><strong>Payment Terms:</strong></td>
                  <td style="padding: 15px; color: #555; font-size: 14px; text-align: right;">{paymentTerms}</td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Please make payment at your earliest convenience. Contact us if you need any assistance.
              </p>
              
              <p style="margin: 0; color: #555555; font-size: 16px;">Thank you for your business!<br><strong>{companyName}</strong></p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 20px 40px; text-align: center; color: #888888; font-size: 13px;">
              <p style="margin: 0;">{companyEmail} | {companyPhone}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{piNumber}", "{piDate}", "{totalAmount}", "{paymentTerms}", "{companyEmail}", "{companyPhone}"],
    isDefault: "No",
  },

  // INVOICES MODULE (2 templates)
  {
    module: "invoices",
    name: "Invoice Delivery",
    subject: "Invoice {invoiceNumber} - Payment Due {dueDate}",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <td style="padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">{companyName}</h1>
              <p style="margin: 10px 0 0; color: #d1fae5; font-size: 16px; font-weight: bold;">INVOICE</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <p style="margin: 0 0 25px; color: #555555; font-size: 16px; line-height: 1.6;">
                Thank you for your business. Please find your invoice details below:
              </p>
              
              <table width="100%" cellpadding="12" style="background-color: #f0fdf4; border-radius: 5px; margin: 20px 0;">
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Invoice Number:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Invoice Date:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{invoiceDate}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Due Date:</strong></td>
                  <td style="color: #dc2626; font-size: 14px; font-weight: bold; text-align: right;">{dueDate}</td>
                </tr>
                <tr style="background-color: #10b981;">
                  <td style="padding: 15px; color: #ffffff; font-size: 18px;"><strong>Total Amount:</strong></td>
                  <td style="padding: 15px; color: #ffffff; font-size: 20px; font-weight: bold; text-align: right;">{totalAmount}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Tax Amount:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{taxAmount}</td>
                </tr>
              </table>
              
              <div style="margin: 25px 0;">
                {itemsTable}
              </div>
              
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0;">
                <p style="margin: 0 0 5px; color: #1e40af; font-size: 14px; font-weight: bold;">Amount in Words:</p>
                <p style="margin: 0; color: #1e3a8a; font-size: 15px;">{amountInWords}</p>
              </div>
              
              <table cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  <td style="background-color: #10b981; border-radius: 5px; padding: 14px 35px;">
                    <a href="{paymentLink}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Pay Now</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #555555; font-size: 15px; line-height: 1.6;">
                Please make payment by <strong>{dueDate}</strong>. For any queries, please contact us.
              </p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">{companyAddress}</p>
              <p style="margin: 0 0 10px; color: #888888; font-size: 13px;">
                GST: {companyGST} | Phone: {companyPhone} | Email: {companyEmail}
              </p>
              <p style="margin: 0; color: #888888; font-size: 12px;">© 2025 {companyName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{invoiceNumber}", "{invoiceDate}", "{dueDate}", "{totalAmount}", "{taxAmount}", "{itemsTable}", "{amountInWords}", "{paymentLink}", "{companyAddress}", "{companyGST}", "{companyPhone}", "{companyEmail}"],
    isDefault: "Yes",
  },
  {
    module: "invoices",
    name: "Payment Overdue Notice",
    subject: "URGENT: Invoice {invoiceNumber} is {daysOverdue} days overdue",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; border: 2px solid #dc2626;">
          <tr style="background-color: #dc2626;">
            <td style="padding: 25px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px;">⚠️ PAYMENT OVERDUE</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <div style="background-color: #fee2e2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px; color: #991b1b; font-size: 18px; font-weight: bold; text-align: center;">
                  Your invoice is <span style="color: #dc2626;">{daysOverdue} DAYS OVERDUE</span>
                </p>
                <p style="margin: 0; color: #7f1d1d; font-size: 14px; text-align: center;">
                  Invoice: {invoiceNumber} | Due Date: {dueDate}
                </p>
              </div>
              
              <table width="100%" style="border: 2px solid #dc2626; border-radius: 5px; margin: 25px 0;">
                <tr style="background-color: #dc2626;">
                  <td colspan="2" style="padding: 15px; text-align: center; color: #ffffff; font-size: 18px; font-weight: bold;">
                    Outstanding Amount
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px; text-align: center; color: #dc2626; font-size: 32px; font-weight: bold;" colspan="2">
                    {totalAmount}
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                This is an urgent reminder that invoice <strong>{invoiceNumber}</strong> dated <strong>{invoiceDate}</strong> is now <strong>{daysOverdue} days overdue</strong>.
              </p>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                We kindly request immediate payment to avoid any service interruption or additional charges.
              </p>
              
              <table cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  <td style="background-color: #dc2626; border-radius: 5px; padding: 14px 35px;">
                    <a href="{paymentLink}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Pay Immediately</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #555555; font-size: 15px; line-height: 1.6;">
                If you have already made the payment, please disregard this notice and send us the payment confirmation.
              </p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 20px 40px; text-align: center;">
              <p style="margin: 0 0 5px; color: #dc2626; font-size: 14px; font-weight: bold;">URGENT CONTACT</p>
              <p style="margin: 0; color: #888888; font-size: 13px;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{customerName}", "{invoiceNumber}", "{dueDate}", "{daysOverdue}", "{totalAmount}", "{invoiceDate}", "{paymentLink}", "{companyPhone}", "{companyEmail}"],
    isDefault: "No",
  },

  // RECEIPTS MODULE (2 templates)
  {
    module: "receipts",
    name: "Payment Receipt Confirmation",
    subject: "Payment Receipt {receiptNumber} - Thank You!",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);">
            <td style="padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">✓ Payment Received</h1>
              <p style="margin: 10px 0 0; color: #cffafe; font-size: 16px;">{companyName}</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; color: #065f46; font-size: 16px; font-weight: bold;">
                  ✓ Your payment has been successfully received and processed!
                </p>
              </div>
              
              <table width="100%" cellpadding="12" style="background-color: #ecfeff; border-radius: 5px; margin: 20px 0;">
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Receipt Number:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{receiptNumber}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Receipt Date:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{receiptDate}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Payment Date:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{paymentDate}</td>
                </tr>
                <tr style="background-color: #06b6d4;">
                  <td style="padding: 15px; color: #ffffff; font-size: 18px;"><strong>Amount Paid:</strong></td>
                  <td style="padding: 15px; color: #ffffff; font-size: 20px; font-weight: bold; text-align: right;">{paidAmount}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Payment Mode:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{paymentMode}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Transaction ID:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{transactionId}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Invoice Number:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{invoiceNumber}</td>
                </tr>
              </table>
              
              <div style="background-color: #fef3c7; border-radius: 5px; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Remaining Balance:</strong> {balanceAmount}
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Thank you for your prompt payment. We truly appreciate your business!
              </p>
              
              <p style="margin: 0; color: #555555; font-size: 16px;">
                Best regards,<br>
                <strong>{companyName}</strong>
              </p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">{companyAddress}</p>
              <p style="margin: 0; color: #888888; font-size: 13px;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{receiptNumber}", "{receiptDate}", "{paymentDate}", "{paidAmount}", "{paymentMode}", "{transactionId}", "{invoiceNumber}", "{balanceAmount}", "{companyAddress}", "{companyPhone}", "{companyEmail}"],
    isDefault: "Yes",
  },
  {
    module: "receipts",
    name: "Partial Payment Acknowledgment",
    subject: "Partial Payment Received - Receipt {receiptNumber}",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr style="background-color: #0891b2;">
            <td style="padding: 25px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px;">{companyName}</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                We acknowledge receipt of your partial payment. Here are the details:
              </p>
              
              <table width="100%" style="border: 2px solid #06b6d4; border-radius: 5px; margin: 20px 0;">
                <tr style="background-color: #ecfeff;">
                  <td style="padding: 15px; color: #0e7490; font-size: 16px;"><strong>Amount Paid:</strong></td>
                  <td style="padding: 15px; color: #0e7490; font-size: 18px; font-weight: bold; text-align: right;">{paidAmount}</td>
                </tr>
                <tr style="background-color: #fef3c7;">
                  <td style="padding: 15px; color: #92400e; font-size: 16px;"><strong>Balance Remaining:</strong></td>
                  <td style="padding: 15px; color: #b45309; font-size: 18px; font-weight: bold; text-align: right;">{balanceAmount}</td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="10" style="background-color: #f9fafb; border-radius: 5px; margin: 20px 0;">
                <tr>
                  <td style="color: #555; font-size: 14px;"><strong>Receipt No:</strong> {receiptNumber}</td>
                </tr>
                <tr>
                  <td style="color: #555; font-size: 14px;"><strong>Payment Mode:</strong> {paymentMode}</td>
                </tr>
                <tr>
                  <td style="color: #555; font-size: 14px;"><strong>Transaction ID:</strong> {transactionId}</td>
                </tr>
                <tr>
                  <td style="color: #555; font-size: 14px;"><strong>Invoice:</strong> {invoiceNumber}</td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Thank you for this payment. We kindly request you to clear the remaining balance of <strong>{balanceAmount}</strong> at your earliest convenience.
              </p>
              
              <p style="margin: 0; color: #555555; font-size: 16px;">Best regards,<br><strong>{companyName}</strong></p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 20px 40px; text-align: center; color: #888888; font-size: 13px;">
              <p style="margin: 0;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{paidAmount}", "{balanceAmount}", "{receiptNumber}", "{paymentMode}", "{transactionId}", "{invoiceNumber}", "{companyPhone}", "{companyEmail}"],
    isDefault: "No",
  },

  // DEBTORS MODULE (2 templates)
  {
    module: "debtors",
    name: "Outstanding Balance Statement",
    subject: "Outstanding Balance Summary - {companyName}",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
            <td style="padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Account Statement</h1>
              <p style="margin: 10px 0 0; color: #fef3c7; font-size: 16px;">{companyName}</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                This is a summary of your outstanding balance with our company:
              </p>
              
              <table width="100%" style="border: 2px solid #f59e0b; border-radius: 8px; margin: 25px 0;">
                <tr style="background-color: #f59e0b;">
                  <td colspan="2" style="padding: 15px; text-align: center; color: #ffffff; font-size: 18px; font-weight: bold;">
                    Outstanding Balance
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px; text-align: center; color: #f59e0b; font-size: 36px; font-weight: bold;" colspan="2">
                    {outstandingAmount}
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="12" style="background-color: #fffbeb; border-radius: 5px; margin: 20px 0;">
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Overdue Amount:</strong></td>
                  <td style="color: #dc2626; font-size: 14px; font-weight: bold; text-align: right;">{overdueAmount}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Total Pending Invoices:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{totalInvoices}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Oldest Invoice Date:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{oldestInvoiceDate}</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Days Overdue:</strong></td>
                  <td style="color: #dc2626; font-size: 14px; font-weight: bold; text-align: right;">{daysOverdue} days</td>
                </tr>
                <tr>
                  <td style="color: #333; font-size: 14px;"><strong>Customer Category:</strong></td>
                  <td style="color: #555; font-size: 14px; text-align: right;">{customerCategory}</td>
                </tr>
              </table>
              
              <div style="background-color: #ecfeff; border-left: 4px solid #06b6d4; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; color: #0e7490; font-size: 14px;">
                  <strong>Payment History:</strong> {paymentHistory}
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                We kindly request you to review and clear your outstanding balance. Please contact us if you have any questions or concerns.
              </p>
              
              <p style="margin: 0; color: #555555; font-size: 16px;">
                Thank you for your cooperation.<br>
                <strong>{companyName}</strong>
              </p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">{companyAddress}</p>
              <p style="margin: 0; color: #888888; font-size: 13px;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{outstandingAmount}", "{overdueAmount}", "{totalInvoices}", "{oldestInvoiceDate}", "{daysOverdue}", "{customerCategory}", "{paymentHistory}", "{companyAddress}", "{companyPhone}", "{companyEmail}"],
    isDefault: "Yes",
  },
  {
    module: "debtors",
    name: "Friendly Payment Reminder",
    subject: "Friendly reminder - Outstanding balance of {outstandingAmount}",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr style="background-color: #d97706;">
            <td style="padding: 25px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px;">{companyName}</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                We hope this email finds you well. This is a friendly reminder about your outstanding balance with us.
              </p>
              
              <table width="100%" style="background-color: #fffbeb; border: 1px solid #fbbf24; border-radius: 5px; padding: 15px; margin: 20px 0;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 10px; color: #92400e; font-size: 14px;">Current Outstanding Balance</p>
                    <p style="margin: 0; color: #b45309; font-size: 28px; font-weight: bold;">{outstandingAmount}</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                You currently have <strong>{totalInvoices} pending invoice(s)</strong> with us. We understand that delays can happen and we're here to help.
              </p>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                If you've already made the payment, please share the payment details with us. If you're facing any issues, please let us know how we can assist.
              </p>
              
              <p style="margin: 20px 0 0; color: #555555; font-size: 16px;">
                We appreciate your business and look forward to continuing our partnership.<br><br>
                Warm regards,<br>
                <strong>{companyName} Team</strong>
              </p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 20px 40px; text-align: center; color: #888888; font-size: 13px;">
              <p style="margin: 0;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{outstandingAmount}", "{totalInvoices}", "{companyPhone}", "{companyEmail}"],
    isDefault: "No",
  },

  // CREDIT MANAGEMENT MODULE (2 templates)
  {
    module: "credit_management",
    name: "Credit Limit Review",
    subject: "Credit Limit Review - {companyName}",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);">
            <td style="padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Credit Limit Review</h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">{companyName}</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                We're writing to provide you with an update on your credit account status:
              </p>
              
              <table width="100%" style="border: 2px solid #6366f1; border-radius: 8px; margin: 25px 0;">
                <tr style="background-color: #6366f1;">
                  <td colspan="2" style="padding: 15px; text-align: center; color: #ffffff; font-size: 18px; font-weight: bold;">
                    Credit Account Summary
                  </td>
                </tr>
                <tr style="background-color: #eef2ff;">
                  <td style="padding: 15px; color: #333; font-size: 15px;"><strong>Credit Limit:</strong></td>
                  <td style="padding: 15px; color: #4f46e5; font-size: 16px; font-weight: bold; text-align: right;">{creditLimit}</td>
                </tr>
                <tr style="background-color: #fef3c7;">
                  <td style="padding: 15px; color: #333; font-size: 15px;"><strong>Credit Used:</strong></td>
                  <td style="padding: 15px; color: #b45309; font-size: 16px; font-weight: bold; text-align: right;">{creditUsed}</td>
                </tr>
                <tr style="background-color: #d1fae5;">
                  <td style="padding: 15px; color: #333; font-size: 15px;"><strong>Credit Available:</strong></td>
                  <td style="padding: 15px; color: #065f46; font-size: 16px; font-weight: bold; text-align: right;">{creditAvailable}</td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #333; font-size: 14px;"><strong>Utilization:</strong></td>
                  <td style="padding: 15px; color: #555; font-size: 14px; text-align: right;">{creditPercentage}</td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #333; font-size: 14px;"><strong>Status:</strong></td>
                  <td style="padding: 15px; color: #555; font-size: 14px; text-align: right;">{creditStatus}</td>
                </tr>
              </table>
              
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  <strong>Next Review Date:</strong> {reviewDate}
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Your credit utilization is currently at <strong>{creditPercentage}</strong>. Please ensure timely payments to maintain a healthy credit status.
              </p>
              
              <p style="margin: 0; color: #555555; font-size: 16px;">
                For any queries regarding your credit account, please contact us.<br><br>
                Best regards,<br>
                <strong>{companyName} Credit Team</strong>
              </p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">{companyAddress}</p>
              <p style="margin: 0; color: #888888; font-size: 13px;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{creditLimit}", "{creditUsed}", "{creditAvailable}", "{creditPercentage}", "{creditStatus}", "{reviewDate}", "{companyAddress}", "{companyPhone}", "{companyEmail}"],
    isDefault: "Yes",
  },
  {
    module: "credit_management",
    name: "Credit Limit Warning",
    subject: "ALERT: Credit Limit {creditPercentage} Utilized",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; border: 2px solid #f59e0b;">
          <tr style="background-color: #f59e0b;">
            <td style="padding: 25px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px;">⚠️ Credit Limit Alert</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 10px; color: #78350f; font-size: 16px;">Your Credit Utilization</p>
                <p style="margin: 0; color: #b45309; font-size: 36px; font-weight: bold;">{creditPercentage}</p>
              </div>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                This is to inform you that your credit utilization has reached <strong>{creditPercentage}</strong>, which is approaching your credit limit.
              </p>
              
              <table width="100%" style="background-color: #fffbeb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                <tr>
                  <td style="color: #78350f; font-size: 14px; padding: 5px 0;"><strong>Credit Limit:</strong></td>
                  <td style="color: #78350f; font-size: 14px; text-align: right; padding: 5px 0;">{creditLimit}</td>
                </tr>
                <tr>
                  <td style="color: #78350f; font-size: 14px; padding: 5px 0;"><strong>Amount Used:</strong></td>
                  <td style="color: #dc2626; font-size: 14px; font-weight: bold; text-align: right; padding: 5px 0;">{creditUsed}</td>
                </tr>
                <tr>
                  <td style="color: #78350f; font-size: 14px; padding: 5px 0;"><strong>Available Credit:</strong></td>
                  <td style="color: #065f46; font-size: 14px; font-weight: bold; text-align: right; padding: 5px 0;">{creditAvailable}</td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                To avoid any disruption in service, we recommend making a payment soon to free up your credit limit. If you need to discuss an increase in your credit limit, please contact our credit team.
              </p>
              
              <p style="margin: 0; color: #555555; font-size: 16px;">
                Thank you for your attention to this matter.<br><br>
                Best regards,<br>
                <strong>{companyName}</strong>
              </p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 20px 40px; text-align: center; color: #888888; font-size: 13px;">
              <p style="margin: 0;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{creditPercentage}", "{creditLimit}", "{creditUsed}", "{creditAvailable}", "{companyPhone}", "{companyEmail}"],
    isDefault: "No",
  },

  // FOLLOW-UP AUTOMATION MODULE (2 templates)
  {
    module: "followup_automation",
    name: "Automated Payment Follow-up",
    subject: "Payment Reminder - {totalDue} due from {customerName}",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
            <td style="padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Payment Follow-up</h1>
              <p style="margin: 10px 0 0; color: #fce7f3; font-size: 16px;">{companyName}</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                This is an automated reminder regarding your outstanding payment with us.
              </p>
              
              <table width="100%" style="border: 2px solid #ec4899; border-radius: 8px; margin: 25px 0;">
                <tr style="background-color: #ec4899;">
                  <td colspan="2" style="padding: 15px; text-align: center; color: #ffffff; font-size: 18px; font-weight: bold;">
                    Payment Summary
                  </td>
                </tr>
                <tr style="background-color: #fce7f3;">
                  <td style="padding: 15px; color: #333; font-size: 15px;"><strong>Total Amount Due:</strong></td>
                  <td style="padding: 15px; color: #be185d; font-size: 18px; font-weight: bold; text-align: right;">{totalDue}</td>
                </tr>
                <tr style="background-color: #fee2e2;">
                  <td style="padding: 15px; color: #333; font-size: 15px;"><strong>Overdue Amount:</strong></td>
                  <td style="padding: 15px; color: #dc2626; font-size: 18px; font-weight: bold; text-align: right;">{overdueAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #555; font-size: 14px;">Days Overdue:</td>
                  <td style="padding: 15px; color: #dc2626; font-size: 14px; font-weight: bold; text-align: right;">{daysOverdue} days</td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #555; font-size: 14px;">Customer Category:</td>
                  <td style="padding: 15px; color: #555; font-size: 14px; text-align: right;">{customerCategory}</td>
                </tr>
              </table>
              
              <div style="background-color: #eff6ff; border-radius: 5px; padding: 15px; margin: 25px 0;">
                <p style="margin: 0 0 5px; color: #1e40af; font-size: 14px;"><strong>Pending Invoices:</strong></p>
                <p style="margin: 0; color: #3b82f6; font-size: 14px;">{pendingInvoices}</p>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Follow-up Count:</strong> This is follow-up #{followupCount}<br>
                  <strong>Last Payment:</strong> {lastPaymentDate}<br>
                  <strong>Next Follow-up:</strong> {nextFollowupDate}
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                We kindly request you to prioritize this payment. If you have already made the payment, please share the payment details with us.
              </p>
              
              <p style="margin: 0; color: #555555; font-size: 16px;">
                Best regards,<br>
                <strong>{companyName} Collections Team</strong>
              </p>
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">{companyAddress}</p>
              <p style="margin: 0; color: #888888; font-size: 13px;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{totalDue}", "{overdueAmount}", "{daysOverdue}", "{customerCategory}", "{pendingInvoices}", "{followupCount}", "{lastPaymentDate}", "{nextFollowupDate}", "{companyAddress}", "{companyPhone}", "{companyEmail}"],
    isDefault: "Yes",
  },
  {
    module: "followup_automation",
    name: "Escalation Notice",
    subject: "URGENT: Final Notice - {daysOverdue} days overdue",
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; border: 3px solid #dc2626;">
          <tr style="background-color: #dc2626;">
            <td style="padding: 25px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px;">🚨 FINAL NOTICE 🚨</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333;">Dear {customerName},</h2>
              
              <div style="background-color: #fee2e2; border: 3px solid #dc2626; border-radius: 8px; padding: 25px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 10px; color: #7f1d1d; font-size: 18px; font-weight: bold;">
                  FINAL PAYMENT NOTICE
                </p>
                <p style="margin: 0; color: #991b1b; font-size: 32px; font-weight: bold;">{totalDue}</p>
                <p style="margin: 10px 0 0; color: #7f1d1d; font-size: 16px;">
                  {daysOverdue} DAYS OVERDUE
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                This is our <strong>final notice</strong> regarding your overdue payment. Despite <strong>{followupCount} previous reminders</strong>, the payment remains outstanding.
              </p>
              
              <table width="100%" style="background-color: #fee2e2; border-radius: 5px; padding: 15px; margin: 20px 0;">
                <tr>
                  <td style="color: #991b1b; font-size: 14px; padding: 5px 0;"><strong>Overdue Amount:</strong></td>
                  <td style="color: #dc2626; font-size: 16px; font-weight: bold; text-align: right; padding: 5px 0;">{overdueAmount}</td>
                </tr>
                <tr>
                  <td style="color: #991b1b; font-size: 14px; padding: 5px 0;"><strong>Pending Invoices:</strong></td>
                  <td style="color: #991b1b; font-size: 14px; text-align: right; padding: 5px 0;">{pendingInvoices}</td>
                </tr>
                <tr>
                  <td style="color: #991b1b; font-size: 14px; padding: 5px 0;"><strong>Last Payment Date:</strong></td>
                  <td style="color: #991b1b; font-size: 14px; text-align: right; padding: 5px 0;">{lastPaymentDate}</td>
                </tr>
                <tr>
                  <td style="color: #991b1b; font-size: 14px; padding: 5px 0;"><strong>Category:</strong></td>
                  <td style="color: #991b1b; font-size: 14px; text-align: right; padding: 5px 0;">{customerCategory}</td>
                </tr>
              </table>
              
              <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 5px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; color: #78350f; font-size: 15px; font-weight: bold; text-align: center;">
                  ⚠️ IMMEDIATE ACTION REQUIRED ⚠️
                </p>
                <p style="margin: 10px 0 0; color: #92400e; font-size: 14px; text-align: center;">
                  Failure to respond may result in account suspension and legal action
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Please contact us <strong>immediately</strong> to resolve this matter. We are still willing to work with you to find a solution.
              </p>
              
              <p style="margin: 0; color: #555555; font-size: 16px;">
                Urgent Contact Required,<br>
                <strong>{companyName} Credit Department</strong>
              </p>
            </td>
          </tr>
          
          <tr style="background-color: #dc2626;">
            <td style="padding: 20px 40px; text-align: center;">
              <p style="margin: 0 0 5px; color: #ffffff; font-size: 16px; font-weight: bold;">URGENT CONTACT</p>
              <p style="margin: 0; color: #fecaca; font-size: 14px;">{companyPhone} | {companyEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ["{companyName}", "{customerName}", "{totalDue}", "{daysOverdue}", "{followupCount}", "{overdueAmount}", "{pendingInvoices}", "{lastPaymentDate}", "{customerCategory}", "{companyPhone}", "{companyEmail}"],
    isDefault: "No",
  },
];

export async function seedEmailTemplates() {
  try {
    console.log("🌱 Starting email templates seed...");

    // Get all active tenants
    const { tenants } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    const allTenants = await db.select().from(tenants).where(eq(tenants.status, "active"));
    
    if (allTenants.length === 0) {
      console.log("⊘ No active tenants found. Skipping email templates seed...");
      return;
    }

    let totalCreated = 0;
    let totalSkipped = 0;

    // Create templates for each tenant
    for (const tenant of allTenants) {
      // Check if templates already exist for this tenant
      const existingTemplates = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.tenantId, tenant.id));
      
      if (existingTemplates.length > 0) {
        console.log(`  ⊘ Skipped ${tenant.businessName} (${existingTemplates.length} templates already exist)`);
        totalSkipped++;
        continue;
      }

      // Insert all templates for this tenant
      for (const template of templates) {
        await db.insert(emailTemplates).values({
          tenantId: tenant.id,
          ...template,
        });
      }
      
      console.log(`  ✓ Created ${templates.length} templates for ${tenant.businessName}`);
      totalCreated++;
    }

    if (totalCreated > 0) {
      console.log(`✓ Successfully seeded email templates for ${totalCreated} tenant(s)!`);
      console.log(`  - Created: ${totalCreated * templates.length} templates total`);
      console.log(`  - Skipped: ${totalSkipped} tenants`);
      console.log("  - Modules covered: leads, quotations, proforma_invoices, invoices, receipts, debtors, credit_management, followup_automation");
    } else {
      console.log("✓ All tenants already have email templates");
    }
  } catch (error) {
    console.error("❌ Error seeding email templates:", error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedEmailTemplates()
    .then(() => {
      console.log("✓ Seed completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seed failed:", error);
      process.exit(1);
    });
}
