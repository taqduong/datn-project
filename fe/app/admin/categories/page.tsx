"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import api, {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from "@/services/api";
import toast from "react-hot-toast";

type CategoryForm = {
  name: string;
  description: string;
};

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [form, setForm] = useState<CategoryForm>({
    name: "",
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);

  // --- STATE VÀ HÀM CHO IMPORT FILE ---
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append("file", file); // Chữ "file" khớp với [FromForm] IFormFile file bên C#
      
      //  Ép Axios phải dùng 'multipart/form-data' thay vì 'application/json' mặc định
      const res = await api.post("/Categories/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      toast.success(res.data.message || "Import thành công!");
      await loadCategories(); // Load lại bảng danh sách
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Lỗi từ C# gửi về!";
      toast.error(errorMessage);
      console.error("🚨 Chi tiết lỗi:", error.response?.data || error);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const nameInputRef = useRef<HTMLInputElement>(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetchCategories();
      setCategories(res.data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách nhóm sản phẩm:", error);
      toast.error("Không tải được danh sách danh mục");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const keyword = searchKeyword.toLowerCase();
      return (
        category.name.toLowerCase().includes(keyword) ||
        (category.description || "").toLowerCase().includes(keyword)
      );
    });
  }, [categories, searchKeyword]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
    });
    setIsEditing(false);
    setEditCategoryId(null);
  };

  const handleCreateCategory = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setSubmitting(true);
      const res = await createCategory({
        name: form.name.trim(),
        description: form.description.trim(),
      });

      setCategories((prev) => [...prev, res.data]);
      resetForm();
      toast.success("Thêm danh mục thành công");
    } catch (error) {
      console.error("Lỗi khi tạo nhóm sản phẩm:", error);
      toast.error("Có lỗi xảy ra khi tạo danh mục");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!isEditing || editCategoryId === null) return;

    if (!form.name.trim() || !form.description.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setSubmitting(true);

      await updateCategory(editCategoryId, {
        name: form.name.trim(),
        description: form.description.trim(),
      });

      setCategories((prev) =>
        prev.map((category) =>
          category.id === editCategoryId
            ? {
                ...category,
                name: form.name.trim(),
                description: form.description.trim(),
              }
            : category
        )
      );

      resetForm();
      toast.success("Cập nhật danh mục thành công");
    } catch (error) {
      console.error("Lỗi khi cập nhật nhóm sản phẩm:", error);
      toast.error("Có lỗi xảy ra khi cập nhật danh mục");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const confirmDelete = window.confirm(
      "Bạn có chắc chắn muốn xóa nhóm sản phẩm này?"
    );
    if (!confirmDelete) return;

    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((category) => category.id !== id));
      toast.success("Xóa danh mục thành công");
    } catch (error: any) {
      console.error("Lỗi khi xóa nhóm sản phẩm:", error);

      const message =
        error?.response?.data?.message ||
        "Không thể xóa danh mục. Có thể danh mục này đang chứa sản phẩm.";

      toast.error(message);
    }
  };

  const handleEditCategory = (category: Category) => {
    setIsEditing(true);
    setEditCategoryId(category.id);
    setForm({
      name: category.name,
      description: category.description || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });

    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="mx-auto w-full max-w-screen-2xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold text-gray-800">
              <span className="rounded-lg bg-purple-100 p-2">📂</span>
              Quản lý Danh mục
            </h1>
            <p className="text-gray-600">Quản lý danh mục và phân loại sản phẩm</p>
          </div>

          <div className="flex items-center gap-6">
            {/* Nút Upload File */}
            <div>
              <input
                type="file"
                id="import-excel"
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <label
                htmlFor="import-excel"
                className="cursor-pointer flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50"
              >
                {isUploading ? "⏳ Đang xử lý..." : "📁 Import từ File Excel"}
              </label>
            </div>

            {/* Thống kê số lượng */}
            <div className="text-right border-l-2 border-gray-200 pl-6">
              <div className="text-2xl font-bold text-gray-800">
                {categories.length}
              </div>
              <div className="text-sm text-gray-600">Tổng số danh mục</div>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-800">
            {isEditing ? (
              <>
                <span className="rounded-lg bg-yellow-100 p-2 text-yellow-600">
                  ✏️
                </span>
                Cập nhật danh mục
              </>
            ) : (
              <>
                <span className="rounded-lg bg-green-100 p-2 text-green-600">
                  ➕
                </span>
                Thêm danh mục mới
              </>
            )}
          </h2>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tên danh mục *
              </label>
              <input
                ref={nameInputRef}
                type="text"
                name="name"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={form.name}
                onChange={handleChange}
                placeholder="Nhập tên danh mục"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Mô tả danh mục *
              </label>
              <input
                type="text"
                name="description"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={form.description}
                onChange={handleChange}
                placeholder="Nhập mô tả danh mục"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleUpdateCategory}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-yellow-500 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="animate-pulse">⏳</span>
                  ) : (
                    <span>✅</span>
                  )}
                  Cập nhật danh mục
                </button>

                <button
                  onClick={resetForm}
                  disabled={submitting}
                  className="rounded-lg bg-gray-400 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-gray-500 disabled:opacity-50"
                >
                  Hủy
                </button>
              </>
            ) : (
              <button
                onClick={handleCreateCategory}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <span className="animate-pulse">⏳</span>
                ) : (
                  <span>➕</span>
                )}
                Thêm danh mục mới
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mô tả danh mục..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <button
              onClick={() => setSearchKeyword("")}
              className="rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Xóa tìm kiếm
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
              <span className="rounded-lg bg-blue-100 p-2 text-blue-600">📋</span>
              Danh sách danh mục
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      STT
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tên danh mục
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Mô tả
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className="mb-4 text-5xl">📂</span>
                          <h3 className="mb-2 text-lg font-medium text-gray-900">
                            Không có danh mục phù hợp
                          </h3>
                          <p className="mb-4 text-gray-500">
                            Hãy thử đổi từ khóa tìm kiếm
                          </p>
                          <button
                            className="rounded-lg bg-purple-600 px-4 py-2 text-white transition duration-300 hover:bg-purple-700"
                            onClick={() => {
                              setSearchKeyword("");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            + Thêm danh mục
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((category, index) => (
                      <tr
                        key={category.id}
                        className="transition-colors duration-150 hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {index + 1}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {category.name}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div
                            className="max-w-md truncate text-sm text-gray-600"
                            title={category.description}
                          >
                            {category.description}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="flex items-center gap-1 rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors duration-150 hover:bg-blue-100 hover:text-blue-900"
                              title="Sửa danh mục"
                            >
                              <span>✏️</span>
                              <span className="text-xs">Sửa</span>
                            </button>

                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="flex items-center gap-1 rounded-lg bg-red-50 p-2 text-red-600 transition-colors duration-150 hover:bg-red-100 hover:text-red-900"
                              title="Xóa danh mục"
                            >
                              <span>🗑️</span>
                              <span className="text-xs">Xóa</span>
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
      </div>
    </div>
  );
}