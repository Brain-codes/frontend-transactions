
import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Smartphone,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import Link from "@/compat/Link";

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + "/functions/v1";

const DEFAULT_FEATURE = { title: "", description: "" };

export default function AppConfigPage() {
  return (
    <ProtectedRoute requireSuperAdmin>
      <DashboardLayout currentRoute="admin-app-config">
        <AppConfigContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AppConfigContent() {
  const { supabase } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    version: "",
    release_notes: "",
    base_url: "",
    apk_path: "/downloads/sales-monitoring-app.apk",
    is_force_update: false,
    size: "~45 MB",
    requires: "Android 8.0+",
    features: [{ title: "", description: "" }],
    requirements: [""],
  });

  // ── Fetch current config ──
  useEffect(() => {
    fetch(`${FUNCTIONS_URL}/manage-app-release`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          version: data.version ?? "1.0.0",
          release_notes: data.release_notes ?? "",
          base_url: data.base_url ?? "",
          apk_path: data.apk_path ?? "/downloads/sales-monitoring-app.apk",
          is_force_update: data.is_force_update ?? false,
          size: data.size ?? "~45 MB",
          requires: data.requires ?? "Android 8.0+",
          features: Array.isArray(data.features) && data.features.length > 0
            ? data.features
            : [{ title: "", description: "" }],
          requirements: Array.isArray(data.requirements) && data.requirements.length > 0
            ? data.requirements
            : [""],
        });
      })
      .catch(() => setError("Failed to load current config. You can still save new values."))
      .finally(() => setLoading(false));
  }, []);

  const field = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  // Features helpers
  const updateFeature = (i, key, val) =>
    setForm((p) => {
      const features = [...p.features];
      features[i] = { ...features[i], [key]: val };
      return { ...p, features };
    });
  const addFeature = () => setForm((p) => ({ ...p, features: [...p.features, { ...DEFAULT_FEATURE }] }));
  const removeFeature = (i) =>
    setForm((p) => ({ ...p, features: p.features.filter((_, idx) => idx !== i) }));

  // Requirements helpers
  const updateReq = (i, val) =>
    setForm((p) => {
      const requirements = [...p.requirements];
      requirements[i] = val;
      return { ...p, requirements };
    });
  const addReq = () => setForm((p) => ({ ...p, requirements: [...p.requirements, ""] }));
  const removeReq = (i) =>
    setForm((p) => ({ ...p, requirements: p.requirements.filter((_, idx) => idx !== i) }));

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const payload = {
        ...form,
        features: form.features.filter((f) => f.title.trim()),
        requirements: form.requirements.filter((r) => r.trim()),
      };

      const res = await fetch(`${FUNCTIONS_URL}/manage-app-release`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setSuccess("App release updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-lg p-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">App Release Config</h1>
            <p className="text-sm text-gray-500">Controls what users see on the Sales Monitoring App page</p>
          </div>
        </div>
        <Link
          href="/sales-monitoring-app"
          target="_blank"
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
        >
          Preview page <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex gap-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {success}
        </div>
      )}

      {/* Version & meta */}
      <Card>
        <CardHeader><CardTitle className="text-base">Version & Metadata</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Version number *</Label>
              <Input
                placeholder="e.g. 1.2.0"
                value={form.version}
                onChange={(e) => field("version", e.target.value)}
              />
              <p className="text-xs text-gray-400">Used by the mobile app to detect if an update is available</p>
            </div>
            <div className="space-y-1.5">
              <Label>Download size</Label>
              <Input
                placeholder="e.g. ~45 MB"
                value={form.size}
                onChange={(e) => field("size", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Minimum Android version</Label>
            <Input
              placeholder="e.g. Android 8.0+"
              value={form.requires}
              onChange={(e) => field("requires", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="force_update"
              checked={form.is_force_update}
              onChange={(e) => field("is_force_update", e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            <Label htmlFor="force_update" className="cursor-pointer">
              Force update (mobile app will block usage until updated)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* URLs */}
      <Card>
        <CardHeader><CardTitle className="text-base">Download URLs</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Base URL</Label>
            <Input
              placeholder="e.g. https://atmosfair.com"
              value={form.base_url}
              onChange={(e) => field("base_url", e.target.value)}
            />
            <p className="text-xs text-gray-400">
              The domain your app is deployed on. The mobile app uses this to build the update page link.
              Update this whenever the deployment domain changes.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>APK path</Label>
            <Input
              placeholder="/downloads/sales-monitoring-app.apk"
              value={form.apk_path}
              onChange={(e) => field("apk_path", e.target.value)}
            />
            <p className="text-xs text-gray-400">
              Relative path to the APK inside the public folder. Full URL = Base URL + APK path.
            </p>
          </div>
          {form.base_url && form.apk_path && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded px-3 py-2">
              Full download URL: <strong>{form.base_url}{form.apk_path}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Release notes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Release Notes</CardTitle></CardHeader>
        <CardContent>
          <textarea
            rows={5}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Describe what's new in this version…"
            value={form.release_notes}
            onChange={(e) => field("release_notes", e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Shown in the "About this app" section on the download page</p>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Key Features</CardTitle>
            <Button variant="outline" size="sm" onClick={addFeature}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.features.map((f, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
                <Input
                  placeholder="Feature title"
                  value={f.title}
                  onChange={(e) => updateFeature(i, "title", e.target.value)}
                />
                <Input
                  placeholder="Feature description"
                  value={f.description}
                  onChange={(e) => updateFeature(i, "description", e.target.value)}
                />
              </div>
              <button
                onClick={() => removeFeature(i)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors mt-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">System Requirements</CardTitle>
            <Button variant="outline" size="sm" onClick={addReq}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {form.requirements.map((req, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="e.g. Android 8.0 or higher"
                value={req}
                onChange={(e) => updateReq(i, e.target.value)}
              />
              <button
                onClick={() => removeReq(i)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} className="px-8">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
