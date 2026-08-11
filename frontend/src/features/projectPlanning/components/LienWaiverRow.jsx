import { useRef } from "react";
import { FileUp } from "lucide-react";
import { CommitmentStatusBadge } from "./CommitmentStatusBadge";
import api, { assetUrl } from "../../../api/client";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const LienWaiverRow = ({ waiver, canWrite, onUploaded }) => {
  const fileRef = useRef(null);

  const upload = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/upload", fd);
    await api.patch(`/lien-waivers/${waiver.id}`, { file_url: data.url, status: "Received" });
    onUploaded();
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border border-slate-200 bg-white/50 px-3 py-2 text-xs" data-testid={`lien-waiver-${waiver.id}`}>
      <span className="uppercase tracking-[0.12em] font-semibold text-slate-500">
        {waiver.waiver_type.replace(/([A-Z])/g, " $1").trim()}
      </span>
      <span className="text-slate-600">{fmt(waiver.amount)}</span>
      <span className="text-slate-500">{waiver.signed_date || "unsigned"}</span>
      <CommitmentStatusBadge status={waiver.status} />
      <div className="ml-auto flex items-center gap-2">
        {waiver.file_url && (
          <a href={assetUrl(waiver.file_url)} target="_blank" rel="noreferrer"
            className="text-blue-600 hover:text-blue-700 font-semibold uppercase tracking-wide text-[10px]">View</a>
        )}
        {canWrite && (
          <>
            <button data-testid={`waiver-upload-${waiver.id}`} onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-wide text-[10px] font-semibold">
              <FileUp size={12} strokeWidth={2.5} /> Upload
            </button>
            <input ref={fileRef} type="file" hidden onChange={upload} />
          </>
        )}
      </div>
    </div>
  );
};
