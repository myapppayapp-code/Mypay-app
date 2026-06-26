import { firebaseAuth } from "./firebase";
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";

export type OtpMode = "prod" | "dev";

export interface OtpSession {
  confirmFn: (otp: string) => Promise<void>;
  mode: OtpMode;
  devOtp?: string;
}

const DEV_FALLBACK_CODES = new Set([
  "auth/billing-not-enabled",
  "auth/quota-exceeded",
]);

function friendlyFirebaseError(code: string): string {
  if (code === "auth/invalid-phone-number" || code === "auth/missing-phone-number") return "Invalid mobile number.";
  if (code === "auth/unauthorized-domain") return "This domain is not authorized for OTP. Contact support.";
  if (code === "auth/too-many-requests") return "Too many attempts. Please try again later.";
  if (code === "auth/captcha-check-failed") return "reCAPTCHA failed. Please refresh and try again.";
  if (code === "auth/invalid-verification-code") return "Incorrect OTP. Please check and try again.";
  if (code === "auth/code-expired") return "OTP has expired. Please request a new one.";
  return "OTP failed. Please try again.";
}

export function getOtpErrorMessage(err: unknown): string {
  const code: string = (err as any)?.code ?? "";
  if (code) return friendlyFirebaseError(code);
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes("network") || msg.includes("fetch")) return "Network error. Check your connection and try again.";
  return "OTP failed. Please try again.";
}

export async function sendFirebaseOtp(
  mobile: string,
  recaptchaContainerId: string,
  purpose: string,
): Promise<OtpSession> {
  try {
    const container = document.getElementById(recaptchaContainerId);
    if (container) container.innerHTML = "";

    const verifier = new RecaptchaVerifier(firebaseAuth, recaptchaContainerId, {
      size: "invisible",
    });

    const result = await signInWithPhoneNumber(firebaseAuth, `+91${mobile}`, verifier);
    console.log(`[PROD MODE] Firebase OTP sent — purpose: ${purpose}`);

    return {
      mode: "prod",
      confirmFn: async (otp: string) => {
        await result.confirm(otp);
      },
    };
  } catch (err: any) {
    const code: string = err?.code ?? "";

    if (DEV_FALLBACK_CODES.has(code)) {
      const devOtp = String(Math.floor(100000 + Math.random() * 900000));
      console.log(`[DEV MODE] Mock verification active — purpose: ${purpose}, reason: ${code}, OTP: ${devOtp}`);
      return {
        mode: "dev",
        devOtp,
        confirmFn: async (otp: string) => {
          if (otp !== devOtp) {
            throw Object.assign(new Error("Incorrect OTP. Please check and try again."), {
              code: "auth/invalid-verification-code",
            });
          }
        },
      };
    }

    throw err;
  }
}
