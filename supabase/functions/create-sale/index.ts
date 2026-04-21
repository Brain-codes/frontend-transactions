import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveAssignedOrgIds } from "../_shared/resolveAssignedOrgIds.ts";

function withCors(res: Response): Response {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return res;
}

function jsonError(message: string, status = 400): Response {
  return withCors(
    new Response(JSON.stringify({ success: false, message }), { status })
  );
}

serve(async (req) => {
  console.log("➡️ Incoming request:", req.method, req.url);

  if (req.method === "OPTIONS") {
    return withCors(new Response("ok", { status: 200 }));
  }

  // Use service role to bypass RLS for writes
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );

  try {
    const body = await req.json();
    console.log("📦 Request body received (keys):", Object.keys(body));

    const {
      transactionId,
      stoveSerialNo,
      salesDate,
      contactPerson,
      contactPhone,
      endUserName,
      aka,
      stateBackup,
      lgaBackup,
      phone,
      otherPhone,
      partnerName,
      retailerBranch,
      amount,
      signature,
      addressData,
      stoveImageId,
      agreementImageId,
      // New stove set fields
      potQuantity,
      heatRetentionDevice,
      // New cooking habits fields
      previousStoveType,
      previousStoveOther,
      mealsPerDay,
      cookingFuelSource,
      cookingLocation,
      // Terms & conditions
      termsAccepted,
      // SAA-specific: explicit organization override
      organizationId: requestedOrgId,
      // Installment payment fields
      isInstallment,
      paymentModelId,
      initialPaymentAmount,
      initialPaymentMethod,
      initialPaymentProofImageId,
    } = body;

    // ── Authenticate ─────────────────────────────────────────────────────────
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: userData, error: authError } =
      await anonClient.auth.getUser();
    if (authError || !userData?.user) {
      return jsonError("Unauthorized", 401);
    }
    const userId = userData.user.id;
    console.log("✅ Authenticated user:", userId);

    // ── Resolve organization_id ───────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("❌ Profile fetch failed:", profileError.message);
      return jsonError("Profile lookup failed", 500);
    }

    let organizationId: string | null = profile?.organization_id ?? null;

    if (!organizationId) {
      // ACSL agent case: org ID must come from the request body
      if (profile?.role !== "acsl_agent" && profile?.role !== "super_admin_agent") {
        return jsonError("User must belong to an organization");
      }

      if (!requestedOrgId) {
        return jsonError(
          "Organization ID is required for ACSL agents"
        );
      }

      // Verify the SAA is assigned to this org (direct or via state)
      const { assignedOrgIds } = await resolveAssignedOrgIds(supabase, userId);
      if (!assignedOrgIds.includes(requestedOrgId)) {
        return jsonError(
          "You are not assigned to the specified organization",
          403
        );
      }

      organizationId = requestedOrgId;
    }

    console.log("🏢 Resolved organization ID:", organizationId);

    // ── Installment payment validation ──────────────────────────────────────
    let saleAmount = amount;
    let installmentData: any = null;

    if (isInstallment && paymentModelId) {
      console.log("💳 Installment mode: validating payment model", paymentModelId);

      // Verify org has access to this model
      const { data: orgModelLink, error: linkError } = await supabase
        .from("organization_payment_models")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("payment_model_id", paymentModelId)
        .maybeSingle();

      if (linkError || !orgModelLink) {
        return jsonError("This organization does not have access to the selected payment model", 403);
      }

      // Fetch model details
      const { data: paymentModel, error: modelError } = await supabase
        .from("payment_models")
        .select("id, name, fixed_price, min_down_payment, is_active, duration_months")
        .eq("id", paymentModelId)
        .single();

      if (modelError || !paymentModel) {
        return jsonError("Payment model not found", 404);
      }

      if (!paymentModel.is_active) {
        return jsonError("This payment model is no longer active");
      }

      // Use model's fixed price as the sale amount
      saleAmount = paymentModel.fixed_price;

      // Validate initial payment
      const initialAmt = parseFloat(initialPaymentAmount) || 0;
      if (paymentModel.min_down_payment && initialAmt < paymentModel.min_down_payment) {
        return jsonError(
          `Minimum down payment is ₦${paymentModel.min_down_payment}`
        );
      }
      if (initialAmt > saleAmount) {
        return jsonError("Initial payment cannot exceed the total price");
      }

      installmentData = {
        modelId: paymentModelId,
        initialAmount: initialAmt,
        paymentMethod: initialPaymentMethod || "cash",
        proofImageId: initialPaymentProofImageId || null,
        totalPaid: initialAmt,
        paymentStatus: initialAmt >= saleAmount ? "fully_paid" : initialAmt > 0 ? "partially_paid" : "partially_paid",
      };

      console.log("✅ Installment validated:", paymentModel.name, "Price:", saleAmount);
    }

    // ── Insert address ────────────────────────────────────────────────────────
    console.log("📍 Inserting address:", addressData);
    const { data: address, error: addressError } = await supabase
      .from("addresses")
      .insert([
        {
          full_address: addressData?.fullAddress,
          street: addressData?.street,
          city: addressData?.city,
          state: addressData?.state,
          country: addressData?.country,
          latitude: addressData?.latitude,
          longitude: addressData?.longitude,
        },
      ])
      .select()
      .maybeSingle();

    if (addressError || !address) {
      console.error("❌ Address save failed:", addressError);
      return jsonError("Address save failed", 500);
    }
    console.log("🏡 Address inserted:", address.id);

    // ── Determine sale status ─────────────────────────────────────────────────
    const requiredFields = [
      transactionId,
      stoveSerialNo,
      salesDate,
      contactPerson,
      contactPhone,
      endUserName,
      phone,
      partnerName,
      amount,
    ];
    const hasAllRequiredFields = requiredFields.every(
      (f) => f !== null && f !== undefined && String(f).trim() !== ""
    );
    const hasSignature = signature && String(signature).trim() !== "";
    const hasStoveImage = stoveImageId != null;
    const hasAgreementImage = agreementImageId != null;

    let saleStatus = "incomplete";
    if (hasAllRequiredFields && hasSignature && hasStoveImage && hasAgreementImage) {
      saleStatus = "completed";
    } else if (
      hasAllRequiredFields &&
      (hasSignature || hasStoveImage || hasAgreementImage)
    ) {
      saleStatus = "pending";
    }

    // ── Insert sale ───────────────────────────────────────────────────────────
    console.log("📝 Inserting main sale with status:", saleStatus);
    const { data: saleInsertData, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          transaction_id: transactionId,
          stove_serial_no: stoveSerialNo,
          sales_date: salesDate,
          contact_person: contactPerson,
          contact_phone: contactPhone,
          end_user_name: endUserName,
          aka,
          state_backup: stateBackup,
          lga_backup: lgaBackup,
          phone,
          other_phone: otherPhone,
          partner_name: partnerName,
          retailer_branch: retailerBranch || null,
          amount: saleAmount,
          signature,
          status: saleStatus,
          created_by: userId,
          organization_id: organizationId,
          address_id: address.id,
          stove_image_id: stoveImageId,
          agreement_image_id: agreementImageId,
          is_installment: !!installmentData,
          payment_model_id: installmentData?.modelId || null,
          total_paid: installmentData?.totalPaid || 0,
          payment_status: installmentData ? installmentData.paymentStatus : "not_applicable",
          pot_quantity: potQuantity ?? null,
          heat_retention_device: heatRetentionDevice ?? false,
          previous_stove_type: previousStoveType || null,
          previous_stove_other: previousStoveOther || null,
          meals_per_day: mealsPerDay || null,
          cooking_fuel_source: cookingFuelSource || null,
          cooking_location: cookingLocation || null,
          terms_accepted: termsAccepted ?? null,
        },
      ])
      .select("id")
      .maybeSingle();

    if (saleError || !saleInsertData?.id) {
      console.error("❌ Sales insert failed:", saleError);
      return jsonError("Sales save failed", 500);
    }

    const saleId = saleInsertData.id;
    console.log("✅ Sale inserted:", saleId);

    // ── Update stove_ids ──────────────────────────────────────────────────────
    const { error: stoveUpdateError } = await supabase
      .from("stove_ids")
      .update({ status: "sold", sale_id: saleId })
      .eq("stove_id", stoveSerialNo)
      .eq("organization_id", organizationId);

    if (stoveUpdateError) {
      console.error("❌ Failed to update stove_ids:", stoveUpdateError);
      return jsonError("Failed to update stove_ids", 500);
    }

    console.log("✅ Sales saved and stove_ids updated with sale_id:", saleId);

    // ── Record initial installment payment (if any) ─────────────────────────
    if (installmentData && installmentData.initialAmount > 0) {
      console.log("💰 Recording initial installment payment:", installmentData.initialAmount);
      const { error: paymentError } = await supabase
        .from("installment_payments")
        .insert({
          sale_id: saleId,
          amount: installmentData.initialAmount,
          payment_method: installmentData.paymentMethod,
          proof_image_id: installmentData.proofImageId,
          recorded_by: userId,
          payment_date: salesDate || new Date().toISOString().split("T")[0],
          notes: "Initial down payment",
        });

      if (paymentError) {
        console.error("⚠️ Initial payment insert failed:", paymentError.message);
        // Don't fail the whole sale creation, just log
      } else {
        console.log("✅ Initial installment payment recorded");
      }
    }

    return withCors(
      new Response(
        JSON.stringify({
          success: true,
          message: "Sales saved successfully",
          status: saleStatus,
          sale_id: saleId,
          data: { id: saleId },
        }),
        { status: 200 }
      )
    );
  } catch (err) {
    console.error("🔥 Unexpected Error:", err);
    return jsonError("Unexpected error", 500);
  }
});
