"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchOrderById, addReview, type OrderDto, type OrderDetailDto } from "@/services/api";
import { Star, ArrowLeft, PackageCheck, Tag } from "lucide-react";

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");
  const orderId = searchParams.get("orderId");

  const [orderItem, setOrderItem] = useState<OrderDetailDto | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Lấy ảnh chuẩn
  const resolveImgUrl = (url?: string) => {
    if (!url) return "/default-image.png";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  useEffect(() => {
    if (!orderId || !productId) {
      setLoading(false);
      return;
    }

    // Lấy thông tin từ Đơn hàng để biết chính xác Phân loại (Màu sắc/Size)
    fetchOrderById(orderId)
      .then((res) => {
        const order = res.data;
        // Tìm đúng cái item trong đơn hàng khớp với productId
        const item = order.orderDetails.find(d => d.productId === Number(productId));
        if (item) setOrderItem(item);
      })
      .catch((err) => console.error("Lỗi tải thông tin đơn hàng:", err))
      .finally(() => setLoading(false));
  }, [orderId, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await addReview({ 
        productId: Number(productId), 
        orderId: Number(orderId), 
        rating, 
        comment 
      }); 
      
      alert("Đánh giá thành công!");
      router.push(`/products/${productId}`);
    } catch (error: any) {
       alert(error.response?.data?.message || "Lỗi");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex justify-center items-center">Đang tải thông tin...</div>;
  }

  if (!orderItem) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Không tìm thấy sản phẩm trong đơn hàng</h2>
        <button onClick={() => router.back()} className="px-6 py-2 bg-slate-900 text-white rounded-xl">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors w-fit"
        >
          <ArrowLeft size={18} /> Quay lại
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-6 py-5 text-white flex items-center gap-3">
            <PackageCheck size={24} className="text-orange-400" />
            <h1 className="text-xl font-bold">Đánh giá sản phẩm</h1>
          </div>

          <div className="p-6 sm:p-8">
            {/* Thông tin sản phẩm & Phân loại */}
            <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
              <img 
                src={resolveImgUrl(orderItem.imageUrl)} 
                alt={orderItem.productName} 
                className="w-20 h-20 rounded-xl object-cover border border-slate-200 shadow-sm"
              />
              <div>
                <h2 className="font-bold text-slate-900 text-lg leading-tight">{orderItem.productName}</h2>
                
                {/* HIỂN THỊ PHÂN LOẠI Ở ĐÂY */}
                {orderItem.variantName ? (
                  <div className="flex items-center gap-1.5 mt-2 text-orange-600 bg-orange-50 w-fit px-3 py-1 rounded-lg border border-orange-100">
                    <Tag size={14} />
                    <span className="text-sm font-semibold">Phân loại: {orderItem.variantName}</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-1 italic">Sản phẩm cơ bản</p>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-6 flex flex-col items-center">
                <p className="text-slate-600 font-medium mb-3">Chất lượng sản phẩm thế nào?</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        size={40}
                        className={`transition-colors ${star <= rating ? "text-orange-400" : "text-slate-200"}`}
                        fill={star <= rating ? "currentColor" : "none"}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm font-bold text-orange-500 mt-3 uppercase tracking-wider">
                  {rating === 5 ? "Tuyệt vời" : rating === 4 ? "Rất tốt" : rating === 3 ? "Bình thường" : rating === 2 ? "Kém" : "Rất tệ"}
                </p>
              </div>

              <div className="mb-8">
                <label className="block text-slate-700 font-medium mb-2">Chia sẻ thêm về trải nghiệm của bạn</label>
                <textarea
                  rows={4}
                  placeholder="Sản phẩm dùng rất tốt, màu sắc đúng như mô tả..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 p-4 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-orange-500 px-6 py-4 font-bold text-white transition hover:bg-orange-600 shadow-lg shadow-orange-200 disabled:opacity-50 flex justify-center items-center"
              >
                {isSubmitting ? "Đang gửi..." : "GỬI ĐÁNH GIÁ NGAY"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}