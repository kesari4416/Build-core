import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import api, { formatApiErrorDetail } from "../../../api/client";
import { useProjects } from "../hooks/useProjects";

export const ProjectAssignmentPicker = ({ open, onOpenChange, targetUser }) => {
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const { data } = useProjects({ limit: 200 });

  const assign = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/assignments`, {
        user_id: targetUser.id, assigned_role: targetUser.role,
      });
      toast.success(`${targetUser.name} assigned to project`);
      onOpenChange(false);
      setProjectId("");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 rounded-none max-w-sm" data-testid="assignment-picker-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase tracking-wide">Assign to Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-zinc-400">
            Assign <span className="text-white font-semibold">{targetUser?.name}</span> ({targetUser?.role}) to a project.
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger data-testid="assignment-project-select" className="mt-1.5 bg-zinc-950 border-zinc-700 rounded-none">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {(data?.items || []).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-none border-zinc-700" data-testid="assignment-cancel">Cancel</Button>
            <Button disabled={!projectId || saving} onClick={assign} data-testid="assignment-submit" className="rounded-none bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold uppercase tracking-wide">Assign</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
