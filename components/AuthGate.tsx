"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ready) return <p className="p-4">Loading...</p>;

  return (
    <>
      <nav className="flex items-center gap-4 border-b p-3">
        <a href="/billing" className="font-semibold">Billing</a>
        <a href="/products" className="font-semibold">Products</a>
        <a href="/reports" className="font-semibold">Reports</a>
        <button
          className="ml-auto underline"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
        >
          Logout
        </button>
      </nav>
      {children}
    </>
  );
}