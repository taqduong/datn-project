"use client";

import React, { useEffect, useMemo, useState } from "react";
import api, {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchCategories,
  uploadImage,
  uploadProductImages,
  type Product,
  type Category,
  UpdateProductPayload,
} from "@/services/api";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";

type ProductForm = {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  discount: number | "";
  categoryId: number;
};

// Hàm xử lý đường dẫn tài nguyên (Hỗ trợ URL tương đối)
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
  // Tính toán tổng số lượng tồn kho khả dụng
  const getRealStock = (p: any) => {
    if (p.variants && p.variants.length > 0) {
      return p.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
    }
    return p.stock || 0;
  };

  //  State mới để chứa mảng file ảnh phụ chuẩn bị upload
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  //  State mới để hiển thị các ảnh phụ đã có sẵn (khi bấm Sửa)
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // THÊM TYPE & STATE CHO BIẾN THỂ (VARIANTS)
  type VariantForm = {
    id?: number;
    variantName: string;
    color?: string;
    price: number;
    stock: number;
    imageUrl?: string;
    discount: number | "";
  };
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<VariantForm[]>([]);

  const [importModalOpen, setImportModalOpen] = useState(false);

  // State phục vụ Preview (Bước 1 & Bước 2)
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);

  const handleCloseImportModal = () => {
    setImportModalOpen(false);
    setImportStep(1);
    setPreviewData([]);
    setSelectedExcelFile(null);
    setSelectedZipFile(null);
  };

  // HÀM XỬ LÝ BIẾN THỂ
  const handleAddVariant = () => {
    setVariants([...variants, { variantName: "", color: "", price: 0, stock: 0, imageUrl: "", discount: 0 }]);
  };

  const handleRemoveVariant = (indexToRemove: number) => {
    setVariants(variants.filter((_, index) => index !== indexToRemove));
  };

  const handleVariantChange = (index: number, field: keyof VariantForm, value: string | number) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value } as VariantForm;
    setVariants(updatedVariants);

    // Nâng cấp luồng xử lý: Đồng bộ khi cập nhật trường chiết khấu độc lập
    if (field === "discount") {
      const firstDiscount = updatedVariants[0].discount;
      const isAllSame = updatedVariants.every(v => v.discount === firstDiscount);

      if (isAllSame) {
        setForm(prev => ({ ...prev, discount: firstDiscount }));
      } else {
        // Nếu khác nhau thì để trống ô chung
        setForm(prev => ({ ...prev, discount: "" })); 
      }
    }
  };

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

  // ==========================================
  // HÀM UPLOAD EXCEL (Ép chuẩn Multipart/form-data) DÁN VÀO ĐÂY
  // ==========================================
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);

  const clampDiscount = (d: number | "") => {
    // Nếu là chuỗi rỗng hoặc không phải số, coi như bằng 0 để tính toán
    if (d === "" || Number.isNaN(Number(d))) return 0;
    
    const val = Number(d);
    if (val < 0) return 0;
    if (val > 99) return 99;
    return Math.floor(val);
  };

  const finalPrice = (price: number, discount: number | "") => {
    const d = clampDiscount(discount);
    const base = Number.isFinite(price) && price > 0 ? price : 0;
    return Math.max(0, Number((base * (1 - d / 100)).toFixed(0))); // .toFixed(0) để ra số nguyên VNĐ
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
    setHasVariants(false);
    setVariants([]);
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
      categoryId: product.categoryId || (categories.length > 0 ? categories[0].id : 0),
    });
    setAdditionalFiles([]);
    setExistingImages(product.additionalImages || []);
    
    // Cơ chế Fallback: Kế thừa mức chiết khấu của sản phẩm gốc
    const parentDiscount = product.discount || 0;

    const productVariants: VariantForm[] = (product.variants || []).map(v => ({
      id: v.id,
      variantName: v.variantName,
      color: v.color || "",
      price: v.price,
      stock: v.stock,
      imageUrl: v.imageUrl || "",
      // Thuật toán ưu tiên: Ưu tiên thiết lập biến thể -> Thiết lập gốc -> Mặc định 0
      discount: v.discount || parentDiscount || 0 
    }));

    const productHasVariants = productVariants.length > 0;
    setHasVariants(productHasVariants);
    setVariants(productVariants); 

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
      const newDiscount = clampDiscount(Number(value));
      setForm((prev) => ({ ...prev, discount: newDiscount }));

      // Cơ chế Fallback: Kế thừa mức chiết khấu của sản phẩm gốc
      if (hasVariants) {
        setVariants((prevVariants) =>
          prevVariants.map((v) => ({ ...v, discount: newDiscount }))
        );
      }
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
      const basePayload = { 
        ...form, 
        // Ép về number: Nếu rỗng thì gửi 0, nếu có số thì gửi số đã qua clamp
        discount: form.discount === "" ? 0 : clampDiscount(form.discount),
        price: hasVariants ? 0 : form.price,
        stock: hasVariants ? 0 : form.stock,
        variants: hasVariants ? variants.map(v => ({
          ...v,
          // Ép v.discount về kiểu dữ liệu number để gửi xuống API
          discount: v.discount === "" ? 0 : Number(v.discount) 
        })) : []
      };
      
      let savedProductId = 0;

      if (editingProduct) {
        const updatePayload: UpdateProductPayload = {
      ...form,
      // Ép giảm giá chung về số
      discount: form.discount === "" ? 0 : clampDiscount(form.discount),
      price: hasVariants ? 0 : form.price,
      stock: hasVariants ? 0 : form.stock,
      retainedAdditionalImages: existingImages,
      // Tiền xử lý và chuẩn hóa dữ liệu Biến thể trước khi truyền tải qua Request
      variants: hasVariants ? variants.map(v => ({
        id: v.id,
        variantName: v.variantName,
        color: v.color,
        price: v.price,
        stock: v.stock,
        imageUrl: v.imageUrl,
        // Validation Logic: Cung cấp giá trị mặc định (0) nếu Input bỏ trống
        discount: v.discount === "" ? 0 : Number(v.discount) 
      })) : []
    };
        
        await updateProduct(editingProduct.id, updatePayload);
        savedProductId = editingProduct.id;
        toast.success("Cập nhật thông tin thành công");
      } else {
        const res = await createProduct(basePayload);
        savedProductId = res.data.id; 
        toast.success("Thêm sản phẩm thành công");
      }

      if (additionalFiles.length > 0 && savedProductId > 0) {
        const fd = new FormData();
        additionalFiles.forEach((file) => fd.append("files", file));
        
        await uploadProductImages(savedProductId, fd);
        toast.success("Tải ảnh phụ thành công");
      }

      closeModal();
      loadProducts(); 
    } catch (error) {
      console.error("Lỗi khi lưu sản phẩm:", error);
      toast.error("Có lỗi xảy ra khi lưu sản phẩm");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này? Nó sẽ không thể khôi phục!")) return;

    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Xóa sản phẩm thành công");
    } catch (error: any) {
      console.error("Lỗi khi xóa sản phẩm:", error);
      // Trích xuất thông báo ngoại lệ trực tiếp từ HTTP Response của Server
      const errorMessage = error.response?.data?.message || error.response?.data;
      
      if (typeof errorMessage === "string") {
        toast.error(errorMessage);
      } else {
        // Xử lý ngoại lệ tổng quát: Server Crash hoặc Vi phạm ràng buộc Khóa ngoại
        toast.error("Không thể xóa! Sản phẩm này có thể đã nằm trong đơn hàng của khách.");
      }
    }
  };

  const removeAdditionalFile = (index: number) => {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 1. Hàm xóa ảnh phụ cũ (khi đang sửa sản phẩm)
  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  // 2. Hàm hoán đổi ảnh phụ (đã có sẵn) lên làm Ảnh bìa
  const setExistingAsCover = (index: number) => {
    const clickedUrl = existingImages[index];
    const oldCover = form.imageUrl;
    
    setForm(prev => ({ ...prev, imageUrl: clickedUrl }));
    setExistingImages(prev => {
      const newArr = [...prev];
      newArr.splice(index, 1); // Xóa khỏi danh sách phụ
      if (oldCover) newArr.push(oldCover); // Tích hợp ảnh bìa cũ xuống làm ảnh phụ
      return newArr;
    });
  };

  // HÀM UPLOAD ẢNH RIÊNG CHO TỪNG BIẾN THỂ 
  const handleVariantImageUpload = async (index: number, file: File) => {
    const toastId = toast.loading("Đang tải ảnh biến thể...");
    try {
      const fd = new FormData();
      fd.append("files", file); // Chú ý: Backend yêu cầu field "files"
      const res = await uploadImage(fd, "products");
      const newUrl = res.data.imageUrls?.[0] || ""; // Backend trả về imageUrls
      if (newUrl) {
        handleVariantChange(index, "imageUrl", newUrl);
        toast.success("Tải ảnh biến thể thành công!", { id: toastId });
      }
    } catch (err) {
      console.error("Lỗi up ảnh biến thể:", err);
      toast.error("Lỗi khi tải ảnh biến thể", { id: toastId });
    }
  };

  // HÀM CHUYỂN ĐỔI ẢNH BIẾN THỂ (ĐÃ CÓ SẴN) LÊN LÀM ẢNH BÌA SẢN PHẨM
  const setVariantAsCover = (index: number) => {
    const clickedUrl = variants[index].imageUrl;
    const oldCover = form.imageUrl;
    
    if (!clickedUrl) {
      toast.error("Biến thể này chưa có ảnh!");
      return;
    }
    
    setForm(prev => ({ ...prev, imageUrl: clickedUrl }));
    if (oldCover) {
      // Nếu có ảnh bìa cũ, cho nó xuống làm ảnh phụ, khỏi mất
      setExistingImages(prev => [...prev, oldCover]);
    }
    toast.success("Đã đổi ảnh bìa!");
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

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-medium text-white shadow transition duration-300 hover:bg-green-700"
            onClick={() => setImportModalOpen(true)}
          >
            <span>📁</span> Nhập Excel & Ảnh
          </button>

          <button
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white shadow transition duration-300 hover:bg-blue-700"
            onClick={openAddModal}
          >
            <span>+</span> Thêm sản phẩm mới
          </button>
        </div>
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
                {products.filter((p) => getRealStock(p) > 0).length}
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
                {products.filter((p) => getRealStock(p) === 0).length}
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

      {/* KHU VỰC TÌM KIẾM & LỌC */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input type="text" placeholder="Tìm theo tên hoặc mô tả sản phẩm..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} className="rounded-lg border border-gray-300 p-3 placeholder-black focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value === "all" ? "all" : Number(e.target.value))} className="rounded-lg border border-gray-300 p-3 text-black focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all" style={{ color: "black" }}>Tất cả danh mục</option>
            {categories.map((c) => (<option value={c.id} key={c.id} style={{ color: "black" }}>{c.name}</option>))}
          </select>
          <button onClick={() => { setSearchKeyword(""); setSelectedCategory("all"); }} className="rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50">
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
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 w-32">
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
                                src={resolveImgUrl(product.imageUrl)} 
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

                      {/* CỘT GIÁ (ĐÃ FIX: HIỂN THỊ KHOẢNG GIÁ BIẾN THỂ) */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {(() => {
                            if (product.variants && product.variants.length > 0) {
                              const prices = product.variants.map((v: any) => v.price);
                              const minPrice = Math.min(...prices);
                              const maxPrice = Math.max(...prices);
                              return minPrice === maxPrice 
                                ? formatVND(minPrice) 
                                : `${formatVND(minPrice)} - ${formatVND(maxPrice)}`;
                            }
                            return formatVND(product.price);
                          })()}
                        </div>
                        {(product.discount || 0) > 0 && (
                          <div className="text-xs text-green-600">
                            Sau giảm: {(() => {
                              if (product.variants && product.variants.length > 0) {
                                const d = (product.discount || 0) / 100;
                                const prices = product.variants.map((v: any) => v.price);
                                const minPrice = Math.min(...prices) * (1 - d);
                                const maxPrice = Math.max(...prices) * (1 - d);
                                return minPrice === maxPrice 
                                  ? formatVND(minPrice) 
                                  : `${formatVND(minPrice)} - ${formatVND(maxPrice)}`;
                              }
                              return formatVND(product.priceAfterDiscount || 0);
                            })()}
                          </div>
                        )}
                      </td>

                      {/* CỘT TỒN KHO (ĐÃ FIX: CỘNG DỒN KHO BIẾN THỂ) */}
                      <td className="px-6 py-4">
                        {(() => {
                          const realStock = getRealStock(product);
                          return (
                            <div
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                realStock > 10
                                  ? "bg-green-100 text-green-800"
                                  : realStock > 0
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {realStock > 0 ? `${realStock} sản phẩm` : "Hết hàng"}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.categoryName || "Không có"}
                      </td>

                      {/* Cột giảm giá */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const generalDiscount = product.discount || 0;
                          const variantDiscounts = product.variants?.map(v => v.discount || 0) || [];
                          
                          // TRƯỜNG HỢP 1: Có giảm giá chung
                          if (generalDiscount > 0) {
                            return (
                              <span className="inline-flex items-center justify-center min-w-[60px] rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-800 border border-red-200">
                                -{generalDiscount}%
                              </span>
                            );
                          }

                          // TRƯỜNG HỢP 2: Có giảm giá riêng lẻ của các biến thể
                          if (variantDiscounts.length > 0 && variantDiscounts.some(d => d > 0)) {
                            const minD = Math.min(...variantDiscounts);
                            const maxD = Math.max(...variantDiscounts);

                            return (
                              <span className="inline-flex items-center justify-center min-w-[60px] rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-800 border border-orange-200">
                                {minD === maxD ? `-${minD}%` : `${minD}% - ${maxD}%`}
                              </span>
                            );
                          }

                          // TRƯỜNG HỢP 3: Không giảm
                          return <span className="inline-flex items-center justify-center min-w-[60px] rounded-full bg-gray-100 px-3 py-1 text-lg font-bold text-gray-400 border border-gray-200">-</span>
                        })()}
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

            {/* KHU VỰC CÔNG TẮC BẬT BIẾN THỂ */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mt-2">
              <label className="flex cursor-pointer items-center text-sm font-semibold text-blue-800">
                <input type="checkbox" className="mr-3 h-5 w-5 accent-blue-600" checked={hasVariants} onChange={(e) => { setHasVariants(e.target.checked); if (e.target.checked && variants.length === 0) handleAddVariant(); }} />
                Sản phẩm này có nhiều phân loại (Màu sắc, Dung lượng, Kích thước...)
              </label>
            </div>

            {/* NẾU KHÔNG CÓ BIẾN THỂ -> HIỆN THÔNG SỐ CƠ BẢN */}
            {!hasVariants && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Giá gốc *</label>
                  <input type="number" name="price" value={form.price} onChange={handleChange} min={0} className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" required={!hasVariants} />
                  <p className="mt-1 text-xs text-gray-500">Sau giảm: <b className="text-green-600">{formatVND(finalPrice(form.price, form.discount ?? 0))}</b></p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tồn kho *</label>
                  <input type="number" name="stock" value={form.stock} onChange={handleChange} min={0} className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" required={!hasVariants} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Giảm giá (%)</label>
                  <input type="number" name="discount" value={form.discount} onChange={handleChange} min={0} max={99} className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}

            {/* NẾU BẬT BIẾN THỂ -> BẢNG NÀY SẼ HIỆN LÊN */}
            {hasVariants && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Danh sách phân loại sản phẩm</h3>
                  {/* Fix màu chữ "Giảm giá chung" ở đây */}
                  <div className="flex items-center gap-2 text-sm text-black font-medium">
                    <span>Giảm giá chung (%):</span>
                    <input 
                      type="number" 
                      name="discount" 
                      // Nếu là chuỗi rỗng thì hiện rỗng, nếu là số 0 thì hiện 0
                      value={form.discount === "" ? "" : form.discount} 
                      onChange={handleChange} 
                      min={0} 
                      max={99} 
                      className="w-16 rounded border border-gray-300 p-1 text-black" 
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="border p-2 text-center w-20">Ảnh</th>
                        <th className="border p-2 text-left w-24">Màu sắc</th> 
                        <th className="border p-2 text-left">Phân loại *</th>
                        <th className="border p-2 text-left w-28">Giá gốc *</th>
                        <th className="border p-2 text-left w-20">Giảm (%)</th>
                        <th className="border p-2 text-left w-24">Kho *</th>
                        <th className="border p-2 text-center w-12">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-center">
                            <div className="relative mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50 group">
                              {variant.imageUrl ? (
                                <>
                                  <img src={resolveImgUrl(variant.imageUrl)} alt="variant" className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 hidden cursor-pointer items-center justify-center bg-black/50 text-white group-hover:flex">
                                    <label className="cursor-pointer text-xs p-1">Sửa<input type="file" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleVariantImageUpload(index, e.target.files[0]); }} /></label>
                                  </div>
                                </>
                              ) : (
                                <label className="flex h-full w-full cursor-pointer items-center justify-center text-gray-400 hover:text-blue-500">
                                  <span className="text-2xl">+</span>
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleVariantImageUpload(index, e.target.files[0]); }} />
                                </label>
                              )}
                            </div>
                          </td>

                          {/* Đẩy Màu Sắc lên cột số 2 cho khớp với thead mới */}
                          <td className="p-2">
                            <input type="text" value={variant.color} onChange={(e) => handleVariantChange(index, "color", e.target.value)} placeholder="Đen, Trắng..." className="w-full rounded border p-2 text-black" />
                          </td>

                          {/* Đẩy Tên Phân Loại (Kích thước) xuống cột số 3 */}
                          <td className="p-2">
                            <input type="text" value={variant.variantName} onChange={(e) => handleVariantChange(index, "variantName", e.target.value)} placeholder="Size M, 128GB..." className="w-full rounded border p-2 text-black" required />
                          </td>
                          <td className="p-2">
                            <input type="number" value={variant.price} onChange={(e) => handleVariantChange(index, "price", Number(e.target.value))} className="w-full rounded border p-2 text-black" required />
                            {/* Hiện giá sau giảm nhẩm tính ở dưới cho Admin dễ nhìn */}
                            <p className="text-[10px] text-green-600 font-bold">
                              ~ {formatVND(variant.price * (1 - (variant.discount || form.discount || 0) / 100))}
                            </p>
                          </td>

                          {/* Ô NHẬP GIẢM GIÁ RIÊNG CHO BIẾN THỂ */}
                          <td className="p-2">
                            <input 
                              type="number" 
                              value={variant.discount} 
                              onChange={(e) => handleVariantChange(index, "discount", clampDiscount(Number(e.target.value)))} 
                              placeholder="0"
                              className="w-full rounded border p-2 text-black font-bold bg-yellow-50" 
                            />
                          </td>

                          <td className="p-2">
                            <input type="number" value={variant.stock} onChange={(e) => handleVariantChange(index, "stock", Number(e.target.value))} className="w-full rounded border p-2 text-black" required />
                          </td>
                          <td className="p-2 text-center">
                            <button type="button" onClick={() => handleRemoveVariant(index)} className="text-red-500">🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={handleAddVariant} className="mt-3 w-full border border-dashed border-blue-400 bg-blue-50 py-2 font-medium text-blue-600 hover:bg-blue-100 rounded-lg">
                  + Thêm phân loại
                </button>
              </div>
            )}

            {/* KHU VỰC UPLOAD ẢNH PHỤ (RETAIN) - GIỮ NGUYÊN NHƯ FILE GỐC CỦA SẾP */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800">
                Hình ảnh sản phẩm (Ảnh bìa và ảnh phụ)
              </label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    if (!e.target.files?.length) return;
                    const files = Array.from(e.target.files);

                    if (!form.imageUrl && files.length > 0) {
                      const firstFile = files[0];
                      const restFiles = files.slice(1);

                      setUploading(true);
                      try {
                        const fd = new FormData();
                        fd.append("files", firstFile);
                        const res = await uploadImage(fd, "products");
                        const firstUrl = res.data.imageUrls?.[0] || "";
                        if (firstUrl) {
                          setForm((prev) => ({ ...prev, imageUrl: firstUrl }));
                        }
                        if (restFiles.length > 0) {
                          setAdditionalFiles((prev) => [...prev, ...restFiles]);
                        }
                      } catch (err) {
                        toast.error("Tải ảnh bìa thất bại");
                      } finally {
                        setUploading(false);
                      }
                    } else {
                      setAdditionalFiles((prev) => [...prev, ...files]);
                    }
                    e.target.value = '';
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-200 focus:outline-none"
                />
                
                {uploading && <div className="mt-2 text-sm font-medium text-blue-600 animate-pulse">⏳ Đang xử lý ảnh...</div>}

                <div className="mt-5 flex flex-wrap gap-5">
                  {form.imageUrl && (
                    <div className="relative h-24 w-24 shrink-0 group">
                      <span className="absolute -top-3 -left-3 z-10 rounded-md bg-yellow-400 px-2 py-1 text-[10px] font-bold uppercase text-white shadow-md">
                        Ảnh bìa
                      </span>
                      <img src={resolveImgUrl(form.imageUrl)} alt="Cover" className="h-full w-full rounded-xl border-2 border-yellow-400 object-cover shadow-sm" />
                      <button type="button" onClick={() => setForm(prev => ({...prev, imageUrl: ""}))} className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-md hover:bg-red-600">✕</button>
                    </div>
                  )}

                  {existingImages.map((imgUrl, idx) => (
                    <div key={`exist-${idx}`} className="relative h-24 w-24 shrink-0 group overflow-hidden rounded-xl border border-gray-300 shadow-sm">
                      <img src={resolveImgUrl(imgUrl)} className="h-full w-full object-cover opacity-90" alt="additional" />
                      <button type="button" onClick={() => removeExistingImage(idx)} className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-md hover:bg-red-600">✕</button>
                      <button type="button" onClick={() => setExistingAsCover(idx)} className="absolute bottom-0 left-0 w-full bg-black/60 py-1 text-[10px] text-white font-medium opacity-0 transition-opacity hover:bg-blue-600 group-hover:opacity-100">Làm ảnh bìa</button>
                    </div>
                  ))}

                  {additionalFiles.map((file, idx) => (
                    <div key={`new-${idx}`} className="relative h-24 w-24 shrink-0 group overflow-hidden rounded-xl border-2 border-dashed border-blue-400 shadow-sm">
                      <span className="absolute top-1 left-1 z-10 rounded-md bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md">Mới</span>
                      <img src={URL.createObjectURL(file)} className="h-full w-full object-cover" alt="new-preview" />
                      <button type="button" onClick={() => removeAdditionalFile(idx)} className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-md hover:bg-red-600">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={closeModal} className="rounded-lg bg-black px-5 py-2.5 font-bold text-white border-2 border-black transition-colors duration-150 hover:bg-gray-900 hover:border-gray-900">Hủy</button>
              <button type="submit" className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white shadow transition-colors duration-150 hover:bg-blue-700">{editingProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}</button>
            </div>
          </form>
        </div>
      </Modal>
      {/* ================= MODAL IMPORT 2 BƯỚC (PREVIEW) ================= */}
      <Modal isOpen={importModalOpen} onClose={handleCloseImportModal}>
        {/* Nới rộng kích thước Modal ra nếu ở Bước 2 để chứa bảng */}
        <div
          className={`w-full rounded-2xl bg-white p-7 shadow-2xl transition-all duration-300 ${
            importStep === 2 ? "max-w-[98vw] xl:max-w-[1700px]" : "max-w-3xl"
          }`}
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">
              {importStep === 1 ? "Nhập sản phẩm hàng loạt" : "Xem trước dữ liệu"}
            </h2>
          </div>

          {/* ============ BƯỚC 1: CHỌN FILE ============ */}
          {importStep === 1 && (
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  1. File Excel (.xlsx) *
                </label>

                <div className="w-[65%]">
                  <input
                    id="product-excel-upload"
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => setSelectedExcelFile(e.target.files?.[0] || null)}
                  />

                  <label
                    htmlFor="product-excel-upload"
                    className="flex cursor-pointer items-center rounded-lg border border-gray-300 px-3 py-2 text-black hover:border-blue-400"
                  >
                    <span className="truncate">
                      {selectedExcelFile ? selectedExcelFile.name : "Chọn tệp"}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  2. File nén chứa ẢNH (.zip)
                </label>

                <div className="w-[65%]">
                  <input
                    id="product-zip-upload"
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => setSelectedZipFile(e.target.files?.[0] || null)}
                  />

                  <label
                    htmlFor="product-zip-upload"
                    className="flex cursor-pointer items-center rounded-lg border border-gray-300 px-3 py-2 text-black hover:border-blue-400"
                  >
                    <span className="truncate">
                      {selectedZipFile ? selectedZipFile.name : "Chọn tệp"}
                    </span>
                  </label>
                </div>
              </div>
              
              <div className="mt-7 flex justify-end gap-3">
                <button type="button" onClick={handleCloseImportModal} className="rounded-lg bg-black px-4 py-2 font-bold text-white border-2 border-black transition-colors duration-150 hover:bg-gray-900 hover:border-gray-900">Hủy</button>
                <button 
                  type="button" 
                  disabled={!selectedExcelFile || isUploadingExcel} 
                  onClick={async () => {
                    try {
                      setIsUploadingExcel(true);
                      const fd = new FormData();
                      fd.append("excelFile", selectedExcelFile!);
                      const res = await api.post("/products/preview-import", fd, { headers: { "Content-Type": "multipart/form-data" } });
                      setPreviewData(res.data);
                      setImportStep(2); // Chuyển sang bước 2
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || "Lỗi đọc file nháp!");
                    } finally {
                      setIsUploadingExcel(false);
                    }
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
                >
                  {isUploadingExcel ? "Đang quét dữ liệu..." : "Xem trước dữ liệu"}
                </button>
              </div>
            </div>
          )}

          {/* ============ BƯỚC 2: HIỂN THỊ PREVIEW ============ */}
          {importStep === 2 && (
            <div>
              <div className="max-h-[78vh] overflow-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 shadow-sm">
                    <tr>
                      <th className="p-3 font-bold">Dòng</th>
                      <th className="p-3 font-bold w-[220px]">Tên SP</th>
                      <th className="p-3 font-bold w-[180px]">Danh mục</th>
                      <th className="p-3 font-bold">Giá</th>
                      <th className="p-3 font-bold">Kho</th>
                      <th className="p-3 font-bold">Giảm (%)</th>
                      <th className="p-3 font-bold">Ảnh bìa</th>
                      <th className="p-3 font-bold">Ảnh phụ</th>
                      <th className="p-3 font-bold">Mô tả</th>
                      <th className="p-3 font-bold">Phân loại (Biến thể)</th>
                      <th className="p-3 text-center font-bold sticky right-0 bg-gray-200 border-l border-gray-300">Trạng thái</th>
                      <th className="p-3 font-bold">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? "bg-white hover:bg-gray-50" : "bg-red-100 hover:bg-red-200"}>
                        <td className="p-3 text-black font-medium">{idx + 1}</td>
                        <td className="p-3 text-black max-w-[150px] truncate" title={row.name}>{row.name}</td>
                        <td className="p-3 text-black">{row.categoryName}</td>
                        {/* Nếu khác null thì in số tiền, nếu null (trống) thì in vạch ngang */}
                        <td className="p-3 text-black font-medium">
                          {row.price != null ? row.price.toLocaleString('vi-VN') : <span className="text-gray-400 font-bold">-</span>}
                        </td>
                        <td className="p-3 text-black font-medium">
                          {row.stock != null ? row.stock : <span className="text-gray-400 font-bold">-</span>}
                        </td>
                        <td className="p-3 text-black">{row.discount}%</td>
                        <td className="p-3 text-gray-600 max-w-[100px] truncate" title={row.imageUrl}>{row.imageUrl || "-"}</td>
                        <td className="p-3 text-gray-600 max-w-[100px] truncate" title={row.additionalImages}>{row.additionalImages || "-"}</td>
                        <td className="p-3 text-gray-600 max-w-[150px] truncate" title={row.description}>{row.description || "-"}</td>
                        
                        {/* Cột Biến thể - Chữ xanh cho nổi bật nếu có */}
                        <td className="p-3 max-w-[200px] truncate" title={row.variants}>
                          {row.variants ? (
                            <span className="font-semibold text-blue-700">{row.variants}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        <td className="p-3 text-center sticky right-0 border-l border-gray-200 shadow-[-5px_0_10px_rgba(0,0,0,0.05)]" style={{ backgroundColor: row.isValid ? '#fff' : '#fee2e2' }}>
                          {row.isValid ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 border border-green-200">Hợp lệ</span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 border border-red-200">Lỗi</span>
                          )}
                        </td>
                        <td className="p-3 text-red-600 text-xs font-bold max-w-[200px] truncate" title={row.errors?.join(", ")}>
                          {row.errors?.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-600">
                  Phát hiện <span className="text-red-600 font-bold">{previewData.filter(r => !r.isValid).length}</span> dòng lỗi trên tổng số {previewData.length} dòng. (Các dòng lỗi sẽ bị bỏ qua khi Import).
                </p>
                <div className="ml-auto flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setImportStep(1)}
                    className="min-w-[120px] whitespace-nowrap rounded-xl border-2 border-black bg-black px-6 py-3 text-base font-semibold text-white transition-colors duration-150 hover:border-gray-900 hover:bg-gray-900"
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
                        fd.append("excelFile", selectedExcelFile!);
                        if (selectedZipFile) fd.append("zipFile", selectedZipFile);

                        const res = await api.post("/products/import", fd, {
                          headers: { "Content-Type": "multipart/form-data" },
                        });
                        toast.success(res.data.message);
                        handleCloseImportModal();
                        loadProducts();
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || "Lỗi import thật!");
                      } finally {
                        setIsUploadingExcel(false);
                      }
                    }}
                    className="min-w-[190px] whitespace-nowrap rounded-xl bg-green-600 px-7 py-3 text-base font-semibold text-white shadow-md transition-colors duration-150 hover:bg-green-700 disabled:opacity-50"
                  >
                    {isUploadingExcel ? "Đang nhập..." : "Xác nhận nhập"}
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