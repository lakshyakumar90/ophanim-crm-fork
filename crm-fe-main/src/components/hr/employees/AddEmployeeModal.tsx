"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, departmentsApi, teamsApi } from "@/lib/api";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";
import { Copy, Loader2 } from "lucide-react";

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const num = "23456789";
  const all = upper + lower + num + "!@#$%";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let p = pick(upper) + pick(lower) + pick(num) + pick(all);
  for (let i = 0; i < 8; i++) p += pick(all);
  return p.split("").sort(() => Math.random() - 0.5).join("");
}

type Dept = { id: string; name?: string };
type Team = { id: string; name?: string; departmentId?: string; department_id?: string };

export function AddEmployeeModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (employeeId: string) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "employee">("employee");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [shiftType, setShiftType] = useState<"day_shift" | "night_shift">("day_shift");
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setFullName("");
      setEmail("");
      setRole("employee");
      setPassword(generatePassword());
      setPhone("");
      setDepartmentId("");
      setTeamId("");
      setShiftType("day_shift");
      return;
    }
    setPassword(generatePassword());
    void (async () => {
      try {
        const d = await departmentsApi.list();
        setDepartments(Array.isArray(d) ? (d as Dept[]) : []);
      } catch {
        setDepartments([]);
      }
      try {
        const t = await teamsApi.list();
        setTeams(Array.isArray(t) ? (t as Team[]) : []);
      } catch {
        setTeams([]);
      }
    })();
  }, [open]);

  const teamsInDept = useMemo(() => {
    if (!departmentId) return teams;
    return teams.filter((t) => (t.departmentId || t.department_id) === departmentId);
  }, [teams, departmentId]);

  const copyPw = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const submit = async () => {
    if (!fullName.trim() || !email.trim() || !departmentId) {
      toast.error("Name, email, and department are required");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/auth/register", {
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
        departmentId,
        teamId: teamId || null,
        phone: phone.trim() || null,
        jobTitle: null,
        shiftType,
      });
      const raw = res.data as { data?: { user?: { id?: string } } };
      const newId = raw?.data?.user?.id;
      toast.success("Employee created. Share login credentials securely.");
      onOpenChange(false);
      if (newId) onCreated(newId);
    } catch (e) {
      toastHrError(e, "Failed to create employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add employee — step {step} of 2</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "manager" | "employee")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Admin or HR roles are assigned separately by an administrator.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <div className="flex gap-2">
                <Input readOnly value={password} className="font-mono text-sm" />
                <Button type="button" size="icon" variant="outline" onClick={() => void copyPw()}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Employee should change password on first login.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setTeamId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name || d.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team (optional)</Label>
              <Select value={teamId || "__none__"} onValueChange={(v) => setTeamId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {teamsInDept.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name || t.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={shiftType} onValueChange={(v) => setShiftType(v as "day_shift" | "night_shift")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day_shift">Day shift</SelectItem>
                  <SelectItem value="night_shift">Night shift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground rounded-md border p-2 bg-muted/40">
              Joining date, CTC, and other HR profile fields can be updated after creation via the employee
              profile (where supported by the API).
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 2 ? (
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 1 ? (
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!fullName.trim() || !email.trim()}
            >
              Next
            </Button>
          ) : (
            <Button type="button" disabled={saving || !departmentId} onClick={() => void submit()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create employee"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
