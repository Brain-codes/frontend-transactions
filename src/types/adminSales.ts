import { Address, ImageData } from "./superAdminSales";

export interface AdminSales {
  id: string;
  transaction_id: string;
  stove_serial_no: string;
  sales_date: string; // ISO date string
  contact_person: string;
  contact_phone: string;
  end_user_name: string;
  aka: string;
  state_backup: string;
  lga_backup: string;
  phone: string;
  other_phone: string;
  partner_name: string;
  amount: number;
  signature: string; // Base64 image string
  created_by: string;
  organization_id: string;
  address_id: string;
  stove_image_id: ImageData;
  agreement_image_id: ImageData;
  created_at: string; // ISO timestamp
  status: string; // could be "completed" | "pending" | ...
  address: Address;
};
