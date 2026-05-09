"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormGrid, FormFieldWrapper } from "@/components/ui/form-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  UserPlus,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Search,
  Building2,
} from "lucide-react";
import superAdminAgentService from "../services/superAdminAgentService";
import organizationsService from "../services/organizationsService";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AcslAgent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
  assigned_organizations_count: number;
  assigned_states_count: number;
}

interface Org {
  id: string;
  partner_name: string;
  branch?: string | null;
  state?: string | null;
}

interface AgentFormModalProps {
  mode: "create" | "edit";
  agent?: AcslAgent;
  onClose: () => void;
  onSuccess: (agent: AcslAgent) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgentFormModal({ mode, agent, onClose, onSuccess }: AgentFormModalProps) {
  // ── Core form state ──────────────────────────────────────────────────────
  const [role, setRole] = useState(mode === "edit" ? (agent?.role ?? "acsl_agent") : "acsl_agent");
  const [fullName, setFullName] = useState(mode === "edit" ? (agent?.full_name ?? "") : "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(mode === "edit" ? (agent?.phone ?? "") : "");
  const [status, setStatus] = useState<"active" | "disabled">(
    mode === "edit" ? ((agent?.status as "active" | "disabled") ?? "active") : "active"
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  // ── Submission ────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // ── Partner assignment ────────────────────────────────────────────────────
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [originalOrgIds, setOriginalOrgIds] = useState<Set<string>>(new Set());
  const [orgSearch, setOrgSearch] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  const isAcslRole = role === "acsl_agent";

  // Load org list when role is acsl_agent
  useEffect(() => {
    if (!isAcslRole) return;
    setOrgsLoading(true);
    organizationsService.getAllOrganizations()
      .then((result: any) => setOrgs(result.data || []))
      .finally(() => setOrgsLoading(false));
  }, [isAcslRole]);

  // In edit mode, load current direct assignments once
  useEffect(() => {
    if (mode !== "edit" || !agent?.id || !isAcslRole) return;
    setAssignmentLoading(true);
    superAdminAgentService.getAgentOrganizations(agent.id)
      .then((result: any) => {
        const directIds = new Set<string>(
          (result.data || [])
            .filter((o: any) => !o.source || o.source === "direct")
            .map((o: any) => o.id as string)
        );
        setSelectedOrgIds(new Set(directIds));
        setOriginalOrgIds(new Set(directIds));
      })
      .catch(() => {})
      .finally(() => setAssignmentLoading(false));
  }, [mode, agent?.id, isAcslRole]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    pwd += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    pwd += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    pwd += "0123456789"[Math.floor(Math.random() * 10)];
    pwd += "!@#$%^&*"[Math.floor(Math.random() * 8)];
    for (let i = 4; i < 12; i++) pwd += charset[Math.floor(Math.random() * charset.length)];
    pwd = pwd.split("").sort(() => Math.random() - 0.5).join("");
    setPassword(pwd);
    setConfirmPassword(pwd);
    copyToClipboard(pwd);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Copied to clipboard!");
    } catch {
      setCopyMessage("Failed to copy");
    }
    setTimeout(() => setCopyMessage(""), 3000);
  };

  const toggleOrg = (orgId: string) => {
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId);
      else next.add(orgId);
      return next;
    });
  };

  // Business rule: in edit mode, agent must keep at least one assignment (org or state)
  const wouldHaveNoAssignment =
    mode === "edit" &&
    isAcslRole &&
    selectedOrgIds.size === 0 &&
    originalOrgIds.size > 0 &&
    (agent?.assigned_states_count ?? 0) === 0;

  const filteredOrgs = orgs.filter(
    (o) =>
      !orgSearch ||
      o.partner_name.toLowerCase().includes(orgSearch.toLowerCase()) ||
      (o.state ?? "").toLowerCase().includes(orgSearch.toLowerCase()) ||
      (o.branch ?? "").toLowerCase().includes(orgSearch.toLowerCase())
  );

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): string[] => {
    const errs: string[] = [];
    if (!fullName.trim()) errs.push("Full name is required");
    if (mode === "create") {
      if (!email.trim()) errs.push("Email is required");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push("Invalid email address");
      if (!password) errs.push("Password is required");
      else if (password.length < 8) errs.push("Password must be at least 8 characters");
      if (!confirmPassword) errs.push("Please confirm the password");
      else if (password !== confirmPassword) errs.push("Passwords do not match");
    }
    return errs;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setErrors([]);
    try {
      if (mode === "create") {
        const result = await superAdminAgentService.createSuperAdminAgent({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          role,
        });
        const newAgent: AcslAgent = result.data;
        if (isAcslRole && selectedOrgIds.size > 0) {
          await superAdminAgentService.setAgentOrganizations(newAgent.id, [...selectedOrgIds]);
        }
        onSuccess({ ...newAgent, assigned_organizations_count: selectedOrgIds.size, assigned_states_count: 0 });
      } else {
        // Build update payload — only changed fields
        const updates: Record<string, string> = {};
        if (fullName.trim() !== agent!.full_name) updates.full_name = fullName.trim();
        if ((phone.trim() || null) !== agent!.phone) updates.phone = phone.trim();
        if (status !== agent!.status) updates.status = status;

        let updatedAgent = { ...agent! };
        if (Object.keys(updates).length > 0) {
          const result = await superAdminAgentService.updateSuperAdminAgent(agent!.id, updates);
          updatedAgent = { ...updatedAgent, ...result.data };
        }

        // Apply org assignment changes (full replace with desired set)
        if (isAcslRole) {
          const hasOrgChanges =
            [...selectedOrgIds].some((id) => !originalOrgIds.has(id)) ||
            [...originalOrgIds].some((id) => !selectedOrgIds.has(id));
          if (hasOrgChanges) {
            await superAdminAgentService.setAgentOrganizations(agent!.id, [...selectedOrgIds]);
          }
        }

        onSuccess({
          ...updatedAgent,
          assigned_organizations_count: isAcslRole ? selectedOrgIds.size : agent!.assigned_organizations_count,
          assigned_states_count: agent!.assigned_states_count,
        });
      }
    } catch (err: any) {
      setErrors([err.message || `Failed to ${mode === "create" ? "create" : "update"} agent`]);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived labels ────────────────────────────────────────────────────────
  const title =
    mode === "create"
      ? role === "super_admin" ? "Add Super Admin" : "Create Agent"
      : "Edit Agent";
  const description =
    mode === "create"
      ? "Fill in the details below to create a new agent account."
      : `Update ${agent?.full_name ?? "agent"}'s profile and partner assignments.`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent size="5xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error list */}
          {errors.length > 0 && (
            <div className="space-y-1.5">
              {errors.map((err, i) => (
                <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Create fields ── */}
          {mode === "create" && (
            <FormGrid>
              <FormFieldWrapper fullWidth>
                <Label>Role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acsl_agent">ACSL Agent</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
                {role === "super_admin" && (
                  <p className="text-xs text-orange-600 mt-1">
                    Super Admin users have full system access. Use with caution.
                  </p>
                )}
              </FormFieldWrapper>

              <FormFieldWrapper fullWidth>
                <Label htmlFor="af-name">Full Name *</Label>
                <Input
                  id="af-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                />
              </FormFieldWrapper>

              <FormFieldWrapper>
                <Label htmlFor="af-email">Email Address *</Label>
                <Input
                  id="af-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </FormFieldWrapper>

              <FormFieldWrapper>
                <Label htmlFor="af-phone">Phone Number</Label>
                <Input
                  id="af-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                />
              </FormFieldWrapper>

              <FormFieldWrapper>
                <div className="flex justify-between items-center">
                  <Label htmlFor="af-password">Password *</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={generatePassword}
                    disabled={submitting}
                    className="text-blue-600 hover:text-blue-800 p-0 h-auto text-sm"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />Auto Generate
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="af-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pr-20"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    {password && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(password)}
                        disabled={submitting}
                        className="h-8 w-8 p-0 mr-1"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={submitting}
                      className="h-8 w-8 p-0 mr-1"
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </FormFieldWrapper>

              <FormFieldWrapper>
                <Label htmlFor="af-confirm">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="af-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={submitting}
                    className="absolute inset-y-0 right-0 h-8 w-8 p-0 mr-1"
                  >
                    {showConfirmPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </FormFieldWrapper>
            </FormGrid>
          )}

          {/* ── Edit fields ── */}
          {mode === "edit" && (
            <FormGrid>
              <FormFieldWrapper>
                <Label htmlFor="af-edit-name">Full Name *</Label>
                <Input
                  id="af-edit-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                />
              </FormFieldWrapper>

              <FormFieldWrapper>
                <Label htmlFor="af-edit-phone">Phone Number</Label>
                <Input
                  id="af-edit-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                />
              </FormFieldWrapper>

              <FormFieldWrapper fullWidth>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "active" | "disabled")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </FormFieldWrapper>
            </FormGrid>
          )}

          {/* Copy confirmation */}
          {copyMessage && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              {copyMessage}
            </div>
          )}

          {/* ── Partner Assignment Section (ACSL role only) ── */}
          {isAcslRole && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">Partner Assignment</span>
                  {selectedOrgIds.size > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#07376a] text-white font-medium">
                      {selectedOrgIds.size} selected
                    </span>
                  )}
                </div>
                <span className="text-xs text-blue-500">
                  {mode === "create" ? "Optional" : "Manage assignments"}
                </span>
              </div>

              <div className="p-3 space-y-2">
                {wouldHaveNoAssignment && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-700 text-xs">
                      An agent must belong to at least one partner or state. Deselecting all will block saving.
                    </p>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Search partners by name, state, or branch..."
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white"
                  />
                </div>

                {(orgsLoading || assignmentLoading) ? (
                  <div className="flex items-center justify-center py-6 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-xs text-gray-500">
                      {assignmentLoading ? "Loading current assignments..." : "Loading partners..."}
                    </span>
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                    {filteredOrgs.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-5">
                        {orgSearch ? "No partners match your search." : "No partners found."}
                      </p>
                    ) : (
                      filteredOrgs.map((org) => {
                        const isSelected = selectedOrgIds.has(org.id);
                        return (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => toggleOrg(org.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                              isSelected
                                ? "border-[#07376a] bg-[#07376a]/5"
                                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <div
                              className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center ${
                                isSelected ? "bg-[#07376a] border-[#07376a]" : "border-gray-300 bg-white"
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="h-2.5 w-2.5 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{org.partner_name}</p>
                              {(org.branch || org.state) && (
                                <p className="text-[10px] text-gray-400 truncate">
                                  {[org.branch, org.state].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || wouldHaveNoAssignment}
              className="bg-brand hover:bg-brand-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === "create" ? "Creating..." : "Saving..."}
                </>
              ) : mode === "create" ? (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Agent
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
