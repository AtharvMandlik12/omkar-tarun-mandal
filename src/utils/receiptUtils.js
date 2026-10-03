const small = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

const teen = [
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const tens = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

const scales = ["", "thousand", "lakh", "crore"];

const convertUnderHundred = (n) => {
  if (n < 10) return small[n];
  if (n < 20) return teen[n - 10];
  const tensPart = tens[Math.floor(n / 10)];
  const unitsPart = n % 10;
  return unitsPart ? `${tensPart} ${small[unitsPart]}` : tensPart;
};

export const toWords = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "zero";

  const chunked = [];
  let remaining = Math.floor(amount);

  while (remaining > 0) {
    chunked.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words = [];
  chunked.forEach((chunk, index) => {
    if (chunk === 0) return;
    const scale = scales[index] || "";
    const chunkWord =
      chunk < 100
        ? convertUnderHundred(chunk)
        : `${convertUnderHundred(Math.floor(chunk / 100))} hundred ${
            chunk % 100 ? convertUnderHundred(chunk % 100) : ""
          }`.trim();
    words.push(`${chunkWord} ${scale}`.trim());
  });

  return words.reverse().join(" ");
};

export const normalizeIndianMobile = (value) => {
  if (value === null || value === undefined) return "";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length > 10) return digits.slice(-10);
  return digits;
};

export const isValidIndianMobile = (value) => {
  const digits = normalizeIndianMobile(value);
  return /^\d{10}$/.test(digits) && /^[6-9]/.test(digits);
};

export const buildReceiptPayload = (receipt = {}) => {
  const receiptNumber = String(
    receipt.receipt_number ?? receipt.receiptNumber ?? "",
  ).trim();
  const donorName = String(
    receipt.donor_name ?? receipt.donorName ?? "",
  ).trim();
  const whatsapp = normalizeIndianMobile(
    receipt.whatsapp_number ?? receipt.whatsappNumber ?? "",
  );
  const donationAmount = Number(receipt.donation_amount ?? receipt.amount ?? 0);
  const paymentStatus =
    String(receipt.payment_status ?? receipt.status ?? "Received")
      .trim()
      .replace(/^\s+|\s+$/g, "") || "Received";
  const paymentMethod =
    String(
      receipt.payment_method ??
        receipt.paymentMode ??
        receipt.payment_mode ??
        "Cash",
    ).trim() || "Cash";
  const donationDate =
    receipt.donation_date ??
    receipt.receipt_date ??
    receipt.date ??
    receipt.donationDate ??
    new Date().toISOString().slice(0, 10);
  const festivalName =
    String(
      receipt.festival_name ??
        receipt.event_name ??
        receipt.event ??
        "Ganesh Festival",
    ).trim() || "Ganesh Festival";

  return {
    receipt_number: receiptNumber,
    donor_name: donorName,
    mobile_number: whatsapp,
    whatsapp_number: whatsapp,
    donation_amount: Number.isFinite(donationAmount) ? donationAmount : 0,
    receipt_date: donationDate,
    donation_date: donationDate,
    festival_name: festivalName,
    payment_status: paymentStatus,
    payment_method: paymentMethod,
    status: paymentStatus,
    created_by_name:
      String(
        receipt.created_by_name ?? receipt.collector ?? "Admin User",
      ).trim() || "Admin User",
    created_by_email: String(
      receipt.created_by_email ?? receipt.creator_email ?? "",
    ).trim(),
  };
};

export const generateReceiptNumber = (
  prefix = "OMTM",
  startingNumber = 1,
  numberLength = 3,
  usedNumbers = [],
) => {
  const safePrefix = (prefix || "OMTM").trim() || "OMTM";
  const parsedStart = Number(startingNumber || 1);
  const digits = Math.max(Number(numberLength || 3), 3);
  const used = Array.isArray(usedNumbers)
    ? usedNumbers
        .map((entry) => {
          const match = String(entry).match(/-(\d{4})-?(\d+)$/);
          if (match && match[2]) return Number(match[2]);
          const fallback = String(entry).match(/\d+$/);
          return fallback ? Number(fallback[0]) : Number.NaN;
        })
        .filter((entry) => Number.isFinite(entry))
    : [];

  let next = parsedStart;
  while (used.includes(next)) {
    next += 1;
  }

  if (safePrefix.toUpperCase() === "OM") {
    return `${safePrefix}-${new Date().getFullYear()}-${String(next).padStart(digits, "0")}`;
  }

  return `${safePrefix}-${String(next).padStart(digits, "0")}`;
};
