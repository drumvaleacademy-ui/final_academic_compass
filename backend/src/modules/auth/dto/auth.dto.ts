import { z } from "zod";

export const signinSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const bootstrapSchema = z.object({
  schoolName: z.string().min(1, "School name is required"),
  adminEmail: z.string().email().trim().toLowerCase(),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  adminFullName: z.string().min(1, "Full name is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SigninInput = z.infer<typeof signinSchema>;
export type BootstrapInput = z.infer<typeof bootstrapSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
