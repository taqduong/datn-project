"use client";

import Link from "next/link";
import { Search, ShoppingCart, User, Menu, Heart, X, LogOut, LayoutDashboard, Store, Clock } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchProducts, fetchCart, fetchWishlist } from "@/services/api";
type UserType = {
  id?: number | string;
  username?: string;
  fullName?: string;
  role?: string;
};

type CartItem = {
  quantity?: number;
};

export default function Navbar() {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null); // Để ẩn lịch sử khi click ra ngoài

  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load lịch sử từ máy
    const history = localStorage.getItem("searchHistory");
    if (history) setSearchHistory(JSON.parse(history));
  }, []);

  // Đóng bảng lịch sử khi bấm chuột ra ngoài ô Search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser: UserType = JSON.parse(storedUser);
        setUser(parsedUser);
        setRole(parsedUser.role || null);
      } else {
        setUser(null);
        setRole(null);
      }
      // ĐÃ XÓA PHẦN CHECK LOCALSTORAGE CỦA WISHLIST Ở ĐÂY
    } catch (error) {
      console.error("Lỗi khi đọc localStorage:", error);
      setUser(null);
      setRole(null);
    }
  };

  const fetchCartCount = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCartCount(0); // Chưa đăng nhập thì số giỏ hàng = 0
      return;
    }
    
    try {
      const res = await fetchCart(); // Gọi API lấy giỏ hàng từ DB
      const data = Array.isArray(res.data) ? res.data : [];
      // ĐẾM SỐ LƯỢNG MÓN (Số dòng trong giỏ hàng)
      setCartCount(data.length);
    } catch (error: any) {
      // Nếu lỗi 401 (hết hạn Token) thì im lặng set về 0, không in lỗi đỏ
      if (error.response?.status !== 401) {
        console.error("Lỗi đồng bộ số lượng giỏ hàng:", error);
      }
      setCartCount(0);
    }
  };

  // Gọi API đếm số lượng Wishlist
  const fetchWishlistCount = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setWishlistCount(0);
      return;
    }
    
    try {
      const res = await fetchWishlist();
      
      //  API Wishlist nó bọc mảng trong cục data
      // Check xem res.data có tồn tại không, rồi check tiếp res.data.data có phải Mảng không
      let count = 0;
      if (res.data && Array.isArray(res.data.data)) {
        count = res.data.data.length; // Lấy length của mảng bên trong
      } else if (Array.isArray(res.data)) {
        count = res.data.length; 
      }
      
      setWishlistCount(count);
      
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.error("Lỗi đồng bộ số lượng wishlist:", error);
      }
      setWishlistCount(0);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    
    loadData(); // Load User từ localStorage
    fetchCartCount(); // Chạy lấy số giỏ hàng
    fetchWishlistCount(); // Chạy lấy số wishlist

    window.addEventListener("storage", loadData);
    window.addEventListener("userUpdated", loadData as EventListener);
    
    // Gắn tai nghe cho Cart
    window.addEventListener("cartUpdated", fetchCartCount); 
    
    // Gắn tai nghe cho Wishlist (Hễ ai báo wishlistUpdated là gọi lại hàm đếm)
    window.addEventListener("wishlistUpdated", fetchWishlistCount);

    return () => {
      window.removeEventListener("storage", loadData);
      window.removeEventListener("userUpdated", loadData as EventListener);
      window.removeEventListener("cartUpdated", fetchCartCount); 
      window.removeEventListener("wishlistUpdated", fetchWishlistCount); 
    };
  }, [mounted]);

  const handleLogout = () => {
    // 1. Quét sạch mọi thông tin của user cũ trong kho chứa
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("wishlist"); // (Tùy chọn) Xóa luôn nếu sếp có lưu
    
    // 2. TÁT VẬT LÝ: Ép trình duyệt tải lại toàn bộ trang từ con số 0
    // Thay vì dùng router.push, ta dùng cái này để dọn sạch 100% rác bộ nhớ
    window.location.href = "/login";
  };

  const saveToHistory = (keyword: string) => {
    const newHistory = [keyword, ...searchHistory.filter((item) => item !== keyword)].slice(0, 8);
    setSearchHistory(newHistory);
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
  };

  const deleteHistoryItem = (e: React.MouseEvent, keyword: string) => {
    e.stopPropagation(); // Không cho nhảy vào hàm tìm kiếm khi bấm nút X
    const newHistory = searchHistory.filter((item) => item !== keyword);
    setSearchHistory(newHistory);
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
  };

  // SỬA LẠI HÀM NÀY ĐỂ NHẬN CẢ EVENT HOẶC STRING
  const handleSearch = async (e?: React.FormEvent<HTMLFormElement> | string) => {
    // Nếu là Event (khi nhấn Enter/nút Search) thì mới chặn reload trang
    if (e && typeof e !== "string") e.preventDefault();
    
    // Nếu truyền vào string (từ lịch sử) thì lấy luôn, không thì lấy từ searchQuery
    const keyword = typeof e === "string" ? e : searchQuery.trim();
    
    if (!keyword) return;

    saveToHistory(keyword); // Lưu lại lịch sử
    setShowHistory(false);
    
    try {
      const results = await searchProducts(keyword);
      if (results.data.length > 0) {
        router.push(`/products?keyword=${encodeURIComponent(keyword)}`);
      } else {
        alert("Không tìm thấy sản phẩm với từ khóa: " + keyword);
      }
    } catch (error) {
      alert("Đã xảy ra lỗi khi tìm kiếm sản phẩm.");
      console.error(error);
    }
  };

  if (!mounted) return null;

  const displayName = user?.fullName || user?.username || "Người dùng";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-4">
          <Link href="/" className="shrink-0 flex items-center gap-2 group">
            <div className="flex items-center justify-center w-9 h-9 bg-linear-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              <Store className="text-white" size={20} strokeWidth={2} />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-blue-700 to-blue-600">
              HomeMart
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-sm font-medium text-slate-700 transition hover:text-blue-600">Trang chủ</Link>
            <Link href="/products" className="text-sm font-medium text-slate-700 transition hover:text-blue-600">Sản phẩm</Link>
            <Link href="/orders" className="text-sm font-medium text-slate-700 transition hover:text-blue-600">Đơn hàng</Link>
            {(role === "nhanvien" || role === "admin") && (
              <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-100">
                <LayoutDashboard className="h-4 w-4" /> Quản trị
              </Link>
            )}
          </nav>

          {/* Thanh tìm kiếm cải tiến */}
          <div className="hidden flex-1 md:block relative" ref={searchRef}>
            <form onSubmit={handleSearch} className="mx-auto max-w-xl relative z-10">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowHistory(true)} // Hiện bảng khi bấm vào ô
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                <button type="submit" className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Dropdown Lịch sử hiển thị ở đây */}
            {showHistory && searchHistory.length > 0 && (
              <div className="absolute left-1/2 mt-2 w-full max-w-xl -translate-x-1/2 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl z-50">
                <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Lịch sử tìm kiếm</div>
                {searchHistory.map((item, index) => (
                  <div key={index} onClick={() => { setSearchQuery(item); handleSearch(item); }} className="group flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-slate-50">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Clock size={16} className="text-slate-400" />
                      <span className="font-medium">{item}</span>
                    </div>
                    <button onClick={(e) => deleteHistoryItem(e, item)} className="rounded-lg p-1 text-slate-300 opacity-0 transition hover:bg-slate-200 hover:text-slate-600 group-hover:opacity-100">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {/* Các nút yêu thích, giỏ hàng, tài khoản */}
            <Link href="/wishlist" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600" aria-label="Yêu thích">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">{wishlistCount}</span>
              )}
            </Link>
            <Link href="/carts" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600" aria-label="Giỏ hàng">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{cartCount}</span>
              )}
            </Link>

              {/* Các nút tài khoản */}
            <Link 
              href={user?.id ? `/profile/${user.id}` : "/login"} 
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 md:flex" 
              aria-label="Tài khoản"
            >
              <User className="h-5 w-5" />
            </Link>

            {/* Đăng xuất */}
            {user ? (
              <div className="hidden items-center gap-3 lg:flex">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Xin chào</p>
                  <p className="max-w-35 truncate text-sm font-semibold text-slate-800">{displayName}</p>
                </div>
                <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                <Link href="/login" className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600">Đăng nhập</Link>
                <Link href="/register" className="rounded-full border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50">Đăng ký</Link>
              </div>
            )}

            {/* Menu */}
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 md:hidden" onClick={() => setIsMenuOpen((prev) => !prev)} aria-label="Mở menu">
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="border-t border-slate-200 py-4 md:hidden">
            {/* Menu content */}
          </div>
        )}
      </div>
    </header>
  );
}