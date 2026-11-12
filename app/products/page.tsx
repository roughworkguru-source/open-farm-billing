"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const CATEGORIES = ["Dry Fruits", "Spices", "Powders", "Seeds", "Oils", "General"];
const PACKAGINGS = ["Premium Packaging", "Transparent Packaging"];

type Product = {
  id: string;
  name: string;
  category: string | null;
  packaging: string | null;
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

function packOf(p: Product) {
  return PACKAGINGS.includes(p.packaging ?? "") ? (p.packaging as string) : PACKAGINGS[0];
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
  const [activePack, setActivePack] = useState("All");
  const [activeCat, setActiveCat] = useState("All");
  const [error, setError] = useState("");
  const [addQty, setAddQty] = useState<Record<string, string>>({});

  // Kotha item form
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [packaging, setPackaging] = useState(PACKAGINGS[0]);
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  // Edit form
  const [editing, setEditing] = useState<Product | null>(null);
  const [ef, setEf] = useState({
    name: "",
    category: CATEGORIES[0],
    packaging: PACKAGINGS[0],
    weight: "",
    price: "",
    stock: "",
    low: "5",
  });
  const [efPhoto, setEfPhoto] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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
        packaging,
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

  function openEdit(p: Product) {
    setError("");
    setEditing(p);
    setEfPhoto(null);
    setEf({
      name: p.name,
      category: catOf(p),
      packaging: packOf(p),
      weight: p.weight_grams ? String(p.weight_grams) : "",
      price: String(p.price),
      stock: String(p.stock),
      low: String(p.low_stock_alert),
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    setSavingEdit(true);
    try {
      const patch: Record<string, unknown> = {
        name: ef.name.trim(),
        category: ef.category,
        packaging: ef.packaging,
        weight_grams: ef.weight ? Number(ef.weight) : null,
        price: Number(ef.price),
        stock: Number(ef.stock || 0),
        low_stock_alert: Number(ef.low || 0),
      };
      if (efPhoto) patch.image_url = await uploadPhoto(efPhoto);
      const { error } = await supabase.from("products").update(patch).eq("id", editing.id);
      if (error) throw error;
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save avvaledu");
    }
    setSavingEdit(false);
  }

  async function deleteProduct() {
    if (!editing) return;
    if (!confirm(`"${editing.name}" ni delete cheyyala?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", editing.id);
    if (error) {
      setEditing(null);
      setError("Ee item tho bills unnayi, delete cheyyaleru. Stock 0 cheyyandi.");
      return;
    }
    setEditing(null);
    load();
  }

  const byPack = products.filter((p) => activePack === "All" || packOf(p) === activePack);
  const shownCats = activeCat === "All" ? CATEGORIES : [activeCat];

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Products & Stock</h1>

      {error && !editing && (
        <p className="mb-3 rounded bg-red-100 p-2 text-red-700">{error}</p>
      )}

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
        <select
          className="rounded border p-2"
          value={packaging}
          onChange={(e) => setPackaging(e.target.value)}
        >
          {PACKAGINGS.map((c) => (
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
          className="col-span-2 rounded border p-2 sm:col-span-3"
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

      <div className="mb-3 flex flex-wrap gap-2">
        {["All", ...PACKAGINGS].map((c) => {
          const count =
            c === "All" ? products.length : products.filter((p) => packOf(p) === c).length;
          return (
            <button
              key={c}
              onClick={() => setActivePack(c)}
              className={`rounded border-2 px-4 py-2 font-semibold ${
                activePack === c ? "bg-green-700 text-white" : ""
              }`}
            >
              {c} ({count})
            </button>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map((c) => {
          const count =
            c === "All" ? byPack.length : byPack.filter((p) => catOf(p) === c).length;
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

      {byPack.length === 0 && <p className="opacity-70">Ee packaging lo items levu</p>}

      {shownCats.map((cat) => {
        const items = byPack.filter((p) => catOf(p) === cat);
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
                      <img src={p.image_url} alt={p.name} className="h-36 w-full object-cover" />
                    ) : (
                      <div className="flex h-36 items-center justify-center bg-gray-200 text-gray-500">
                        No photo
                      </div>
                    )}
                    <div className="p-2">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm opacity-70">{fmtW(p.weight_grams)}</p>
                      <p className="text-xs opacity-70">{packOf(p)}</p>
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
                      <button
                        onClick={() => openEdit(p)}
                        className="mt-2 w-full rounded border px-3 py-1 text-sm font-semibold"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

            {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={saveEdit}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded bg-white p-4 text-black"
          >
            <h2 className="mb-3 text-xl font-bold">Edit item</h2>

            {error && <p className="mb-3 rounded bg-red-100 p-2 text-red-700">{error}</p>}

            {editing.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={editing.image_url}
                alt={editing.name}
                className="mb-3 h-32 w-full rounded object-cover"
              />
            )}

            <label className="text-sm">Item name</label>
            <input
              className="mb-2 w-full rounded border bg-white p-2 text-black"
              value={ef.name}
              onChange={(e) => setEf({ ...ef, name: e.target.value })}
              required
            />

            <label className="text-sm">Packaging</label>
            <select
              className="mb-2 w-full rounded border bg-white p-2 text-black"
              value={ef.packaging}
              onChange={(e) => setEf({ ...ef, packaging: e.target.value })}
            >
              {PACKAGINGS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label className="text-sm">Category</label>
            <select
              className="mb-2 w-full rounded border bg-white p-2 text-black"
              value={ef.category}
              onChange={(e) => setEf({ ...ef, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="mb-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm">Weight (grams)</label>
                <input
                  className="w-full rounded border bg-white p-2 text-black"
                  type="number"
                  value={ef.weight}
                  onChange={(e) => setEf({ ...ef, weight: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm">Price ₹</label>
                <input
                  className="w-full rounded border bg-white p-2 text-black"
                  type="number"
                  step="any"
                  value={ef.price}
                  onChange={(e) => setEf({ ...ef, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm">Stock</label>
                <input
                  className="w-full rounded border bg-white p-2 text-black"
                  type="number"
                  value={ef.stock}
                  onChange={(e) => setEf({ ...ef, stock: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm">Low stock limit</label>
                <input
                  className="w-full rounded border bg-white p-2 text-black"
                  type="number"
                  value={ef.low}
                  onChange={(e) => setEf({ ...ef, low: e.target.value })}
                />
              </div>
            </div>

            <label className="text-sm">Kotha photo (kavalante matrame)</label>
            <input
              className="mb-4 w-full rounded border bg-white p-2 text-black"
              type="file"
              accept="image/*"
              onChange={(e) => setEfPhoto(e.target.files?.[0] ?? null)}
            />

            <div className="flex gap-2">
              <button
                disabled={savingEdit}
                className="flex-1 rounded bg-green-700 p-2 text-white disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded border p-2"
              >
                Cancel
              </button>
            </div>
            <button
              type="button"
              onClick={deleteProduct}
              className="mt-3 w-full text-sm text-red-600 underline"
            >
              Delete this item
            </button>
          </form>
        </div>
      )}
    </main>
  );
}