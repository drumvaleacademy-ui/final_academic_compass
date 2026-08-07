import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";

export default function Marks() {
  return (
    <div>
      <PageHeader title="Exam Marks" description="View and manage exam marks." />
      <Card className="p-6 text-center text-muted-foreground">
        Marks module will be reconnected to the backend API during migration.
      </Card>
    </div>
  );
}
