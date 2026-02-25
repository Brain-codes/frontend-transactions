export interface SuperAdminAgent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "super_admin_agent";
  status: string;
  organization_id: null; // SAA users never own an organization
  created_at: string;
  assigned_organizations_count?: number;
  assigned_organizations?: AssignedOrganization[];
}

export interface AssignedOrganization {
  id: string;
  partner_name: string;
  branch: string | null;
  state: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  email?: string | null;
  assignment_id: string;
  assigned_at: string;
  assigned_by?: string;
}

export interface SuperAdminAgentDashboardStats {
  assignedPartnersCount: number;
  totalSales: number;
  pendingApprovals: number;
  approvedSales: number;
  salesCreatedByMe: number;
}

export interface CreateSuperAdminAgentPayload {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateSuperAdminAgentPayload {
  full_name?: string;
  phone?: string;
  status?: "active" | "disabled";
}

export interface SetAgentOrganizationsPayload {
  organization_ids: string[];
}
