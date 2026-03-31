"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchProductById, addReview, type Product } from "@/services/api";
import { Star, ArrowLeft, PackageCheck } from "lucide-react";

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");
  const orderId = searchParams.get("orderId");

  const [product, setProduct] = useState<Product | null>(null);
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
    if (!productId) {
      setLoading(false);
      return;
    }
    fetchProductById(productId)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error("Lỗi tải SP:", err))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      // ✅ GỬI KÈM orderId TRONG PAYLOAD
      await addReview({ 
        productId: Number(productId), 
        orderId: Number(orderId), // QUAN TRỌNG NHẤT LÀ DÒNG NÀY
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

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Không tìm thấy sản phẩm để đánh giá</h2>
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
          {/* Header */}
          <div className="bg-slate-900 px-6 py-5 text-white flex items-center gap-3">
            <PackageCheck size={24} className="text-orange-400" />
            <h1 className="text-xl font-bold">Đánh giá sản phẩm</h1>
          </div>

          <div className="p-6 sm:p-8">
            {/* Thông tin sản phẩm */}
            <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
              <img 
                src={resolveImgUrl(product.imageUrl)} 
                alt={product.name} 
                className="w-16 h-16 rounded-xl object-cover border border-slate-200"
              />
              <div>
                <h2 className="font-bold text-slate-900">{product.name}</h2>
                <p className="text-sm text-slate-500 mt-1">Sản phẩm bạn đã mua</p>
              </div>
            </div>

            {/* Form đánh giá */}
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
                <p className="text-sm font-bold text-orange-500 mt-3">
                  {rating === 5 ? "Tuyệt vời" : rating === 4 ? "Rất tốt" : rating === 3 ? "Bình thường" : rating === 2 ? "Kém" : "Rất tệ"}
                </p>
              </div>

              <div className="mb-8">
                <label className="block text-slate-700 font-medium mb-2">Chia sẻ thêm về trải nghiệm của bạn (tuỳ chọn)</label>
                <textarea
                  rows={4}
                  placeholder="Ví dụ: Sản phẩm chất lượng, đóng gói cẩn thận, giao hàng nhanh..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 p-4 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-orange-500 px-6 py-4 font-bold text-white transition hover:bg-orange-600 disabled:opacity-50 flex justify-center items-center"
              >
                {isSubmitting ? "Đang gửi đánh giá..." : "Gửi Đánh Giá"}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}