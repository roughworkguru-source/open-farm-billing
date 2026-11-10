"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Bill = {
  id: string;
  total: number;
  created_at: string;
  customers: { name: string; phone: string } | null;
};

type Product = {
  id: string;
  name: string;
  weight_grams: number | null;
  stock: number;
  low_stock_alert: number;
};

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function label(p: { name: string; weight_grams: number | null }) {
  if (!p.weight_grams) return p.name;
  const w =
    p.weight_grams >= 1000
      ? `${Number((p.weight_grams / 1000).toFixed(2))}kg`
      : `${p.weight_grams}g`;
  return `${p.name} ${w}`;
}

export default function ReportsPage() {
  const [date, setDate] = useState(today());
  const [bills, setBills] = useState<Bill[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setError("");
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const { data, error } = await supabase
        .from("bills")
        .select("id,total,created_at,customers(name,phone)")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setBills(data as unknown as Bill[]);
    }
    load();
  }, [date]);

  useEffect(() => {
    async function loadStock() {
      const { data } = await supabase
        .from("products")
        .select("id,name,weight_grams,stock,low_stock_alert")
        .order("stock");
      const all = (data ?? []) as Product[];
      setLowStock(all.filter((p) => p.stock <= p.low_stock_alert));
    }
    loadStock();
  }, []);

  const totalSales = bills.reduce((s, b) => s + Number(b.total), 0);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Reports</h1>

      {error && <p className="mb-3 rounded bg-red-100 p-2 text-red-700">{error}</p>}

      <div className="mb-4 flex items-center gap-3">
        <label>Date:</label>
        <input
          type="date"
          className="rounded border p-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded border p-4">
          <p className="opacity-70">Total sales</p>
          <p className="text-3xl font-bold">₹{totalSales}</p>
        </div>
        <div className="rounded border p-4">
          <p className="opacity-70">Bills</p>
          <p className="text-3xl font-bold">{bills.length}</p>
        </div>
      </div>

      <h2 className="mb-2 text-xl font-semibold">Bills</h2>
      <table className="mb-8 w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="p-2">Time</th>
            <th className="p-2">Customer</th>
            <th className="p-2">Phone</th>
            <th className="p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((b) => (
            <tr key={b.id} className="border-b">
              <td className="p-2">
                {new Date(b.created_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="p-2">{b.customers?.name}</td>
              <td className="p-2">{b.customers?.phone}</td>
              <td className="p-2">₹{b.total}</td>
            </tr>
          ))}
          {bills.length === 0 && (
            <tr>
              <td className="p-2 opacity-70" colSpan={4}>
                Ee roju bills levu
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 className="mb-2 text-xl font-semibold">⚠ Low stock</h2>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="p-2">Item</th>
            <th className="p-2">Stock</th>
          </tr>
        </thead>
        <tbody>
          {lowStock.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{label(p)}</td>
              <td className="p-2 font-semibold text-red-600">{p.stock}</td>
            </tr>
          ))}
          {lowStock.length === 0 && (
            <tr>
              <td className="p-2 opacity-70" colSpan={2}>
                Anni items lo stock undi ✅
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}