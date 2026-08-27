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
  const [timeoutMins, setTimeoutMins] = useState(() => {
    try {
      const ms = Number(localStorage.getItem("ac_auto_logout_ms") ?? "");
      return ms && ms > 0 ? String(Math.round(ms / 60000)) : "30";
    } catch (_e) { return "30"; }
  });
  const save = () => { update((current) => { current.settings = { ...current.settings, ...draft }; }); toast.success("School settings saved"); };
  const saveTimeout = () => {
    const mins = Number(timeoutMins) || 0;
    const ms = Math.max(0, Math.round(mins * 60000));
    if (ms > 0) localStorage.setItem("ac_auto_logout_ms", String(ms)); else localStorage.removeItem("ac_auto_logout_ms");
    toast.success("Auto-logout timeout saved");
  };
  return (
    <div>
      <PageHeader title="Settings" description="School and system settings." />
      <Card className="p-6 space-y-5 max-w-3xl">
        <div className="grid md:grid-cols-2 gap-4">{([['schoolName','School name'],['schoolTag','School tag'],['schoolAddress','Address'],['schoolEmail','Email'],['schoolWebsite','Website'],['schoolMotto','Motto'],['principalName','Principal name'],['principalTitle','Principal title']] as const).map(([key,label]) => <div key={key} className="space-y-1"><Label htmlFor={key}>{label}</Label><Input id={key} value={String(draft[key])} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /></div>)}</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="academic-year">Academic year</Label>
            <Input id="academic-year" type="number" min={2000} max={2100} value={draft.academicYear} onChange={(e) => setDraft({ ...draft, academicYear: Number(e.target.value) || new Date().getFullYear() })} />
            <p className="text-xs text-muted-foreground">Defaults to the current calendar year when no school year is saved.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="auto-logout">Auto logout (minutes)</Label>
            <Input id="auto-logout" type="number" min={0} value={timeoutMins} onChange={(e) => setTimeoutMins(e.target.value)} />
            <p className="text-xs text-muted-foreground">Set 0 to disable auto-logout. Default is 30 minutes.</p>
            <div className="flex gap-2 mt-2">
              <Button onClick={saveTimeout}>Save timeout</Button>
              <Button variant="outline" onClick={() => { setTimeoutMins("30"); localStorage.removeItem("ac_auto_logout_ms"); toast.success("Reset timeout to default"); }}>Reset</Button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={save}>Save settings</Button>
        </div>
      </Card>
    </div>
  );
}
