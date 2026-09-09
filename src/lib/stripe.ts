import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Lazy singleton, same pattern as src/lib/ai.ts's Groq client — throws a
 * clear message if the key is missing rather than letting Stripe's own SDK
 * error surface, since callers already catch and report this uniformly.
 */
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it to .env.local to enable payments.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}
