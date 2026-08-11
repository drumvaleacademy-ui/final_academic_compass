import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SchoolLogoIcon } from "@/components/SchoolLogo";
import { api } from "@/lib/api";

export default function Bootstrap() {
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/v2/auth/bootstrap", { schoolName, adminEmail: email, adminFullName: fullName, adminPassword: password });
      toast.success("School initialized successfully");
      setTimeout(() => nav("/auth", { replace: true }), 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bootstrap failed";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 auth-bg">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <SchoolLogoIcon size="md" />
          <div>
            <div className="font-semibold">Academic Compass</div>
            <div className="text-xs text-muted-foreground">Initialize your school</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="school">School Name</Label>
            <Input id="school" value={schoolName} onChange={e => setSchoolName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Admin Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="fullName">Admin Full Name</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Admin Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : "Initialize School"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
