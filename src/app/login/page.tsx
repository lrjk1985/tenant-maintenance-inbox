import { LockKeyhole, Mail, Wrench } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  sendMagicLinkAction,
  signInWithPasswordAction,
} from "@/app/login/actions";
import { getPublicSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; sent?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  if (!getPublicSupabaseConfig()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f7f2] p-6">
        <section className="w-full max-w-md rounded-md border border-[#d8ddd3] bg-white p-6 shadow-sm">
          <BrandHeader />
          <div className="mt-6 rounded-md border border-[#e7c87d] bg-[#fff8e5] px-4 py-3 text-sm text-[#72520d]">
            Demo mode is active because Supabase environment variables are missing.
          </div>
          <Link
            className="mt-5 flex h-11 items-center justify-center rounded-md bg-[#0f7b5f] px-4 text-sm font-semibold text-white transition hover:bg-[#0c684f]"
            href="/"
          >
            Open demo inbox
          </Link>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen bg-[#f6f7f2] lg:grid-cols-[minmax(420px,0.9fr)_1.1fr]">
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-md border border-[#d8ddd3] bg-white p-6 shadow-sm">
          <BrandHeader />
          {params.error ? (
            <div className="mt-5 rounded-md border border-[#e7aaa3] bg-[#fee2df] px-4 py-3 text-sm text-[#8d251e]">
              {params.error}
            </div>
          ) : null}
          {params.sent ? (
            <div className="mt-5 rounded-md border border-[#b8dccb] bg-[#e6f4ed] px-4 py-3 text-sm text-[#0f6b52]">
              Magic link sent.
            </div>
          ) : null}

          <form action={signInWithPasswordAction} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#64726b]">
                Email
              </span>
              <input
                autoComplete="email"
                className="field"
                name="email"
                placeholder="staff@example.com"
                type="email"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#64726b]">
                Password
              </span>
              <input
                autoComplete="current-password"
                className="field"
                name="password"
                placeholder="Password"
                type="password"
              />
            </label>
            <button
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0f7b5f] px-4 text-sm font-semibold text-white transition hover:bg-[#0c684f]"
              type="submit"
            >
              <LockKeyhole size={16} aria-hidden />
              Sign in
            </button>
          </form>

          <form action={sendMagicLinkAction} className="mt-4 border-t border-[#e1e6dc] pt-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#64726b]">
                Email magic link
              </span>
              <div className="flex gap-2">
                <input
                  autoComplete="email"
                  className="field"
                  name="email"
                  placeholder="staff@example.com"
                  type="email"
                />
                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#b9c5bb] bg-white text-[#26362e] transition hover:bg-[#eef4ec]"
                  title="Send magic link"
                  type="submit"
                >
                  <Mail size={16} aria-hidden />
                </button>
              </div>
            </label>
          </form>
        </div>
      </section>
      <section className="hidden border-l border-[#d8ddd3] bg-[#e5f3ed] p-8 lg:flex lg:items-end">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0f7b5f]">
            Internal tenant operations
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-normal text-[#12211b]">
            WhatsApp Tenant Maintenance Inbox
          </h1>
        </div>
      </section>
    </main>
  );
}

function BrandHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#0f7b5f] text-white">
        <Wrench size={21} aria-hidden />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-[#12211b]">Maintenance Inbox</h1>
        <p className="text-sm text-[#65736b]">Staff access</p>
      </div>
    </div>
  );
}
