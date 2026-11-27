import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Users,
  Tractor,
  UserCog,
  ClipboardList,
  IndianRupee,
  Eye,
  Pencil,
  KeyRound,
  Power,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  History,
  AlertTriangle,
  Phone,
  MapPin,
  Mail,
  Download,
  Check,
  Clock,
} from "lucide-react";

import { buildOwnerExportPdf } from "../utils/ownerExport.js";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const API = `${API_BASE}/api/admin`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const inr = (n = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const fmtDate = (d) => {
  if (!d) return "-";
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? "-"
    : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (d) => {
  if (!d) return "-";
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? "-"
    : x.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const errMsg = (error, fallback) => error?.response?.data?.message || fallback;

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

const ACTION_LABEL = {
  UPDATE: { text: "Updated", cls: "bg-sky-100 text-sky-700" },
  ENABLE: { text: "Enabled", cls: "bg-emerald-100 text-emerald-700" },
  DISABLE: { text: "Disabled", cls: "bg-amber-100 text-amber-700" },
  RESET_PASSWORD: { text: "Password reset", cls: "bg-violet-100 text-violet-700" },
  EXPORT: { text: "Exported", cls: "bg-indigo-100 text-indigo-700" },
  DELETE: { text: "Deleted", cls: "bg-rose-100 text-rose-700" },
  APPROVE: { text: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  REJECT: { text: "Rejected", cls: "bg-rose-100 text-rose-700" },
};

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Backend se owner ka poora data (JSON blob) laao
const fetchOwnerExport = async (owner) => {
  const res = await axios.get(`${API}/owners/${owner._id}/export`, {
    responseType: "blob",
    withCredentials: true,
  });
  return res.data;
};

const stamp = () => new Date().toISOString().slice(0, 10);

// Padhne layayak PDF
const downloadOwnerPdf = async (owner, generatedBy = "") => {
  const blob = await fetchOwnerExport(owner);
  const data = JSON.parse(await blob.text());

  const { blob: pdf, fileName } = await buildOwnerExportPdf({
    owner: data.owner || owner,
    data,
    generatedBy,
  });

  saveBlob(pdf, fileName);
};

// Technical backup (dobara import ya developer ke kaam ka)
const downloadOwnerJson = async (owner) => {
  const blob = await fetchOwnerExport(owner);
  const safe = String(owner.email || owner._id).replace(/[^a-z0-9]+/gi, "-");
  saveBlob(blob, `owner-${safe}-${stamp()}.json`);
};

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm font-medium text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminOwners() {
  const [stats, setStats] = useState(null);

  const [owners, setOwners] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // { type: "view" | "edit" | "password" | "delete", owner }
  const [modal, setModal] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/stats`, { withCredentials: true });
      setStats(res.data?.stats || null);
    } catch (error) {
      toast.error(errMsg(error, "Failed to load summary"));
    }
  }, []);

  const fetchOwners = useCallback(async () => {
    try {
      setLoading(true);
      setListError("");
      const res = await axios.get(`${API}/owners`, {
        params: { search, status, page, limit: 10 },
        withCredentials: true,
      });
      setOwners(res.data?.owners || []);
      setPagination(res.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error) {
      const status = error?.response?.status;
      const message = errMsg(error, "Failed to load owners");
      setOwners([]);
      setListError(status ? `${message} (HTTP ${status})` : `${message} (server se jawab nahi aaya)`);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/audit`, {
        params: { limit: 15 },
        withCredentials: true,
      });
      setLogs(res.data?.logs || []);
    } catch {
      // activity log optional hai
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [fetchStats, fetchLogs]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  // Search: type rukne ke 400ms baad hi request
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const refreshAll = () => {
    fetchStats();
    fetchOwners();
    fetchLogs();
  };

  const approveOwner = async (owner) => {
    try {
      await axios.patch(
        `${API}/owners/${owner._id}/approval`,
        { decision: "approve" },
        { withCredentials: true }
      );
      toast.success(`${owner.name} approve ho gaya. Ab wo login kar sakta hai.`);
      refreshAll();
    } catch (error) {
      toast.error(errMsg(error, "Could not approve owner"));
    }
  };

  const toggleStatus = async (owner) => {
    const next = !owner.isActive;

    if (
      !next &&
      !window.confirm(
        `${owner.name} ko disable karna hai?\nOwner aur uske saare drivers login nahi kar payenge.`
      )
    ) {
      return;
    }

    try {
      await axios.patch(
        `${API}/owners/${owner._id}/status`,
        { isActive: next },
        { withCredentials: true }
      );
      toast.success(next ? "Owner enabled" : "Owner disabled");
      refreshAll();
    } catch (error) {
      toast.error(errMsg(error, "Could not change status"));
    }
  };

  const closeModal = () => setModal(null);

  const exportOwner = async (owner) => {
    const id = toast.loading("PDF ban raha hai, thoda ruko...");
    try {
      await downloadOwnerPdf(owner);
      toast.success("PDF download ho gaya", { id });
      fetchLogs();
    } catch (error) {
      toast.error(errMsg(error, "Export fail ho gaya"), { id });
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-800">
              <ShieldCheck size={14} />
              Admin Panel
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900">
              Owners
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Saare owners, unka data aur status ek jagah. Yahin se edit, disable,
              password reset ya delete kar sakte ho.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200 transition hover:bg-violet-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        {/* Platform summary */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            icon={ShieldCheck}
            label="Owners"
            value={stats ? stats.owners.total : "-"}
            sub={
              stats
                ? `${stats.owners.active} active · ${stats.owners.disabled} disabled${
                    stats.owners.pending ? ` · ${stats.owners.pending} pending` : ""
                  }`
                : ""
            }
            tone="violet"
          />
          <StatTile
            icon={UserCog}
            label="Drivers"
            value={stats ? stats.drivers : "-"}
            tone="sky"
          />
          <StatTile
            icon={Users}
            label="Farmers"
            value={stats ? stats.farmers : "-"}
            tone="emerald"
          />
          <StatTile
            icon={ClipboardList}
            label="Works"
            value={stats ? stats.works : "-"}
            sub={stats ? `${stats.payments} payments` : ""}
            tone="amber"
          />
        </div>

        {stats && (
          <div className="grid gap-4 sm:grid-cols-3">
            <MoneyTile label="Total billed" value={stats.billed} cls="text-stone-900" />
            <MoneyTile label="Collected" value={stats.paid} cls="text-emerald-700" />
            <MoneyTile label="Outstanding due" value={stats.due} cls="text-rose-600" />
          </div>
        )}

        {stats?.owners?.pending > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <Clock size={16} />
              {stats.owners.pending} naye owner approval ka intezaar kar rahe hain
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("pending");
                setPage(1);
              }}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-600"
            >
              Dekho
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-900/5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Naam, email, phone ya village se dhundho"
              className={`${inputCls} pl-10`}
            />
          </div>

          <div className="flex rounded-xl bg-stone-100 p-1">
            {[
              ["all", "All"],
              ["pending", `Pending${stats?.owners?.pending ? ` (${stats.owners.pending})` : ""}`],
              ["active", "Active"],
              ["disabled", "Disabled"],
              ["rejected", "Rejected"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setStatus(id);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  status === id
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Owners list */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5">
          {loading && !owners.length ? (
            <div className="flex items-center justify-center gap-3 p-16 text-stone-400">
              <Loader2 className="animate-spin" size={20} />
              Loading owners...
            </div>
          ) : listError ? (
            <div className="p-16 text-center">
              <p className="font-bold text-rose-600">Owners load nahi hue</p>
              <p className="mt-1 text-sm text-stone-500">{listError}</p>
              <button
                type="button"
                onClick={fetchOwners}
                className="mt-4 rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700"
              >
                Retry
              </button>
            </div>
          ) : owners.length === 0 ? (
            <div className="p-16 text-center">
              <p className="font-bold text-stone-700">Koi owner nahi mila</p>
              <p className="mt-1 text-sm text-stone-400">Search ya filter badal ke dekho.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {owners.map((owner) => (
                <OwnerRow
                  key={owner._id}
                  owner={owner}
                  onView={() => setModal({ type: "view", owner })}
                  onEdit={() => setModal({ type: "edit", owner })}
                  onPassword={() => setModal({ type: "password", owner })}
                  onToggle={() => toggleStatus(owner)}
                  onApprove={() => approveOwner(owner)}
                  onReject={() => setModal({ type: "reject", owner })}
                  onDelete={() => setModal({ type: "delete", owner })}
                  onExport={() => exportOwner(owner)}
                />
              ))}
            </ul>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3 text-xs font-semibold text-stone-500">
            <span>
              {pagination.total} owner{pagination.total === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg p-1.5 ring-1 ring-stone-200 transition hover:bg-stone-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg p-1.5 ring-1 ring-stone-200 transition hover:bg-stone-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Admin activity */}
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5">
          <button
            type="button"
            onClick={() => setShowLogs((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="inline-flex items-center gap-2 text-sm font-bold text-stone-800">
              <History size={16} className="text-violet-600" />
              Recent admin activity
            </span>
            <span className="text-xs font-semibold text-stone-400">
              {showLogs ? "Hide" : "Show"}
            </span>
          </button>

          {showLogs && (
            <ul className="mt-4 space-y-2">
              {logs.length === 0 && (
                <li className="text-sm text-stone-400">Abhi koi activity nahi.</li>
              )}
              {logs.map((log) => {
                const meta = ACTION_LABEL[log.action] || { text: log.action, cls: "bg-stone-100 text-stone-600" };
                return (
                  <li
                    key={log._id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-stone-50 px-3.5 py-2.5 text-xs"
                  >
                    <span className={`rounded-full px-2.5 py-0.5 font-bold ${meta.cls}`}>
                      {meta.text}
                    </span>
                    <span className="font-semibold text-stone-800">
                      {log.targetName || "Owner"}
                    </span>
                    <span className="text-stone-400">{log.targetEmail}</span>
                    <span className="ml-auto text-stone-400">
                      {log.adminName ? `${log.adminName} · ` : ""}
                      {fmtDateTime(log.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {modal?.type === "view" && <OwnerDetailsModal owner={modal.owner} onClose={closeModal} />}

      {modal?.type === "edit" && (
        <EditOwnerModal
          owner={modal.owner}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            refreshAll();
          }}
        />
      )}

      {modal?.type === "password" && (
        <ResetPasswordModal
          owner={modal.owner}
          onClose={closeModal}
          onDone={() => {
            closeModal();
            fetchLogs();
          }}
        />
      )}

      {modal?.type === "reject" && (
        <RejectOwnerModal
          owner={modal.owner}
          onClose={closeModal}
          onDone={() => {
            closeModal();
            refreshAll();
          }}
        />
      )}

      {modal?.type === "delete" && (
        <DeleteOwnerModal
          owner={modal.owner}
          onClose={closeModal}
          onDeleted={() => {
            closeModal();
            if (owners.length === 1 && page > 1) setPage((p) => p - 1);
            refreshAll();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* List parts                                                          */
/* ------------------------------------------------------------------ */

const TONES = {
  violet: "bg-violet-100 text-violet-700",
  sky: "bg-sky-100 text-sky-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
};

function StatTile({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONES[tone]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</p>
        <p className="mt-0.5 text-xl font-extrabold tabular-nums text-stone-900">{value}</p>
        {sub && <p className="truncate text-[11px] text-stone-400">{sub}</p>}
      </div>
    </div>
  );
}

function MoneyTile({ label, value, cls }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
        <IndianRupee size={13} />
        {label}
      </p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${cls}`}>{inr(value)}</p>
    </div>
  );
}

function OwnerRow({ owner, onView, onEdit, onPassword, onToggle, onApprove, onReject, onDelete, onExport }) {
  const s = owner.stats || {};
  const pending = owner.approvalStatus === "pending";
  const rejected = owner.approvalStatus === "rejected";
  const unapproved = pending || rejected;

  const pill = pending
    ? { text: "Pending approval", cls: "bg-amber-100 text-amber-700" }
    : rejected
      ? { text: "Rejected", cls: "bg-rose-100 text-rose-600" }
      : owner.isActive
        ? { text: "Active", cls: "bg-emerald-100 text-emerald-700" }
        : { text: "Disabled", cls: "bg-rose-100 text-rose-600" };

  return (
    <li
      className={`grid gap-4 p-5 lg:grid-cols-12 lg:items-center ${
        pending ? "bg-amber-50/60" : owner.isActive && !rejected ? "" : "bg-stone-50/70"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3 lg:col-span-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md ${
            owner.isActive && !unapproved ? "bg-gradient-to-br from-violet-600 to-indigo-500" : "bg-stone-400"
          }`}
        >
          {initials(owner.name)}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-bold text-stone-900">
            {owner.name}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${pill.cls}`}>
              {pill.text}
            </span>
          </p>
          <p className="truncate text-xs text-stone-400">{owner.email}</p>
          <p className="truncate text-xs text-stone-400">Joined {fmtDate(owner.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center lg:col-span-4">
        <MiniStat icon={UserCog} label="Drivers" value={s.drivers ?? 0} />
        <MiniStat icon={Users} label="Farmers" value={s.farmers ?? 0} />
        <MiniStat icon={ClipboardList} label="Works" value={s.works ?? 0} />
      </div>

      <div className="lg:col-span-2">
        <p className="text-[11px] font-semibold uppercase text-stone-400">Due</p>
        <p className={`font-extrabold tabular-nums ${s.due > 0 ? "text-rose-600" : "text-emerald-700"}`}>
          {inr(s.due)}
        </p>
        <p className="text-[11px] text-stone-400">of {inr(s.billed)} billed</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 lg:col-span-2 lg:justify-end">
        {unapproved && (
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            <Check size={14} />
            {rejected ? "Approve karo" : "Approve"}
          </button>
        )}
        {pending && (
          <button
            type="button"
            onClick={onReject}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50"
          >
            <X size={14} />
            Reject
          </button>
        )}
        <IconBtn title="Details" onClick={onView} icon={Eye} />
        <IconBtn title="Edit" onClick={onEdit} icon={Pencil} />
        <IconBtn title="Export PDF" onClick={onExport} icon={Download} />
        <IconBtn title="Reset password" onClick={onPassword} icon={KeyRound} />
        {!unapproved && (
          <IconBtn
            title={owner.isActive ? "Disable" : "Enable"}
            onClick={onToggle}
            icon={Power}
            cls={owner.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}
          />
        )}
        <IconBtn title="Delete" onClick={onDelete} icon={Trash2} cls="text-rose-600 hover:bg-rose-50" />
      </div>
    </li>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-stone-50 px-2 py-2">
      <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase text-stone-400">
        <Icon size={11} />
        {label}
      </p>
      <p className="mt-0.5 text-sm font-extrabold tabular-nums text-stone-800">{value}</p>
    </div>
  );
}

function IconBtn({ icon: Icon, title, onClick, cls = "text-stone-600 hover:bg-stone-100" }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-xl p-2 ring-1 ring-stone-200 transition ${cls}`}
    >
      <Icon size={16} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */
/* ------------------------------------------------------------------ */

function ModalShell({ title, onClose, busy = false, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-extrabold text-stone-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl p-2 text-stone-400 transition hover:bg-stone-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function OwnerDetailsModal({ owner, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await axios.get(`${API}/owners/${owner._id}`, { withCredentials: true });
        if (alive) setData(res.data);
      } catch (error) {
        toast.error(errMsg(error, "Failed to load details"));
        onClose();
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner._id]);

  const s = data?.stats;

  return (
    <ModalShell title={owner.name} onClose={onClose} wide>
      {loading || !data ? (
        <div className="flex items-center justify-center gap-3 p-10 text-stone-400">
          <Loader2 className="animate-spin" size={18} />
          Loading...
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
            <p className="flex items-center gap-2"><Mail size={14} className="text-stone-400" />{data.owner.email}</p>
            <p className="flex items-center gap-2"><Phone size={14} className="text-stone-400" />{data.owner.phone || "-"}</p>
            <p className="flex items-center gap-2"><MapPin size={14} className="text-stone-400" />{data.owner.village || "-"}</p>
            <p className="flex items-center gap-2"><Tractor size={14} className="text-stone-400" />Last activity: {fmtDate(s.lastActivity)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat icon={UserCog} label="Drivers" value={s.drivers} />
            <MiniStat icon={Users} label="Farmers" value={s.farmers} />
            <MiniStat icon={ClipboardList} label="Works" value={s.works} />
            <MiniStat icon={IndianRupee} label="Due" value={inr(s.due)} />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-xl bg-stone-50 p-3"><p className="text-[11px] uppercase text-stone-400">Billed</p><p className="font-extrabold">{inr(s.billed)}</p></div>
            <div className="rounded-xl bg-stone-50 p-3"><p className="text-[11px] uppercase text-stone-400">Collected</p><p className="font-extrabold text-emerald-700">{inr(s.paid)}</p></div>
            <div className="rounded-xl bg-stone-50 p-3"><p className="text-[11px] uppercase text-stone-400">Due</p><p className="font-extrabold text-rose-600">{inr(s.due)}</p></div>
          </div>

          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Drivers ({data.drivers.length})</h4>
            {data.drivers.length === 0 ? (
              <p className="text-sm text-stone-400">Koi driver nahi.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.drivers.map((d) => (
                  <li key={d._id} className="flex items-center justify-between rounded-xl bg-stone-50 px-3.5 py-2 text-sm">
                    <span className="font-semibold text-stone-800">{d.name}</span>
                    <span className="text-xs text-stone-400">
                      {d.email} · {d.isActive === false ? "Disabled" : "Active"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Recent works</h4>
            {data.recentWorks.length === 0 ? (
              <p className="text-sm text-stone-400">Abhi koi kaam nahi.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.recentWorks.map((w) => (
                  <li key={w._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 px-3.5 py-2 text-sm">
                    <span className="font-semibold text-stone-800">
                      {w.farmer?.name || "Farmer"} · {w.workType || "-"}
                    </span>
                    <span className="text-xs text-stone-500">
                      {fmtDate(w.date)} · {inr(w.totalAmount)} · due {inr(w.dueAmount)} · {w.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </ModalShell>
  );
}

function EditOwnerModal({ owner, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: owner.name || "",
    email: owner.email || "",
    phone: owner.phone || "",
    village: owner.village || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      await axios.patch(`${API}/owners/${owner._id}`, form, { withCredentials: true });
      toast.success("Owner updated");
      onSaved();
    } catch (error) {
      toast.error(errMsg(error, "Could not update owner"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Edit owner" onClose={onClose} busy={saving}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-semibold text-stone-700">
          Name
          <input className={`${inputCls} mt-1`} value={form.name} onChange={set("name")} required />
        </label>
        <label className="block text-sm font-semibold text-stone-700">
          Email
          <input type="email" className={`${inputCls} mt-1`} value={form.email} onChange={set("email")} required />
        </label>
        <label className="block text-sm font-semibold text-stone-700">
          Phone
          <input className={`${inputCls} mt-1`} value={form.phone} onChange={set("phone")} />
        </label>
        <label className="block text-sm font-semibold text-stone-700">
          Village
          <input className={`${inputCls} mt-1`} value={form.village} onChange={set("village")} />
        </label>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 hover:bg-stone-200 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ResetPasswordModal({ owner, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (password.length < 8 || password.length > 72) {
      return toast.error("Password 8 se 72 characters ka hona chahiye");
    }

    try {
      setSaving(true);
      await axios.post(
        `${API}/owners/${owner._id}/reset-password`,
        { newPassword: password },
        { withCredentials: true }
      );
      toast.success("Password reset ho gaya");
      onDone();
    } catch (error) {
      toast.error(errMsg(error, "Could not reset password"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`Reset password: ${owner.name}`} onClose={onClose} busy={saving}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-stone-500">
          Naya password set hoga. Owner ko ye surakshit tareeke se khud batana padega. Purane
          login session 7 din tak chal sakte hain.
        </p>
        <input
          type="text"
          autoComplete="off"
          className={inputCls}
          placeholder="Naya password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 hover:bg-stone-200 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">
            {saving ? "Saving..." : "Reset password"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteOwnerModal({ owner, onClose, onDeleted }) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [jsonBusy, setJsonBusy] = useState(false);
  const [skipBackup, setSkipBackup] = useState(false);

  const matches = confirmEmail.trim().toLowerCase() === (owner.email || "").toLowerCase();
  const s = owner.stats || {};
  const backupOk = exported || skipBackup;

  const runExport = async () => {
    if (exporting) return;

    try {
      setExporting(true);
      await downloadOwnerPdf(owner);
      setExported(true);
      toast.success("PDF download ho gaya");
    } catch (error) {
      toast.error(errMsg(error, "Export fail ho gaya"));
    } finally {
      setExporting(false);
    }
  };

  const runJsonExport = async () => {
    if (jsonBusy) return;

    try {
      setJsonBusy(true);
      await downloadOwnerJson(owner);
      setExported(true);
      toast.success("JSON backup download ho gaya");
    } catch (error) {
      toast.error(errMsg(error, "Export fail ho gaya"));
    } finally {
      setJsonBusy(false);
    }
  };

  const submit = async () => {
    if (!matches || !backupOk || deleting) return;

    try {
      setDeleting(true);
      await axios.delete(`${API}/owners/${owner._id}`, {
        data: { confirmEmail: confirmEmail.trim() },
        withCredentials: true,
      });
      toast.success("Owner aur uska poora data delete ho gaya");
      onDeleted();
    } catch (error) {
      toast.error(errMsg(error, "Could not delete owner"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalShell title="Owner permanently delete karna hai?" onClose={onClose} busy={deleting}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-100">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            <b>{owner.name}</b> ke saath uske {s.drivers ?? 0} drivers, {s.farmers ?? 0} farmers,{" "}
            {s.works ?? 0} works, saare payments, advance aur expenses hamesha ke liye hat jayenge.
            Ye wapas nahi ho sakta. Sirf rokna ho to <b>Disable</b> use karo.
          </p>
        </div>

        <div className="rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <button
            type="button"
            onClick={runExport}
            disabled={exporting || jsonBusy || deleting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {exporting
              ? "PDF ban raha hai..."
              : exported
                ? "PDF dobara download karo"
                : "Pehle poora data PDF me download karo"}
          </button>

          <button
            type="button"
            onClick={runJsonExport}
            disabled={jsonBusy || deleting}
            className="mt-2 w-full text-center text-xs font-semibold text-stone-500 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {jsonBusy ? "JSON ban raha hai..." : "Technical backup (JSON) bhi chahiye?"}
          </button>

          {exported ? (
            <p className="mt-2 text-center text-xs font-semibold text-emerald-700">
              Backup download ho chuka hai. Use surakshit jagah rakh lo.
            </p>
          ) : (
            <label className="mt-3 flex items-start gap-2 text-xs text-stone-500">
              <input
                type="checkbox"
                checked={skipBackup}
                onChange={(e) => setSkipBackup(e.target.checked)}
                className="mt-0.5"
              />
              Mujhe backup nahi chahiye, bina export ke delete karo.
            </label>
          )}
        </div>

        <label className="block text-sm font-semibold text-stone-700">
          Confirm karne ke liye owner ka email likho:
          <span className="mt-0.5 block text-xs font-bold text-stone-500">{owner.email}</span>
          <input
            className={`${inputCls} mt-2`}
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder="owner@email.com"
            autoComplete="off"
          />
        </label>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={deleting} className="flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 hover:bg-stone-200 disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!matches || !backupOk || deleting}
            className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-40"
          >
            {deleting ? "Deleting..." : "Delete forever"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}


function RejectOwnerModal({ owner, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;

    try {
      setSaving(true);
      await axios.patch(
        `${API}/owners/${owner._id}/approval`,
        { decision: "reject", reason: reason.trim() },
        { withCredentials: true }
      );
      toast.success("Owner reject ho gaya");
      onDone();
    } catch (error) {
      toast.error(errMsg(error, "Could not reject owner"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`Reject: ${owner.name}`} onClose={onClose} busy={saving}>
      <div className="space-y-3">
        <p className="text-sm text-stone-500">
          Reject karne par ye owner login nahi kar payega. Wajah likhoge to login par use dikhegi.
          Baad me chaho to dobara Approve kar sakte ho.
        </p>
        <input
          className={inputCls}
          placeholder="Wajah (optional)"
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700 hover:bg-stone-200 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={saving} className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">
            {saving ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}