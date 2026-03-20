"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchCategories,
  uploadImage,
  uploadProductImages,
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

// Hàm xử lý link ảnh (nếu backend trả về link tương đối /uploads/...)
const resolveImgUrl = (url?: string) => {
  if (!url) return "https://placehold.co/400x400?text=No+Image";
  
  // 1. Nếu link đã có http (link ngoại hoặc ảnh cũ) thì trả về luôn
  if (url.startsWith("http")) return url;
  
  // 2. Lấy domain backend (Mặc định 5270)
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
  
  // 3. Đảm bảo nối đúng chuẩn: http://localhost:5270/uploads/products/abc.jpg
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${baseUrl}${cleanUrl}`;
};

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ State mới để chứa mảng file ảnh phụ chuẩn bị upload
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  // ✅ State mới để hiển thị các ảnh phụ đã có sẵn (khi bấm Sửa)
  const [existingImages, setExistingImages] = useState<string[]>([]);

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
    setAdditionalFiles([]); 
    setExistingImages([]);
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
    setAdditionalFiles([]);
    setExistingImages(product.additionalImages || []);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
    setAdditionalFiles([]);
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
      const basePayload = { ...form, discount: clampDiscount(form.discount) };
      let savedProductId = 0;

      if (editingProduct) {
        const updatePayload = {
          ...basePayload,
          retainedAdditionalImages: existingImages // Báo cho Backend biết
        };
        
        await updateProduct(editingProduct.id, updatePayload);
        savedProductId = editingProduct.id;
        toast.success("Cập nhật thông tin thành công");
      } else {
        const res = await createProduct(basePayload);
        savedProductId = res.data.id; // Lấy ID sản phẩm vừa tạo
        toast.success("Thêm sản phẩm thành công");
      }

      // Nếu có chọn ảnh phụ mới thì vác đi upload
      if (additionalFiles.length > 0 && savedProductId > 0) {
        const fd = new FormData();
        additionalFiles.forEach((file) => fd.append("files", file));
        
        await uploadProductImages(savedProductId, fd);
        toast.success("Tải ảnh phụ thành công");
      }

      closeModal();
      loadProducts(); // Load lại data cho mới
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

  const removeAdditionalFile = (index: number) => {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ 1. Hàm xóa ảnh phụ cũ (khi đang sửa sản phẩm)
  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ 2. Hàm hoán đổi ảnh phụ (đã có sẵn) lên làm Ảnh bìa
  const setExistingAsCover = (index: number) => {
    const clickedUrl = existingImages[index];
    const oldCover = form.imageUrl;
    
    setForm(prev => ({ ...prev, imageUrl: clickedUrl }));
    setExistingImages(prev => {
      const newArr = [...prev];
      newArr.splice(index, 1); // Xóa khỏi danh sách phụ
      if (oldCover) newArr.push(oldCover); // Nhét ảnh bìa cũ xuống làm ảnh phụ
      return newArr;
    });
  };

  // ✅ 3. Hàm hoán đổi ảnh phụ (vừa chọn từ máy) lên làm Ảnh bìa
  const setNewAsCover = async (index: number) => {
    const file = additionalFiles[index];
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await uploadImage(fd);
      const newUrl = res.data.imageUrls?.[0] || "";

      if (newUrl) {
        const oldCover = form.imageUrl;
        setForm(prev => ({ ...prev, imageUrl: newUrl }));
        setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
        if (oldCover) setExistingImages(prev => [...prev, oldCover]);
        toast.success("Đã đổi ảnh bìa!");
      }
    } catch (err) {
      toast.error("Lỗi khi tải ảnh lên");
    } finally {
      setUploading(false);
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
                                src={resolveImgUrl(product.imageUrl)} // Dùng hàm mới ở trên
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

            {/* ✅ KHU VỰC UPLOAD ẢNH GỘP CHUNG (1 Ô DUY NHẤT) */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800">
                Hình ảnh sản phẩm
              </label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    if (!e.target.files?.length) return;
                    const files = Array.from(e.target.files);

                    // Logic: Nếu chưa có ảnh chính, lấy file đầu tiên đem up làm ảnh chính, còn lại cho vào ảnh phụ
                    if (!form.imageUrl && files.length > 0) {
                      const firstFile = files[0];
                      const restFiles = files.slice(1);

                      setUploading(true);
                      try {
                        const fd = new FormData();
                        fd.append("files", firstFile);
                        const res = await uploadImage(fd);
                        const firstUrl = res.data.imageUrls?.[0] || "";
                        if (firstUrl) {
                          setForm((prev) => ({ ...prev, imageUrl: firstUrl }));
                        }
                        // Đẩy các file còn lại vào mảng chờ
                        if (restFiles.length > 0) {
                          setAdditionalFiles((prev) => [...prev, ...restFiles]);
                        }
                      } catch (err) {
                        toast.error("Tải ảnh đại diện thất bại");
                      } finally {
                        setUploading(false);
                      }
                    } else {
                      // Nếu đã có ảnh chính rồi, thì tất cả file chọn thêm đều tống vào ảnh phụ
                      setAdditionalFiles((prev) => [...prev, ...files]);
                    }
                    
                    // Reset input để chọn lại cùng file thoải mái
                    e.target.value = '';
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-200 focus:outline-none"
                />
                
                {uploading && <div className="mt-2 text-sm font-medium text-blue-600 animate-pulse">⏳ Đang xử lý ảnh...</div>}

                {/* KHUNG HIỂN THỊ TẤT CẢ ẢNH THEO DẠNG GALLERY */}
                <div className="mt-5 flex flex-wrap gap-5">
                  
                  {/* 1. Ảnh Bìa (Thumbnail) */}
                  {form.imageUrl && (
                    <div className="relative h-24 w-24 shrink-0 group">
                      <span className="absolute -top-3 -left-3 z-10 rounded-md bg-yellow-400 px-2 py-1 text-[10px] font-bold uppercase text-white shadow-md">
                        Ảnh bìa
                      </span>
                      <img
                        src={resolveImgUrl(form.imageUrl)} 
                        alt="Thumbnail"
                        className="h-full w-full rounded-xl border-2 border-yellow-400 object-cover shadow-sm"
                      />
                      {/* ✅ Đã bỏ opacity-0, hiện luôn nút xóa */}
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({...prev, imageUrl: ""}))}
                        className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-md hover:bg-red-600"
                        title="Xóa ảnh bìa"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* 2. Ảnh phụ cũ từ Database (Khi bấm sửa) */}
                  {existingImages.map((imgUrl, idx) => (
                    <div key={`exist-${idx}`} className="relative h-24 w-24 shrink-0 group overflow-hidden rounded-xl border border-gray-300 shadow-sm">
                      <img
                        src={resolveImgUrl(imgUrl)} 
                        className="h-full w-full object-cover opacity-90"
                        alt="preview"
                      />
                      {/* ✅ Đã bỏ opacity-0 */}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-md hover:bg-red-600"
                        title="Xóa ảnh phụ"
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        onClick={() => setExistingAsCover(idx)}
                        className="absolute bottom-0 left-0 w-full bg-black/60 py-1 text-[10px] text-white opacity-0 transition-opacity hover:bg-blue-600 group-hover:opacity-100 font-medium"
                      >
                        Làm ảnh bìa
                      </button>
                    </div>
                  ))}

                  {/* 3. Ảnh phụ mới chuẩn bị tải lên */}
                  {additionalFiles.map((file, idx) => (
                    <div key={`new-${idx}`} className="relative h-24 w-24 shrink-0 group overflow-hidden rounded-xl border-2 border-dashed border-blue-400 shadow-sm">
                      <span className="absolute top-1 left-1 z-10 rounded-md bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md">
                        Mới
                      </span>
                      <img
                        src={URL.createObjectURL(file)}
                        className="h-full w-full object-cover"
                        alt="preview"
                      />
                      {/* ✅ Đã bỏ opacity-0 */}
                      <button
                        type="button"
                        onClick={() => removeAdditionalFile(idx)}
                        className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-md hover:bg-red-600"
                        title="Xóa ảnh phụ"
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAsCover(idx)}
                        className="absolute bottom-0 left-0 w-full bg-black/60 py-1 text-[10px] text-white opacity-0 transition-opacity hover:bg-blue-600 group-hover:opacity-100 font-medium"
                      >
                        Làm ảnh bìa
                      </button>
                    </div>
                  ))}
                  
                </div>
              </div>
            </div>
            {/* ✅ KẾT THÚC KHU VỰC UPLOAD GỘP CHUNG */}


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