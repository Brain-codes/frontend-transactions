import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from "lucide-react";
import PageHeader from "../../components/PageHeader";
import { createClientComponentClient } from "@/lib/supabaseClient";
import { supabaseFunctionsUrl } from "@/lib/supabaseConfig";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/app/contexts/useAuth";

export default function PartnerAgentsProfilesContent() {
  const supabase = createClientComponentClient();
  const { toast, toasts, removeToast } = useToast();
  const { isSuperAdmin } = useAuth();

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState({ done: 0, total: 0 });

  const loadAgents = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const params = new URLSearchParams({
        role: "partner_agent",
        page: "1",
        limit: "500",
        sortBy: "created_at",
        sortOrder: "desc",
      });

      const res = await fetch(`${supabaseFunctionsUrl}/manage-users?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load");
      setAgents(result.data || []);
    } catch (err) {
      toast({ variant: "error", title: "Failed to load partner agents", description: err.message });
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAgents(); }, []); // eslint-disable-line

  // Sort newest first so we can clearly identify keepers vs. legacy rows
  const sortedByNewest = useMemo(
    () =>
      [...agents].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      ),
    [agents]
  );
  const keepers = sortedByNewest.slice(0, 2);
  const toDelete = sortedByNewest.slice(2);

  const runCleanup = async () => {
    if (confirmText !== "DELETE") return;
    setCleaning(true);
    setCleanupProgress({ done: 0, total: toDelete.length });
    let ok = 0;
    let failed = 0;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      for (let i = 0; i < toDelete.length; i++) {
        const u = toDelete[i];
        try {
          const res = await fetch(`${supabaseFunctionsUrl}/manage-users/${u.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (!res.ok) {
            failed++;
          } else {
            ok++;
          }
        } catch {
          failed++;
        }
        setCleanupProgress({ done: i + 1, total: toDelete.length });
      }
      toast({
        variant: failed === 0 ? "success" : "warning",
        title: "Cleanup complete",
        description: `Deleted ${ok}, kept ${keepers.length}, failed ${failed}`,
      });
    } catch (err) {
      toast({ variant: "error", title: "Cleanup failed", description: err.message });
    } finally {
      setCleaning(false);
      setCleanupOpen(false);
      setConfirmText("");
      await loadAgents();
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) =>
      [a.full_name, a.phone, a.organization?.partner_name, a.organization?.state]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [agents, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + pageSize);
  const startRecord = filtered.length === 0 ? 0 : startIdx + 1;
  const endRecord = Math.min(startIdx + pageSize, filtered.length);

  const getVisiblePages = () => {
    const pages = [];
    const max = 5;
    let start = Math.max(1, currentPage - Math.floor(max / 2));
    let end = Math.min(totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const hasFilter = !!search;

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Partner Agents Profile" description="View all partner agents" />

      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-3"
        style={{ backgroundColor: "#f4f7e3" }}
      >
        <Input
          placeholder="Search by name, phone, partner or state…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-9 max-w-sm bg-white"
        />
        <Button
          onClick={() => setSearch("")}
          size="sm"
          variant="outline"
          className="h-9 bg-white shadow-none border-gray-200"
          disabled={!hasFilter}
        >
          <X className="h-4 w-4 mr-1" />
          Reset Filters
        </Button>
        {isSuperAdmin && (
          <Button
            onClick={() => { setConfirmText(""); setCleanupOpen(true); }}
            size="sm"
            className="h-9 ml-auto bg-red-600 hover:bg-red-700 text-white shadow-none"
            disabled={loading || agents.length < 3}
            title={agents.length < 3 ? "Nothing to clean" : "Keep newest 2, delete the rest"}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clean Legacy Records
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="space-y-0">
        <div className="bg-white border-x border-t border-gray-200 rounded-t-lg overflow-x-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#4a5d0f]" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: "#4a5d0f" }} className="hover:bg-transparent">
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap first:rounded-tl-lg">Agent Name</TableHead>
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap">Phone Number</TableHead>
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap">Partner Name</TableHead>
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap rounded-tr-lg">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={loading ? "opacity-40" : ""}>
              {pageRows.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-gray-500">
                    No partner agents found
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((a, idx) => (
                  <TableRow
                    key={a.id}
                    className="hover:bg-[#eef3c4] text-gray-700"
                    style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f4f7e3" }}
                  >
                    <TableCell className="text-sm font-medium text-gray-900">
                      {a.full_name || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 whitespace-nowrap">
                      {a.phone || ""}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {a.organization?.partner_name || ""}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {a.organization?.state || ""}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-b-lg px-4 py-3">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                Showing <span className="font-medium">{startRecord}</span> to{" "}
                <span className="font-medium">{endRecord}</span> of{" "}
                <span className="font-medium">{filtered.length}</span> partner agents
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Prev
                </Button>
                {getVisiblePages().map((p) => (
                  <Button
                    key={p}
                    variant={p === currentPage ? "default" : "outline"}
                    size="sm"
                    className={`h-8 w-8 p-0 ${p === currentPage ? "bg-black text-white hover:bg-black border-black" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={cleanupOpen} onOpenChange={(o) => !cleaning && setCleanupOpen(o)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Clean Legacy Partner Agent Records</DialogTitle>
            <DialogDescription>
              This will keep the 2 most recently created partner agents and permanently delete the rest (auth users + profiles). This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-gray-900 mb-1">Keep ({keepers.length})</p>
              <ul className="bg-green-50 border border-green-200 rounded p-2 space-y-1">
                {keepers.map((u) => (
                  <li key={u.id} className="text-gray-800">
                    {u.full_name || "(no name)"} — {u.email}
                    <span className="text-gray-500"> · {u.created_at?.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Delete ({toDelete.length})</p>
              <ul className="bg-red-50 border border-red-200 rounded p-2 space-y-1 max-h-60 overflow-y-auto">
                {toDelete.map((u) => (
                  <li key={u.id} className="text-gray-800">
                    {u.full_name || "(no name)"} — {u.email}
                    <span className="text-gray-500"> · {u.created_at?.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">
                Type <span className="font-mono font-semibold">DELETE</span> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={cleaning}
                className="max-w-xs"
              />
            </div>
            {cleaning && (
              <p className="text-gray-600">
                Deleting… {cleanupProgress.done} / {cleanupProgress.total}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCleanupOpen(false)} disabled={cleaning}>
              Cancel
            </Button>
            <Button
              onClick={runCleanup}
              disabled={confirmText !== "DELETE" || cleaning || toDelete.length === 0}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cleaning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete {toDelete.length} records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
