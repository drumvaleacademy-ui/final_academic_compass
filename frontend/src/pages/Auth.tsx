import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { School, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/store/auth";
import Loading from "@/components/Loading";

export default function Auth() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [busy, setBusy]             = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const nav = useNavigate();
  const { session, loading, signIn } = useAuth();

  useEffect(() => {
    if (!loading && session) nav("/", { replace: true });
  }, [session, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotBusy(true);
    try {
      const res = await fetch("/api/v2/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password");
      toast.success(data.message || "If an account exists, a reset link has been sent.");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password";
      toast.error(message);
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 auth-bg">
      {busy ? (
        <Loading />
      ) : (
        <Card className="w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <School className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Academic Compass</div>
            <div className="text-xs text-muted-foreground">Sign in to your school account</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 text-xs text-center text-muted-foreground">
          <button
            type="button"
            className="text-blue-900 hover:underline inline-flex items-center gap-1"
            onClick={() => setForgotOpen(true)}
          >
            <KeyRound className="h-3.5 w-3.5" /> Forgot password?
          </button>
        </div>

        <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" /> Reset Password
              </DialogTitle>
              <DialogDescription>
                Enter your registered email address to receive a password reset link.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  disabled={forgotBusy}
                />
              </div>
              <Button type="submit" className="w-full" disabled={forgotBusy}>
                {forgotBusy ? "Sending…" : "Send Reset Link"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          Contact your Principal for account access. Teacher accounts are created by the school administration.
        </p>
        </Card>
        )}
      </div>
    );
  }
