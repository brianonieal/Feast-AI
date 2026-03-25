// @version 0.7.0 - Compass: Resend transactional email adapter
// Docs: https://resend.com/docs
// Stubs gracefully when RESEND_API_KEY is missing — app boots without live key

import { Resend } from "resend";
import type { EmailTemplate } from "@feast-ai/shared";
import { getBreaker } from "@feast-ai/shared";

const FROM_EMAIL = process.env.FEAST_FROM_EMAIL ?? "hello@feastongood.com";
const FROM_NAME = "The Feast";

interface SendEmailParams {
  to: string;
  template: EmailTemplate;
  variables: {
    name: string;
    city?: string;
    [key: string]: string | undefined;
  };
}

// Welcome email content per template
const EMAIL_CONTENT: Record<
  EmailTemplate,
  { subject: string; html: (v: SendEmailParams["variables"]) => string }
> = {
  welcome_attend: {
    subject: "Welcome to The Feast \u2014 find a dinner near you",
    html: (v) => `
      <h2>Welcome, ${v.name}.</h2>
      <p>We\u2019re glad you found your way to the table.</p>
      <p>The Feast brings together curious, open-hearted people for evenings of meaningful conversation and connection. Your next dinner is waiting.</p>
      <p><a href="https://feastongood.com/dinners">Find a dinner near ${v.city ?? "you"} \u2192</a></p>
      <p>With gratitude,<br/>The Feast</p>
    `,
  },
  welcome_host: {
    subject: "Your host application \u2014 next steps",
    html: (v) => `
      <h2>Thank you, ${v.name}.</h2>
      <p>There\u2019s something powerful about opening your home and your table. We\u2019re honored you want to bring The Feast to your community.</p>
      <p>We\u2019ve received your application and will be in touch once we see enough interest in your area. In the meantime, explore what it means to host a Feast dinner.</p>
      <p><a href="https://feastongood.com/host">Learn more about hosting \u2192</a></p>
      <p>With gratitude,<br/>The Feast</p>
    `,
  },
  welcome_facilitate: {
    subject: "Your facilitator application \u2014 next steps",
    html: (v) => `
      <h2>Thank you, ${v.name}.</h2>
      <p>Facilitators are the heartbeat of every Feast dinner. Your desire to hold space for others is a gift.</p>
      <p>We\u2019ve received your application and will reach out about our next facilitator training cohort.</p>
      <p><a href="https://feastongood.com/facilitate">Learn more about facilitation \u2192</a></p>
      <p>With gratitude,<br/>The Feast</p>
    `,
  },
  welcome_diy: {
    subject: "DIY Feast tools \u2014 you\u2019re on the list",
    html: (v) => `
      <h2>Hello, ${v.name}.</h2>
      <p>We love that you want to bring this experience to your community on your own terms.</p>
      <p>We\u2019re building DIY tools for gatherers like you \u2014 conversation guides, hosting tips, and everything you need to run a Feast-inspired dinner. You\u2019ll be the first to know when they\u2019re ready.</p>
      <p>With gratitude,<br/>The Feast</p>
    `,
  },
  welcome_newsletter: {
    subject: "Welcome to The Feast community",
    html: (v) => `
      <h2>Hello, ${v.name}.</h2>
      <p>Thank you for connecting with The Feast. We\u2019ll keep you in the loop on upcoming dinners, community happenings, and new ways to get involved.</p>
      <p><a href="https://feastongood.com">Explore The Feast \u2192</a></p>
      <p>With gratitude,<br/>The Feast</p>
    `,
  },
};

export async function sendWelcomeEmail(
  params: SendEmailParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  // Graceful stub when Resend key not configured — never throws
  if (!process.env.RESEND_API_KEY) {
    console.log(
      `[Resend stub] Would send ${params.template} to ${params.to}`
    );
    return { success: true, id: "stub" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const content = EMAIL_CONTENT[params.template];
  if (!content) {
    return { success: false, error: `Unknown template: ${params.template}` };
  }

  // Real call — wrap with circuit breaker
  const breaker = getBreaker("resend", {
    failureThreshold: 3,
    recoveryTimeout: 60_000,
  });

  try {
    const result = await breaker.call(() =>
      resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: params.to,
        subject: content.subject,
        html: content.html(params.variables),
      })
    );

    if (result.error) {
      console.error(
        `[Resend] Failed to send ${params.template} to ${params.to}:`,
        result.error.message
      );
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    // Circuit open or send failed — log and return graceful failure
    console.error(`[Resend] ${error}`);
    return { success: false, error };
  }
}
