"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const magicLinkSchema = z.object({
  email: z.email(),
});

export async function signInWithPasswordAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const input = loginSchema.parse(Object.fromEntries(formData));
  const { error } = await supabase.auth.signInWithPassword(input);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function sendMagicLinkAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const input = magicLinkSchema.parse(Object.fromEntries(formData));
  const requestHeaders = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? requestHeaders.get("origin");
  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?sent=1");
}
