"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchCategories,
  uploadImage,
  type Product,
  type Category,
} from "@/services/api";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";

type ProductForm = {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  discount: number;
  categoryId: number;
};

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");

  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    imageUrl: "",
    discount: 0,
    categoryId: 0,
  });

  const clampDiscount = (d: number) => {
    if (Number.isNaN(d)) return 0;
    if (d < 0) return 0;
    if (d > 99) return 99;
    return Math.floor(d);
  };

  const finalPrice = (price: number, discount: number) => {
    const d = clampDiscount(discount);
    const base = Number.isFinite(price) && price > 0 ? price : 0;
    return Math.max(0, Number((base * (1 - d / 100)).toFixed(2)));
  };

  const formatVND = (v: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(v || 0);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetchProducts();
      setProducts(res.data);
    } catch (error) {
      console.error("Lỗi khi tải sản phẩm:", error);
      toast.error("Không tải được danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetchCategories();
      setCategories(res.data);
    } catch (error) {
      console.error("Lỗi khi tải danh mục:", error);
      toast.error("Không tải được danh mục");
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchKeyword =
        product.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (product.description || "")
          .toLowerCase()
          .includes(searchKeyword.toLowerCase());

      const matchCategory =
        selectedCategory === "all"
          ? true
          : product.categoryId === selectedCategory;

      return matchKeyword && matchCategory;
    });
  }, [products, searchKeyword, selectedCategory]);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm({
      name: "",
      description: "",
      price: 0,
      stock: 0,
      imageUrl: "",
      discount: 0,
      categoryId: categories[0]?.id || 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price || 0,
      stock: product.stock || 0,
      imageUrl: product.imageUrl || "",
      discount: product.discount || 0,
      categoryId: product.categoryId || categories[0]?.id || 0,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "discount") {
      setForm((prev) => ({ ...prev, discount: clampDiscount(Number(value)) }));
      return;
    }

    if (name === "price" || name === "stock" || name === "categoryId") {
      setForm((prev) => ({ ...prev, [name]: Number(value) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        discount: clampDiscount(form.discount),
      };

      if (editingProduct) {
        const res = await updateProduct(editingProduct.id, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? res.data : p))
        );
        toast.success("Cập nhật sản phẩm thành công");
      } else {
        const res = await createProduct(payload);
        setProducts((prev) => [...prev, res.data]);
        toast.success("Thêm sản phẩm thành công");
      }

      closeModal();
    } catch (error) {
      console.error("Lỗi khi lưu sản phẩm:", error);
      toast.error("Có lỗi xảy ra khi lưu sản phẩm");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Xóa sản phẩm thành công");
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm:", error);
      toast.error("Có lỗi xảy ra khi xóa sản phẩm");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-white px-6 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold text-gray-800">
            <span className="rounded-lg bg-blue-100 p-2">📦</span>
            Quản lý Sản phẩm
          </h1>
          <p className="text-gray-600">
            Quản lý danh sách sản phẩm và thông tin chi tiết
          </p>
        </div>

        <button
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white shadow transition duration-300 hover:bg-blue-700"
          onClick={openAddModal}
        >
          <span>+</span> Thêm sản phẩm mới
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng sản phẩm</p>
              <h3 className="text-2xl font-bold text-gray-800">{products.length}</h3>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <span className="text-xl text-blue-600">📦</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sản phẩm có sẵn</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {products.filter((p) => p.stock > 0).length}
              </h3>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <span className="text-xl text-green-600">✅</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sản phẩm hết hàng</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {products.filter((p) => p.stock === 0).length}
              </h3>
            </div>
            <div className="rounded-lg bg-red-100 p-3">
              <span className="text-xl text-red-600">⚠️</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Đang giảm giá</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {products.filter((p) => (p.discount || 0) > 0).length}
              </h3>
            </div>
            <div className="rounded-lg bg-yellow-100 p-3">
              <span className="text-xl text-yellow-600">🔥</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mô tả sản phẩm..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="rounded-lg border border-gray-300 p-3 placeholder-black focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
            className="rounded-lg border border-gray-300 p-3 text-black focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all" style={{ color: "black" }}>Tất cả danh mục</option>
            {categories.map((c) => (
              <option value={c.id} key={c.id} style={{ color: "black" }}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearchKeyword("");
              setSelectedCategory("all");
            }}
            className="rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Sản phẩm
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Giá
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tồn kho
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Danh mục
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Giảm giá
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className="mb-4 text-5xl">📦</span>
                        <h3 className="mb-2 text-lg font-medium text-gray-900">
                          Không có sản phẩm phù hợp
                        </h3>
                        <p className="mb-4 text-gray-500">
                          Hãy thử đổi từ khóa tìm kiếm hoặc bộ lọc
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="transition-colors duration-150 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {product.imageUrl ? (
                              <img
                                className="h-12 w-12 object-cover"
                                src={product.imageUrl}
                                alt={product.name}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-500">
                                <span>📷</span>
                              </div>
                            )}
                          </div>

                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="max-w-xs line-clamp-1 text-sm text-gray-500">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatVND(product.price)}
                        </div>
                        {(product.discount || 0) > 0 && (
                          <div className="text-xs text-green-600">
                            Sau giảm: {formatVND(product.priceAfterDiscount || 0)}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            product.stock > 10
                              ? "bg-green-100 text-green-800"
                              : product.stock > 0
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {product.stock > 0 ? `${product.stock} sản phẩm` : "Hết hàng"}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.categoryName || "Không có"}
                      </td>

                      <td className="px-6 py-4">
                        {(product.discount || 0) > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                            -{product.discount}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Không giảm</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors duration-150 hover:bg-blue-100 hover:text-blue-900"
                            onClick={() => openEditModal(product)}
                            title="Sửa sản phẩm"
                          >
                            ✏️
                          </button>

                          <button
                            className="rounded-lg bg-red-50 p-2 text-red-600 transition-colors duration-150 hover:bg-red-100 hover:text-red-900"
                            onClick={() => handleDelete(product.id)}
                            title="Xóa sản phẩm"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal}>
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
              {editingProduct ? (
                <>
                  <span className="rounded-lg bg-yellow-100 p-2 text-yellow-600">✏️</span>
                  Sửa sản phẩm
                </>
              ) : (
                <>
                  <span className="rounded-lg bg-blue-100 p-2 text-blue-600">➕</span>
                  Thêm sản phẩm mới
                </>
              )}
            </h2>

            <button
              onClick={closeModal}
              className="text-gray-400 transition-colors duration-150 hover:text-gray-500"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tên sản phẩm *
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nhập tên sản phẩm"
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Danh mục *
                </label>
                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mô tả sản phẩm
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Mô tả về sản phẩm"
                rows={3}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Giá gốc *
                </label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  min={0}
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-600">
                  Giá sau giảm:{" "}
                  <b>{formatVND(finalPrice(form.price, form.discount ?? 0))}</b>
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tồn kho *
                </label>
                <input
                  type="number"
                  name="stock"
                  value={form.stock}
                  onChange={handleChange}
                  min={0}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Giảm giá (%)
                </label>
                <input
                  type="number"
                  name="discount"
                  value={form.discount}
                  onChange={handleChange}
                  min={0}
                  max={99}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Hình ảnh sản phẩm
              </label>

              <div className="flex flex-col space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    if (!e.target.files?.length) return;

                    setUploading(true);
                    try {
                      const fd = new FormData();
                      Array.from(e.target.files).forEach((f) => fd.append("files", f));

                      const res = await uploadImage(fd);
                      const first = res.data.imageUrls?.[0] || "";

                      if (!first) {
                        toast.error("Không nhận được ảnh");
                        return;
                      }

                      setForm((prev) => ({ ...prev, imageUrl: first }));
                      toast.success("Tải ảnh lên thành công");
                    } catch (err) {
                      console.error("Upload failed", err);
                      toast.error("Tải ảnh thất bại");
                    } finally {
                      setUploading(false);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 p-3 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {uploading && (
                  <div className="flex items-center text-blue-600">
                    <span className="mr-2 animate-pulse">⏳</span>
                    Đang tải ảnh lên...
                  </div>
                )}

                {form.imageUrl && (
                  <div className="mt-2">
                    <p className="mb-2 text-sm text-gray-600">Ảnh xem trước:</p>
                    <img
                      src={form.imageUrl}
                      alt="Ảnh đại diện"
                      className="h-32 w-32 rounded-lg border object-cover shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50"
              >
                Hủy
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white shadow transition-colors duration-150 hover:bg-blue-700"
              >
                {editingProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}