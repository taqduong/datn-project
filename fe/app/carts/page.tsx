'use client'

import { useEffect, useState } from 'react'
import { fetchCart, updateCartItem, removeCartItem, resolveImgUrl } from "@/services/api" 
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type CartItem = {
  cartItemId: number
  productId: number
  variantId?: number      
  variantName?: string
  variantColor?: string
  variantPrice?: number     
  variantDiscount?: number  
  variantImage?: string
  quantity: number
  product: {
    id: number
    name: string
    price: number
    discount?: number | null
    priceAfterDiscount: number
    imageUrl?: string // Ở Backend chúng ta dùng imageUrl (số ít)
  }
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ===== THÊM STATE NÀY ĐỂ LƯU CÁC MÓN ĐƯỢC TICK =====
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

  const [subtotal, setSubtotal] = useState(0)
  const [discount, setDiscount] = useState(0) // Promo discount (nếu có sau này)
  const [total, setTotal] = useState(0)

  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [removingItems, setRemovingItems] = useState<Set<number>>(new Set())
  const router = useRouter()

  // Giá gốc (Ưu tiên giá phân loại, nếu không có thì lấy giá SP mẹ)
  const getOriginalPrice = (item: CartItem) => Number((item.variantPrice ?? item.product.price) || 0)

  // Giá khách trả
  const getUnitPrice = (item: CartItem) => {
    const price = getOriginalPrice(item)
    // SỬA DẤU ?? THÀNH || Ở ĐÂY 👇 (Nếu bằng 0 thì tự nhảy sang lấy của product)
    const discount = item.variantDiscount || item.product.discount || 0
    return Math.round(price * (1 - discount / 100))
  }

  // ===== SỬA HÀM TÍNH TỔNG: CHỈ TÍNH NHỮNG MÓN ĐƯỢC TICK =====
  const calculateSubtotal = (items: CartItem[], selectedIds: Set<number>) => {
    const sum = items
      .filter(item => selectedIds.has(item.cartItemId))
      .reduce((acc, item) => acc + getUnitPrice(item) * item.quantity, 0)
    setSubtotal(sum)
  }

  useEffect(() => {
    setTotal(subtotal - discount)
  }, [subtotal, discount])

  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        if (!token) {
          setError('Bạn chưa đăng nhập.')
          setCartItems([])
          return
        }

        const res = await fetchCart()
        const data = Array.isArray(res.data) ? (res.data as CartItem[]) : []
        setCartItems(data)
        
        // Mới vào giỏ hàng -> Tự động tick chọn tất cả cho khách
        const allItemIds = new Set(data.map(item => item.cartItemId));
        setSelectedItems(allItemIds);
        calculateSubtotal(data, allItemIds);

        setError(null)
      } catch {
        setError('Lỗi khi tải giỏ hàng.')
      } finally {
        setLoading(false)
      }
    }
    loadCart()
  }, [])

  // ===== HÀM XỬ LÝ KHI CLICK VÀO Ô CHECKBOX =====
  const handleToggleItem = (itemId: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      calculateSubtotal(cartItems, next)
      return next
    })
  }

  const handleToggleAll = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set()) // Đang tick hết -> Bỏ tick hết
      calculateSubtotal(cartItems, new Set())
    } else {
      const allItemIds = new Set(cartItems.map(item => item.cartItemId))
      setSelectedItems(allItemIds) // Tick tất cả
      calculateSubtotal(cartItems, allItemIds)
    }
  }

  const handleUpdateQuantity = async (itemId: number, productId: number, variantId: number | undefined, quantity: number) => {
    if (quantity < 1) {
      await handleRemoveItem(itemId, productId, variantId) 
      return
    }
    try {
      const updatedItems = cartItems.map((item) => item.cartItemId === itemId ? { ...item, quantity } : item )
      setCartItems(updatedItems)
      calculateSubtotal(updatedItems, selectedItems) // Truyền danh sách đang tick vào

      await updateCartItem(productId, quantity, variantId)
      window.dispatchEvent(new Event('cartUpdated'))
    } catch (err) {
      console.error('Lỗi cập nhật số lượng:', err)
      alert("Có lỗi xảy ra, vui lòng thử lại!")
    }
  }

  const handleRemoveItem = async (itemId: number, productId: number, variantId?: number) => {
    setRemovingItems((prev) => new Set(prev).add(itemId)) 
    try {
      await removeCartItem(productId, variantId)
      const updatedItems = cartItems.filter((item) => item.cartItemId !== itemId)
      setCartItems(updatedItems)
      
      // Xóa item đó khỏi danh sách tick chọn (nếu có)
      setSelectedItems(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        calculateSubtotal(updatedItems, next)
        return next
      })
      window.dispatchEvent(new Event('cartUpdated'))
    } catch (err) {
      console.error('Lỗi khi xóa sản phẩm:', err)
      alert("Lỗi khi xóa sản phẩm!")
    } finally {
      setRemovingItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  // ===== Truyền danh sách cartItemId đã tick qua URL =====
  const goCheckout = () => {
    if (selectedItems.size === 0) {
      alert("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán!");
      return;
    }
    setIsCheckingOut(true)
    
    // Gói các ID thành 1 chuỗi (vd: 1,5,8)
    const selectedIdsString = Array.from(selectedItems).join(',');
    
    // Đẩy sang trang Checkout kèm tham số
    router.push(`/checkout?cartItems=${selectedIdsString}`)
  }

  // ================= UI =================

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-gray-500 text-lg font-medium">Đang tải giỏ hàng...</div>
      </div>
    )

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center flex-col bg-gray-50">
        <div className="text-red-600 text-xl font-bold mb-4">{error}</div>
        <Link href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Đi đến Đăng nhập
        </Link>
      </div>
    )

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors bg-white px-5 py-2.5 rounded-xl shadow-sm border border-gray-200 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Tiếp tục mua sắm</span>
          </Link>

          <div className="text-left md:text-right">
            <h1 className="text-3xl font-bold text-gray-900">Giỏ hàng</h1>
            <p className="text-gray-500 mt-1 flex items-center md:justify-end gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              <span>{cartItems.length} sản phẩm</span>
            </p>
          </div>
        </div>

        {/* Empty Cart */}
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center max-w-2xl mx-auto mt-10">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
            <p className="text-gray-500 mb-8">Bạn chưa có sản phẩm nào trong giỏ hàng. Cùng khám phá hàng ngàn sản phẩm tuyệt vời nhé!</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Bắt đầu mua sắm ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Cột Danh sách sản phẩm */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* ===== THANH TICK CHỌN TẤT CẢ ===== */}
              <div className="bg-white p-4 sm:px-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between mb-2">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={cartItems.length > 0 && selectedItems.size === cartItems.length}
                    onChange={handleToggleAll}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span className="font-semibold text-gray-800 text-base">
                    Chọn tất cả ({cartItems.length})
                  </span>
                </label>
              </div>

              {cartItems.map((item) => {
                const unitPrice = getUnitPrice(item)
                const originalPrice = getOriginalPrice(item)
                const hasDiscount = unitPrice < originalPrice
                
                // Kiểm tra xem item này có đang được tick hay không
                const isSelected = selectedItems.has(item.cartItemId)

                return (
                  <div
                    key={item.cartItemId}
                    className={`bg-white p-4 sm:p-5 rounded-2xl shadow-sm border transition-all flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5
                      ${isSelected ? 'border-blue-300 shadow-blue-50' : 'border-gray-100 hover:shadow-md'}
                    `}
                  >
                    {/* ===== CHECKBOX TỪNG SẢN PHẨM ===== */}
                    <div className="pl-1 shrink-0">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(item.cartItemId)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Ảnh sản phẩm */}
                    <div className="w-full sm:w-28 h-28 shrink-0 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                      <img
                        // ƯU TIÊN ẢNH BIẾN THỂ TRƯỚC
                        src={resolveImgUrl(item.variantImage || item.product.imageUrl)} 
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Chi tiết sản phẩm */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2">
                            {item.product.name}
                          </h3>
                          {/* HIỂN THỊ TÊN PHÂN LOẠI & MÀU SẮC NẾU CÓ */}
                          {(item.variantName || item.variantColor) && (
                            <div className="mt-1.5 inline-block flex-wrap items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 w-fit">
                              Phân loại: <span className="text-slate-900">
                                {item.variantColor ? `${item.variantColor} - ` : ''}{item.variantName}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.cartItemId, item.productId, item.variantId)} // Truyền thêm variantId
                          disabled={removingItems.has(item.cartItemId)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>

                      {/* Giá & Số lượng (Căn chỉnh lại cho đẹp) */}
                      <div className="flex flex-wrap items-end justify-between mt-4 gap-4">
                        <div>
                          <div className="font-bold text-blue-600 text-xl">
                            {unitPrice.toLocaleString()}₫
                          </div>
                          {hasDiscount && (
                            <div className="text-sm text-gray-400 line-through mt-0.5">
                              {originalPrice.toLocaleString()}₫
                            </div>
                          )}
                        </div>

                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1">
                          <button
                            onClick={() => handleUpdateQuantity(item.cartItemId, item.productId, item.variantId, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded bg-white shadow-sm text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-10 text-center font-semibold text-gray-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.cartItemId, item.productId, item.variantId, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded bg-white shadow-sm text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Cột Tổng kết (Sticky) */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">Đơn hàng của bạn</h3>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium text-slate-800">Đã chọn ({selectedItems.size} sản phẩm)</span>
                    <span className="font-medium">{subtotal.toLocaleString()}₫</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Giảm giá</span>
                      <span className="font-medium">-{discount.toLocaleString()}₫</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-end border-t border-gray-100 pt-4 mb-8">
                  <span className="text-gray-900 font-semibold">Tổng cộng</span>
                  <div className="text-right">
                    <span className="block text-2xl font-bold text-blue-600">{total.toLocaleString()}₫</span>
                    <span className="text-xs text-gray-400 font-normal">(Đã bao gồm VAT nếu có)</span>
                  </div>
                </div>

                <button
                  onClick={goCheckout}
                  disabled={isCheckingOut || cartItems.length === 0}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
                >
                  {isCheckingOut ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    'Tiến hành thanh toán'
                  )}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}