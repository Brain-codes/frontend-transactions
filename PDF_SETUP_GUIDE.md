# PDF Generation Setup Guide

## Installation

To enable PDF generation for receipts and invoices, you need to install the following dependencies:

```bash
npm install jspdf jspdf-autotable
```

## Features

### 1. Download Receipt

- Generates a professional PDF receipt with company branding
- Includes customer information, product details, and payment information
- Falls back to HTML receipt if PDF generation fails
- Automatic file naming with transaction ID and date

### 2. Email Receipt

- Attempts to send receipt via email API
- Falls back to mailto link if email service is unavailable
- Includes professional email template with receipt details

### 3. Generate Invoice

- Creates a detailed PDF invoice with itemized breakdown
- Includes VAT calculation (7.5%)
- Professional formatting with tables and totals
- Net 30 payment terms

## Email Service Setup

To enable email functionality, you'll need to:

1. Set up an email service (SendGrid, NodeMailer, etc.)
2. Create an API endpoint at `/api/send-email`
3. Update the email service configuration in `src/lib/emailService.js`

Example API endpoint structure:

```javascript
// pages/api/send-email.js or app/api/send-email/route.js
export async function POST(request) {
  const { to, subject, template, templateData } = await request.json();

  // Your email service logic here
  // Return success/error response
}
```

## Error Handling

The system includes comprehensive error handling:

- PDF generation errors fall back to HTML
- Email errors fall back to mailto links
- Loading states for all operations
- User-friendly error messages

## Customization

You can customize:

- Company branding in PDF templates
- Email templates
- Receipt/invoice layouts
- VAT rates and calculations
- File naming conventions

## Dependencies

Required packages:

- `jspdf`: PDF generation library
- `jspdf-autotable`: Table plugin for jsPDF

Optional (for email):

- Email service of your choice (SendGrid, NodeMailer, etc.)

## Usage

The functions are automatically integrated into the SalesDetailSidebar component with loading states and error handling. Users can:

1. Click "Download Receipt" to generate and download a PDF receipt
2. Click "Email Receipt" to send receipt to customer's email
3. Click "Generate Invoice" to create and download a PDF invoice

All operations include visual feedback and error recovery mechanisms.
