import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

interface InvoiceLineItemRecord {
  description?: string;
  service_name?: string;
  plan_name?: string;
  quantity?: number;
  unit_price?: number;
  original_amount?: number;
  item_discount_type?: "none" | "percentage" | "fixed";
  item_discount_value?: number;
  total?: number;
}

interface PaymentRecord {
  amount?: number;
  payment_date?: string;
  payment_mode?: string;
  transaction_id?: string;
  status?: string;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  invoice_date: string;
  due_date: string;
  payment_terms?: string;
  notes?: string;
  currency?: "USD" | "CAD" | "GBP" | "EUR" | "INR";
  subtotal?: number;
  discount_rate?: number;
  discount_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
  amount_paid?: number;
  status?: string;
  line_items?: InvoiceLineItemRecord[];
  payments?: PaymentRecord[];
}

interface InvoiceRenderOptions {
  companyName?: string;
  companyTagline?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  logoDataUri?: string | null;
  watermarkDataUri?: string | null;
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(dateInput?: string): string {
  if (!dateInput) return "-";
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(dateInput);
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number | undefined, currency: string): string {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function toWordsBelowThousand(value: number): string {
  const ones = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
    "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen",
  ];
  const tens = [
    "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
  ];

  if (value < 20) return ones[value] || "";
  if (value < 100) {
    const remainder = value % 10;
    return `${tens[Math.floor(value / 10)]}${remainder ? `-${ones[remainder]}` : ""}`;
  }

  const remainder = value % 100;
  return `${ones[Math.floor(value / 100)]} hundred${remainder ? ` ${toWordsBelowThousand(remainder)}` : ""}`;
}

function numberToWords(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "zero";

  const groups = [
    { unit: "billion", value: 1_000_000_000 },
    { unit: "million", value: 1_000_000 },
    { unit: "thousand", value: 1_000 },
  ];

  let remaining = Math.floor(Math.abs(value));
  const parts: string[] = [];

  for (const group of groups) {
    if (remaining >= group.value) {
      const chunk = Math.floor(remaining / group.value);
      parts.push(`${toWordsBelowThousand(chunk)} ${group.unit}`);
      remaining %= group.value;
    }
  }

  if (remaining > 0) {
    parts.push(toWordsBelowThousand(remaining));
  }

  return parts.join(" ").trim();
}

function formatAmountInWords(value: number, currency: string): string {
  const whole = Math.floor(Math.abs(value));
  const cents = Math.round((Math.abs(value) - whole) * 100);
  const currencyLabel: Record<string, string> = {
    USD: "dollars", CAD: "Canadian dollars", GBP: "pounds sterling", EUR: "euros", INR: "rupees",
  };
  const minorLabel: Record<string, string> = {
    USD: "cents", CAD: "cents", GBP: "pence", EUR: "cents", INR: "paise",
  };

  const main = `${numberToWords(whole)} ${currencyLabel[currency] || "units"}`;
  if (!cents) return main;
  return `${main} and ${numberToWords(cents)} ${minorLabel[currency] || "cents"}`;
}

function toTitleCase(value: string): string {
  return value.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function normalizeLineItemPart(value: string): string {
  return value
    .trim()
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function buildLineItemDescription(item: InvoiceLineItemRecord): string {
  const candidates = [item.service_name, item.plan_name, item.description];
  const seen = new Set<string>();
  const uniqueParts: string[] = [];

  for (const part of candidates) {
    const trimmed = String(part || "").trim();
    if (!trimmed) continue;
    const key = normalizeLineItemPart(trimmed);
    if (seen.has(key)) continue;
    if (uniqueParts.some((existing) => normalizeLineItemPart(existing).includes(key))) {
      continue;
    }
    const overlappingParts = uniqueParts.filter((existing) => key.includes(normalizeLineItemPart(existing)));
    if (overlappingParts.length) {
      for (const existing of overlappingParts) {
        uniqueParts.splice(uniqueParts.indexOf(existing), 1);
        seen.delete(normalizeLineItemPart(existing));
      }
    }
    seen.add(key);
    uniqueParts.push(trimmed);
  }

  return uniqueParts.join(" – ") || "-";
}

function getCompanyDefaults(): InvoiceRenderOptions {
  return {
    companyName: process.env.COMPANY_NAME || "Ophanim Technologies",
    companyTagline: process.env.COMPANY_TAGLINE || "",
    companyAddress: process.env.COMPANY_ADDRESS || "",
    companyEmail: process.env.COMPANY_EMAIL || "info@ophanimtechnologies.com",
    // companyPhone: process.env.COMPANY_PHONE || "+1 (307) 301 2204",
  };
}

function getMimeTypeFromExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function loadLogoDataUri(): Promise<string | null> {
  const envLogo = process.env.COMPANY_LOGO_URL;
  if (envLogo) return envLogo;

  const candidatePaths = [
    path.resolve(process.cwd(), "../crm-fe-main/public/logo.png"),
    path.resolve(process.cwd(), "crm-fe-main/public/logo.png"),
    path.resolve(process.cwd(), "public/logo.png"),
    path.resolve(moduleDir, "../../../../crm-fe-main/public/logo.png"),
  ];

  for (const candidate of candidatePaths) {
    try {
      const file = await fs.readFile(candidate);
      const mime = getMimeTypeFromExtension(candidate);
      return `data:${mime};base64,${file.toString("base64")}`;
    } catch {
      // Try next path
    }
  }

  return null;
}

/**
 * FIX: Per-item discount display in the line items table.
 * When unit_price !== total / quantity, we show a strikethrough original price
 * and the discounted amount so the table is internally consistent.
 */
function buildLineItemsHtml(
  lineItems: InvoiceLineItemRecord[],
  currency: string,
): string {
  if (!lineItems.length) {
    return `<tr><td colspan="6" style="text-align:center;color:#6b7280;">No items</td></tr>`;
  }

  return lineItems
    .map((item, index) => {
      const description = buildLineItemDescription(item);
      const qty = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const originalAmount = Number(item.original_amount || 0) || qty * unitPrice;
      const lineTotal = Number(item.total || 0);
      const discountType = item.item_discount_type || "none";
      const discountValue = Number(item.item_discount_value || 0);
      const configuredDiscount =
        discountType === "percentage"
          ? (originalAmount * discountValue) / 100
          : discountType === "fixed"
            ? discountValue
            : 0;
      const derivedDiscount = Math.max(originalAmount - lineTotal, 0);
      const discountAmount =
        configuredDiscount > 0 || discountType !== "none"
          ? configuredDiscount
          : derivedDiscount;
      const discountMeta =
        discountAmount <= 0
          ? "—"
          : discountType === "percentage"
            ? `${formatCurrency(discountAmount, currency)}<div style="color:#6b7280;font-size:10px;">${discountValue}%</div>`
            : discountType === "fixed"
              ? formatCurrency(discountAmount, currency)
              : formatCurrency(discountAmount, currency);

      return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(description)}</td>
        <td class="right">${qty}</td>
        <td class="right">${formatCurrency(originalAmount, currency)}</td>
        <td class="right">${discountMeta}</td>
        <td class="right strong">${formatCurrency(lineTotal, currency)}</td>
      </tr>`;
    })
    .join("\n");
}

function buildInvoiceHtml(
  invoice: InvoiceRecord,
  options: InvoiceRenderOptions,
): string {
  const currency = invoice.currency || "INR";
  const subtotal = Number(invoice.subtotal || 0);
  const discountAmount = Number(invoice.discount_amount || 0);
  const taxAmount = Number(invoice.tax_amount || 0);
  const total = Number(invoice.total_amount || 0);
  const amountPaid = Number(invoice.amount_paid || 0);
  const outstanding = Math.max(total - amountPaid, 0);
  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];

  const paymentStatusLabel =
    outstanding <= 0 || (invoice.status || "").toLowerCase() === "paid"
      ? "PAID"
      : "DUE";
  const paymentStatusClass = paymentStatusLabel === "PAID" ? "paid" : "due";
  const amountInWords = toTitleCase(formatAmountInWords(total, currency));
  const invoiceReference = `${invoice.invoice_number} / ${invoice.id.slice(0, 8).toUpperCase()}`;
  const websiteUrl = "https://www.ophanimtechnologies.com";

  const lineItemsHtml = buildLineItemsHtml(lineItems, currency);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(invoice.invoice_number)}</title>
  <style>
    @page { size: A4; margin: 16mm 12mm; }

    * { box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      color: #111827;
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      background: #ffffff;
    }

    /* ── Watermark ── */
    .watermark {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.035;
      z-index: 0;
      pointer-events: none;
    }
    .watermark img { width: 320px; height: auto; }

    .doc {
      position: relative;
      z-index: 2;
      max-width: 210mm;
      margin: 0 auto;
      padding: 28px 36px 32px;
    }

    /* ── Header row: logo+company LEFT, invoice meta RIGHT ── */
    /*
     * FIX: Changed from grid (which caused overlap when logo was wide) to
     * flex with a clear separator so both sides are always side-by-side and
     * never bleed into each other.
     */
    .top {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
      gap: 32px;
      padding-bottom: 20px;
      margin-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }

    /* Left: logo + company text stacked vertically */
    .brand {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      flex: 1 1 auto;
      min-width: 0;
      max-width: 50%;
    }

    .brand img {
      width: 118px;
      height: auto;
      object-fit: contain;
      object-position: left center;
      flex-shrink: 0;
    }

    .company-block {
      margin-top: 0;
      max-width: 320px;
    }

    .company-block h1 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }

    .company-block p {
      margin: 4px 0;
      color: #374151;
      font-size: 11px;
    }

    .company-block a {
      color: #374151;
      text-decoration: none;
    }

    /* Right: invoice meta */
    .invoice-meta {
      text-align: right;
      flex: 0 0 auto;
      min-width: 280px;
      margin-left: auto;
    }

    .status-chip {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
      border: 1px solid;
    }
    .status-chip.paid { color: #15803d; background: #f0fdf4; border-color: #86efac; }
    .status-chip.due  { color: #dc2626; background: #fef2f2; border-color: #fca5a5; }

    .invoice-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 10px;
    }

    /*
     * FIX: .meta-row was previously a bare <div> inside .invoice-meta without the
     * class set consistently. Now every row is consistently classed AND styled.
     */
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 20px;
      margin: 5px 0;
      font-size: 12px;
      min-width: 100%;
    }
    .meta-row .label { color: #6b7280; white-space: nowrap; }
    .meta-row .value { font-weight: 700; color: #111827; white-space: nowrap; }

    /* ── Bill To / Invoice Info cards ── */
    .card-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }

    .card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 14px;
      background: #fafafa;
    }

    .card h3 {
      margin: 0 0 8px;
      font-size: 10px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .card p { margin: 3px 0; font-size: 12px; }

    /* ── Line items table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }

    th {
      background: #1f2937;
      color: #ffffff;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.03em;
      padding: 9px 10px;
      text-align: left;
    }
    th:first-child { border-radius: 6px 0 0 6px; }
    th:last-child  { border-radius: 0 6px 6px 0; }

    td {
      border-bottom: 1px solid #f3f4f6;
      padding: 10px 10px;
      vertical-align: top;
      font-size: 12px;
    }

    tbody tr:last-child td { border-bottom: none; }

    .right  { text-align: right; }
    .strong { font-weight: 700; }

    /* ── Totals block ── */
    .totals {
      margin-left: auto;
      width: 400px;
    }

    .totals .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin: 6px 0;
      padding: 0 2px;
      font-size: 12px;
    }

    .totals .muted { color: #6b7280; }

    .totals .highlight {
      font-size: 15px;
      font-weight: 800;
      color: #111827;
      border-top: 1px solid #d1d5db;
      padding-top: 8px;
      margin-top: 4px;
    }

    .totals .negative { color: #dc2626; font-weight: 600; }
    .totals .negative span { color: #dc2626; }

    .totals .balance {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 10px 12px;
      font-weight: 700;
      font-size: 13px;
      margin-top: 8px;
    }

    .words {
      margin-top: 10px;
      font-size: 11px;
      color: #374151;
      text-align: right;
      font-style: italic;
    }

    /* ── Notes ── */
    .notes {
      margin-top: 24px;
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      white-space: pre-wrap;
      font-size: 12px;
      color: #374151;
    }

    .section-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 700;
      color: #111827;
    }

    /* ── Terms ── */
    .terms {
      margin-top: 20px;
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      font-size: 11px;
      color: #374151;
    }

    .terms ol { margin: 8px 0 0 18px; padding: 0; }
    .terms li { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="watermark">${
    options.watermarkDataUri
      ? `<img src="${escapeHtml(options.watermarkDataUri)}" alt="" />`
      : ""
  }</div>

  <div class="doc">

    <!-- ── HEADER ── -->
    <div class="top">
      <!-- Left: logo + company -->
      <div class="brand">
        ${
          options.logoDataUri
            ? `<img src="${escapeHtml(options.logoDataUri)}" alt="Logo" />`
            : ""
        }
        <div class="company-block">
          <h1>${escapeHtml(options.companyName || "Ophanim Technologies")}</h1>
          ${options.companyEmail  ? `<p>${escapeHtml(options.companyEmail)}</p>`  : ""}
          ${options.companyPhone  ? `<p>${escapeHtml(options.companyPhone)}</p>`  : ""}
          ${options.companyAddress ? `<p>${escapeHtml(options.companyAddress)}</p>` : ""}
          <p><a href="${websiteUrl}">${websiteUrl}</a></p>
        </div>
      </div>

      <!-- Right: invoice meta -->
      <div class="invoice-meta">
        <div class="status-chip ${paymentStatusClass}">${paymentStatusLabel}</div>
        <div class="invoice-title">Invoice</div>
        <div class="meta-row">
          <span class="label">Invoice Date</span>
          <span class="value">${formatDate(invoice.invoice_date)}</span>
        </div>
        <div class="meta-row">
          <span class="label">Due Date</span>
          <span class="value">${formatDate(invoice.due_date)}</span>
        </div>
        <div class="meta-row">
          <span class="label">Balance Due</span>
          <span class="value">${formatCurrency(outstanding, currency)}</span>
        </div>
      </div>
    </div>

    <!-- ── BILL TO / INVOICE INFO ── -->
    <div class="card-row">
      <div class="card">
        <h3>Bill To</h3>
        <p><strong>${escapeHtml(invoice.client_name)}</strong></p>
        ${invoice.client_email   ? `<p>${escapeHtml(invoice.client_email)}</p>`   : ""}
        ${invoice.client_phone   ? `<p>${escapeHtml(invoice.client_phone)}</p>`   : ""}
        ${invoice.client_address ? `<p>${escapeHtml(invoice.client_address)}</p>` : ""}
      </div>
      <div class="card">
        <h3>Invoice Info</h3>
        <p><strong>Invoice Number:</strong> ${escapeHtml(invoice.invoice_number)}</p>
        <p><strong>Invoice ID:</strong> ${escapeHtml(invoice.id)}</p>
        <p><strong>Currency:</strong> ${escapeHtml(currency)}</p>
      </div>
    </div>

    <!-- ── LINE ITEMS ── -->
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item &amp; Description</th>
          <th class="right">Qty</th>
          <th class="right">Original Amount</th>
          <th class="right">Discount</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <!-- ── TOTALS ── -->
    <div class="totals">
      <div class="row">
        <span class="muted">Subtotal</span>
        <span>${formatCurrency(subtotal, currency)}</span>
      </div>
      ${
        discountAmount > 0
          ? `<div class="row">
               <span class="muted">Discount (${Number(invoice.discount_rate || 0)}%)</span>
               <span>− ${formatCurrency(discountAmount, currency)}</span>
             </div>`
          : ""
      }
      ${
        taxAmount > 0
          ? `<div class="row">
               <span class="muted">Tax (${Number(invoice.tax_rate || 0)}%)</span>
               <span>${formatCurrency(taxAmount, currency)}</span>
             </div>`
          : ""
      }
      <div class="row highlight">
        <span>Total</span>
        <span>${formatCurrency(total, currency)}</span>
      </div>
      ${
        amountPaid > 0
          ? `<div class="row">
               <span>Payment Made</span>
               <span style="color: red">(−) ${formatCurrency(amountPaid, currency)}</span>
             </div>`
          : ""
      }
      <div class="row balance">
        <span>Balance Due</span>
        <span>${formatCurrency(outstanding, currency)}</span>
      </div>
      <div class="words">
        <strong>Total In Words:</strong> ${escapeHtml(amountInWords)}
      </div>
    </div>

    <!-- ── NOTES ── -->
    ${
      invoice.notes
        ? `<div class="notes"><div class="section-title">Notes</div>${escapeHtml(invoice.notes)}</div>`
        : ""
    }

    <!-- ── TERMS ── -->
    <div class="terms">
      <div class="section-title">Terms &amp; Conditions</div>
      <ol>
        <li>Privacy Policy — https://www.ophanimtechnologies.com/privacy-policy</li>
        <li>Website — https://www.ophanimtechnologies.com</li>
        <li>Terms of Service — https://www.ophanimtechnologies.com/terms-and-conditions</li>
      </ol>
    </div>

  </div>
</body>
</html>`;
}

export async function buildInvoicePreviewHtml(
  invoice: InvoiceRecord,
  options: InvoiceRenderOptions = {},
): Promise<string> {
  const defaults = getCompanyDefaults();
  const logoDataUri = options.logoDataUri ?? (await loadLogoDataUri());
  const watermarkDataUri = options.watermarkDataUri ?? logoDataUri;

  return buildInvoiceHtml(invoice, {
    ...defaults,
    ...options,
    logoDataUri,
    watermarkDataUri,
  });
}

export async function generateInvoicePdfBuffer(
  invoice: InvoiceRecord,
  options: InvoiceRenderOptions = {},
): Promise<Buffer> {
  const html = await buildInvoicePreviewHtml(invoice, options);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
