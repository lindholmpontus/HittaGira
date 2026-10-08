import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Feedback form on /kontakt → an email to CONTACT_EMAIL via Resend's REST API.
// Until you verify your own domain in Resend, mail is sent from their shared
// onboarding@resend.dev address, which only delivers to the email you signed
// up to Resend with — so sign up with the same address as CONTACT_EMAIL.

const Body = z.object({
  message: z.string().trim().min(1).max(5000),
  name: z.string().trim().max(100).optional(),
  email: z.union([z.literal(""), z.string().trim().email().max(200)]).optional(),
  /** Honeypot — a hidden field only bots fill in. */
  website: z.string().optional(),
  /** Milliseconds between the form rendering and submit. */
  elapsedMs: z.number().optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Bots: pretend it worked so they don't retry, but send nothing.
  if (body.website || (body.elapsedMs ?? 0) < 3000) {
    return NextResponse.json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL;
  if (!apiKey || !to) {
    console.error("contact form: RESEND_API_KEY or CONTACT_EMAIL not set");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const name = body.name?.replace(/[\r\n]+/g, " ") || "";
  const email = body.email || "";
  const text = [
    body.message,
    "",
    "—",
    `Namn: ${name || "(inget)"}`,
    `E-post: ${email || "(ingen)"}`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HittaGira <onboarding@resend.dev>",
      to,
      subject: `HittaGira-feedback${name ? ` från ${name}` : ""}`,
      text,
      // Lets you answer straight from your inbox.
      ...(email ? { reply_to: email } : {}),
    }),
  });

  if (!res.ok) {
    console.error("contact form: Resend failed", res.status, await res.text());
    return NextResponse.json({ error: "send failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
