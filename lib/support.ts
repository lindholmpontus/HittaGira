import QRCode from "qrcode";

// Donation options shown on /stod.

export const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/lindholmpontus";

/**
 * Digits only, e.g. "0701234567". Comes from an env var (Vercel + .env.local)
 * so the phone number never lands in the git history; unset hides Swish.
 * The /stod page is static, so a change takes effect on the next deploy.
 */
export const SWISH_NUMBER =
  process.env.SWISH_NUMBER?.replace(/\D/g, "") || null;

/** Suggested amount in SEK — the payer can change it in the Swish app. */
const SWISH_AMOUNT = 30;
const SWISH_MESSAGE = "HittaGira";

/**
 * QR code for the Swish app's scanner, per Swish's QR spec (v1.7.2, §6.1):
 * `C<payee>;<amount>;<message>;<lock mask>`. Amount uses a decimal comma;
 * the mask's bits are payee (1), amount (2), message (4) — set = editable.
 */
export async function swishQrSvg(number: string): Promise<string> {
  const payload = `C${number};${SWISH_AMOUNT},00;${encodeURIComponent(SWISH_MESSAGE)};6`;
  return QRCode.toString(payload, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1A100C", light: "#0000" },
  });
}

/**
 * Opens the Swish app with the payment prefilled (used on phones). Not an
 * official Swish API — a community-documented format.
 */
export function swishAppLink(number: string): string {
  const data = {
    version: 1,
    payee: { value: number.replace(/^0/, "+46") },
    amount: { value: SWISH_AMOUNT, editable: true },
    message: { value: SWISH_MESSAGE, editable: true },
  };
  return `swish://payment?data=${encodeURIComponent(JSON.stringify(data))}`;
}
