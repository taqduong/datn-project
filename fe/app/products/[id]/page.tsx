"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { Heart } from "lucide-react";
import { fetchProductById, addToCart, addToWishlist, type Product, trackProductView, trackProductAddToCart } from "@/services/api";


export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeImage, setActiveImage] = useState<string>("");

  const resolveImgUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const [quantity, setQuantity] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);
  // ✅ Lưu lại cái ID sản phẩm đã đếm
  const trackedIdRef = useRef<string | null>(null);

  

  const loadProduct = async () => {
    try {
      setLoading(true);
      const res = await fetchProductById(id);
      setProduct(res.data);

      if (res.data?.imageUrl) setActiveImage(res.data.imageUrl);

      // ✅ GẮN CẢM BIẾN LƯỢT XEM Ở ĐÂY:
      // Gọi API chạy ngầm (không dùng await) để không làm chậm trải nghiệm của khách
      if (res.data?.id && trackedIdRef.current !== id) {
        trackedIdRef.current = id; // Đánh dấu là đã đếm ID này rồi
        trackProductView(res.data.id).catch(err => console.error("Lỗi tracking view:", err));
      }

    } catch (error) {
      console.error("Lỗi khi tải chi tiết sản phẩm:", error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadProduct();
  }, [id]);

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const stockStatus = useMemo(() => {
    if (!product) return null;
    if (product.stock <= 0) {
      return {
        text: "Hết hàng",
        className: "bg-red-100 text-red-700 ring-red-200",
      };
    }
    if (product.stock <= 10) {
      return {
        text: "Sắp hết hàng",
        className: "bg-yellow-100 text-yellow-700 ring-yellow-200",
      };
    }
    return {
      text: "Còn hàng",
      className: "bg-green-100 text-green-700 ring-green-200",
    };
  }, [product]);

  const handleIncrease = () => {
    if (!product) return;
    setQuantity((prev) => Math.min(prev + 1, Math.max(product.stock, 1)));
  };

  const handleDecrease = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

// =========================================================
  // 1. HÀM XỬ LÝ "MUA NGAY" ĐỘC LẬP
  // =========================================================
  const handleBuyNow = () => {
    if (!product) return;
    
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để mua hàng!");
      router.push("/login");
      return;
    }

    // Đẩy thông tin lên URL để sang trang Checkout
    router.push(`/checkout?buyNowId=${product.id}&qty=${quantity}`);
  };

  // =========================================================
  // 2. HÀM THÊM VÀO GIỎ
  // =========================================================
  const handleAddToCart = async () => {
    if (!product) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để mua hàng!");
      router.push("/login");
      return;
    }

    try {
      setIsAdding(true);
      await addToCart(product.id, quantity);
      
      trackProductAddToCart(product.id).catch(err => console.error("Lỗi tracking cart:", err));
      window.dispatchEvent(new Event('cartUpdated')); 
      alert(`Đã thêm ${product.name} vào giỏ hàng!`);
      
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setIsAdding(false);
    }
  };

  // Xử lý Thêm vào Danh sách yêu thích
  const handleAddToWishlist = async () => {
    if (!product) return;
    
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để thêm vào yêu thích!");
      return;
    }

    try {
      setIsWishlisting(true);
      await addToWishlist(product.id);
      window.dispatchEvent(new Event('wishlistUpdated')); // Báo Header chớp số
      alert(`Đã thêm ${product.name} vào danh sách yêu thích!`);
    } catch (error: any) {
      console.error("Lỗi khi thêm yêu thích:", error);
      const msg = error.response?.data?.message || "Sản phẩm đã có trong danh sách yêu thích!";
      alert(msg);
    } finally {
      setIsWishlisting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 h-5 w-64 animate-pulse rounded bg-slate-200" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-3xl bg-slate-200" />
            <div className="space-y-4">
              <div className="h-10 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
              <div className="h-8 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="h-28 w-full animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-14 w-full animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-14 w-full animate-pulse rounded-2xl bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="mb-6 rounded-full bg-red-100 p-5 text-4xl">⚠️</div>
          <h1 className="text-3xl font-bold text-slate-900">
            Không tìm thấy sản phẩm
          </h1>
          <p className="mt-3 text-slate-600">
            Sản phẩm bạn đang tìm có thể đã bị xóa hoặc đường dẫn không đúng.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Quay lại
            </button>
            <Link
              href="/products"
              className="rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
            >
              Xem tất cả sản phẩm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayPrice =
    product.priceAfterDiscount && product.priceAfterDiscount > 0
      ? product.priceAfterDiscount
      : product.price;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-slate-900">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/products" className="transition hover:text-slate-900">
            Sản phẩm
          </Link>
          {product.categoryName && (
            <>
              <span>/</span>
              <span>{product.categoryName}</span>
            </>
          )}
          <span>/</span>
          <span className="font-medium text-slate-900">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Cột ảnh */}
          <div className="space-y-4">
            {/* 1. KHUNG HIỂN THỊ ẢNH TO */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {!imageLoaded && (
                <div className="absolute inset-0 animate-pulse bg-slate-100" />
              )}

              {/* ✅ PHẢI DÙNG activeImage VÀ resolveImgUrl Ở ĐÂY */}
              {activeImage ? (
                <img
                  src={resolveImgUrl(activeImage)}
                  alt={product.name}
                  onLoad={() => setImageLoaded(true)}
                  className="aspect-square w-full object-cover transition-all duration-300"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-slate-100 text-7xl">
                  📦
                </div>
              )}

              {stockStatus && (
                <div className="absolute left-5 top-5">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${stockStatus.className}`}
                  >
                    {stockStatus.text}
                  </span>
                </div>
              )}
            </div>

            {/* ✅ 2. DẢI ẢNH NHỎ (THUMBNAILS) - SẾP ĐANG THIẾU NGUYÊN CỤM NÀY */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {/* Thumbnail của Ảnh Bìa */}
              {product.imageUrl && (
                <button
                  type="button"
                  onClick={() => setActiveImage(product.imageUrl!)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    activeImage === product.imageUrl 
                      ? "border-blue-600 ring-2 ring-blue-100" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img 
                    src={resolveImgUrl(product.imageUrl)} 
                    className="h-full w-full object-cover" 
                    alt="thumb-main" 
                  />
                </button>
              )}

              {/* Danh sách các Ảnh Phụ */}
              {product.additionalImages?.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(imgUrl)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    activeImage === imgUrl 
                      ? "border-blue-600 ring-2 ring-blue-100" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img 
                    src={resolveImgUrl(imgUrl)} 
                    className="h-full w-full object-cover" 
                    alt={`thumb-sub-${idx}`} 
                  />
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold text-slate-900">
                Điểm nổi bật
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Danh mục</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {product.categoryName || "Chưa phân loại"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Tồn kho</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {product.stock} sản phẩm
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Giảm giá</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {product.discount ? `${product.discount}%` : "Không có"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cột nội dung */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                {product.categoryName && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    {product.categoryName}
                  </span>
                )}

                {product.discount && product.discount > 0 && (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                    Giảm {product.discount}%
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                {product.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-end gap-3">
                <div className="text-3xl font-bold text-slate-900 sm:text-4xl">
                  {formatVND(displayPrice)}
                </div>

                {product.discount && product.discount > 0 && (
                  <div className="pb-1 text-lg text-slate-400 line-through">
                    {formatVND(product.price)}
                  </div>
                )}
              </div>

              {product.discount && product.discount > 0 && (
                <p className="mt-2 text-sm text-green-700">
                  Bạn tiết kiệm được{" "}
                  <span className="font-semibold">
                    {formatVND(product.price - displayPrice)}
                  </span>
                </p>
              )}

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Mã sản phẩm</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    #{product.id}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Ngày tạo</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {product.createdAt
                      ? new Date(product.createdAt).toLocaleDateString("vi-VN")
                      : "Không rõ"}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Mô tả sản phẩm
                </h2>
                <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
                  {product.description || "Sản phẩm chưa có mô tả chi tiết."}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Chọn số lượng
              </h3>

              <div className="flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center overflow-hidden rounded-2xl border border-slate-300">
                  <button
                    onClick={handleDecrease}
                    className="px-4 py-3 text-lg font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    −
                  </button>
                  <div className="min-w-16 border-x border-slate-300 px-5 py-3 text-center font-semibold text-slate-900">
                    {quantity}
                  </div>
                  <button
                    onClick={handleIncrease}
                    className="px-4 py-3 text-lg font-semibold text-slate-700 transition hover:bg-slate-50"
                    disabled={product.stock <= 0}
                  >
                    +
                  </button>
                </div>

                <p className="text-sm text-slate-500">
                  Tối đa: {product.stock > 0 ? product.stock : 0} sản phẩm
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* 1. NÚT MUA NGAY */}
                <button
                  onClick={handleBuyNow} // ✅ Đổi thành gọi hàm mới
                  disabled={product.stock <= 0} // ✅ Bỏ cái isAdding đi
                  className={`rounded-2xl px-5 py-4 font-semibold text-white transition flex justify-center items-center ${
                    product.stock <= 0
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  Mua ngay
                </button>

                {/* 2. NÚT THÊM VÀO GIỎ HÀNG */}
                <button 
                  onClick={handleAddToCart} // ✅ Bỏ chữ 'false' ở trong đi
                  disabled={product.stock <= 0 || isAdding}
                  className={`rounded-2xl border px-5 py-4 font-semibold transition flex justify-center items-center ${
                    product.stock <= 0 || isAdding
                      ? "cursor-not-allowed border-slate-200 text-slate-400 bg-slate-50"
                      : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {isAdding ? "Đang thêm..." : "Thêm vào giỏ hàng"}
                </button>

                {/* 3. NÚT THÊM VÀO YÊU THÍCH */}
              <button
                onClick={handleAddToWishlist}
                disabled={isWishlisting}
                className="sm:col-span-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-pink-50 px-5 py-4 font-semibold text-pink-600 transition hover:bg-pink-100 disabled:opacity-50"
              >
                {isWishlisting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-600 border-t-transparent" />
                ) : (
                  <Heart size={20} className="text-pink-500" />
                )}
                {isWishlisting ? "Đang xử lý..." : "Thêm vào danh sách yêu thích"}
              </button>
              </div>

              
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Thông tin thêm
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Trạng thái</span>
                  <span className="font-semibold text-slate-900">
                    {stockStatus?.text}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Danh mục</span>
                  <span className="font-semibold text-slate-900">
                    {product.categoryName || "Chưa phân loại"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Giảm giá hiện tại</span>
                  <span className="font-semibold text-slate-900">
                    {product.discount ? `${product.discount}%` : "0%"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Xem thêm sản phẩm khác
              </h3>
              <p className="mt-1 text-slate-600">
                Khám phá thêm nhiều sản phẩm phù hợp trong cửa hàng của bạn.
              </p>
            </div>

            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Quay về danh sách sản phẩm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}