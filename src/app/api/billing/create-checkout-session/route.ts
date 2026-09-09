import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to purchase a session." }, { status: 401 });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "Payments are not configured yet." }, { status: 500 });
    }

    const { next } = (await req.json().catch(() => ({}))) as { next?: string };
    const returnPath = next && next.startsWith("/") ? next : "/start";

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      // Ties the payment to this user server-side — the webhook reads this
      // back to know whose account to credit. Never trust a user id passed
      // from the client for this.
      client_reference_id: user.id,
      success_url: `${SITE_URL}${returnPath}?checkout=success`,
      cancel_url: `${SITE_URL}${returnPath}?checkout=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
