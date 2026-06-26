
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Save } from "lucide-react";
import { useAuth } from "../../contexts/useAuth";
import { useToast } from "@/components/ui/toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const clean = (v: string | undefined | null) => {
  const s = (v ?? "").trim();
  return ["n/a", "na", "null", "undefined", "none", "-"].includes(s.toLowerCase()) ? "" : s;
};

interface Organization {
  id: string;
  partner_id: string;
  partner_name: string;
  branch?: string;
  state?: string;
  email?: string;
  contact_phone?: string;
  alternative_phone?: string;
  manually_edited?: boolean;
}

interface Credential {
  username?: string;
  email?: string;
  is_dummy_email?: boolean;
}

interface Props {
  organization: Organization | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrg: Organization) => void;
}

const FormField = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <Label>{label}</Label>
    {children}
    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
  </div>
);

export default function EditPartnerModal({ organization, isOpen, onClose, onSuccess }: Props) {
  const { supabase } = useAuth();
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [loadingCred, setLoadingCred] = useState(false);
  const [credential, setCredential] = useState<Credential | null>(null);

  const [form, setForm] = useState({
    contact_phone: "",
    alternative_phone: "",
    email: "",
    username: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !organization) return;
    setForm({
      contact_phone: clean(organization.contact_phone),
      alternative_phone: clean(organization.alternative_phone),
      email: clean(organization.email),
      username: "",
    });
    setErrors({});
    setCredential(null);
    loadCredential();
  }, [isOpen, organization?.id]);

  const loadCredential = async () => {
    if (!organization) return;
    setLoadingCred(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/manage-credentials?partner_id=${encodeURIComponent(organization.partner_id)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (res.ok) {
        const result = await res.json();
        const cred: Credential = result.data ?? null;
        setCredential(cred);
        if (cred?.username) {
          setForm((prev) => ({ ...prev, username: clean(cred.username) }));
        }
        if (cred?.email && !cred.is_dummy_email) {
          setForm((prev) => ({ ...prev, email: clean(cred.email) }));
        }
      }
    } catch {
      // non-critical
    } finally {
      setLoadingCred(false);
    }
  };

  const setField = (k: string, v: string) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: "" }));
  };

  const isDummyEmail = credential?.is_dummy_email ?? !organization?.email;
  const canEditEmail = isDummyEmail || !credential?.email;

  const handleSubmit = async () => {
    if (!organization) return;

    const payload: Record<string, string> = {};
    const newErrors: Record<string, string> = {};

    const trimPhone = form.contact_phone.trim();
    const trimAltPhone = form.alternative_phone.trim();
    const trimEmail = form.email.trim();
    const trimUsername = form.username.trim();

    if (trimPhone !== (organization.contact_phone ?? "")) payload.contact_phone = trimPhone;
    if (trimAltPhone !== (organization.alternative_phone ?? "")) payload.alternative_phone = trimAltPhone;

    if (canEditEmail && trimEmail && trimEmail !== (credential?.email ?? organization.email ?? "")) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
        newErrors.email = "Enter a valid email address";
      } else {
        payload.email = trimEmail;
      }
    }

    if (trimUsername && trimUsername !== (credential?.username ?? "")) {
      payload.username = trimUsername;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (Object.keys(payload).length === 0) {
      toast({ variant: "error", title: "No changes to save" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/manage-organizations/${organization.id}?action=update-details`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        if (result.error?.includes("already taken")) {
          setErrors({ username: result.error });
          return;
        }
        throw new Error(result.error || result.message || "Update failed");
      }
      toast({ variant: "success", title: "Partner details updated" });
      onSuccess(result.data?.organization ?? { ...organization, ...payload });
      onClose();
    } catch (err: any) {
      toast({ variant: "error", title: "Error", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!organization) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-base font-semibold">Edit Partner Details</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {organization.partner_name}
            <span className="ml-2 font-mono text-xs">{organization.partner_id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">

            {/* Contact */}
            <div>
              <Label className="text-base font-semibold">Contact Details</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField label="Phone Number">
                  <Input
                    value={form.contact_phone}
                    onChange={(e) => setField("contact_phone", e.target.value)}
                    placeholder="e.g. 08012345678"
                  />
                </FormField>
                <FormField label="Alternative Phone">
                  <Input
                    value={form.alternative_phone}
                    onChange={(e) => setField("alternative_phone", e.target.value)}
                    placeholder="e.g. 08098765432"
                  />
                </FormField>
              </div>
            </div>

            {/* Email */}
            <div>
              <Label className="text-base font-semibold">Email</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {canEditEmail ? (
                  <FormField label="Email Address (optional)" error={errors.email}>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="partner@example.com"
                      className={errors.email ? "border-red-500" : ""}
                    />
                  </FormField>
                ) : (
                  <FormField label="Email Address">
                    <Input value={credential?.email ?? organization.email ?? ""} readOnly className="bg-gray-100" />
                  </FormField>
                )}
              </div>
            </div>

            {/* Login */}
            <div>
              {/* <Label className="text-base font-semibold">Login</Label> */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {loadingCred ? (
                  <div className="flex items-center gap-2 h-9">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Loading…</span>
                  </div>
                ) : (
                  <FormField label="Username" error={errors.username}>
                    <Input
                      value={form.username}
                      onChange={(e) => setField("username", e.target.value)}
                      placeholder="e.g. acsl001_partner"
                      className={errors.username ? "border-red-500" : ""}
                    />
                  </FormField>
                )}
              </div>
            </div>

          </div>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loadingCred}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
