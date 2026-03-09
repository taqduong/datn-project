"use client";

import { useEffect, useState } from "react";
import { fetchProducts } from "@/services/api";

type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  stock: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts()
      .then((res) => setProducts(res.data))
      .catch((error) => console.error("Lỗi khi tải sản phẩm:", error));
  }, []);

  return (
    <main className="p-10">
      <h1 className="mb-6 text-2xl font-bold">Danh sách sản phẩm</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="rounded-lg border p-4 shadow">
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="text-gray-600">{p.price.toLocaleString()}đ</p>
            <p className="text-sm text-gray-500">{p.description}</p>
            <p className="text-sm text-gray-500">Tồn kho: {p.stock}</p>
          </div>
        ))}
      </div>
    </main>
  );
}