import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="School and system settings." />
      <Card className="p-6 text-center text-muted-foreground">
        Settings module will be reconnected to the backend API during migration.
      </Card>
    </div>
  );
}
