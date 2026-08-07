import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";

export default function Reports() {
  return (
    <div>
      <PageHeader title="Reports" description="Generate and manage report cards." />
      <Card className="p-6 text-center text-muted-foreground">
        Reports module will be reconnected to the backend API during migration.
      </Card>
    </div>
  );
}
