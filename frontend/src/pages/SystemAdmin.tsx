import { Link } from "react-router-dom";
import { ShieldCheck, UserPlus, ClipboardCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/store/auth";

export default function SystemAdmin() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeader
          title="System Administration"
          description={`Platform control center for ${user?.email ?? "the system administrator"}.`}
          actions={<Button asChild><Link to="/teachers">Manage staff <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6 space-y-4">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <div>
              <h2 className="font-semibold">Platform access</h2>
              <p className="text-sm text-muted-foreground">You are signed in as the system administrator.</p>
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <UserPlus className="h-7 w-7 text-primary" />
            <div>
              <h2 className="font-semibold">Create first principal</h2>
              <p className="text-sm text-muted-foreground">Create an active principal account for school operations.</p>
            </div>
            <Button asChild variant="outline"><Link to="/teachers">Open staff setup</Link></Button>
          </Card>
          <Card className="p-6 space-y-4">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            <div>
              <h2 className="font-semibold">Testing accounts</h2>
              <p className="text-sm text-muted-foreground">Add principal and teacher accounts for full workflow testing.</p>
            </div>
            <Button asChild variant="outline"><Link to="/teachers">Add test accounts</Link></Button>
          </Card>
        </div>
      </div>
    </main>
  );
}
