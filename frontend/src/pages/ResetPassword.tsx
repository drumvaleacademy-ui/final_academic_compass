import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolLogoIcon } from "@/components/SchoolLogo";
import { KeyRound, CheckCircle, AlertCircle, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import Loading from "@/components/Loading";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [step, setStep] = useState<"loading" | "invalid" | "form" | "success">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStep("invalid");
      return;
    }

    verifyToken();

    async function verifyToken() {
      try {
        const data = await api.get<{ valid: boolean; email: string }>(`/v2/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        if (data.valid && data.email) {
          setEmail(data.email);
          setStep("form");
        } else {
          setStep("invalid");
        }
      } catch {
        setStep("invalid");
      }
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/v2/auth/reset-password", { token, password });
      toast.success("Password reset successfully!");
      setStep("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4 auth-bg">
        <div className="text-center space-y-4">
          <Loading />
          <p className="text-sm text-muted-foreground">Validating your reset link...</p>
        </div>
      </div>
    );
  }

  if (step === "invalid") {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4 auth-bg">
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 text-destructive grid place-items-center">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold">Invalid or Expired Link</h1>
          <p className="text-sm text-muted-foreground">
            The password reset link you followed is invalid or has expired.
            Reset links expire after 1 hour for security.
          </p>
          <div className="pt-2">
            <Button onClick={() => navigate("/auth", { replace: true })}>
              Back to Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4 auth-bg">
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="mx-auto h-14 w-14 rounded-full bg-success/10 text-success grid place-items-center">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold">Password Reset Complete</h1>
          <p className="text-sm text-muted-foreground">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <div className="pt-2">
            <Button onClick={() => navigate("/auth", { replace: true })}>
              Sign In Now
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 auth-bg">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <SchoolLogoIcon size="md" />
          <div>
            <div className="font-semibold">Academic Compass</div>
            <div className="text-xs text-muted-foreground">Reset your password</div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-sm">Security Verification</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Resetting password for <span className="font-medium text-foreground">{email}</span>.
                This link was sent to the email address on file and expires in 1 hour.
                Choose a strong password you haven't used before.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Enter new password"
                className="pr-10"
                disabled={submitting}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters. Include uppercase, lowercase, and numbers.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Confirm new password"
                className="pr-10"
                disabled={submitting}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/auth", { replace: true })}
          >
            Back to Sign In
          </button>
        </div>
      </Card>
    </div>
  );
}
