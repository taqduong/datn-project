"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import api, {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadImage,
  resolveImgUrl,
  type Category,
} from "@/services/api";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";

type CategoryForm = {
  name: string;
  description: string;
  imageUrl: string;
};

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [form, setForm] = useState<CategoryForm>({
    name: "",
    description: "",
    imageUrl: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);

  const handleCloseImportModal = () => {
    setImportModalOpen(false);
    setImportStep(1);
    setPreviewData([]);
    setSelectedExcelFile(null);
    setSelectedZipFile(null);
  };

  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const toastId = toast.loading("Đang tải ảnh lên...");
      const fd = new FormData();
      fd.append("Files", file); // Phải viết hoa chữ F cho khớp với Backend
      
      const res = await uploadImage(fd);
      if (res.data.imageUrls && res.data.imageUrls.length > 0) {
        setForm(prev => ({ ...prev, imageUrl: res.data.imageUrls[0] }));
        toast.success("Tải ảnh thành công", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi tải ảnh lên");
    }
  };

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
    setForm({ name: "", description: "", imageUrl: "" });
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
        imageUrl: form.imageUrl, 
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
        imageUrl: form.imageUrl, 
      });

      setCategories((prev) =>
        prev.map((category) =>
          category.id === editCategoryId
            ? {
                ...category,
                name: form.name.trim(),
                description: form.description.trim(),
                imageUrl: form.imageUrl, 
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
      imageUrl: category.imageUrl || "",
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
            {/* Nút Mở Modal Import */}
            <div>
              <button
                onClick={() => setImportModalOpen(true)}
                className="cursor-pointer flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-400 shadow-sm px-6 py-3 text-base font-semibold text-emerald-700 transition hover:bg-emerald-100 hover:text-emerald-800"
              >
                📁 Nhập từ File Excel
              </button>
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

            {/* GIAO DIỆN UPLOAD ẢNH */}
            <div className="md:col-span-2 mt-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Ảnh đại diện danh mục
              </label>
              <div className="flex items-center gap-4">
                {form.imageUrl ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                    <img src={resolveImgUrl(form.imageUrl)} alt="Preview" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setForm(prev => ({...prev, imageUrl: ""}))} className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-bl-lg bg-red-500 text-xs font-bold text-white transition hover:bg-red-600">✕</button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-2xl text-gray-400">
                    🖼️
                  </div>
                )}
                <div>
                  <input type="file" id="category-img" className="hidden" accept="image/*" onChange={handleUploadImage} disabled={submitting} />
                  <label htmlFor="category-img" className="cursor-pointer rounded-lg bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 border border-purple-200 hover:bg-purple-100 transition shadow-sm">
                    Tải ảnh lên
                  </label>
                </div>
              </div>
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
                      Ảnh
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
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
                        <td className="px-6 py-4">
                          {category.imageUrl ? (
                            <img
                              src={resolveImgUrl(category.imageUrl)}
                              alt={category.name}
                              className="h-14 w-14 rounded-xl object-cover border border-gray-200 shadow hover:scale-105 transition"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed text-gray-400 text-xs">
                              No Img
                            </div>
                          )}
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
      {/* ================= MODAL IMPORT DANH MỤC 2 BƯỚC ================= */}
      <Modal isOpen={importModalOpen} onClose={handleCloseImportModal}>
        <div className={`w-full rounded-xl bg-white p-6 transition-all duration-300 ${importStep === 2 ? 'max-w-4xl' : 'max-w-3xl'}`}>
          <div className="mb-6 flex items-center justify-between pb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {importStep === 1 ? "Nhập danh mục hàng loạt" : "Xem trước dữ liệu danh mục"}
            </h2>
          </div>

          {/* BƯỚC 1: CHỌN FILE */}
          {importStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Chọn File Excel (.xlsx) *
                </label>

                <div className="w-[520px]">
                  <input
                    id="category-excel-upload"
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => setSelectedExcelFile(e.target.files?.[0] || null)}
                  />

                  <label
                    htmlFor="category-excel-upload"
                    className="flex cursor-pointer items-center rounded-lg border border-gray-300 px-3 py-2.5 text-black hover:border-purple-400"
                  >
                    <span className="truncate">
                      {selectedExcelFile ? selectedExcelFile.name : "Chọn tệp"}
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  2. File nén chứa ẢNH (.zip) - Không bắt buộc
                </label>
                <div className="w-[520px]">
                  <input
                    id="category-zip-upload"
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => setSelectedZipFile(e.target.files?.[0] || null)}
                  />
                  <label
                    htmlFor="category-zip-upload"
                    className="flex cursor-pointer items-center rounded-lg border border-gray-300 px-3 py-2.5 text-black hover:border-purple-400"
                  >
                    <span className="truncate">
                      {selectedZipFile ? selectedZipFile.name : "Chọn tệp"}
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-8 w-full flex justify-end gap-3">
                <button type="button" onClick={handleCloseImportModal} className="cursor-pointer rounded-lg bg-black px-6 py-2.5 font-bold text-white transition hover:bg-gray-800">Hủy</button>
                <button 
                  type="button" 
                  disabled={!selectedExcelFile || isUploadingExcel} 
                  onClick={async () => {
                    try {
                      setIsUploadingExcel(true);
                      const fd = new FormData();
                      fd.append("excelFile", selectedExcelFile!); // Đổi "file" thành "excelFile"
                      if (selectedZipFile) fd.append("zipFile", selectedZipFile); // Thêm zipFile

                      const res = await api.post("/categories/preview-import", fd, { headers: { "Content-Type": "multipart/form-data" } });
                      setPreviewData(res.data);
                      setImportStep(2); 
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || "Lỗi đọc file nháp!");
                    } finally {
                      setIsUploadingExcel(false);
                    }
                  }}
                  className="cursor-pointer rounded-lg bg-purple-600 px-6 py-2.5 font-bold text-white shadow-md transition hover:bg-purple-700 disabled:opacity-50"
                >
                  {isUploadingExcel ? "⏳ Đang quét..." : "Xem trước dữ liệu"}
                </button>
              </div>
            </div>
          )}

          {/* BƯỚC 2: BẢNG PREVIEW */}
          {importStep === 2 && (
            <div>
              <div className="max-h-[60vh] overflow-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-100 text-gray-800 shadow-sm">
                    <tr>
                      <th className="p-4 font-semibold w-[60px]">Dòng</th>
                      <th className="p-4 font-semibold w-[350px]">Tên Danh Mục</th>
                      <th className="p-4 font-semibold w-[400px]">Mô Tả</th>
                      <th className="p-4 font-semibold w-[200px]">Tên Ảnh</th> 
                      <th className="p-4 text-center font-semibold w-[140px]">Trạng thái</th>
                      <th className="p-4 font-semibold min-w-[140px]">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={row.isValid 
                          ? "bg-white hover:bg-gray-50" 
                          : "bg-red-50 hover:bg-red-100"}
                      >
                        <td className="p-4 text-black font-medium">{idx + 1}</td>

                        <td className="p-4 text-black font-semibold text-base">
                          {row.name || "-"}
                        </td>

                        <td className="p-4 text-gray-700">{row.description || "-"}</td>

                        <td className="p-4 text-gray-700 italic">
                          {row.imageFileName || "Không có"}
                        </td>

                        <td className="p-4 text-center w-[140px]">
                          {row.isValid ? (
                            <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 border border-green-200">
                              Hợp lệ
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
                              Lỗi
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-red-600 text-xs font-semibold uppercase">
                          {row.errors?.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex items-center justify-between border-t pt-5">
                <p className="text-sm font-semibold text-gray-600 italic">
                  * Hệ thống sẽ tự động loại bỏ <span className="text-red-600 font-black">{previewData.filter(r => !r.isValid).length}</span> dòng lỗi khi lưu.
                </p>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setImportStep(1)} 
                    className="cursor-pointer rounded-lg bg-black px-6 py-2.5 font-bold text-white transition hover:bg-gray-800"
                  >
                    Quay lại
                  </button>
                  <button 
                    type="button" 
                    disabled={isUploadingExcel}
                    onClick={async () => {
                      try {
                        setIsUploadingExcel(true);
                        const fd = new FormData();
                        fd.append("excelFile", selectedExcelFile!); // Đổi "file" thành "excelFile"
                        if (selectedZipFile) fd.append("zipFile", selectedZipFile); // Thêm zipFile

                        const res = await api.post("/categories/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
                        toast.success(res.data.message);
                        handleCloseImportModal();
                        loadCategories();
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || "Lỗi import thật!");
                      } finally {
                        setIsUploadingExcel(false);
                      }
                    }}
                    className="cursor-pointer rounded-lg bg-green-600 px-8 py-2.5 font-semibold tracking-wide text-white shadow-lg transition hover:bg-green-700 disabled:opacity-50"
                  >
                    {isUploadingExcel ? "Đang nhập..." : " Xác nhận nhập"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}