import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The authoritative source of a credit's existence — never created from the
 * client's success_url redirect, which anyone can hit manually without
 * having paid. Stripe signs this payload, so the signature check below is
 * what actually proves a payment happened, not the browser landing back on
 * our site.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;

    if (session.payment_status === "paid" && userId) {
      // Needs the service-role client, not the cookie-based one: this
      // request has no user session to authenticate as (Stripe calls this
      // server-to-server), so RLS would reject the write with no policy to
      // authorize it under. This is the one place in the app that's meant
      // to bypass RLS — everywhere else, RLS is the actual security
      // boundary.
      const supabase = createAdminClient();
      if (!supabase) {
        console.error("Stripe webhook received but Supabase admin client is not configured.");
        return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
      }
      // Primary key is the checkout session id, so a redelivered webhook
      // event (Stripe retries on anything but a 2xx) just no-ops here
      // instead of minting a second credit.
      const { error } = await supabase
        .from("session_credits")
        .upsert({ id: session.id, user_id: userId }, { onConflict: "id", ignoreDuplicates: true });
      if (error) {
        console.error("Failed to record session credit:", error.message);
        return NextResponse.json({ error: "Failed to record credit." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
