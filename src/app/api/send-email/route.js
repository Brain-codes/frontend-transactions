/* eslint-disable no-unused-vars */
// Example API route for sending emails
// This is a template - replace with your actual email service

import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { to, subject, template, templateData } = await request.json();

    // Validate required fields
    if (!to || !subject || !template) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, template" },
        { status: 400 }
      );
    }

    // Example with SendGrid (replace with your email service)
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: to,
      from: process.env.FROM_EMAIL, // Your verified sender
      subject: subject,
      templateId: template === 'receipt' ? 'your-receipt-template-id' : 'your-invoice-template-id',
      dynamicTemplateData: templateData
    };

    await sgMail.send(msg);
    */

    // Example with NodeMailer (replace with your SMTP settings)
    /*
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const htmlContent = generateEmailTemplate(template, templateData);

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: to,
      subject: subject,
      html: htmlContent
    });
    */

    // For demo purposes, we'll just log and return success
    console.log("Email would be sent:", {
      to,
      subject,
      template,
      templateData,
    });

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

// Helper function to generate email templates
function generateEmailTemplate(template, data) {
  if (template === "receipt") {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ATMOSFAIR</h1>
          <p>Receipt for your purchase</p>
        </div>
        <div class="content">
          <p>Dear ${data.customerName},</p>
          <p>Thank you for your purchase. Here are the details:</p>
          <ul>
            <li><strong>Transaction ID:</strong> ${data.transactionId}</li>
            <li><strong>Amount:</strong> ${data.amount}</li>
            <li><strong>Product:</strong> Atmosfair Stove (${data.stoveSerial})</li>
            <li><strong>Date:</strong> ${data.saleDate}</li>
            <li><strong>Payment Method:</strong> ${data.paymentMethod}</li>
          </ul>
        </div>
        <div class="footer">
          <p>Thank you for choosing Atmosfair Clean Cooking Solutions!</p>
        </div>
      </body>
      </html>
    `;
  }

  if (template === "invoice") {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
          .invoice-details { background: #f9fafb; padding: 15px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ATMOSFAIR</h1>
          <p>Invoice ${data.invoiceNumber}</p>
        </div>
        <div class="content">
          <p>Dear ${data.customerName},</p>
          <p>Please find your invoice details below:</p>
          <div class="invoice-details">
            <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
            <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
            <p><strong>Amount:</strong> ${data.amount}</p>
            <p><strong>Due Date:</strong> ${data.dueDate}</p>
          </div>
        </div>
        <div class="footer">
          <p>Please remit payment by the due date. Thank you!</p>
        </div>
      </body>
      </html>
    `;
  }

  return "<p>Template not found</p>";
}
