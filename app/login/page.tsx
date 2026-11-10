"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email leda password tappu");
      return;
    }
    router.replace("/billing");
  }

  return (
    <main className="mx-auto mt-20 max-w-sm p-4">
      <h1 className="mb-1 text-2xl font-bold">Open Farm Natural Store</h1>
      <p className="mb-4 opacity-70">Staff login</p>

      {error && <p className="mb-3 rounded bg-red-100 p-2 text-red-700">{error}</p>}

      <form onSubmit={login} className="grid gap-2">
        <input
          className="rounded border p-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded border p-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          disabled={loading}
          className="rounded bg-green-700 p-2 text-white disabled:opacity-50"
        >
          {loading ? "Please wait..." : "Login"}
        </button>
      </form>
    </main>
  );
}