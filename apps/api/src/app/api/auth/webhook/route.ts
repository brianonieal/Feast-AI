// @version 0.2.0 - Conduit: Clerk webhook for user sync
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{
      id: string;
      email_address: string;
    }>;
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    phone_numbers: Array<{
      phone_number: string;
    }>;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook secret not configured", code: "WEBHOOK_CONFIG_ERROR" },
      { status: 500 }
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers", code: "WEBHOOK_HEADER_ERROR" },
      { status: 400 }
    );
  }

  const body = await req.text();

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature", code: "WEBHOOK_VERIFY_ERROR" },
      { status: 401 }
    );
  }

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id
    );
    const email = primaryEmail?.email_address ?? "";
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    const phone = data.phone_numbers[0]?.phone_number ?? null;

    await db.user.upsert({
      where: { clerkId: data.id },
      create: {
        clerkId: data.id,
        email,
        name,
        phone,
      },
      update: {
        email,
        name,
        phone,
      },
    });
  }

  if (type === "user.deleted") {
    await db.user.update({
      where: { clerkId: data.id },
      data: { deletedAt: new Date() },
    }).catch(() => {
      // User may not exist in our DB yet — safe to ignore
    });
  }

  return NextResponse.json({ received: true });
}
