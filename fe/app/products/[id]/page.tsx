"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { Heart, Star, CheckCircle, User as UserIcon, ZoomIn, ZoomOut, X } from "lucide-react"; 
import { 
  fetchProductById, 
  addToCart, 
  addToWishlist, 
  type Product, 
  trackProductView, 
  trackProductAddToCart,
  fetchReviewsByProduct,
  type ReviewDto 
} from "@/services/api";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>("");

  // ✅ STATE QUẢN LÝ ZOOM ẢNH
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

  // HÀM BẮT TỌA ĐỘ CHUỘT ĐỂ ZOOM
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPosition({ x, y });
  };

  const [quantity, setQuantity] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);
  const trackedIdRef = useRef<string | null>(null);

  // ✅ STATE QUẢN LÝ BIẾN THỂ ĐƯỢC CHỌN
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  const [openLightbox, setOpenLightbox] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);

  const isMaxZoom = previewZoom >= 4;
  const isMinZoom = previewZoom <= 1;

  const resolveImgUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const allImages = useMemo(() => {
  if (!product) return [];

  const imgs = new Set<string>();
  if (product.imageUrl) imgs.add(product.imageUrl);
  product.variants?.forEach((v: any) => {
    if (v.imageUrl) imgs.add(v.imageUrl);
  });
  product.additionalImages?.forEach((img) => imgs.add(img));

  return Array.from(imgs).map(resolveImgUrl);
  }, [product]);

  const [photoIndex, setPhotoIndex] = useState(0);

  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [reviewStats, setReviewStats] = useState({ totalReviews: 0, averageRating: 0 });

  useEffect(() => {
  if (!openLightbox) return;
  const idx = allImages.indexOf(resolveImgUrl(activeImage));
  setPhotoIndex(idx !== -1 ? idx : 0);
  }, [openLightbox, activeImage, allImages]);

  const closeLightbox = () => {
  setOpenLightbox(false);
  setPreviewZoom(1);
};

const handleZoomIn = () => {
  setPreviewZoom((prev) => Math.min(prev + 0.6, 4));
};

const handleZoomOut = () => {
  setPreviewZoom((prev) => Math.max(prev - 0.6, 1));
};

useEffect(() => {
  if (!openLightbox) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeLightbox();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [openLightbox]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const res = await fetchProductById(id);
      const data = res.data;
      setProduct(data);
      
      if (data?.imageUrl) setActiveImage(data.imageUrl);

      // ✅ Tự động chọn biến thể đầu tiên nếu có
      if (data?.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
      }

      if (data?.id && trackedIdRef.current !== id) {
        trackedIdRef.current = id; 
        trackProductView(data.id).catch(err => console.error("Lỗi tracking view:", err));
      }
    } catch (error) {
      console.error("Lỗi khi tải chi tiết sản phẩm:", error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const res = await fetchReviewsByProduct(id);
      setReviews(res.data.reviews);
      setReviewStats({
        totalReviews: res.data.totalReviews,
        averageRating: res.data.averageRating,
      });
    } catch (error) {
      console.error("Lỗi khi tải đánh giá:", error);
    }
  };

  useEffect(() => {
    if (id) {
      loadProduct();
      loadReviews(); 
    }
  }, [id]);

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const formatSoldCount = (count?: number) => {
    if (!count || count === 0) return "0";
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace('.0', '').replace('.', ',') + 'k';
    }
    return count.toString();
  };

  // ✅ LOGIC TÍNH TOÁN GIÁ & TỒN KHO LINH HOẠT THEO BIẾN THỂ
  const currentPrice = selectedVariant ? selectedVariant.price : (product?.price || 0);
  const currentStock = selectedVariant ? selectedVariant.stock : (product?.stock || 0);
  
  // Tính giá sau giảm (dùng % giảm chung của sản phẩm)
  const currentDiscount = product?.discount || 0;
  const currentPriceAfterDiscount = currentDiscount > 0 
    ? Math.max(0, Math.round(currentPrice * (1 - currentDiscount / 100))) 
    : currentPrice;

  // Quyết định số tiền hiện lên màn hình
  const displayPrice = currentDiscount > 0 ? currentPriceAfterDiscount : currentPrice;

  const stockStatus = useMemo(() => {
    if (!product) return null;
    if (currentStock <= 0) return { text: "Hết hàng", className: "bg-red-100 text-red-700 ring-red-200" };
    if (currentStock <= 10) return { text: "Sắp hết hàng", className: "bg-yellow-100 text-yellow-700 ring-yellow-200" };
    return { text: "Còn hàng", className: "bg-green-100 text-green-700 ring-green-200" };
  }, [product, currentStock]);

  const handleIncrease = () => {
    if (!product) return;
    setQuantity((prev) => Math.min(prev + 1, Math.max(currentStock, 1)));
  };

  const handleDecrease = () => setQuantity((prev) => Math.max(prev - 1, 1));

  // ✅ HÀM KHI KHÁCH BẤM CHỌN BIẾN THỂ
  const handleSelectVariant = (variant: any) => {
    setSelectedVariant(variant);
    setQuantity(1); // Reset số lượng về 1 khi đổi loại
    if (variant.imageUrl) {
      setActiveImage(variant.imageUrl); // Đổi ảnh bìa to đùng nếu biến thể có ảnh
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để mua hàng!");
      router.push("/login");
      return;
    }
    // (Lưu ý: Logic Checkout sau này sếp sẽ cần truyền thêm VariantId vào URL nhé)
    router.push(`/checkout?buyNowId=${product.id}&qty=${quantity}${selectedVariant ? `&variantId=${selectedVariant.id}` : ''}`);
  };

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
      // (Lưu ý: API AddToCart sếp có thể cần sửa lại để nhận thêm VariantId sau)
      await addToCart(product.id, quantity); 
      trackProductAddToCart(product.id).catch(err => console.error("Lỗi tracking cart:", err));
      window.dispatchEvent(new Event('cartUpdated')); 
      alert(`Đã thêm ${product.name} ${selectedVariant ? `(${selectedVariant.variantName})` : ''} vào giỏ hàng!`);
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setIsAdding(false);
    }
  };

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
      window.dispatchEvent(new Event('wishlistUpdated')); 
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
              <div className="h-28 w-full animate-pulse rounded-2xl bg-slate-200" />
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
          <h1 className="text-3xl font-bold text-slate-900">Không tìm thấy sản phẩm</h1>
          <p className="mt-3 text-slate-600">Sản phẩm bạn đang tìm có thể đã bị xóa hoặc đường dẫn không đúng.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => router.back()} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50">Quay lại</button>
            <Link href="/products" className="rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800">Xem tất cả sản phẩm</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-slate-900">Trang chủ</Link>
          <span>/</span>
          <Link href="/products" className="transition hover:text-slate-900">Sản phẩm</Link>
          {product.categoryName && (
            <>
              <span>/</span>
              <Link 
                href={`/products?category=${product.categoryId}`} 
                className="transition hover:text-slate-900 hover:underline"
              >
                {product.categoryName}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="font-medium text-slate-900">{product.name}</span>
        </div>

        {/* Cột chính: Ảnh + Thông tin */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          
          {/* Cột trái: Ảnh */}
          <div className="space-y-4">
            {/* ✅ KHUNG ẢNH CHÍNH (ĐÃ TÍCH HỢP KÍNH LÚP) */}
            <div 
              className="relative aspect-square w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm cursor-zoom-in group"
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleMouseMove}
              onClick={() => {
                setIsZooming(false);       // 👈 tắt zoom trước
                setOpenLightbox(true);     // 👈 mở modal
              }}
            >
              {!imageLoaded && <div className="absolute inset-0 z-10 animate-pulse bg-slate-100" />}
              
              {activeImage ? (
                <img
                  src={resolveImgUrl(activeImage)}
                  alt={product.name}
                  onLoad={() => setImageLoaded(true)}
                  // Thêm hiệu ứng transform mượt mà
                  className="h-full w-full object-cover transition-transform duration-100 ease-out"
                  style={{
                    // Phóng to gấp 2.5 lần khi hover
                    transform: isZooming ? "scale(2.5)" : "scale(1)",
                    // Tâm phóng to di chuyển theo chuột
                    transformOrigin: isZooming ? `${zoomPosition.x}% ${zoomPosition.y}%` : "center center",
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-7xl">📦</div>
              )}
              
              {/* Nhãn "Còn hàng" (Tự động ẩn đi khi đang zoom để khỏi che mất ảnh) */}
              {stockStatus && !isZooming && (
                <div className="absolute left-5 top-5 z-20 transition-opacity">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${stockStatus.className}`}>
                    {stockStatus.text}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {/* Ảnh bìa */}
              {product.imageUrl && (
                <button
                  type="button"
                  onClick={() => setActiveImage(product.imageUrl!)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${activeImage === product.imageUrl ? "border-blue-600 ring-2 ring-blue-100" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  <img src={resolveImgUrl(product.imageUrl)} className="h-full w-full object-cover" alt="thumb-main" />
                </button>
              )}
              
              {/* Ảnh của các phân loại (Biến thể) */}
              {product.variants?.map((v, idx) => v.imageUrl ? (
                <button
                  key={`var-${idx}`}
                  type="button"
                  onClick={() => { setActiveImage(v.imageUrl!); setSelectedVariant(v); }}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${activeImage === v.imageUrl ? "border-blue-600 ring-2 ring-blue-100" : "border-transparent opacity-60 hover:opacity-100"}`}
                  title={v.variantName}
                >
                  <img src={resolveImgUrl(v.imageUrl)} className="h-full w-full object-cover" alt={`thumb-var-${idx}`} />
                </button>
              ) : null)}

              {/* Ảnh phụ khác */}
              {product.additionalImages?.map((imgUrl, idx) => (
                <button
                  key={`add-${idx}`}
                  type="button"
                  onClick={() => setActiveImage(imgUrl)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${activeImage === imgUrl ? "border-blue-600 ring-2 ring-blue-100" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  <img src={resolveImgUrl(imgUrl)} className="h-full w-full object-cover" alt={`thumb-sub-${idx}`} />
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold text-slate-900">Điểm nổi bật</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Danh mục</p>
                  <p className="mt-1 font-semibold text-slate-900">{product.categoryName || "Chưa phân loại"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Tồn kho</p>
                  <p className="mt-1 font-semibold text-slate-900">{currentStock} sản phẩm</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Đã bán</p>
                  <p className="mt-1 font-semibold text-blue-600">{formatSoldCount(product.soldCount)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Giảm giá</p>
                  <p className="mt-1 font-semibold text-red-600">{product.discount ? `${product.discount}%` : "Không có"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Thông tin */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                {product.categoryName && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">{product.categoryName}</span>
                )}
                {currentDiscount > 0 && (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">Giảm {currentDiscount}%</span>
                )}
              </div>

              <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{product.name}</h1>

              {/* HIỂN THỊ SỐ SAO TỔNG QUAN */}
              {reviewStats.totalReviews > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <div className="flex items-center text-yellow-400">
                    <Star size={18} fill="currentColor" stroke="none" />
                    <span className="ml-1 font-semibold text-slate-900">{reviewStats.averageRating}</span>
                  </div>
                  <span>•</span>
                  <span>{reviewStats.totalReviews} đánh giá</span>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-end gap-3">
                <div className="text-3xl font-bold text-slate-900 sm:text-4xl">{formatVND(displayPrice)}</div>
                {currentDiscount > 0 && (
                  <div className="pb-1 text-lg text-slate-400 line-through">{formatVND(currentPrice)}</div>
                )}
              </div>

              {currentDiscount > 0 && (
                <p className="mt-2 text-sm text-green-700">Bạn tiết kiệm được <span className="font-semibold">{formatVND(currentPrice - displayPrice)}</span></p>
              )}

              {/* ✅ KHU VỰC CHỌN PHÂN LOẠI BIẾN THỂ (BẢN TỐI THƯỢNG: MÀU TRÊN DÒNG + MÀU TRONG NÚT) */}
              {product.variants && product.variants.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-6 space-y-4">
                  
                  {/* 🎨 ĐỊNH NGHĨA TỪ ĐIỂN MÀU SẮC CHỐNG LỖI TYPING */}
                  {(() => {
                      const getHexColor = (colorName?: string) => {
                          if (!colorName) return null;
                          const cleanName = colorName.trim().toLowerCase();
                          const map: { [key: string]: string } = {
                              "đỏ": "#ef4444", "cam": "#f97316", "vàng": "#eab308",
                              "xanh dương": "#3b82f6", "xanh lá cây": "#22c55e", "tím": "#a855f7",
                              "đen": "#000000", "trắng": "#ffffff", "xanh": "#3b82f6",
                              "xanh lá": "#22c55e", "xám": "#6b7280", "hồng": "#ec4899"
                          };
                          return map[cleanName] || null;
                      };

                      // Mã màu cho dòng Text "Màu sắc:" ở trên
                      const selectedColorHex = getHexColor(selectedVariant?.color);
                      const isSelectedWhite = selectedColorHex === '#ffffff';

                      return (
                        <>
                          {/* DÒNG 1: MÀU SẮC ĐANG CHỌN (TRÊN CÙNG) */}
                          {selectedVariant && selectedVariant.color && (
                            <div className="flex items-center gap-3 text-base text-slate-900 mb-2">
                                <span className="shrink-0">Màu sắc:</span>
                                {selectedColorHex && (
                                  <span 
                                      className={`w-5 h-5 rounded-full shrink-0 ${isSelectedWhite ? 'border border-slate-300' : ''}`}
                                      style={{ backgroundColor: selectedColorHex }}
                                  />
                                )}
                                <span className="font-semibold text-black leading-none">{selectedVariant.color}</span>
                            </div>
                          )}

                          {/* DÒNG 2: DANH SÁCH NÚT BẤM (ICON MÀU VÀO TRONG NÚT) */}
                          <div>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Phân loại</h3>
                            <div className="flex flex-wrap gap-5">
                                {product.variants.map((v: any) => {
                                  const isSelected = selectedVariant?.id === v.id;
                                  const isOutOfStock = v.stock <= 0;
                                  
                                  // Tính mã màu riêng cho TỪNG NÚT MỘT
                                  const btnColorHex = getHexColor(v.color);
                                  const needBtnBorder = btnColorHex === '#ffffff';

                                  return (
                                    <button
                                      key={v.id}
                                      onClick={() => !isOutOfStock && handleSelectVariant(v)}
                                      disabled={isOutOfStock}
                                      className={`relative overflow-hidden rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5
                                        ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}
                                        ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' : ''}
                                      `}
                                    >
                                      {/* ✅ ICON TRÒN BÊN TRONG NÚT */}
                                      {btnColorHex && (
                                        <span 
                                            className={`w-4 h-4 rounded-full shrink-0 ${needBtnBorder ? 'border border-slate-300' : ''}`}
                                            style={{ backgroundColor: btnColorHex }}
                                        />
                                      )}

                                      <span className="leading-none">{v.variantName}</span>
                                      
                                      {/* GẠCH CHÉO NẾU HẾT HÀNG */}
                                      {isOutOfStock && (
                                        <span className="absolute inset-0 flex items-center justify-center">
                                          <span className="w-full border-t border-slate-400 -rotate-12 transform absolute"></span>
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        </>
                      );
                  })()}
                </div>
              )}

              <div className="mt-6 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">Mô tả sản phẩm</h2>
                <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">{product.description || "Sản phẩm chưa có mô tả chi tiết."}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Chọn số lượng</h3>
              <div className="flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center overflow-hidden rounded-2xl border border-slate-300">
                  <button onClick={handleDecrease} className="px-4 py-3 text-lg font-semibold text-slate-700 transition hover:bg-slate-50">−</button>
                  <div className="min-w-16 border-x border-slate-300 px-5 py-3 text-center font-semibold text-slate-900">{quantity}</div>
                  <button onClick={handleIncrease} disabled={currentStock <= 0} className="px-4 py-3 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">+</button>
                </div>
                <p className="text-sm text-slate-500">Tối đa: {currentStock > 0 ? currentStock : 0} sản phẩm</p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button onClick={handleBuyNow} disabled={currentStock <= 0} className={`flex items-center justify-center rounded-2xl px-5 py-4 font-semibold text-white transition ${currentStock <= 0 ? "cursor-not-allowed bg-slate-300" : "bg-slate-900 hover:bg-slate-800"}`}>
                  Mua ngay
                </button>
                <button onClick={handleAddToCart} disabled={currentStock <= 0 || isAdding} className={`flex items-center justify-center rounded-2xl border px-5 py-4 font-semibold transition ${currentStock <= 0 || isAdding ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}>
                  {isAdding ? "Đang thêm..." : "Thêm vào giỏ hàng"}
                </button>
                <button onClick={handleAddToWishlist} disabled={isWishlisting} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-pink-50 px-5 py-4 font-semibold text-pink-600 transition hover:bg-pink-100 disabled:opacity-50 sm:col-span-2">
                  {isWishlisting ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-600 border-t-transparent" /> : <Heart size={20} className="text-pink-500" />}
                  {isWishlisting ? "Đang xử lý..." : "Thêm vào danh sách yêu thích"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* KHU VỰC HIỂN THỊ ĐÁNH GIÁ (CHUẨN SHOPEE) */}
        {/* ======================================================= */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
            <h2 className="text-2xl font-bold text-slate-900">Đánh giá sản phẩm</h2>
            
            {reviewStats.totalReviews > 0 ? (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <Star size={28} className="text-yellow-400" fill="currentColor" stroke="none" />
                  <span>{reviewStats.averageRating} / 5</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{reviewStats.totalReviews} đánh giá</p>
              </div>
            ) : (
              <span className="text-sm text-slate-500">Chưa có đánh giá</span>
            )}
          </div>

          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                  <Star size={24} className="text-slate-300" />
                </div>
                <p className="text-lg font-medium text-slate-900">Chưa có đánh giá nào</p>
                <p className="text-slate-500 mt-1">Hãy mua hàng và là người đầu tiên đánh giá sản phẩm này!</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 text-base">{review.userName}</span>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex text-yellow-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} size={14} fill={star <= review.rating ? "currentColor" : "none"} className={star <= review.rating ? "text-yellow-400" : "text-slate-200"} />
                            ))}
                          </div>
                          {review.isVerifiedPurchase && (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle size={12} /> Đã mua hàng
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-slate-400">
                      {new Date(review.createdAt).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <p className="mt-4 text-slate-700 leading-relaxed pl-16">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Khối xem thêm sản phẩm */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Xem thêm sản phẩm khác</h3>
              <p className="mt-1 text-slate-600">Khám phá thêm nhiều sản phẩm phù hợp trong cửa hàng của bạn.</p>
            </div>
            <Link href="/products" className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700">
              Quay về danh sách sản phẩm
            </Link>
          </div>
        </div>
        {/* Lightbox */}
        {openLightbox && allImages.length > 0 && (
        <div
        className="fixed inset-0 z-[100] bg-black/35"
        onClick={closeLightbox}
        >
    <div
      className="absolute left-1/2 top-1/2 w-[92vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Nút đóng */}
      <button
        onClick={closeLightbox}
        className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white shadow-sm transition hover:bg-white hover:text-slate-900"
        title="Đóng"
      >
        <X size={26} strokeWidth={2.2} />
      </button>

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_280px]">
        {/* Ảnh lớn bên trái */}
        <div className="relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-4">
          {/* Nút zoom góc phải trên */}
          <div className="absolute right-20 top-4 z-20 flex items-center gap-3">
          <button
            onClick={handleZoomIn}
            disabled={isMaxZoom}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition
              ${isMaxZoom 
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm"}
            `}
            title="Phóng to"
          >
            <ZoomIn size={24} strokeWidth={2.2} />
          </button>
          <button
              onClick={handleZoomOut}
              disabled={isMinZoom}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition
                ${isMinZoom 
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm"}
              `}
              title="Thu nhỏ"
            >
              <ZoomOut size={24} strokeWidth={2.2} />
            </button>
          </div>

          <img
            src={allImages[photoIndex]}
            alt={`preview-${photoIndex}`}
            className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain transition-transform duration-200"
            style={{ transform: `scale(${previewZoom})` }}
          />

          {allImages.length > 1 && (
            <>
              <button
                onClick={() => {
                  setPreviewZoom(1);
                  setPhotoIndex((prev) =>
                    prev === 0 ? allImages.length - 1 : prev - 1
                  );
                }}  
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-800/75 text-3xl text-white transition hover:bg-slate-900"
              >
                ‹
              </button>

              <button
                onClick={() => {
                  setPreviewZoom(1);
                  setPhotoIndex((prev) =>
                    prev === allImages.length - 1 ? 0 : prev + 1
                  );
                }}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-800/75 text-3xl text-white transition hover:bg-slate-900"
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* Cột phải: tiêu đề + ảnh nhỏ ở góc trên */}
        <div className="flex flex-col">
          <h3 className="line-clamp-2 pr-10 text-xl font-semibold text-slate-900">
            {product?.name}
          </h3>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPreviewZoom(1);
                  setPhotoIndex(idx);
                }}
                className={`overflow-hidden rounded-xl border-2 bg-white transition ${
                  photoIndex === idx
                    ? "border-red-500 ring-2 ring-red-100"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <img
                  src={img}
                  alt={`thumb-${idx}`}
                  className="aspect-square h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}