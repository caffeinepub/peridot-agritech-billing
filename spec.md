# Peridot Agritech Billing App

## Current State
New project. User has provided an existing HTML billing app for Peridot Agritech (an agricultural/microgreens products company).

## Requested Changes (Diff)

### Add
- **Product management**: List of products with names and prices. Default products: White Radish (60g) ₹59, Green Mustard (60g) ₹59, Pea Shoots (60g) ₹59, Baby Palak ₹60, Button Mushroom ₹65. Add/Edit/Delete products. Backup products as JSON download.
- **Customer management**: Save and recall previous customers by name. WhatsApp mobile number field.
- **Invoice builder**: Select product from dropdown (auto-fills price), enter qty, optional custom item name. Add multiple items. Reset clears items.
- **Invoice preview**: Shows company name "PERIDOT AGRITECH", customer name, invoice number (INV-timestamp), date, line items table (Sr, Item, Price, Qty, Total), grand total, UPI QR code (UPI ID: donovanksingh-1@okaxis), and company logo.
- **Actions**: Generate Invoice, Download Invoice as PNG, Screenshot helper, Send via WhatsApp (download image + open wa.me link), Reset.
- **UPI QR Code**: Generated dynamically for the invoice total amount using upi://pay scheme.
- **Peridot logo**: Displayed in invoice preview.

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan

1. **Backend (Motoko)**:
   - `Product` type: id, name, price (Nat, in rupees)
   - `Customer` type: id, name, mobile
   - `Invoice` type: id, customerName, items (name, price, qty), grandTotal, invoiceNo, createdAt
   - CRUD for products and customers
   - Create and list invoices
   - Seed default products on first deploy

2. **Frontend (React)**:
   - Single-page app with green Peridot Agritech branding
   - Product selector with auto-fill price
   - Previous customer selector + name input
   - Item builder: qty, optional custom item name, Add Item button
   - Invoice preview panel with QR code (qrcode npm package) and logo
   - Download as PNG via html2canvas
   - WhatsApp send button (download + open wa.me)
   - Add/Edit/Delete/Backup product buttons
   - Reset button
