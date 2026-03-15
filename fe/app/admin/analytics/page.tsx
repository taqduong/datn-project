'use client'

import { useEffect, useState } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { Eye, ShoppingCart, CreditCard, TrendingUp, AlertCircle } from 'lucide-react'
import { fetchAnalyticsSummary } from '@/services/api' // Sửa lại đường dẫn nếu cần

// Định nghĩa Type để TypeScript không khóc
interface AnalyticsData {
  productId: number
  productName: string
  views: number
  addToCartCount: number
  purchaseCount: number
  lastUpdated: string
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const res = await fetchAnalyticsSummary()
        // API trả về trực tiếp mảng (theo file api.ts sếp viết)
        const analyticsList = Array.isArray(res.data) ? res.data : (res as any)
        setData(analyticsList)
      } catch (err: any) {
        console.error("Lỗi khi tải dữ liệu phân tích:", err)
        setError('Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ================= TÍNH TOÁN SỐ LIỆU TỔNG QUAN =================
  const totalViews = data.reduce((sum, item) => sum + item.views, 0)
  const totalCarts = data.reduce((sum, item) => sum + item.addToCartCount, 0)
  const totalPurchases = data.reduce((sum, item) => sum + item.purchaseCount, 0)

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-600 border border-red-100">
          <AlertCircle size={24} />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
          <TrendingUp className="text-blue-600" size={32} />
          Phân tích & Thống kê
        </h1>
        <p className="mt-2 text-zinc-500">
          Theo dõi hành vi người dùng, lượt xem và tỷ lệ chuyển đổi mua hàng của từng sản phẩm.
        </p>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Card Views */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-zinc-200 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5">
            <Eye size={120} />
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Eye size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Tổng Lượt Xem</p>
            <h3 className="text-3xl font-black text-zinc-900 mt-1">{totalViews.toLocaleString('vi-VN')}</h3>
          </div>
        </div>

        {/* Card Cart */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-zinc-200 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5">
            <ShoppingCart size={120} />
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <ShoppingCart size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Thêm Giỏ Hàng</p>
            <h3 className="text-3xl font-black text-zinc-900 mt-1">{totalCarts.toLocaleString('vi-VN')}</h3>
          </div>
        </div>

        {/* Card Purchases */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-zinc-200 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5">
            <CreditCard size={120} />
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CreditCard size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Lượt Mua Thành Công</p>
            <h3 className="text-3xl font-black text-zinc-900 mt-1">{totalPurchases.toLocaleString('vi-VN')}</h3>
          </div>
        </div>
      </div>

      {/* ================= BIỂU ĐỒ (CHART) ================= */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-zinc-200">
        <h2 className="text-lg font-bold text-zinc-800 mb-6">Biểu đồ hành vi trên từng sản phẩm</h2>
        {data.length === 0 ? (
          <div className="h-100 flex items-center justify-center text-zinc-400 font-medium">
            Chưa có dữ liệu thống kê nào.
          </div>
        ) : (
          <div className="h-112.5 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis 
                  dataKey="productName" 
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e4e4e7' }}
                  angle={-45}
                  textAnchor="end"
                  height={80} // Tăng chiều cao để chữ không bị cắt
                />
                <YAxis 
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                
                {/* 3 Cột biểu đồ */}
                <Bar dataKey="views" name="Lượt Xem" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="addToCartCount" name="Thêm Giỏ Hàng" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchaseCount" name="Lượt Mua" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ================= BẢNG CHI TIẾT DỮ LIỆU ================= */}
      <div className="rounded-3xl bg-white shadow-sm border border-zinc-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50/50">
          <h2 className="text-lg font-bold text-zinc-800">Chi tiết số liệu sản phẩm</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-4 font-bold">Sản phẩm</th>
                <th className="px-6 py-4 font-bold text-center">Lượt xem</th>
                <th className="px-6 py-4 font-bold text-center">Thêm giỏ</th>
                <th className="px-6 py-4 font-bold text-center">Đã bán</th>
                <th className="px-6 py-4 font-bold text-center">Tỷ lệ chuyển đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.map((item) => {
                // Tính tỷ lệ chuyển đổi: (Đã bán / Lượt xem) * 100
                const conversionRate = item.views > 0 
                  ? ((item.purchaseCount / item.views) * 100).toFixed(1) 
                  : "0.0";

                return (
                  <tr key={item.productId} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900 max-w-62.5 truncate" title={item.productName}>
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-blue-600">{item.views}</td>
                    <td className="px-6 py-4 text-center font-semibold text-amber-500">{item.addToCartCount}</td>
                    <td className="px-6 py-4 text-center font-semibold text-emerald-600">{item.purchaseCount}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        Number(conversionRate) > 10 ? 'bg-emerald-100 text-emerald-700' : 
                        Number(conversionRate) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {conversionRate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-400">Không có dữ liệu hiển thị.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}