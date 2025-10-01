export interface Organization {
  id: string;
  organization_name: string;
  partner_name: string;
  partner_email: string;
  branch: string; // Required - was branch_name in separate table
  contact_phone: string; // Required - was optional in separate table
  state: string; // Required - was optional in separate table
  contact_person?: string; // Optional
  alternative_phone?: string; // Optional
  email?: string; // Optional
  address?: string; // Optional
  city?: string;
  country?: string;
  description?: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface OrganizationFilters {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
}

export interface OrganizationStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  recentlyCreated: number;
}

export interface CreateOrganizationData {
  organization_name: string;
  partner_name: string;
  partner_email: string;
  branch: string; // Required
  contact_phone: string; // Required
  state: string; // Required
  contact_person?: string; // Optional
  alternative_phone?: string; // Optional
  email?: string; // Optional
  address?: string; // Optional
  city?: string;
  country?: string;
  description?: string;
  status?: "active" | "inactive" | "suspended";
}

export interface UpdateOrganizationData {
  organization_name?: string;
  partner_name?: string;
  partner_email?: string;
  branch?: string;
  contact_phone?: string;
  state?: string;
  contact_person?: string;
  alternative_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  description?: string;
  status?: "active" | "inactive" | "suspended";
}
