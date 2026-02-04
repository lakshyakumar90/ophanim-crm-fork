import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";

// App name shown in authenticator apps
const APP_NAME = "CRM";

/**
 * Generate a new TOTP secret for a user
 */
export function generateTOTPSecret(): string {
  const secret = new Secret({ size: 20 });
  return secret.base32;
}

/**
 * Create a TOTP instance with the given secret
 */
export function createTOTP(email: string, secret: string): TOTP {
  return new TOTP({
    issuer: APP_NAME,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

/**
 * Generate the otpauth URI for the authenticator app
 */
export function getTOTPUri(email: string, secret: string): string {
  const totp = createTOTP(email, secret);
  return totp.toString();
}

/**
 * Generate QR code as data URL for the TOTP setup
 */
export async function generateQRCode(
  email: string,
  secret: string
): Promise<string> {
  const uri = getTOTPUri(email, secret);
  return QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Verify a TOTP code against the secret
 * Allows for 1 period of drift (30 seconds before/after)
 */
export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });

  // Delta allows for time drift: -1 = previous period, 0 = current, 1 = next
  const delta = totp.validate({ token, window: 1 });

  // Returns null if invalid, number if valid
  return delta !== null;
}

/**
 * Generate current TOTP code (for testing purposes)
 */
export function generateCurrentTOTP(secret: string): string {
  const totp = new TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });

  return totp.generate();
}
