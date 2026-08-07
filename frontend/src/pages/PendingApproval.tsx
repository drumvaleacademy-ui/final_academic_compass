import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/auth";
import { Clock, LogOut, RefreshCw, School, ShieldCheck, Hammer } from "lucide-react";
import { toast } from "sonner";

export default function PendingApproval() {
  const { user, signOut, refreshProfile, refreshRoles } = useAuth();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      refreshProfile();
      refreshRoles();
    }, 20000);
    return () => clearInterval(id);
  }, [refreshProfile, refreshRoles]);

  const checkNow = async () => {
    setChecking(true);
    try {
      await refreshProfile();
      await refreshRoles();
      toast.info("Status refreshed.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 auth-bg">
      <Card className="w-full max-w-md p-6 text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-full bg-warning-soft text-warning-foreground grid place-items-center">
          <Clock className="h-7 w-7" />
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <School className="h-4 w-4" /> Academic Compass
        </div>

        <div>
          <h1 className="text-lg font-bold">Awaiting Principal Approval</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Hi {user?.full_name || user?.email}, your profile has been created but
            isn't approved yet. The Principal needs to review and grant your role
            before you can access the system.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 text-left text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Department</span>
            <span className="font-medium">{user?.department || "—"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <span className="inline-flex items-center gap-1 font-semibold text-warning-foreground">
              <Clock className="h-3.5 w-3.5" /> Pending
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={checkNow} disabled={checking}>
            <RefreshCw className={`h-4 w-4 mr-1 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking…" : "Check status"}
          </Button>
          <Button variant="ghost" className="flex-1" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </div>

        <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> This page refreshes automatically once approved.
        </div>
      </Card>
    </div>
  );
}
