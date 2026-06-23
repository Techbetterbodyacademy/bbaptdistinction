"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { stripeLineItem, type PackageInterval } from "@/lib/packages";

export async function startCheckout(formData: FormData) {
  const packageId = String(formData.get("package_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!packageId || !slug) redirect(`/buy/${slug}`);

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error("[checkout] STRIPE_SECRET_KEY not set");
    redirect(`/buy/${slug}?error=stripe-not-configured`);
  }

  const supabase = createServiceClient();
  const { data: pkg } = await supabase
    .from("coaching_package")
    .select("id, name, description, price_cents, currency, interval, workspace_id, enabled")
    .eq("id", packageId)
    .maybeSingle();

  if (!pkg || !pkg.enabled) redirect(`/buy/${slug}`);

  const lineItem = stripeLineItem({
    name: pkg.name,
    description: pkg.description ?? undefined,
    price_cents: pkg.price_cents,
    currency: pkg.currency,
    interval: pkg.interval as PackageInterval
  });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://bbapt.vercel.app";
  const successUrl = `${origin}/buy/${slug}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/buy/${slug}?cancelled=1`;

  const params = new URLSearchParams();
  params.append("mode", pkg.interval === "one_time" ? "payment" : "subscription");
  params.append("success_url", successUrl);
  params.append("cancel_url", cancelUrl);
  params.append("line_items[0][price_data][currency]", lineItem.price_data.currency);
  params.append("line_items[0][price_data][unit_amount]", String(lineItem.price_data.unit_amount));
  params.append("line_items[0][price_data][product_data][name]", lineItem.price_data.product_data.name);
  if (lineItem.price_data.product_data.description) {
    params.append("line_items[0][price_data][product_data][description]", lineItem.price_data.product_data.description);
  }
  if (lineItem.price_data.recurring) {
    params.append("line_items[0][price_data][recurring][interval]", lineItem.price_data.recurring.interval);
  }
  params.append("line_items[0][quantity]", "1");
  params.append("metadata[workspace_id]", pkg.workspace_id);
  params.append("metadata[package_id]", pkg.id);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[checkout] stripe failed", res.status, body.slice(0, 500));
    redirect(`/buy/${slug}?error=stripe`);
  }

  const session = await res.json();

  await supabase.from("checkout_session").insert({
    workspace_id: pkg.workspace_id,
    package_id: pkg.id,
    stripe_session_id: session.id,
    status: "pending",
    amount_cents: pkg.price_cents,
    currency: pkg.currency
  });

  redirect(session.url as string);
}
