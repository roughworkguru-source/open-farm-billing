"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const CATEGORIES = ["Dry Fruits", "Spices", "Powders", "Seeds", "Oils", "General"];

type Product = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  stock: number;
  low_stock_alert: number;
  weight_grams: number | null;
  image_url: string | null;
};

function fmtW(g: number | null) {
  if (!g) return "";
  return g >= 1000 ? `${Number((g / 1000).toFixed(2))} kg` : `${g} g`;
}

function catOf(p: Product) {
  return CATEGORIES.includes(p.category ?? "") ? (p.category as string) : "General";
}

// Phone photo pedda untundi, upload mundu chinnadi chestam
async function resizeImage(file: File, max = 800): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Photo process avvaledu"))), "image/jpeg", 0.8)
  );
}

async function uploadPhoto(file: File): Promise<string> {
  const blob = await resizeImage(file);
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState("All");
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
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
    setAdding(true);
    try {
      const image_url = photo ? await uploadPhoto(photo) : null;
      const { error } = await supabase.from("products").insert({
        name: name.trim(),
        category,
        weight_grams: weight ? Number(weight) : null,
        price: Number(price),
        stock: Number(stock || 0),
        image_url,
      });
      if (error) throw error;
      setName("");
      setWeight("");
      setPrice("");
      setStock("");
      setPhoto(null);
      (e.target as HTMLFormElement).reset();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edo tappu jarigindi");
    }
    setAdding(false);
  }

  async function changePhoto(p: Product, file: File) {
    setError("");
    try {
      const image_url = await uploadPhoto(file);
      const { error } = await supabase.from("products").update({ image_url }).eq("id", p.id);
      if (error) throw error;
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload avvaledu");
    }
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

  const shownCats = activeCat === "All" ? CATEGORIES : [activeCat];

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Products & Stock</h1>

      {error && <p className="mb-3 rounded bg-red-100 p-2 text-red-700">{error}</p>}

      <form onSubmit={addProduct} className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input
          className="rounded border p-2"
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select
          className="rounded border p-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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
        <input
          className="rounded border p-2"
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
        <button
          disabled={adding}
          className="col-span-2 rounded bg-green-700 p-2 text-white disabled:opacity-50 sm:col-span-3"
        >
          {adding ? "Saving..." : "Add Item"}
        </button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map((c) => {
          const count =
            c === "All" ? products.length : products.filter((p) => catOf(p) === c).length;
          return (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`rounded-full border px-3 py-1 ${
                activeCat === c ? "bg-green-700 text-white" : ""
              }`}
            >
              {c} ({count})
            </button>
          );
        })}
      </div>

      {shownCats.map((cat) => {
        const items = products.filter((p) => catOf(p) === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">{cat}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((p) => {
                const low = p.stock <= p.low_stock_alert;
                return (
                  <div key={p.id} className="overflow-hidden rounded border">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-36 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-36 items-center justify-center bg-gray-200 text-gray-500">
                        No photo
                      </div>
                    )}
                    <div className="p-2">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm opacity-70">{fmtW(p.weight_grams)}</p>
                      <p>₹{p.price}</p>
                      <p className={`font-semibold ${low ? "text-red-600" : ""}`}>
                        Stock: {p.stock} {low && "⚠ Low"}
                      </p>
                      <div className="mt-1 flex items-center">
                        <input
                          className="w-14 rounded border p-1"
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
                      </div>
                      <label className="mt-2 block cursor-pointer text-sm underline">
                        {p.image_url ? "Change photo" : "Add photo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) changePhoto(p, f);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}