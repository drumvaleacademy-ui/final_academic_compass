import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { KeyRound, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/store/auth";
import { useSchool } from "@/store/school";
import Loading from "@/components/Loading";
import { SchoolLogoIcon } from "@/components/SchoolLogo";
import { api } from "@/lib/api";

export default function Auth() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [busy, setBusy]             = useState(false);
   const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotFullName, setForgotFullName] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const nav = useNavigate();
  const { session, loading, signIn } = useAuth();
  const { state } = useSchool();
  const schoolTag = state.settings.schoolTag;

  useEffect(() => {
    if (!loading && session && !signedIn) {
      nav("/", { replace: true });
    }
  }, [session, loading, nav, signedIn]);

   const submit = async (e: React.FormEvent) => {
     e.preventDefault();
     setBusy(true);
     try {
       await signIn(email, password);
       setSignedIn(true);
       setTimeout(() => nav("/", { replace: true }), 1200);
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
      await api.post("/v2/auth/forgot-password", { email: forgotEmail, fullName: forgotFullName });
      setForgotSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process request";
      toast.error(message);
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 auth-bg">
      {busy ? (
        <Loading />
      ) : signedIn ? (
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-success/10 text-success grid place-items-center">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Welcome back!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Signed in to {schoolTag}. Redirecting to your dashboard...
            </p>
          </div>
        </Card>
      ) : (
        <Card className="w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <SchoolLogoIcon size="md" />
          <div>
            <div className="font-semibold">Academic Compass</div>
            <div className="text-xs text-muted-foreground">Sign in to {schoolTag}</div>
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
                Enter your registered email and full name to verify your identity. A secure reset link will be sent to the email on file.
              </DialogDescription>
            </DialogHeader>
            {forgotSubmitted ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle className="h-12 w-12 text-success mx-auto" />
                <p className="text-sm">
                  If an account with that email and name exists, a password reset link has been sent.
                  The link expires in 1 hour. Please check your inbox (and spam folder).
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setForgotSubmitted(false); setForgotEmail(""); setForgotFullName(""); }}
                >
                  Close
                </Button>
              </div>
            ) : (
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
                    placeholder="you@school.ac.ke"
                  />
                </div>
                <div>
                  <Label htmlFor="forgot-full-name">Full Name (as registered)</Label>
                  <Input
                    id="forgot-full-name"
                    type="text"
                    value={forgotFullName}
                    onChange={(e) => setForgotFullName(e.target.value)}
                    required
                    disabled={forgotBusy}
                    placeholder="e.g. Amina Wanjiru Ochieng"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must match the name on your account for verification.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={forgotBusy}>
                  {forgotBusy ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>
            )}
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
