"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  weight_grams: number | null;
};
type CartItem = { product_id: string; name: string; price: number; qty: number };
type SavedBill = { name: string; phone: string; items: CartItem[]; total: number };

function label(p: { name: string; weight_grams: number | null }) {
  if (!p.weight_grams) return p.name;
  const w =
    p.weight_grams >= 1000
      ? `${Number((p.weight_grams / 1000).toFixed(2))}kg`
      : `${p.weight_grams}g`;
  return `${p.name} ${w}`;
}

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [qty, setQty] = useState("1");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedBill | null>(null);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,price,stock,weight_grams")
      .order("name")
      .order("weight_grams");
    if (error) setError(error.message);
    else setProducts(data as Product[]);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // Old customer aithe phone number tho name automatic ga vastundi
  async function lookupCustomer() {
    const p = phone.replace(/\D/g, "");
    if (p.length !== 10) return;
    const { data } = await supabase
      .from("customers")
      .select("name")
      .eq("phone", p)
      .maybeSingle();
    if (data?.name && !name) setName(data.name);
  }

  function addToCart() {
    setError("");
    const product = products.find((p) => p.id === selectedId);
    const q = Number(qty);
    if (!product || !q || q < 1) return;

    const already = cart.find((c) => c.product_id === product.id)?.qty ?? 0;
    if (already + q > product.stock) {
      setError(`${label(product)}: stock lo ${product.stock} matrame undi`);
      return;
    }

    const exists = cart.some((c) => c.product_id === product.id);
    setCart(
      exists
        ? cart.map((c) =>
            c.product_id === product.id ? { ...c, qty: c.qty + q } : c
          )
        : [
            ...cart,
            { product_id: product.id, name: label(product), price: product.price, qty: q },
          ]
    );
    setSelectedId("");
    setQty("1");
  }

  function removeFromCart(id: string) {
    setCart(cart.filter((c) => c.product_id !== id));
  }

  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  async function saveBill() {
    setError("");
    const cleanPhone = phone.replace(/\D/g, "");
    if (!name.trim()) return setError("Customer name enter cheyyandi");
    if (cleanPhone.length !== 10) return setError("10 digits phone number enter cheyyandi");
    if (cart.length === 0) return setError("Kanisam oka item add cheyyandi");

    setSaving(true);
    const { error } = await supabase.rpc("create_bill", {
      p_name: name.trim(),
      p_phone: cleanPhone,
      p_items: cart.map((c) => ({ product_id: c.product_id, qty: c.qty })),
    });
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSaved({ name: name.trim(), phone: cleanPhone, items: cart, total });
    setCart([]);
    setName("");
    setPhone("");
    loadProducts(); // stock taggindi, malli load
  }

  function whatsappLink(b: SavedBill) {
    const lines = b.items
      .map((i) => `${i.name} x ${i.qty} = ₹${i.price * i.qty}`)
      .join("\n");
    const msg =
      `*Open Farm Natural Store*\n` +
      `Namaste ${b.name}! Mee bill:\n\n${lines}\n\n` +
      `*Total: ₹${b.total}*\n\nDhanyavadalu, malli randi! 🙏`;
    return `https://wa.me/91${b.phone}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Billing</h1>

      {error && <p className="mb-3 rounded bg-red-100 p-2 text-red-700">{error}</p>}

      {saved && (
        <div className="mb-4 rounded border border-green-600 bg-green-50 p-3 text-black">
          <p className="font-semibold">Bill saved ✅ (Total ₹{saved.total})</p>
          <a
            href={whatsappLink(saved)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block rounded bg-green-600 px-4 py-2 text-white"
          >
            WhatsApp lo bill pampandi
          </a>
          <button onClick={() => setSaved(null)} className="ml-3 underline">
            Close
          </button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className="rounded border p-2"
          placeholder="Phone number (10 digits)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={lookupCustomer}
          inputMode="numeric"
        />
        <input
          className="rounded border p-2"
          placeholder="Customer name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="mb-4 flex gap-2">
        <select
          className="flex-1 rounded border p-2"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Item select cheyyandi</option>
          {products.map((p) => (
            <option key={p.id} value={p.id} disabled={p.stock <= 0}>
              {label(p)} - ₹{p.price} (stock {p.stock})
            </option>
          ))}
        </select>
        <input
          className="w-20 rounded border p-2"
          type="number"
          min="1"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <button onClick={addToCart} className="rounded bg-green-700 px-4 text-white">
          Add
        </button>
      </div>

      <table className="mb-4 w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="p-2">Item</th>
            <th className="p-2">Qty</th>
            <th className="p-2">Amount</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {cart.map((c) => (
            <tr key={c.product_id} className="border-b">
              <td className="p-2">{c.name}</td>
              <td className="p-2">{c.qty}</td>
              <td className="p-2">₹{c.price * c.qty}</td>
              <td className="p-2">
                <button onClick={() => removeFromCart(c.product_id)} className="text-red-600">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between">
        <p className="text-xl font-bold">Total: ₹{total}</p>
        <button
          onClick={saveBill}
          disabled={saving}
          className="rounded bg-green-700 px-6 py-3 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Bill"}
        </button>
      </div>
    </main>
  );
}