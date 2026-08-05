import { EyeOff, User } from "lucide-react";
import { FlagBadge } from "./ProjectStatusBadge";
import { assetUrl } from "../../../api/client";

export const ProgressUpdateCard = ({ update }) => (
  <div
    className={`border border-zinc-800 bg-zinc-900/60 p-5 ${update._optimistic ? "opacity-60" : ""}`}
    data-testid={`update-card-${update.id}`}
  >
    <div className="flex flex-wrap items-center gap-3 mb-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <User size={13} strokeWidth={2.5} className="text-orange-500" />
        </div>
        <span className="text-sm font-semibold text-white">{update.author_name || "Unknown"}</span>
      </div>
      <span className="text-xs text-zinc-500">{update.update_date}</span>
      {update.phase_name && (
        <span className="text-[11px] uppercase tracking-[0.12em] text-zinc-400 border border-zinc-700 px-2 py-0.5">
          {update.phase_name}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        {update.visible_to_client === false && (
          <span className="flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-zinc-500 border border-zinc-700 px-2 py-0.5" data-testid={`internal-badge-${update.id}`}>
            <EyeOff size={11} strokeWidth={2.5} /> Internal
          </span>
        )}
        <FlagBadge flag={update.status_flag} />
      </div>
    </div>
    <p className="text-sm text-zinc-300 leading-relaxed">{update.description}</p>
    {update.percent_progress != null && (
      <div className="flex items-center gap-2 mt-3 max-w-xs">
        <div className="flex-1 h-1.5 bg-zinc-800">
          <div className="h-full bg-orange-500" style={{ width: `${update.percent_progress}%` }} />
        </div>
        <span className="text-xs text-zinc-400">{update.percent_progress}%</span>
      </div>
    )}
    {update.attachments?.length > 0 && (
      <div className="flex flex-wrap gap-2 mt-3">
        {update.attachments.map((a, i) => (
          <a key={i} href={assetUrl(a)} target="_blank" rel="noreferrer">
            <img src={assetUrl(a)} alt="attachment" className="w-28 h-20 object-cover border border-zinc-700 hover:border-orange-500 transition-colors" />
          </a>
        ))}
      </div>
    )}
  </div>
);

export const ProgressUpdateFeed = ({ updates }) => {
  if (!updates?.length)
    return (
      <div className="border border-zinc-800 bg-zinc-900/50 p-12 text-center text-zinc-500" data-testid="updates-empty-state">
        No progress updates yet.
      </div>
    );
  return (
    <div className="relative pl-6" data-testid="progress-update-feed">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-zinc-800" />
      <div className="space-y-4">
        {updates.map((u) => (
          <div key={u.id} className="relative">
            <div className="absolute -left-[21px] top-6 w-2.5 h-2.5 bg-orange-500 border-2 border-zinc-950" />
            <ProgressUpdateCard update={u} />
          </div>
        ))}
      </div>
    </div>
  );
};
