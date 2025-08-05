# Receipt and Invoice Implementation Guide

## Overview

I've implemented a comprehensive receipt and invoice generation system with the following features:

## 1. **Download Receipt** (`handleDownloadReceipt`)

### Logic Flow:

1. **Set Loading State**: Shows spinner and disables button
2. **Primary Method - PDF Generation**:
   - Uses `jsPDF` library to create professional PDF receipt
   - Includes company header, customer info, product details, payment info
   - Automatically names file as `receipt-{transactionId}-{date}.pdf`
3. **Fallback Method - HTML Receipt**:
   - If PDF generation fails, creates HTML receipt
   - Can be opened in browser and printed
4. **Error Handling**: User-friendly alerts for any failures
5. **Success Confirmation**: Alert when receipt is downloaded

### Key Features:

- Professional company branding (ATMOSFAIR)
- Customer information (name, phone, email, address)
- Product details (stove serial number, partner info)
- Payment information (amount, method, status)
- Automatic file download
- Graceful fallback to HTML if PDF fails

## 2. **Email Receipt** (`handleEmailReceipt`)

### Logic Flow:

1. **Validation**: Check if customer has email address
2. **Primary Method - API Email**:
   - Sends professional HTML email via API endpoint
   - Uses email templates with dynamic data
3. **Fallback Method - Mailto Link**:
   - If API fails, opens default email client
   - Pre-populates subject and body with receipt details
4. **Success/Failure Feedback**: Appropriate user alerts

### Key Features:

- Email validation before sending
- Professional HTML email templates
- Fallback to system email client
- Pre-composed receipt details in email body

## 3. **Generate Invoice** (`handleGenerateInvoice`)

### Logic Flow:

1. **PDF Generation**: Creates detailed invoice with itemized breakdown
2. **Professional Layout**:
   - Company header and invoice number
   - Bill-to customer information
   - Itemized table with quantities and prices
   - Tax calculations (7.5% VAT)
   - Payment terms and totals
3. **Auto-download**: Downloads as `invoice-{transactionId}-{date}.pdf`

### Key Features:

- Professional invoice layout
- Automatic invoice numbering (INV-{transactionId})
- VAT calculation (7.5%)
- Itemized table with quantities and totals
- Net 30 payment terms
- Automatic file naming and download

## 4. **Technical Implementation Details**

### PDF Generation (`src/lib/pdfUtils.js`):

```javascript
// Professional PDF with:
- Company branding and headers
- Formatted currency (Nigerian Naira)
- Proper date formatting
- Structured layout with sections
- Error handling with fallbacks
```

### Email Service (`src/lib/emailService.js`):

```javascript
// Email functionality with:
- API integration for sending emails
- HTML email templates
- Mailto fallback for offline usage
- Dynamic template data injection
```

### Loading States:

- Visual feedback with spinner icons
- Button text changes during operations
- Disabled buttons prevent multiple clicks
- Separate loading states for each operation

### Error Recovery:

- PDF generation falls back to HTML
- Email API falls back to mailto links
- User-friendly error messages
- Graceful degradation for all features

## 5. **API Endpoint** (`src/app/api/send-email/route.js`)

### Template Structure:

- Validates required fields (to, subject, template)
- Supports receipt and invoice templates
- Returns proper HTTP status codes
- Includes example integrations for SendGrid and NodeMailer

### Usage Examples:

```javascript
// Receipt email
{
  to: "customer@email.com",
  subject: "Receipt for your Atmosfair Stove Purchase",
  template: "receipt",
  templateData: { customerName, transactionId, amount, ... }
}

// Invoice email
{
  to: "customer@email.com",
  subject: "Invoice for your Atmosfair Stove Purchase",
  template: "invoice",
  templateData: { invoiceNumber, amount, dueDate, ... }
}
```

## 6. **User Experience**

### Visual Feedback:

- Loading spinners during operations
- Button text changes (e.g., "Download Receipt" → "Generating...")
- Success/error alerts with descriptive messages
- Buttons disabled during processing to prevent duplicate requests

### Accessibility:

- Clear button labels and states
- Proper error messaging
- Fallback options for different scenarios
- Professional document formatting

## 7. **Business Logic**

### Receipt Contents:

- Transaction identification
- Customer contact information
- Product specifications (stove serial, partner)
- Payment details (amount, method, status)
- Company branding and contact info

### Invoice Contents:

- Professional invoice numbering
- Itemized breakdown with quantities
- Tax calculations (7.5% VAT)
- Payment terms (Net 30)
- Due date calculation (30 days from creation)

### File Naming Convention:

- Receipts: `receipt-{transactionId}-{YYYY-MM-DD}.pdf`
- Invoices: `invoice-{transactionId}-{YYYY-MM-DD}.pdf`
- Exports: `sale-{transactionId}-export-{YYYY-MM-DD}.json`

## 8. **Setup Requirements**

### Required Dependencies:

```bash
npm install jspdf jspdf-autotable
```

### Optional Email Service Setup:

- Configure email provider (SendGrid, NodeMailer, etc.)
- Set up API endpoint for email sending
- Configure environment variables for email credentials

### Next Steps:

1. Install PDF dependencies (already done)
2. Test receipt/invoice generation
3. Set up email service if needed
4. Customize templates with your branding
5. Configure email API endpoint

The system is designed to work immediately with PDF generation and fallback to HTML/mailto for email functionality until you set up a proper email service.
