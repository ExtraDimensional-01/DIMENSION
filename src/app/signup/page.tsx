import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Sign up — DIMENSION" };

export default function SignupPage() {
  return <SignupForm />;
}
