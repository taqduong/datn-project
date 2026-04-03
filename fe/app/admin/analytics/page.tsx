'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  Eye,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Package,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'
import { fetchAnalyticsSummary, resolveImgUrl } from '@/services/api'

interface AnalyticsData {
  productId: number
  productName: string
  imageUrl?: string
  views: number
  addToCartCount: number
  purchaseCount: number
  lastUpdated: string
}

const chartColors = {
  views: '#3b82f6',
  carts: '#f59e0b',
  purchases: '#10b981',
}

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN')
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function truncateLabel(text: string, max = 20) {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError('')

        const res = await fetchAnalyticsSummary()
        const analyticsList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []

        setData(analyticsList)
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu phân tích:', err)
        setError('Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const totalViews = useMemo(() => data.reduce((sum, item) => sum + item.views, 0), [data])
  const totalCarts = useMemo(() => data.reduce((sum, item) => sum + item.addToCartCount, 0), [data])
  const totalPurchases = useMemo(() => data.reduce((sum, item) => sum + item.purchaseCount, 0), [data])

  const overallConversionRate = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0

  const bestProduct = useMemo(() => {
    if (!data.length) return null

    return [...data].sort((a, b) => {
      const aScore = a.purchaseCount * 100 + a.addToCartCount * 10 + a.views
      const bScore = b.purchaseCount * 100 + b.addToCartCount * 10 + b.views
      return bScore - aScore
    })[0]
  }, [data])

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        shortName: truncateLabel(item.productName, 22),
      })),
    [data]
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu phân tích...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600 shadow-sm">
          <AlertCircle size={22} />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-6 md:py-8">
      {/* HEADER */}
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 px-6 py-7 shadow-sm md:px-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-indigo-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              <Sparkles size={16} />
              Dashboard phân tích
            </div>

            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              <TrendingUp className="text-blue-600" size={34} />
              Phân tích & Thống kê
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
              Theo dõi lượt xem, thêm giỏ, đơn mua thành công và đánh giá hiệu quả chuyển đổi
              của từng sản phẩm theo giao diện trực quan hơn.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
            <MiniStat label="Sản phẩm" value={data.length} />
            <MiniStat label="Tổng view" value={totalViews} />
            <MiniStat label="Thêm giỏ" value={totalCarts} />
            <MiniStat label="Đã mua" value={totalPurchases} />
          </div>
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng lượt xem"
          value={formatNumber(totalViews)}
          icon={<Eye size={24} />}
          iconWrap="bg-blue-100 text-blue-700"
          subText="Tổng số lần người dùng xem sản phẩm"
          accent="from-blue-500/10 to-transparent"
        />

        <StatCard
          title="Thêm vào giỏ"
          value={formatNumber(totalCarts)}
          icon={<ShoppingCart size={24} />}
          iconWrap="bg-amber-100 text-amber-600"
          subText="Số lượt khách thêm sản phẩm vào giỏ"
          accent="from-amber-500/10 to-transparent"
        />

        <StatCard
          title="Mua thành công"
          value={formatNumber(totalPurchases)}
          icon={<CreditCard size={24} />}
          iconWrap="bg-emerald-100 text-emerald-600"
          subText="Số đơn hàng hoàn tất từ sản phẩm"
          accent="from-emerald-500/10 to-transparent"
        />

        <StatCard
          title="Tỷ lệ chuyển đổi"
          value={formatPercent(overallConversionRate)}
          icon={<ArrowUpRight size={24} />}
          iconWrap="bg-violet-100 text-violet-600"
          subText="Tính theo tổng mua thành công / tổng lượt xem"
          accent="from-violet-500/10 to-transparent"
        />
      </section>

      {/* TOP + CHART */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
              <Package size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Sản phẩm nổi bật</h2>
          </div>

          {bestProduct ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {bestProduct.imageUrl ? (
                  <img
                    src={resolveImgUrl(bestProduct.imageUrl)}
                    alt={bestProduct.productName}
                    className="h-52 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-52 items-center justify-center text-5xl">📦</div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Hiệu suất tốt nhất
                </p>
                <h3 className="mt-2 line-clamp-2 text-lg font-bold text-slate-900">
                  {bestProduct.productName}
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <SmallMetric label="View" value={bestProduct.views} valueClass="text-blue-600" />
                <SmallMetric
                  label="Giỏ hàng"
                  value={bestProduct.addToCartCount}
                  valueClass="text-amber-500"
                />
                <SmallMetric
                  label="Đã bán"
                  value={bestProduct.purchaseCount}
                  valueClass="text-emerald-600"
                />
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-sm text-blue-800">
                  Tỷ lệ chuyển đổi:{' '}
                  <span className="font-bold">
                    {formatPercent(
                      bestProduct.views > 0
                        ? (bestProduct.purchaseCount / bestProduct.views) * 100
                        : 0
                    )}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
              Chưa có dữ liệu
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Biểu đồ hành vi sản phẩm</h2>
              <p className="mt-1 text-sm text-slate-500">
                So sánh lượt xem, thêm giỏ và mua thành công theo từng sản phẩm.
              </p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="flex h-[420px] items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              Chưa có dữ liệu thống kê nào.
            </div>
          ) : (
            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    angle={-22}
                    textAnchor="end"
                    interval={0}
                    height={70}
                  />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                      backgroundColor: '#ffffff',
                    }}
                    formatter={(value, name) => [formatNumber(Number(value ?? 0)), String(name)]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.productName || ''}
                  />

                  <Bar dataKey="views" name="Lượt xem" radius={[8, 8, 0, 0]} maxBarSize={36}>
                    {chartData.map((_, index) => (
                      <Cell key={`views-${index}`} fill={chartColors.views} />
                    ))}
                  </Bar>

                  <Bar dataKey="addToCartCount" name="Thêm giỏ" radius={[8, 8, 0, 0]} maxBarSize={36}>
                    {chartData.map((_, index) => (
                      <Cell key={`carts-${index}`} fill={chartColors.carts} />
                    ))}
                  </Bar>

                  <Bar dataKey="purchaseCount" name="Mua thành công" radius={[8, 8, 0, 0]} maxBarSize={36}>
                    {chartData.map((_, index) => (
                      <Cell key={`purchase-${index}`} fill={chartColors.purchases} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <LegendItem color="bg-blue-500" label="Lượt xem" />
            <LegendItem color="bg-amber-500" label="Thêm giỏ" />
            <LegendItem color="bg-emerald-500" label="Mua thành công" />
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">Chi tiết số liệu sản phẩm</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bảng tổng hợp lượt xem, thêm giỏ, số lượng bán và tỷ lệ chuyển đổi.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 font-bold">Sản phẩm</th>
                <th className="px-6 py-4 text-center font-bold">Lượt xem</th>
                <th className="px-6 py-4 text-center font-bold">Thêm giỏ</th>
                <th className="px-6 py-4 text-center font-bold">Đã bán</th>
                <th className="px-6 py-4 text-center font-bold">Tỷ lệ chuyển đổi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.length > 0 ? (
                data.map((item) => {
                  const conversionRate =
                    item.views > 0 ? (item.purchaseCount / item.views) * 100 : 0

                  return (
                    <tr key={item.productId} className="transition hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={resolveImgUrl(item.imageUrl)}
                              alt={item.productName}
                              className="h-12 w-12 rounded-xl border border-slate-200 object-cover shadow-sm"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-lg">
                              📦
                            </div>
                          )}

                          <div className="min-w-0">
                            <p
                              className="truncate font-semibold text-slate-900 max-w-[280px]"
                              title={item.productName}
                            >
                              {item.productName}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              ID sản phẩm: #{item.productId}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-blue-600">
                        {formatNumber(item.views)}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-amber-500">
                        {formatNumber(item.addToCartCount)}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-emerald-600">
                        {formatNumber(item.purchaseCount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex min-w-[72px] items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${
                            conversionRate >= 10
                              ? 'bg-emerald-100 text-emerald-700'
                              : conversionRate > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {formatPercent(conversionRate)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    Không có dữ liệu hiển thị.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  iconWrap,
  subText,
  accent,
}: {
  title: string
  value: string
  icon: React.ReactNode
  iconWrap: string
  subText: string
  accent: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${accent}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</h3>
          <p className="mt-2 text-sm leading-5 text-slate-500">{subText}</p>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconWrap}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{formatNumber(value)}</p>
    </div>
  )
}

function SmallMetric({
  label,
  value,
  valueClass,
}: {
  label: string
  value: number
  valueClass?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{label}</p>
      <p className={`mt-1 text-lg font-black ${valueClass || 'text-slate-900'}`}>
        {formatNumber(value)}
      </p>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-slate-600">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  )
}