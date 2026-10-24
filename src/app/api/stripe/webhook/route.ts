import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { confirmFromSession } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response("Webhook not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const db = createAdminClient();
  const { data: seen } = await db.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return Response.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await confirmFromSession(event.data.object);
        break;
      case "checkout.session.expired": {
        const { error } = await db.rpc("expire_checkout", { p_session: event.data.object.id });
        if (error) throw error;
        break;
      }
    }
  } catch (err) {
    console.error("Stripe webhook failed", event.id, event.type, err);
    return new Response("Handler failed", { status: 500 }); // Stripe will retry.
  }

  await db.from("stripe_events").insert({ id: event.id, type: event.type });
  return Response.json({ received: true });
}
