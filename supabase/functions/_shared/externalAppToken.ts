// Checks a token sent by an outside application (the ERP, the NABDA Portal) against
// external_app_tokens. Shared by external-csv-sync and external-transfer-cancel.
export async function validateExternalToken(
  supabase: any,
  token: string,
  secret_key: string,
  application_name: string,
  origin_url?: string,
): Promise<{ isValid: boolean; token_data?: any; error?: string }> {
  try {
    const { data: tokenData, error } = await supabase
      .from("external_app_tokens")
      .select("*")
      .eq("token", token)
      .eq("secret_key", secret_key)
      .eq("application_name", application_name)
      .eq("is_active", true)
      .single();

    if (error || !tokenData) return { isValid: false, error: "Invalid token, secret key, or application name" };

    if (origin_url && tokenData.allowed_urls?.length > 0) {
      const isUrlAllowed = tokenData.allowed_urls.some(
        (allowedUrl: string) => origin_url.includes(allowedUrl) || allowedUrl === "*",
      );
      if (!isUrlAllowed) return { isValid: false, error: "Request origin not allowed for this application" };
    }

    return { isValid: true, token_data: tokenData };
  } catch {
    return { isValid: false, error: "Token validation failed" };
  }
}
