"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Users,
  X,
  AlertCircle,
  Info,
  XCircle,
} from "lucide-react";
import syncLogsService from "../../services/syncLogsService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    success: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2, label: "Success" },
    partial: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertTriangle, label: "Partial" },
    failed:  { color: "bg-red-100 text-red-800 border-red-200",         icon: XCircle,      label: "Failed"  },
  };
  const cfg = map[status] || map.failed;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }) {
  const isCSV = source === "external-csv-sync";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
      isCSV ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-blue-100 text-blue-800 border-blue-200"
    }`}>
      {isCSV ? "CSV Sync" : "API Sync"}
    </span>
  );
}

// ─── Log entry level icon ─────────────────────────────────────────────────────

function EntryIcon({ level }) {
  const map = {
    info:    { icon: Info,         color: "text-blue-500"  },
    warn:    { icon: AlertTriangle, color: "text-yellow-500" },
    error:   { icon: XCircle,      color: "text-red-500"   },
    success: { icon: CheckCircle2, color: "text-green-500" },
  };
  const cfg = map[level] || map.info;
  const Icon = cfg.icon;
  return <Icon size={14} className={`flex-shrink-0 mt-0.5 ${cfg.color}`} />;
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function LogDetailPanel({ log, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    syncLogsService.getLogDetail(log.id)
      .then(setDetail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [log.id]);

  const toggleStep = (idx) => setExpandedSteps((p) => ({ ...p, [idx]: !p[idx] }));

  // Group entries by step for cleaner display
  const groupedEntries = detail?.entries
    ? detail.entries.reduce((acc, entry, idx) => {
        acc.push({ ...entry, idx });
        return acc;
      }, [])
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-semibold text-gray-900 text-base">Sync Log Detail</h2>
            <p className="text-xs text-gray-500 mt-0.5">{formatDate(log.started_at)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-3 mb-3">
            <SourceBadge source={log.source} />
            <StatusBadge status={log.status} />
            {log.application_name && (
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full border border-gray-300">
                {log.application_name}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{log.total_partners}</div>
              <div className="text-xs text-gray-500 mt-0.5">Partners</div>
            </div>
            <div className="bg-white rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{log.partners_created}</div>
              <div className="text-xs text-gray-500 mt-0.5">Created</div>
            </div>
            <div className="bg-white rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{log.partners_updated}</div>
              <div className="text-xs text-gray-500 mt-0.5">Updated</div>
            </div>
          </div>
          {log.total_stove_ids > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="bg-white rounded-lg border p-3 text-center">
                <div className="text-lg font-bold text-gray-900">{log.total_stove_ids}</div>
                <div className="text-xs text-gray-500 mt-0.5">Stove IDs</div>
              </div>
              <div className="bg-white rounded-lg border p-3 text-center">
                <div className="text-lg font-bold text-green-700">{log.stove_ids_created}</div>
                <div className="text-xs text-gray-500 mt-0.5">New IDs</div>
              </div>
              <div className="bg-white rounded-lg border p-3 text-center">
                <div className="text-lg font-bold text-gray-500">{log.stove_ids_skipped}</div>
                <div className="text-xs text-gray-500 mt-0.5">Already Existed</div>
              </div>
            </div>
          )}
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span>Duration: <strong>{formatDuration(log.duration_ms)}</strong></span>
            <span>Completed: <strong>{formatDate(log.completed_at)}</strong></span>
          </div>
          {log.error_message && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              <strong>Error:</strong> {log.error_message}
            </div>
          )}
        </div>

        {/* Log entries */}
        <div className="px-6 py-4 flex-1">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Step-by-step log</h3>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-1">
              {groupedEntries.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No detailed log entries available.</p>
              )}
              {groupedEntries.map((entry) => (
                <div
                  key={entry.idx}
                  className={`rounded-lg border text-sm ${
                    entry.level === "error"   ? "bg-red-50 border-red-200"    :
                    entry.level === "warn"    ? "bg-yellow-50 border-yellow-200" :
                    entry.level === "success" ? "bg-green-50 border-green-200" :
                    "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div
                    className="flex items-start gap-2 px-3 py-2 cursor-pointer"
                    onClick={() => entry.detail && toggleStep(entry.idx)}
                  >
                    <EntryIcon level={entry.level} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-gray-400 bg-white/70 px-1 rounded border">{entry.step}</span>
                        <span className={`flex-1 ${entry.level === "error" ? "text-red-800 font-medium" : "text-gray-700"}`}>
                          {entry.message}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{formatDate(entry.ts)}</div>
                    </div>
                    {entry.detail && (
                      <span className="text-gray-400 flex-shrink-0">
                        {expandedSteps[entry.idx] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    )}
                  </div>
                  {entry.detail && expandedSteps[entry.idx] && (
                    <div className="px-3 pb-3">
                      <pre className="text-xs bg-white/80 border rounded p-2 overflow-x-auto text-gray-700 whitespace-pre-wrap break-all">
                        {JSON.stringify(entry.detail, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Log row ──────────────────────────────────────────────────────────────────

function LogRow({ log, onClick }) {
  return (
    <tr
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => onClick(log)}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={log.status} />
        </div>
      </td>
      <td className="py-3 px-4">
        <SourceBadge source={log.source} />
      </td>
      <td className="py-3 px-4">
        <div className="text-sm text-gray-900">{log.application_name || <span className="text-gray-400">—</span>}</div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-700 font-medium">{log.partners_created} new</span>
          <span className="text-blue-700">{log.partners_updated} updated</span>
          {log.partners_failed > 0 && <span className="text-red-600">{log.partners_failed} failed</span>}
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">
        {log.total_stove_ids > 0 ? (
          <span>{log.stove_ids_created} new / {log.stove_ids_skipped} existed</span>
        ) : (
          <span className="text-gray-400">None</span>
        )}
      </td>
      <td className="py-3 px-4 text-xs text-gray-500">
        <div title={formatDate(log.started_at)}>{timeAgo(log.started_at)}</div>
        <div className="text-gray-400">{formatDuration(log.duration_ms)}</div>
      </td>
      <td className="py-3 px-4">
        <ChevronRight size={16} className="text-gray-400" />
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const SyncLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0, has_more: false });

  const [filters, setFilters] = useState({
    source: "",
    status: "",
    application_name: "",
    date_from: "",
    date_to: "",
  });
  const [searchInput, setSearchInput] = useState("");

  const fetchLogs = useCallback(async (overrideFilters, offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const active = overrideFilters ?? filters;
      const result = await syncLogsService.getLogs({ ...active, offset, limit: 50 });
      setLogs(result.data);
      setPagination(result.pagination);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const applyFilters = () => fetchLogs(filters, 0);
  const clearFilters = () => {
    const cleared = { source: "", status: "", application_name: "", date_from: "", date_to: "" };
    setFilters(cleared);
    setSearchInput("");
    fetchLogs(cleared, 0);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Stats summary
  const successCount = logs.filter((l) => l.status === "success").length;
  const partialCount = logs.filter((l) => l.status === "partial").length;
  const failedCount  = logs.filter((l) => l.status === "failed").length;

  return (
    <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
      <DashboardLayout currentRoute="admin-logs">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sync Logs</h1>
              <p className="text-sm text-gray-500 mt-1">
                Activity log for external API sync and CSV sync operations
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs()}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>

          {/* Quick stats */}
          {!loading && logs.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white border rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Activity size={18} className="text-gray-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{pagination.total}</div>
                  <div className="text-xs text-gray-500">Total calls</div>
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-green-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-green-700">{successCount}</div>
                  <div className="text-xs text-gray-500">Successful</div>
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={18} className="text-yellow-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-yellow-700">{partialCount}</div>
                  <div className="text-xs text-gray-500">Partial</div>
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle size={18} className="text-red-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-red-700">{failedCount}</div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white border rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={15} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter logs</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
                >
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Source filter */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.source}
                  onChange={(e) => setFilters((p) => ({ ...p, source: e.target.value }))}
                >
                  <option value="">All types</option>
                  <option value="external-sync">API Sync</option>
                  <option value="external-csv-sync">CSV Sync</option>
                </select>
              </div>

              {/* Status filter */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.status}
                  onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="">All statuses</option>
                  <option value="success">Success</option>
                  <option value="partial">Partial</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Date from */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From date</label>
                <Input
                  type="date"
                  className="text-sm"
                  value={filters.date_from}
                  onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
                />
              </div>

              {/* Date to */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To date</label>
                <Input
                  type="date"
                  className="text-sm"
                  value={filters.date_to}
                  onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={applyFilters} disabled={loading}>
                {loading ? <Loader2 size={13} className="animate-spin mr-1" /> : <Search size={13} className="mr-1" />}
                Search
              </Button>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Failed to load logs</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="bg-white border rounded-xl p-12 flex flex-col items-center justify-center">
              <Loader2 size={32} className="animate-spin text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Loading sync logs...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && logs.length === 0 && (
            <div className="bg-white border rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <FileText size={40} className="text-gray-200 mb-3" />
              <p className="text-base font-medium text-gray-500">No sync logs yet</p>
              <p className="text-sm text-gray-400 mt-1 max-w-sm">
                Logs will appear here when external-sync or CSV-sync calls are made.
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && logs.length > 0 && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Application</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Partners</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stove IDs</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">When</th>
                    <th className="py-3 px-4 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} onClick={setSelectedLog} />
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {(pagination.offset > 0 || pagination.has_more) && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchLogs(filters, pagination.offset - pagination.limit)}
                      disabled={pagination.offset === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchLogs(filters, pagination.offset + pagination.limit)}
                      disabled={!pagination.has_more}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedLog && (
          <LogDetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SyncLogsPage;
