"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  low_stock_alert: number;
  weight_grams: number | null;
};

function fmtW(g: number | null) {
  if (!g) return "";
  return g >= 1000 ? `${Number((g / 1000).toFixed(2))} kg` : `${g} g`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [addQty, setAddQty] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name")
      .order("weight_grams");
    if (error) setError(error.message);
    else setProducts(data as Product[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      weight_grams: weight ? Number(weight) : null,
      price: Number(price),
      stock: Number(stock || 0),
    });
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setWeight("");
    setPrice("");
    setStock("");
    load();
  }

  async function addStock(p: Product) {
    const qty = Number(addQty[p.id] || 0);
    if (!qty) return;
    const { error } = await supabase
      .from("products")
      .update({ stock: p.stock + qty })
      .eq("id", p.id);
    if (error) {
      setError(error.message);
      return;
    }
    setAddQty({ ...addQty, [p.id]: "" });
    load();
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Products & Stock</h1>

      {error && <p className="mb-3 rounded bg-red-100 p-2 text-red-700">{error}</p>}

      <form onSubmit={addProduct} className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input
          className="rounded border p-2"
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded border p-2"
          placeholder="Weight (grams)"
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <input
          className="rounded border p-2"
          placeholder="Price ₹"
          type="number"
          step="any"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <input
          className="rounded border p-2"
          placeholder="Stock (packs)"
          type="number"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
        <button className="rounded bg-green-700 p-2 text-white">Add Item</button>
      </form>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="p-2">Item</th>
            <th className="p-2">Weight</th>
            <th className="p-2">Price</th>
            <th className="p-2">Stock</th>
            <th className="p-2">Add stock</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const low = p.stock <= p.low_stock_alert;
            return (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{fmtW(p.weight_grams)}</td>
                <td className="p-2">₹{p.price}</td>
                <td className={`p-2 font-semibold ${low ? "text-red-600" : ""}`}>
                  {p.stock} {low && "⚠ Low"}
                </td>
                <td className="p-2">
                  <input
                    className="w-16 rounded border p-1"
                    type="number"
                    value={addQty[p.id] || ""}
                    onChange={(e) => setAddQty({ ...addQty, [p.id]: e.target.value })}
                  />
                  <button
                    onClick={() => addStock(p)}
                    className="ml-1 rounded bg-green-700 px-2 py-1 text-white"
                  >
                    +
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}