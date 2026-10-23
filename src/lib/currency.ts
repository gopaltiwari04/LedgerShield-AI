/**
 * Indian Number Formatting and Currency Utilities for LedgerShield AI
 * Formats numbers in Indian lakh / crore format: 1,23,45,678.00
 */

export function formatINR(amount: number | null | undefined, includeSymbol: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? "₹0.00" : "0.00";
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Split into integer and decimal parts
  const parts = absAmount.toFixed(2).split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian numbering system: last 3 digits, then pairs of 2 digits
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherDigits = integerPart.substring(0, integerPart.length - 3);
    const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    integerPart = formattedOther + "," + lastThree;
  }

  const prefix = isNegative ? "-" : "";
  const symbol = includeSymbol ? "₹" : "";

  return `${prefix}${symbol}${integerPart}.${decimalPart}`;
}

/**
 * Compact Indian format: e.g. 1.5 Lakhs, 2.4 Crores
 */
export function formatCompactINR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  } else if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  } else if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  }
  return formatINR(amount);
}

/**
 * Indian Financial Year Helper (Default: April 1 to March 31)
 */
export function getIndianFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0 is January, 3 is April
  const year = date.getFullYear();
  if (month >= 3) {
    // April onwards -> FY 2024-25
    return `FY ${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    // Jan - March -> FY 2023-24
    return `FY ${year - 1}-${year.toString().slice(-2)}`;
  }
}

/**
 * GSTIN Validation Check (Indian 15-character alphanumeric GSTIN)
 * Format: 2-digit state code + 10-char PAN + 1 entity num + 'Z' + 1 checksum char
 */
export function validateGSTIN(gstin: string): { isValid: boolean; stateCode?: string; message?: string } {
  if (!gstin) return { isValid: false, message: "GSTIN is missing" };
  const clean = gstin.trim().toUpperCase();
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstinRegex.test(clean)) {
    return {
      isValid: false,
      message: "Malformed GSTIN format. Expected 15-character standard Indian GST identifier.",
    };
  }

  const stateCode = clean.substring(0, 2);
  return { isValid: true, stateCode };
}

/**
 * GST Calculation (CGST+SGST for intra-state vs IGST for inter-state)
 */
export function calculateGST(
  taxableAmount: number,
  taxRatePercent: number,
  supplierStateCode: string,
  buyerStateCode: string
): { isInterState: boolean; cgst: number; sgst: number; igst: number; totalTax: number } {
  const isInterState = supplierStateCode !== buyerStateCode;
  const totalTax = (taxableAmount * taxRatePercent) / 100;
  
  if (isInterState) {
    return {
      isInterState: true,
      cgst: 0,
      sgst: 0,
      igst: Number(totalTax.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
    };
  } else {
    const half = Number((totalTax / 2).toFixed(2));
    return {
      isInterState: false,
      cgst: half,
      sgst: half,
      igst: 0,
      totalTax: Number((half * 2).toFixed(2)),
    };
  }
}

/**
 * Integer Minor Currency Unit (Paise) Exact Arithmetic
 * Prevents binary floating-point precision loss in financial reconciliation calculations.
 */
export function toPaise(rupees: number): number {
  return Math.round(Number(rupees || 0) * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(Number(paise || 0)) / 100;
}

export function paiseAdd(...rupees: number[]): number {
  const sumPaise = rupees.reduce((acc, r) => acc + toPaise(r), 0);
  return fromPaise(sumPaise);
}

export function paiseSubtract(a: number, b: number): number {
  return fromPaise(toPaise(a) - toPaise(b));
}

export function paiseMultiply(amount: number, factor: number): number {
  return fromPaise(Math.round(toPaise(amount) * factor));
}

export function paiseRound(amount: number): number {
  return fromPaise(toPaise(amount));
}
