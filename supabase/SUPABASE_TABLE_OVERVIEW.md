Last Updated: Now

[
  {
    "Table Name": "acsl_agent_organizations",
    "Columns": "id (uuid), agent_id (uuid), organization_id (uuid), assigned_by (uuid), assigned_at (timestamp with time zone)",
    "Constraints": "2200_286951_5_not_null (CHECK), 2200_286951_4_not_null (CHECK), super_admin_agent_organizations_pkey (PRIMARY KEY), super_admin_agent_organizations_organization_id_fkey (FOREIGN KEY), super_admin_agent_organizations_assigned_by_fkey (FOREIGN KEY), super_admin_agent_organizations_agent_id_organization_id_key (UNIQUE), super_admin_agent_organizations_agent_id_fkey (FOREIGN KEY), 2200_286951_1_not_null (CHECK), 2200_286951_2_not_null (CHECK), 2200_286951_3_not_null (CHECK)",
    "Policies": "agent_read_own [PERMISSIVE] (SELECT), super_admin_full_access [PERMISSIVE] (ALL)"
  },
  {
    "Table Name": "acsl_agent_states",
    "Columns": "id (uuid), agent_id (uuid), state (text), assigned_by (uuid), assigned_at (timestamp with time zone)",
    "Constraints": "super_admin_agent_states_agent_id_fkey (FOREIGN KEY), 2200_299988_2_not_null (CHECK), 2200_299988_3_not_null (CHECK), 2200_299988_4_not_null (CHECK), 2200_299988_5_not_null (CHECK), super_admin_agent_states_agent_id_state_key (UNIQUE), super_admin_agent_states_pkey (PRIMARY KEY), super_admin_agent_states_assigned_by_fkey (FOREIGN KEY), 2200_299988_1_not_null (CHECK)",
    "Policies": "agent_read_own [PERMISSIVE] (SELECT), super_admin_full_access [PERMISSIVE] (ALL)"
  },
  {
    "Table Name": "addresses",
    "Columns": "id (uuid), full_address (text), street (text), city (text), state (text), country (text), latitude (double precision), longitude (double precision), created_at (timestamp without time zone)",
    "Constraints": "addresses_pkey (PRIMARY KEY), 2200_22608_1_not_null (CHECK)",
    "Policies": "service_role_access [PERMISSIVE] (ALL), super_admin_addresses_access [PERMISSIVE] (ALL), authenticated_users_insert_addresses [PERMISSIVE] (INSERT), authenticated_users_read_addresses [PERMISSIVE] (SELECT)"
  },
  {
    "Table Name": "app_settings",
    "Columns": "id (uuid), google_places_api_key (text), brevo_api_key (text), updated_at (timestamp with time zone), updated_by (uuid)",
    "Constraints": "app_settings_updated_by_fkey (FOREIGN KEY), app_settings_pkey (PRIMARY KEY), 2200_328943_1_not_null (CHECK)",
    "Policies": "super_admin_full_access [PERMISSIVE] (ALL), service_role_read [PERMISSIVE] (SELECT)"
  },
  {
    "Table Name": "credentials",
    "Columns": "id (uuid), partner_id (character varying), partner_name (character varying), email (character varying), password (text), organization_id (uuid), user_id (uuid), is_dummy_email (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone), username (text), role (text), profile_id (uuid)",
    "Constraints": "credentials_pkey (PRIMARY KEY), fk_credentials_profile (FOREIGN KEY), credentials_email_key (UNIQUE), credentials_organization_id_fkey (FOREIGN KEY), credentials_partner_id_key (UNIQUE), 2200_174780_1_not_null (CHECK), 2200_174780_3_not_null (CHECK), 2200_174780_4_not_null (CHECK), 2200_174780_5_not_null (CHECK), credentials_user_id_fkey (FOREIGN KEY)",
    "Policies": "Service role can update credentials [PERMISSIVE] (UPDATE), Service role can insert credentials [PERMISSIVE] (INSERT), Admins can view all credentials [PERMISSIVE] (SELECT), Super admins can delete credentials [PERMISSIVE] (DELETE)"
  },
  {
    "Table Name": "external_app_tokens",
    "Columns": "id (uuid), token (character varying), secret_key (character varying), application_name (character varying), application_description (text), allowed_urls (ARRAY), is_active (boolean), created_at (timestamp with time zone), last_used_at (timestamp with time zone), usage_count (integer)",
    "Constraints": "2200_157828_2_not_null (CHECK), external_app_tokens_pkey (PRIMARY KEY), external_app_tokens_token_key (UNIQUE), 2200_157828_4_not_null (CHECK), 2200_157828_3_not_null (CHECK), 2200_157828_1_not_null (CHECK)",
    "Policies": "-"
  },
  {
    "Table Name": "installment_payments",
    "Columns": "id (uuid), sale_id (uuid), amount (numeric), payment_method (text), proof_image_url (text), proof_image_id (uuid), notes (text), recorded_by (uuid), payment_date (date), created_at (timestamp with time zone)",
    "Constraints": "installment_payments_recorded_by_fkey (FOREIGN KEY), installment_payments_sale_id_fkey (FOREIGN KEY), 2200_301166_1_not_null (CHECK), 2200_301166_2_not_null (CHECK), installment_payments_payment_method_check (CHECK), installment_payments_pkey (PRIMARY KEY), installment_payments_proof_image_id_fkey (FOREIGN KEY), 2200_301166_3_not_null (CHECK), 2200_301166_4_not_null (CHECK), 2200_301166_8_not_null (CHECK), 2200_301166_9_not_null (CHECK), 2200_301166_10_not_null (CHECK)",
    "Policies": "service_role_access [PERMISSIVE] (ALL), org_members_insert_own_sales [PERMISSIVE] (INSERT), org_members_read_own_sales [PERMISSIVE] (SELECT), super_admin_full_access [PERMISSIVE] (ALL)"
  },
  {
    "Table Name": "organization_payment_models",
    "Columns": "id (uuid), organization_id (uuid), payment_model_id (uuid), assigned_by (uuid), assigned_at (timestamp with time zone)",
    "Constraints": "2200_301138_4_not_null (CHECK), organization_payment_models_assigned_by_fkey (FOREIGN KEY), organization_payment_models_organization_id_fkey (FOREIGN KEY), organization_payment_models_organization_id_payment_model_i_key (UNIQUE), organization_payment_models_payment_model_id_fkey (FOREIGN KEY), organization_payment_models_pkey (PRIMARY KEY), 2200_301138_2_not_null (CHECK), 2200_301138_1_not_null (CHECK), 2200_301138_5_not_null (CHECK), 2200_301138_3_not_null (CHECK)",
    "Policies": "org_members_read_own [PERMISSIVE] (SELECT), super_admin_full_access [PERMISSIVE] (ALL)"
  },
  {
    "Table Name": "organizations",
    "Columns": "id (uuid), created_at (timestamp with time zone), contact_phone (character varying), address (text), state (character varying), updated_at (timestamp with time zone), created_by (uuid), branch (character varying), contact_person (character varying), alternative_phone (character varying), partner_name (character varying), email (character varying), updated_by (uuid), partner_id (text), partner_type (text)",
    "Constraints": "organizations_updated_by_fkey (FOREIGN KEY), organizations_pkey (PRIMARY KEY), 2200_21282_5_not_null (CHECK), 2200_21282_1_not_null (CHECK), organizations_created_by_fkey (FOREIGN KEY), 2200_21282_17_not_null (CHECK), 2200_21282_8_not_null (CHECK), organizations_partner_type_check (CHECK)",
    "Policies": "service_role_access [PERMISSIVE] (ALL), users_organization_access [PERMISSIVE] (SELECT), admin_organization_management [PERMISSIVE] (ALL), super_admin_organizations_access [PERMISSIVE] (ALL)"
  },
  {
    "Table Name": "organizations_backup_20251002",
    "Columns": "id (uuid), name (text), created_at (timestamp with time zone), partner_email (text), contact_phone (text), address (text), city (text), state (text), country (text), description (text), status (text), updated_at (timestamp with time zone), created_by (uuid), branch (text), contact_person (text), alternative_phone (text)",
    "Constraints": "organizations_backup_20251002_pkey (PRIMARY KEY), 2200_139892_1_not_null (CHECK)",
    "Policies": "-"
  },
  {
    "Table Name": "payment_models",
    "Columns": "id (uuid), name (text), description (text), duration_months (integer), fixed_price (numeric), min_down_payment (numeric), is_active (boolean), created_by (uuid), created_at (timestamp with time zone), updated_at (timestamp with time zone)",
    "Constraints": "payment_models_created_by_fkey (FOREIGN KEY), 2200_301116_1_not_null (CHECK), 2200_301116_2_not_null (CHECK), 2200_301116_4_not_null (CHECK), 2200_301116_5_not_null (CHECK), 2200_301116_7_not_null (CHECK), 2200_301116_8_not_null (CHECK), 2200_301116_9_not_null (CHECK), 2200_301116_10_not_null (CHECK), payment_models_pkey (PRIMARY KEY)",
    "Policies": "super_admin_full_access [PERMISSIVE] (ALL), authenticated_read_active [PERMISSIVE] (SELECT)"
  },
  {
    "Table Name": "profiles",
    "Columns": "id (uuid), created_at (timestamp with time zone), email (text), full_name (text), phone (text), role (text), has_changed_password (boolean), organization_id (uuid), username (text), status (text), last_login (timestamp with time zone)",
    "Constraints": "profiles_pkey (PRIMARY KEY), profiles_username_key (UNIQUE), profiles_status_check (CHECK), profiles_email_key (UNIQUE), 2200_18513_2_not_null (CHECK), 2200_18513_1_not_null (CHECK), profiles_organization_id_fkey (FOREIGN KEY)",
    "Policies": "users_read_own_profile [PERMISSIVE] (SELECT), allow_profile_creation [PERMISSIVE] (INSERT), users_update_own_profile [PERMISSIVE] (UPDATE), service_role_access [PERMISSIVE] (ALL)"
  },
  {
    "Table Name": "sales",
    "Columns": "id (uuid), transaction_id (text), stove_serial_no (text), sales_date (date), contact_person (text), contact_phone (text), end_user_name (text), aka (text), state_backup (text), lga_backup (text), phone (text), other_phone (text), partner_name (text), amount (numeric), signature (text), created_by (uuid), organization_id (uuid), address_id (uuid), stove_image_id (uuid), agreement_image_id (uuid), created_at (timestamp without time zone), status (text), agent_approved (boolean), agent_approved_at (timestamp with time zone), agent_approved_by (uuid), is_installment (boolean), payment_model_id (uuid), total_paid (numeric), payment_status (text), retailer_branch (text), pot_quantity (integer), heat_retention_device (boolean), previous_stove_type (text), previous_stove_other (text), meals_per_day (text), cooking_fuel_source (text), cooking_location (text), terms_accepted (jsonb), is_archived (boolean)",
    "Constraints": "sales_status_check (CHECK), sales_address_id_fkey (FOREIGN KEY), sales_agent_approved_by_fkey (FOREIGN KEY), sales_agreement_image_id_fkey (FOREIGN KEY), sales_created_by_fkey (FOREIGN KEY), sales_organization_id_fkey (FOREIGN KEY), sales_payment_model_id_fkey (FOREIGN KEY), sales_payment_status_check (CHECK), sales_pkey (PRIMARY KEY), sales_stove_image_id_fkey (FOREIGN KEY), 2200_22627_1_not_null (CHECK), 2200_22627_22_not_null (CHECK), 2200_22627_26_not_null (CHECK)",
    "Policies": "super_admin_sales_access [PERMISSIVE] (ALL), service_role_access [PERMISSIVE] (ALL), admin_org_sales_management [PERMISSIVE] (ALL), users_org_sales [PERMISSIVE] (SELECT), users_own_sales [PERMISSIVE] (ALL)"
  },
  {
    "Table Name": "sales_history",
    "Columns": "id (uuid), sale_id (uuid), action_type (character varying), action_description (text), field_changes (jsonb), performed_by (uuid), performed_at (timestamp with time zone), ip_address (inet), user_agent (text), created_at (timestamp with time zone), updated_at (timestamp with time zone)",
    "Constraints": "sales_history_performed_by_fkey (FOREIGN KEY), sales_history_sale_id_fkey (FOREIGN KEY), 2200_47750_2_not_null (CHECK), 2200_47750_1_not_null (CHECK), sales_history_pkey (PRIMARY KEY), 2200_47750_6_not_null (CHECK), 2200_47750_4_not_null (CHECK), 2200_47750_3_not_null (CHECK)",
    "Policies": "service_role_access [PERMISSIVE] (ALL), System can insert history [PERMISSIVE] (INSERT), Users can view their own history [PERMISSIVE] (SELECT)"
  },
  {
    "Table Name": "sales_images",
    "Columns": "id (uuid), type (text), public_id (text), url (text), created_at (timestamp without time zone)",
    "Constraints": "sales_images_pkey (PRIMARY KEY), sales_images_type_check (CHECK), 2200_22617_1_not_null (CHECK)",
    "Policies": "-"
  },
  {
    "Table Name": "stove_ids",
    "Columns": "id (uuid), stove_id (text), organization_id (uuid), status (text), created_at (timestamp with time zone), sale_id (uuid), factory (text), is_archived (boolean), archive_note (text), sales_reference (text)",
    "Constraints": "stove_ids_sale_id_fkey (FOREIGN KEY), 2200_89506_1_not_null (CHECK), 2200_89506_2_not_null (CHECK), 2200_89506_3_not_null (CHECK), 2200_89506_4_not_null (CHECK), stove_ids_stove_id_organization_id_key (UNIQUE), stove_ids_sale_id_check (CHECK), stove_ids_pkey (PRIMARY KEY), stove_ids_organization_id_fkey (FOREIGN KEY)",
    "Policies": "Allow organization members to insert stove_ids [PERMISSIVE] (INSERT), Authenticated and service role can select stove_ids [PERMISSIVE] (SELECT), Authenticated and service role can update stove_ids [PERMISSIVE] (UPDATE)"
  },
  {
    "Table Name": "sync_logs",
    "Columns": "id (uuid), source (text), status (text), application_name (text), started_at (timestamp with time zone), completed_at (timestamp with time zone), duration_ms (integer), total_partners (integer), partners_created (integer), partners_updated (integer), partners_failed (integer), total_stove_ids (integer), stove_ids_created (integer), stove_ids_skipped (integer), entries (jsonb), request_summary (jsonb), error_message (text), created_at (timestamp with time zone)",
    "Constraints": "sync_logs_pkey (PRIMARY KEY), 2200_328971_3_not_null (CHECK), 2200_328971_5_not_null (CHECK), 2200_328971_18_not_null (CHECK), sync_logs_source_check (CHECK), sync_logs_status_check (CHECK), 2200_328971_1_not_null (CHECK), 2200_328971_2_not_null (CHECK)",
    "Policies": "Super admins can read sync_logs [PERMISSIVE] (SELECT), Service role full access [PERMISSIVE] (ALL)"
  },
  {
    "Table Name": "uploads",
    "Columns": "id (uuid), public_id (text), url (text), type (text), created_by (uuid), created_at (timestamp without time zone)",
    "Constraints": "uploads_created_by_fkey (FOREIGN KEY), 2200_31734_1_not_null (CHECK), uploads_pkey (PRIMARY KEY)",
    "Policies": "users_own_uploads [PERMISSIVE] (ALL), service_role_access [PERMISSIVE] (ALL), super_admin_uploads_access [PERMISSIVE] (ALL)"
  }
]