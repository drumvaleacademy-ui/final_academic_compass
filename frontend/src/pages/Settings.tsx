import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { useSchool } from "@/store/school";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { state, update } = useSchool();
  const [draft, setDraft] = useState(state.settings);
  const save = () => { update((current) => { current.settings = { ...current.settings, ...draft }; }); toast.success("School settings saved"); };
  return (
    <div>
      <PageHeader title="Settings" description="School and system settings." />
      <Card className="p-6 space-y-5 max-w-3xl">
        <div className="grid md:grid-cols-2 gap-4">{([['schoolName','School name'],['schoolTag','School tag'],['schoolAddress','Address'],['schoolEmail','Email'],['schoolWebsite','Website'],['schoolMotto','Motto'],['principalName','Principal name'],['principalTitle','Principal title']] as const).map(([key,label]) => <div key={key} className="space-y-1"><Label htmlFor={key}>{label}</Label><Input id={key} value={String(draft[key])} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /></div>)}</div>
        <Button onClick={save}>Save settings</Button>
      </Card>
    </div>
  );
}
