"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { Heart, Star, CheckCircle, User as UserIcon, ZoomIn, ZoomOut, X, Expand, Shrink } from "lucide-react";
import { fetchProductById, addToCart, addToWishlist, type Product, fetchReviewsByProduct, type ReviewDto, logUserActivity, fetchSimilarProducts, trackProductView, trackProductAddToCart} from "@/services/api";
import ProductCard from "@/components/ProductCard";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>("");
  const [quantity, setQuantity] = useState<number | string>(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);
  const trackedIdRef = useRef<string | null>(null);

  // ===== STATE MỚI CHO PHÂN LOẠI 2 CẤP =====
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const [openLightbox, setOpenLightbox] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [isFillView, setIsFillView] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
  const [zoomPercent, setZoomPercent] = useState({ x: 50, y: 50 });
  const imageWrapperRef = useRef<HTMLDivElement | null>(null);
  const MAGNIFIER_SIZE = 180;
  const ZOOM_LEVEL = 1.8;
  const FLOAT_ZOOM_WIDTH = 537;

  const handleImageHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clampedX = Math.max(MAGNIFIER_SIZE / 2, Math.min(x, rect.width - MAGNIFIER_SIZE / 2));
    const clampedY = Math.max(MAGNIFIER_SIZE / 2, Math.min(y, rect.height - MAGNIFIER_SIZE / 2));

    setMagnifierPos({ x: clampedX, y: clampedY });
    setZoomPercent({
      x: (clampedX / rect.width) * 100,
      y: (clampedY / rect.height) * 100,
    });
  };

  const handleLightboxMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (previewZoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - dragPosition.x, y: e.clientY - dragPosition.y });
  };

  const handleLightboxMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || previewZoom <= 1) return;
    setDragPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleLightboxMouseUp = () => setIsDragging(false);

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
    setDragPosition({ x: 0, y: 0 });
    setIsDragging(false);
    setIsFillView(false);
};

  const handleZoomIn = () => setPreviewZoom((prev) => Math.min(prev + 0.6, 4));
  const handleZoomOut = () => setPreviewZoom((prev) => Math.max(prev - 0.6, 1));

  const handleToggleFillView = () => {
    setIsFillView((prev) => !prev);
    setPreviewZoom(1);
    setDragPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  useEffect(() => {
    if (!openLightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
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

      if (data?.imageUrl) {
        setActiveImage(data.imageUrl);
        setImageLoaded(false);
      }

      if (data?.id && trackedIdRef.current !== id) {
        trackedIdRef.current = id;
        
        // 1. BÁO CÁO LƯỢT XEM CHO BẢNG THỐNG KÊ ADMIN (Ai xem cũng đếm)
        trackProductView(data.id).catch(err => console.error("Lỗi đếm view:", err));

        // 2. LƯU LỊCH SỬ CHO AI GỢI Ý (Chỉ lưu nếu đã đăng nhập)
        const token = localStorage.getItem("token");
        if (token) {
          logUserActivity({ productId: data.id, actionType: "View" }).catch((err) =>
            console.error("Lỗi tracking View:", err)
          );
        }
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

  // Tự động chọn màu đầu tiên khi load sản phẩm
  useEffect(() => {
    if (product?.variants && product.variants.length > 0) {
      const colors = product.variants.map((v: any) => v.color).filter(Boolean);
      if (colors.length > 0 && !selectedColor) {
        setSelectedColor(colors[0]); 
      }
    }
  }, [product]);

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

  const formatSoldCount = (count?: number) => {
    if (!count || count === 0) return "0";
    if (count >= 1000) return (count / 1000).toFixed(1).replace(".0", "").replace(".", ",") + "k";
    return count.toString();
  };

  const hasVariants = product?.variants && product.variants.length > 0;
  const generalDiscount = product?.discount || 0;

  let displayPriceElement;
  let currentStock = 0;
  let savingAmountText = "";
  let displayDiscount = 0; 

  if (selectedVariant) {
    currentStock = selectedVariant.stock;
    displayDiscount = selectedVariant.discount ?? generalDiscount;
    const price = selectedVariant.price;
    const priceAfterDiscount = Math.round(price * (1 - displayDiscount / 100));

    displayPriceElement = (
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="text-3xl font-bold text-slate-900 sm:text-4xl">{formatVND(priceAfterDiscount)}</div>
        {displayDiscount > 0 && <div className="pb-1 text-lg text-slate-400 line-through">{formatVND(price)}</div>}
      </div>
    );
    savingAmountText = formatVND(price - priceAfterDiscount);
  } else if (hasVariants) {
    currentStock = product.variants!.reduce((total: number, v: any) => total + v.stock, 0);
    const originalPrices = product.variants!.map((v: any) => v.price);
    const minPrice = Math.min(...originalPrices);
    const maxPrice = Math.max(...originalPrices);

    const finalPrices = product.variants!.map((v: any) => {
      const d = v.discount ?? generalDiscount;
      return Math.round(v.price * (1 - d / 100));
    });
    const minFinal = Math.min(...finalPrices);
    const maxFinal = Math.max(...finalPrices);

    const discounts = product.variants!.map((v: any) => v.discount ?? generalDiscount);
    displayDiscount = Math.max(...discounts); 

    displayPriceElement = (
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="text-3xl font-bold text-slate-900 sm:text-4xl">
          {minFinal === maxFinal ? formatVND(minFinal) : `${formatVND(minFinal)} - ${formatVND(maxFinal)}`}
        </div>
        {displayDiscount > 0 && (
          <div className="pb-1 text-lg text-slate-400 line-through">
            {minPrice === maxPrice ? formatVND(minPrice) : `${formatVND(minPrice)} - ${formatVND(maxPrice)}`}
          </div>
        )}
      </div>
    );

    const savings = product.variants!.map((v: any) => {
       const d = v.discount ?? generalDiscount;
       return v.price - Math.round(v.price * (1 - d / 100));
    });
    const minSaving = Math.min(...savings);
    const maxSaving = Math.max(...savings);
    savingAmountText = minSaving === maxSaving ? formatVND(minSaving) : `${formatVND(minSaving)} - ${formatVND(maxSaving)}`;

  } else {
    currentStock = product?.stock || 0;
    displayDiscount = generalDiscount;
    const price = product?.price || 0;
    const priceAfterDiscount = Math.round(price * (1 - displayDiscount / 100));

    displayPriceElement = (
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="text-3xl font-bold text-slate-900 sm:text-4xl">{formatVND(priceAfterDiscount)}</div>
        {displayDiscount > 0 && <div className="pb-1 text-lg text-slate-400 line-through">{formatVND(price)}</div>}
      </div>
    );
    savingAmountText = formatVND(price - priceAfterDiscount);
  }

  const showSaving = displayDiscount > 0;

  const stockStatus = useMemo(() => {
    if (!product) return null;
    if (currentStock <= 0) return { text: "Hết hàng", className: "bg-red-100 text-red-700 ring-red-200" };
    if (currentStock <= 10) return { text: "Sắp hết hàng", className: "bg-yellow-100 text-yellow-700 ring-yellow-200" };
    return { text: "Còn hàng", className: "bg-green-100 text-green-700 ring-green-200" };
  }, [product, currentStock]);

  const handleIncrease = () => {
  if (!product) return;
  setQuantity((prev) => Math.min(Number(prev) + 1, Math.max(currentStock, 1)));
};

const handleDecrease = () => setQuantity((prev) => Math.max(Number(prev) - 1, 1));

const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const val = e.target.value.replace(/\D/g, ''); 
  if (val === '') {
    setQuantity('');
    return;
  }
  setQuantity(Number(val));
};

const handleQuantityBlur = () => {
    let validQty = Number(quantity);
    if (isNaN(validQty) || validQty < 1) validQty = 1;
    setQuantity(validQty);
  };

  // Hàm chọn Size/Biến thể cuối cùng
  const handleSelectVariant = (variant: any) => {
    setSelectedVariant(variant);
    if (variant.color) setSelectedColor(variant.color); // Đồng bộ lại màu
    setQuantity(1);
    setShowMagnifier(false);

    if (variant.imageUrl && variant.imageUrl !== activeImage) {
      setImageLoaded(false);
      setActiveImage(variant.imageUrl);
    }
  };

  // Hàm xử lý sự kiện khi người dùng click chọn Màu ở hàng 1
  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    if (!product) return;

    // Lấy ra danh sách tất cả các biến thể (variants) thuộc màu vừa chọn
    const variantsOfColor = product.variants?.filter((v: any) => v.color === color) || [];
    // Kiểm tra xem Phân loại đang chọn ở hàng 2 có tồn tại trong màu mới này không
    const exactMatch = variantsOfColor.find((v: any) => v.variantName === selectedVariant?.variantName);
    
    if (exactMatch && exactMatch.stock > 0) {
      // Nếu màu mới cũng có phân loại này và còn hàng -> Giữ nguyên phân loại, ngầm cập nhật sang variant mới
      handleSelectVariant(exactMatch); 
    } else {
      setSelectedVariant(null); // Nếu màu mới không có phân loại này (hoặc hết hàng) -> Reset hàng 2, bắt người dùng chọn lại phân loại
      // Nếu màu này có ảnh riêng thì đổi ảnh sang
      if (variantsOfColor[0]?.imageUrl && variantsOfColor[0].imageUrl !== activeImage) {
        setImageLoaded(false);
        setActiveImage(variantsOfColor[0].imageUrl);
      }
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    // THÊM CHECK TỒN KHO
    if (Number(quantity) > currentStock) {
      alert("Sản phẩm không đủ số lượng trong kho");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để mua hàng!");
      router.push("/login");
      return;
    }

    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      alert("⚠️ Vui lòng chọn đầy đủ Màu sắc và Phân loại trước khi mua hàng!");
      return;
    }

    router.push(
      `/checkout?buyNowId=${product.id}&qty=${Number(quantity)}${selectedVariant ? `&variantId=${selectedVariant.id}` : ""}`
    );
  };

  const handleAddToCart = async () => {
    if (!product) return;
    // THÊM CHECK TỒN KHO
    if (Number(quantity) > currentStock) {
      alert("Sản phẩm không đủ số lượng trong kho");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để mua hàng!");
      router.push("/login");
      return;
    }

    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      alert("⚠️ Vui lòng chọn đầy đủ Màu sắc và Phân loại trước khi thêm vào giỏ!");
      return;
    }

    try {
      setIsAdding(true);
      await addToCart(product.id, Number(quantity), selectedVariant?.id);

      logUserActivity({ productId: product.id, actionType: "AddToCart" }).catch((err) => console.error("Hoạt động Tracking [AddToCart] thất bại:", err));
      // Ghi nhận sự kiện "Thêm vào giỏ hàng" để phục vụ thống kê trên màn hình Admin
      trackProductAddToCart(product.id).catch((err) => console.error(err));
      window.dispatchEvent(new Event("cartUpdated"));
      alert(`Đã thêm ${product.name} ${selectedVariant ? `(${selectedColor ? selectedColor + ' - ' : ''}${selectedVariant.variantName})` : ""} vào giỏ hàng!`);
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
      logUserActivity({ productId: product.id, actionType: "AddToWishlist" }).catch((err) => console.error("Hoạt động Tracking [AddToWishlist] thất bại:", err));
      window.dispatchEvent(new Event("wishlistUpdated"));
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
            <button
              onClick={() => router.back()}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Quay lại
            </button>
            <Link href="/products" className="rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800">
              Xem tất cả sản phẩm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[470px_1fr] xl:grid-cols-[640px_1fr]">
          <div className="space-y-4 z-40">
            <div className="relative">
              <div
                ref={imageWrapperRef}
                className="relative w-full h-[400px] rounded-3xl border border-slate-200 bg-white shadow-sm cursor-pointer"
                onMouseEnter={() => setShowMagnifier(true)}
                onMouseLeave={() => setShowMagnifier(false)}
                onMouseMove={handleImageHover}
                onClick={() => {
                  setShowMagnifier(false);
                  setOpenLightbox(true);
                }}
              >
                {!imageLoaded && <div className="absolute inset-0 z-10 animate-pulse bg-slate-100 rounded-3xl" />}

                {activeImage ? (
                  <div className="absolute inset-0 overflow-hidden rounded-3xl bg-white">
                    <img
                      src={resolveImgUrl(activeImage)}
                      alt={product.name}
                      onLoad={() => setImageLoaded(true)}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-7xl rounded-3xl">📦</div>
                )}

                {stockStatus && !showMagnifier && (
                  <div className="absolute left-5 top-5 z-20 transition-opacity">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${stockStatus.className}`}>
                      {stockStatus.text}
                    </span>
                  </div>
                )}

                {showMagnifier && activeImage && (
                  <>
                    <div
                      className="pointer-events-none absolute z-20 rounded-2xl border border-blue-300 bg-black/10"
                      style={{
                        width: `${MAGNIFIER_SIZE}px`,
                        height: `${MAGNIFIER_SIZE}px`,
                        left: `${magnifierPos.x - MAGNIFIER_SIZE / 2}px`,
                        top: `${magnifierPos.y - MAGNIFIER_SIZE / 2}px`,
                      }}
                    />

                    <div
                      className="pointer-events-none absolute top-0 z-30 hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl xl:block"
                      style={{
                        left: `calc(100% + 40px)`,
                        width: `${FLOAT_ZOOM_WIDTH}px`,
                        height: "400px",
                      }}
                    >
                      <img
                        src={resolveImgUrl(activeImage)}
                        alt={`${product.name}-zoom`}
                        className="h-full w-full object-cover"
                        style={{
                          transform: `scale(${ZOOM_LEVEL})`,
                          transformOrigin: `${zoomPercent.x}% ${zoomPercent.y}%`,
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {allImages.map((imgUrl, idx) => {
                const isActive = resolveImgUrl(activeImage) === imgUrl;

                return (
                  <button
                    key={`thumb-gallery-${idx}`}
                    type="button"
                    onClick={() => {
                      if (activeImage !== imgUrl) {
                        setActiveImage(imgUrl);
                        setImageLoaded(false);
                      }
                      setShowMagnifier(false);
                    }}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      isActive ? "border-blue-600 ring-2 ring-blue-100" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} className="h-full w-full object-cover" alt={`thumb-${idx}`} />
                  </button>
                );
              })}
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
                  <p className="mt-1 font-semibold text-red-600">
                    {displayDiscount > 0 
                      ? (hasVariants && !selectedVariant ? `Lên đến ${displayDiscount}%` : `${displayDiscount}%`) 
                      : "Không có"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                {product.categoryName && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">{product.categoryName}</span>
                )}
                {displayDiscount > 0 && (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                    Giảm {displayDiscount}%
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{product.name}</h1>

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

              {displayPriceElement}

              {showSaving && (
                <p className="mt-2 text-sm text-green-700">
                  Bạn tiết kiệm được <span className="font-semibold">{savingAmountText}</span>
                </p>
              )}

              {/* PHÂN LOẠI / BIẾN THỂ (ĐÃ LÀM LẠI 2 CẤP) */}
              {product.variants && product.variants.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-6 space-y-6">
                  {(() => {
                    const getHexColor = (colorName?: string) => {
                      if (!colorName) return null;
                      const cleanName = colorName.trim().toLowerCase();
                      const map: { [key: string]: string } = {
                        đỏ: "#ef4444", cam: "#f97316", vàng: "#eab308", "xanh dương": "#3b82f6",
                        "xanh lá cây": "#22c55e", tím: "#a855f7", đen: "#000000", trắng: "#ffffff",
                        xanh: "#3b82f6", "xanh lá": "#22c55e", xám: "#6b7280", hồng: "#ec4899",
                        bạc: "#c0c0c0", nâu: "#8b4513", kem: "#f5f5dc", "vàng nhạt": "#fef08a",
                      };
                      return map[cleanName] || null;
                    };

                    // Rút trích danh sách Màu Sắc độc nhất
                    const uniqueColors = Array.from(new Set(product.variants.map((v: any) => v.color).filter(Boolean))) as string[];
                    const hasColors = uniqueColors.length > 0;

                    // Các Size được phép hiển thị tùy thuộc vào Màu sắc đang chọn
                    const variantsToShow = hasColors && selectedColor 
                    ? product.variants?.filter((v: any) => v.color === selectedColor) || []
                    : product.variants || [];

                    return (
                      <>
                        {/* HÀNG 1: CHỌN MÀU SẮC */}
                        {hasColors && (
                          <div>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                              Màu sắc: <span className="text-slate-900 font-bold ml-1">{selectedColor}</span>
                            </h3>
                            <div className="flex flex-wrap gap-3">
                              {uniqueColors.map((color) => {
                                const isSelectedColor = selectedColor === color;
                                const colorHex = getHexColor(color);
                                const isWhite = colorHex === "#ffffff";

                                return (
                                  <button
                                    key={color}
                                    onClick={() => handleSelectColor(color)}
                                    className={`relative overflow-hidden rounded-xl border px-4 py-2 text-sm font-medium transition-all flex items-center gap-2
                                      ${isSelectedColor 
                                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600" 
                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}
                                  >
                                    {colorHex && (
                                      <span
                                        className={`w-4 h-4 rounded-full shrink-0 ${isWhite ? "border border-slate-300" : ""}`}
                                        style={{ backgroundColor: colorHex }}
                                      />
                                    )}
                                    <span>{color}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* HÀNG 2: CHỌN KÍCH THƯỚC / PHÂN LOẠI */}
                        {variantsToShow.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                              Phân loại
                            </h3>
                            <div className="flex flex-wrap gap-3">
                              {variantsToShow.map((v: any) => {
                                const isSelected = selectedVariant?.id === v.id;
                                const isOutOfStock = v.stock <= 0;

                                return (
                                  <button
                                    key={v.id}
                                    onClick={() => !isOutOfStock && handleSelectVariant(v)}
                                    disabled={isOutOfStock}
                                    className={`relative overflow-hidden rounded-xl border px-5 py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center min-w-[70px]
                                      ${isSelected
                                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                                      }
                                      ${isOutOfStock ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200" : ""}
                                    `}
                                  >
                                    <span className="leading-none">{v.variantName}</span>
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
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="mt-8 border-t border-slate-100 pt-8">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Chọn số lượng</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="inline-flex items-center overflow-hidden rounded-2xl border border-slate-300">
                    <button onClick={handleDecrease} className="px-4 py-3 text-lg font-semibold text-slate-700 transition hover:bg-slate-50">
                      −
                    </button>
                    <input 
                      type="text"
                      value={quantity}
                      onChange={handleQuantityChange}
                      onBlur={handleQuantityBlur}
                      disabled={currentStock <= 0}
                      className="w-16 border-x border-slate-300 px-2 py-3 text-center font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                    <button
                      onClick={handleIncrease}
                      disabled={currentStock <= 0 || Number(quantity) >= currentStock}
                      className="px-4 py-3 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm text-slate-500">Tối đa: {currentStock > 0 ? currentStock : 0} sản phẩm</p>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    onClick={handleBuyNow}
                    disabled={currentStock <= 0}
                    className={`flex items-center justify-center rounded-2xl px-5 py-4 font-semibold text-white transition ${
                      currentStock <= 0 ? "cursor-not-allowed bg-slate-300" : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    Mua ngay
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={currentStock <= 0 || isAdding}
                    className={`flex items-center justify-center rounded-2xl border px-5 py-4 font-semibold transition ${
                      currentStock <= 0 || isAdding
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                        : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {isAdding ? "Đang thêm..." : "Thêm vào giỏ hàng"}
                  </button>
                  <button
                    onClick={handleAddToWishlist}
                    disabled={isWishlisting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-pink-50 px-5 py-4 font-semibold text-pink-600 transition hover:bg-pink-100 disabled:opacity-50 sm:col-span-2"
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
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="mb-6 border-b border-slate-100 pb-6">
            <h2 className="text-2xl font-bold text-slate-900">Mô tả sản phẩm</h2>
          </div>
          
          {product.description ? (
            <div className="space-y-4 text-slate-600 leading-8 text-justify text-base">
              {product.description
                .split(". ")
                .filter(Boolean)
                .map((sentence, index) => {
                  const text = sentence.trim() + (sentence.endsWith(".") ? "" : ".");
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-blue-500 font-bold mt-1 text-lg">✓</span>
                      <span>{text}</span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-slate-500 italic">Sản phẩm chưa có mô tả chi tiết.</p>
          )}
        </div>

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
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <div className="flex text-yellow-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                fill={star <= review.rating ? "currentColor" : "none"}
                                className={star <= review.rating ? "text-yellow-400" : "text-slate-200"}
                              />
                            ))}
                          </div>
                          
                          {/* HIỂN THỊ ĐẦY ĐỦ MÀU VÀ SIZE TRONG BÌNH LUẬN */}
                          {(review.variantName || review.variantColor) && (
                            <span className="text-xs text-slate-500 font-medium border-l border-slate-300 pl-2">
                              Phân loại: {review.variantColor ? `${review.variantColor} - ` : ''}{review.variantName}
                            </span>
                          )}

                          {review.isVerifiedPurchase && (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-1">
                              <CheckCircle size={12} /> Đã mua hàng
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-slate-400">
                      {new Date(review.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-4 text-slate-700 leading-relaxed pl-16">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <SimilarProducts productId={product.id} />

        {/* ========================================================= */}
        {/* LIGHTBOX KHU VỰC ẢNH PHÓNG TO (ĐÃ FIX FULLSCREEN CHUẨN) */}
        {/* ========================================================= */}
        {openLightbox && allImages.length > 0 && (
          <div className={`fixed inset-0 z-[100] transition-all duration-300 ${isFillView ? "bg-black" : "bg-black/40 backdrop-blur-sm"}`} onClick={closeLightbox}>
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white transition-all duration-300 overflow-hidden ${
                isFillView 
                  ? "w-screen h-screen max-w-none rounded-none bg-black" 
                  : "w-[92vw] max-w-6xl rounded-2xl shadow-2xl"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* NÚT TẮT LIGHTBOX (LUÔN HIỂN THỊ) */}
              <button
                onClick={closeLightbox}
                className={`absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition hover:bg-red-500 hover:text-white ${
                  isFillView ? "bg-white/10 text-white hover:bg-white/30" : "bg-black/10 text-slate-700 hover:bg-black/20"
                }`}
              >
                <X size={22} strokeWidth={1.5} />
              </button>

              {/* CHIA LAYOUT: NẾU FULLSCREEN THÌ 1 CỘT, BÌNH THƯỜNG THÌ 2 CỘT */}
              <div className={`relative grid h-full w-full ${isFillView ? "grid-cols-1 p-0" : "gap-6 p-6 lg:grid-cols-[1fr_280px]"}`}>
                
                {/* KHU VỰC ẢNH CHÍNH */}
                <div
                  className={`relative flex items-center justify-center overflow-hidden select-none ${
                    isFillView ? "h-screen w-screen bg-black" : "min-h-[520px] rounded-2xl bg-slate-50 p-4"
                  } ${
                    previewZoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
                  }`}
                  onMouseDown={handleLightboxMouseDown}
                  onMouseMove={handleLightboxMouseMove}
                  onMouseUp={handleLightboxMouseUp}
                  onMouseLeave={handleLightboxMouseUp}
                >
                  {/* THANH CÔNG CỤ ZOOM & FULLSCREEN */}
                  <div className={`absolute z-40 flex items-center gap-3 ${isFillView ? "top-4 right-20" : "top-4 right-4"}`}>
                    
                    {/* Các nút Zoom In/Out (Chỉ hiện khi chưa Fullscreen) */}
                    {!isFillView && (
                      <>
                        <button
                          onClick={handleZoomIn}
                          disabled={isMaxZoom}
                          className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                            isMaxZoom ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm"
                          }`}
                        >
                          <ZoomIn size={24} strokeWidth={2.2} />
                        </button>

                        <button
                          onClick={() => {
                            handleZoomOut();
                            if (previewZoom - 0.6 <= 1) setDragPosition({ x: 0, y: 0 });
                          }}
                          disabled={isMinZoom}
                          className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                            isMinZoom ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm"
                          }`}
                        >
                          <ZoomOut size={24} strokeWidth={2.2} />
                        </button>
                      </>
                    )}

                    {/* Nút Phóng to/Thu nhỏ màn hình (Luôn hiện) */}
                    <button
                      onClick={handleToggleFillView}
                      className={`flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition ${
                        isFillView ? "bg-white/10 text-white hover:bg-white/30" : "bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900"
                      }`}
                      title={isFillView ? "Thu nhỏ về mặc định" : "Phóng đầy khung"}
                    >
                      {isFillView ? <Shrink size={22} strokeWidth={2.2} /> : <Expand size={22} strokeWidth={2.2} />}
                    </button>
                  </div>

                  {/* ẢNH HIỂN THỊ */}
                  <img
                    src={allImages[photoIndex]}
                    alt={`preview-${photoIndex}`}
                    draggable={false}
                    className={`${
                      isFillView
                        ? "h-full w-full object-contain"
                        : "max-h-[75vh] w-auto max-w-full object-contain"
                    } ${!isDragging ? "transition-transform duration-200" : ""}`}
                    style={{
                      transform: `translate(${dragPosition.x}px, ${dragPosition.y}px) scale(${previewZoom})`,
                      transformOrigin: "center center",
                    }}
                  />

                  {/* NÚT NEXT/PREV */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewZoom(1);
                          setDragPosition({ x: 0, y: 0 });
                          setPhotoIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
                        }}
                        className={`absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-3xl text-white transition ${
                          isFillView ? "bg-white/10 hover:bg-white/30" : "bg-slate-800/75 hover:bg-slate-900"
                        }`}
                      >‹</button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewZoom(1);
                          setDragPosition({ x: 0, y: 0 });
                          setPhotoIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
                        }}
                        className={`absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-3xl text-white transition ${
                          isFillView ? "bg-white/10 hover:bg-white/30" : "bg-slate-800/75 hover:bg-slate-900"
                        }`}
                      >›</button>
                    </>
                  )}
                </div>

                {/* KHU VỰC THÔNG TIN (BỊ ẨN NẾU LÀ FULLSCREEN) */}
                {!isFillView && (
                  <div className="flex flex-col animate-in fade-in duration-300">
                    <h3 className="line-clamp-2 pr-10 text-xl font-semibold text-slate-900">{product?.name}</h3>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      {allImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setPreviewZoom(1);
                            setDragPosition({ x: 0, y: 0 });
                            setPhotoIndex(idx);
                          }}
                          className={`overflow-hidden rounded-xl border-2 bg-white transition ${photoIndex === idx ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-400"}`}
                        >
                          <img src={img} alt={`thumb-${idx}`} className="aspect-square h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SimilarProducts({ productId }: { productId: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSimilarProducts(productId)
      .then((res) => {
        const fixedProducts = res.data.map((p: any) => ({ ...p, variants: p.productVariants }));
        setProducts(fixedProducts);
      })
      .catch((err) => console.error("Lỗi tải sp tương tự:", err))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <div className="mt-8 h-40 animate-pulse rounded-3xl bg-slate-200"></div>;
  if (products.length === 0) return null;

  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
      <h2 className="mb-6 text-2xl font-bold text-slate-900">Sản phẩm tương tự</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}