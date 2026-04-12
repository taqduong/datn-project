'use client'

import { use, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  User, Mail, Phone, Shield, Edit2, Save, X,
  ShoppingBag, Heart, Settings, LogOut, Calendar, ChevronRight, Eye, EyeOff, Lock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api' 
import { updateUser } from '@/services/api'
import { uploadAvatar } from '@/services/api'
import { changePassword } from '@/services/api'


// ================== Kiểu dữ liệu ==================
interface OrderItem {
  id: number
  name: string
  quantity: number
  unitPrice: number
  imageUrls?: string | string[]
}

interface Order {
  orderId: number
  orderDate: string
  totalAmount: number
  status?: string
  details: OrderItem[]
}

interface UserData {
  id: string
  username: string
  fullName: string
  email: string
  phone: string
  role?: string
  avatar?: string
  createdAt?: string
  gender?: string
  age?: number
}

// ================== Component ==================
export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'wishlist' | 'settings'>('info')
  const [userData, setUserData] = useState<UserData | null>(null)
  const [editData, setEditData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  // Thêm state để lưu avatar
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // ================= STATE CHO ĐỔI MẬT KHẨU =================
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPwd, setIsChangingPwd] = useState(false)

  // ================= LOGIC KIỂM TRA MẬT KHẨU MỚI =================
  const passwordChecks = useMemo(
    () => [
      { label: "Tối thiểu 8 ký tự", valid: newPassword.length >= 8 },
      { label: "Có ít nhất 1 chữ hoa", valid: /[A-Z]/.test(newPassword) },
      { label: "Có ít nhất 1 chữ thường", valid: /[a-z]/.test(newPassword) },
      { label: "Có ít nhất 1 chữ số", valid: /\d/.test(newPassword) },
      { label: "Có ít nhất 1 ký tự đặc biệt (!@#$%^&*)", valid: /[!@#$%^&*]/.test(newPassword) },
    ],
    [newPassword]
  );
  
  const isPasswordStrong = passwordChecks.every((item) => item.valid);

 // Load thông tin user (ĐÃ VÁ LỖ HỔNG BẢO MẬT)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true); // Bật loading trước khi check
        
        // 1. KIỂM TRA ĐĂNG NHẬP: Lấy token và user từ LocalStorage
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        // 2. Nếu không có token -> CHƯA ĐĂNG NHẬP -> Ép văng ra màn hình "Chưa đăng nhập" ngay lập tức
        if (!token || !storedUser) {
          setUserData(null);
          setLoading(false);
          return; // Dừng luôn, không gọi API gì sất
        }

        // 3. Nếu đã đăng nhập, lấy thông tin user đang login
        let loggedInUser = JSON.parse(storedUser);

        // 4. BẢO MẬT: So sánh ID trên URL và ID của người đang login
        // Nếu cố tình gõ /profile/2 trong khi đang login là user 1 -> Bắt ép dùng id của user 1
        const targetUserId = loggedInUser.id || loggedInUser.Id;
        
        if (id && targetUserId.toString() !== id.toString()) {
            console.warn("Bảo mật: Không được xem thông tin người khác!");
            // Nếu có router.push('/403') thì cho vào đây, còn tạm thời ta cứ ép nó fetch đúng user đang login
        }

        // 5. Gọi API lấy dữ liệu mới nhất (chỉ lấy của targetUserId)
        try {
          const res = await api.get(`/users/${targetUserId}`);
          if (res.data) {
            loggedInUser = res.data;
          }
        } catch (err) {
          console.warn('⚠️ Lấy user từ API thất bại, dùng data cũ từ localStorage.');
        }

        // 6. Format lại dữ liệu và in ra màn hình (Giữ nguyên phần fix Avatar hoa/thường)
        const formattedUser: UserData = {
          id: loggedInUser.id || loggedInUser.Id,
          username: loggedInUser.username || loggedInUser.Username || '',
          fullName: loggedInUser.fullName || loggedInUser.FullName || loggedInUser.username || loggedInUser.Username || '',
          email: loggedInUser.email || loggedInUser.Email || '',
          phone: loggedInUser.phone || loggedInUser.Phone || '',
          role: loggedInUser.role || loggedInUser.Role || 'Customer',
          avatar: loggedInUser.avatar || loggedInUser.Avatar || '', 
          gender: loggedInUser.gender || loggedInUser.Gender || undefined, 
          age: loggedInUser.age || loggedInUser.Age || undefined,      
          createdAt: loggedInUser.createdAt || loggedInUser.CreatedAt || loggedInUser.createdDate || null
        }
        
        setUserData(formattedUser);
        setEditData(formattedUser);
        localStorage.setItem('user', JSON.stringify(formattedUser));

      } catch (error) {
        console.error('Lỗi khi tải thông tin người dùng:', error);
        setUserData(null); // Nếu lỗi nặng cũng cho văng ra
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [id]);

  // Lấy danh sách đơn hàng
  useEffect(() => {
    const fetchOrders = async () => {
      if (activeTab !== 'orders' || !userData?.id) return
      setLoadingOrders(true)
      try {
        const res = await api.get('/Order')
        setOrders(res.data || [])
      } catch (err) {
        console.error('Lỗi khi lấy đơn hàng:', err)
      } finally {
        setLoadingOrders(false)
      }
    }
    fetchOrders()
  }, [activeTab, userData])

// Lưu thay đổi
  const handleSave = async () => {
    if (!editData || !userData?.id) return;

    // THÊM ĐOẠN CHẶN TUỔI ÂM NÀY VÀO
    if (editData.age !== undefined && editData.age !== null) {
      if (editData.age < 1 || editData.age > 120) {
        alert("❌ Tuổi phải là số dương từ 1 đến 120!");
        return; // Dừng luôn, không gửi lên Backend
      }
    }

    try {
      const payload = {
        username: userData.username,  
        password: "", // Gửi chuỗi rỗng              
        fullName: editData.fullName,
        email: editData.email,
        phone: editData.phone,
        gender: editData.gender || undefined,  
        age: editData.age || undefined        
      };

      let newAvatarUrl = userData.avatar; // Tạm giữ link cũ

      // SỬA LỖI CHÍNH Ở ĐÂY: Nếu có chọn ảnh mới thì gọi API upload
      if (avatar) {
        const formData = new FormData();
        // ĐÚNG TÊN "avatarFile" MÀ BACKEND ĐANG CHỜ
        formData.append("avatarFile", avatar); 

        const avatarRes = await api.post(`/files/upload-avatar/${userData.id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        // Lấy link ảnh từ backend trả về cất vào biến
        newAvatarUrl = avatarRes.data.avatarUrl; 
      }

      const res = await updateUser(Number(userData.id), payload as any);

      if (res.status === 200 || res.status === 204) {
        const updatedUser = { 
          ...userData, 
          ...payload, 
          avatar: newAvatarUrl, // Nạp link ảnh mới (hoặc cũ) vào đây
          age: payload.age === undefined ? undefined : payload.age 
        };
        setUserData(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser)); // Cất vào LocalStorage
        window.dispatchEvent(new Event("storage"));
        setIsEditing(false);
        setAvatar(null); // Dọn dẹp state
        setAvatarPreview(null);
        alert('Cập nhật thông tin thành công!');
      } else {
        alert('Cập nhật thất bại, vui lòng thử lại!');
      }
    } catch (error: any) {
      console.error('Lỗi khi cập nhật thông tin:', error);
      
      let errorMsg = 'Có lỗi xảy ra khi cập nhật thông tin người dùng.';
      
      if (error.response?.data) {
        const data = error.response.data;
        
        // Trường hợp 1: Lỗi mình tự quăng ra (trùng Email, trùng SĐT)
        if (data.message) {
          errorMsg = data.message;
        } 
        // Trường hợp 2: Lỗi Validation tự động của .NET (nhập sai định dạng SĐT)
        else if (data.errors) {
          // Lấy câu lỗi đầu tiên trong danh sách lỗi trả về
          const firstErrorKey = Object.keys(data.errors)[0];
          errorMsg = data.errors[firstErrorKey][0];
        }
        // Trường hợp 3: Trả về chuỗi đơn giản
        else if (typeof data === 'string') {
          errorMsg = data;
        }
      }

      alert("❌ " + errorMsg);
    }
  };
// SỬA LẠI HÀM NÀY: Tự động lưu ảnh ngay khi vừa chọn xong!
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file || !userData?.id) return;

    try {
      // 1. Hiển thị ảnh xem trước ngay lập tức cho mượt mắt
      setAvatarPreview(URL.createObjectURL(file)); 

      // 2. GỌI API ĐẨY ẢNH LÊN LUÔN (Không cần chờ bấm nút Lưu)
      const avatarRes = await uploadAvatar(Number(userData.id), file);
      const newAvatarUrl = avatarRes.data.avatarUrl || avatarRes.data.AvatarUrl;

      // 3. Cập nhật lại thông tin User ngay và luôn
      const updatedUser = { ...userData, avatar: newAvatarUrl };
      
      setUserData(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("storage")); // Cập nhật luôn avatar trên thanh Navbar góc phải

      // Reset cái input file để lần sau chọn lại ảnh cũ vẫn được
      e.target.value = '';

      alert('Đã cập nhật ảnh đại diện thành công!');

    } catch (error) {
      console.error('Lỗi tải ảnh lên:', error);
      alert('Có lỗi xảy ra khi cập nhật ảnh đại diện.');
      setAvatarPreview(null); // Nếu lỗi thì gỡ cái ảnh xem trước đi
    }
  };

  const handleCancel = () => {
    setEditData(userData)
    setIsEditing(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

 // ================= HÀM XỬ LÝ ĐỔI MẬT KHẨU =================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }
    // Kiểm tra độ mạnh mật khẩu (chuẩn mới: 8 ký tự, hoa, thường, số, ký tự đặc biệt)
    // Dùng biến tổng hợp từ useMemo
    if (!isPasswordStrong) {
      alert("Mật khẩu mới chưa đáp ứng đầy đủ các tiêu chuẩn bảo mật!");
      return;
    }

    try {
      setIsChangingPwd(true);
      await changePassword({ oldPassword, newPassword }); // Gọi API
      
      alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.");
      
      // 1. Xóa vé VIP cũ
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 2. Kêu gọi Navbar load lại giao diện (mất avatar góc phải)
      window.dispatchEvent(new Event("userUpdated"));
      
      // 3. Đá văng khách ra trang đăng nhập
      router.push('/login');

    } catch (error: any) {
      console.error("Lỗi đổi mật khẩu:", error);
      const msg = error.response?.data?.message || "Mật khẩu cũ không chính xác hoặc có lỗi xảy ra.";
      alert("❌ " + msg);
    } finally {
      setIsChangingPwd(false);
    }
  };

  // Role Formatter
  const getRoleDisplayName = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'Admin'
      case 'nhanvien': return 'Nhân viên'
      case 'nguoimua': return 'Khách hàng'
      default: return role
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-sm"></div>
          <p className="text-zinc-600 font-medium">Đang tải thông tin...</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="text-center max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={40} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Chưa đăng nhập</h2>
          <p className="text-zinc-500 mb-8">Vui lòng đăng nhập để xem thông tin cá nhân và quản lý đơn hàng của bạn.</p>
          <Link href="/login" className="inline-flex w-full justify-center items-center px-6 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm font-medium text-zinc-500">
          <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
          <ChevronRight size={16} />
          <span className="text-zinc-900">Trang cá nhân</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* ================== SIDEBAR ================== */}
          <div className="lg:col-span-3 lg:col-start-1">
            <div className="bg-white rounded-4xl shadow-sm border border-zinc-200 overflow-hidden sticky top-24">
              
            {/* User Avatar Section */}
              <div className="p-8 text-center bg-linear-to-b from-blue-50/50 to-white">
                <div className="relative w-28 h-28 mx-auto mb-5">
                    <div className="w-full h-full rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-3xl font-bold shadow-md ring-4 ring-white overflow-hidden">
                        <img 
                          src={
                            avatarPreview || 
                            userData.avatar || 
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName || 'User')}&background=0D8ABC&color=fff&size=150`
                          } 
                          alt="User Avatar" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName || 'User')}&background=0D8ABC&color=fff&size=150`;
                          }}
                        />
                    </div>

                    <label className="absolute bottom-0 right-0 cursor-pointer">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden" 
                        />
                        <div className="p-2.5 bg-white rounded-full text-zinc-600 shadow-md border border-zinc-200 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center">
                            <Edit2 size={16} />
                        </div>
                    </label>
                </div>
                
                <h2 className="text-xl font-bold text-zinc-900 mb-1">{userData.fullName}</h2>
                <p className="text-sm text-zinc-500 mb-4">{userData.email}</p>
                <span className="inline-flex px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-semibold uppercase tracking-wide">
                  {getRoleDisplayName(userData.role || '')}
                </span>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-1">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all ${
                    activeTab === 'info' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <User size={20} className={activeTab === 'info' ? 'text-blue-600' : 'text-zinc-400'} />
                  <span>Thông tin cá nhân</span>
                </button>

                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all ${
                    activeTab === 'orders' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <ShoppingBag size={20} className={activeTab === 'orders' ? 'text-blue-600' : 'text-zinc-400'} />
                  <span>Đơn hàng của tôi</span>
                </button>

                <Link 
                  href="/wishlist" 
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all"
                >
                  <Heart size={20} className="text-zinc-400" />
                  <span>Danh sách yêu thích</span>
                </Link>

                <div className="h-px bg-zinc-100 my-4 mx-4"></div>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all ${
                    activeTab === 'settings' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <Settings size={20} className={activeTab === 'settings' ? 'text-blue-600' : 'text-zinc-400'} />
                  <span>Đổi mật khẩu</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut size={20} />
                  <span>Đăng xuất</span>
                </button>
              </nav>
            </div>
          </div>

          {/* ================== MAIN CONTENT ================== */}
          <div className="lg:col-span-9">
            
            {/* TAB: THÔNG TIN CÁ NHÂN */}
            {activeTab === 'info' && (
              <div className="bg-white rounded-4xl shadow-sm border border-zinc-200 overflow-hidden">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Hồ sơ của tôi</h2>
                    <p className="text-sm text-zinc-500 mt-1">Quản lý thông tin bảo mật để bảo vệ tài khoản</p>
                  </div>
                  
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-zinc-200 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition shadow-sm"
                    >
                      <Edit2 size={16} />
                      Chỉnh sửa
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-zinc-200 text-zinc-600 font-semibold rounded-xl hover:bg-zinc-50 hover:text-zinc-900 transition"
                      >
                        <X size={16} />
                        Hủy
                      </button>
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm"
                      >
                        <Save size={16} />
                        Lưu thay đổi
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Content */}
                <div className="p-8">
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    
                    {/* Username */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Tên đăng nhập</label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 text-zinc-400" size={20} />
                        <input
                          type="text"
                          value={userData.username}
                          disabled
                          className="w-full pl-12 pr-4 py-3.5 border border-zinc-200 rounded-xl bg-zinc-50 text-zinc-500 font-medium cursor-not-allowed"
                        />
                      </div>
                      <p className="text-xs text-zinc-400 mt-1.5 ml-1">Tên đăng nhập không thể thay đổi</p>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Họ và tên</label>
                      <div className="relative group">
                        <User className={`absolute left-4 top-3.5 transition-colors ${isEditing ? 'text-blue-500' : 'text-zinc-400'}`} size={20} />
                        <input
                          type="text"
                          value={isEditing ? editData?.fullName : userData.fullName}
                          onChange={(e) => editData && setEditData({ ...editData, fullName: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full pl-12 pr-4 py-3.5 border rounded-xl font-medium transition-all ${
                            isEditing 
                              ? 'border-blue-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 text-zinc-900' 
                              : 'border-zinc-200 bg-white text-zinc-700 disabled:opacity-100'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Email liên hệ</label>
                      <div className="relative">
                        <Mail className={`absolute left-4 top-3.5 transition-colors ${isEditing ? 'text-blue-500' : 'text-zinc-400'}`} size={20} />
                        <input
                          type="email"
                          value={isEditing ? editData?.email : userData.email}
                          onChange={(e) => editData && setEditData({ ...editData, email: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full pl-12 pr-4 py-3.5 border rounded-xl font-medium transition-all ${
                            isEditing 
                              ? 'border-blue-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 text-zinc-900' 
                              : 'border-zinc-200 bg-white text-zinc-700 disabled:opacity-100'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Số điện thoại</label>
                      <div className="relative">
                        <Phone className={`absolute left-4 top-3.5 transition-colors ${isEditing ? 'text-blue-500' : 'text-zinc-400'}`} size={20} />
                        <input
                          type="tel"
                          value={isEditing ? editData?.phone : userData.phone}
                          onChange={(e) => editData && setEditData({ ...editData, phone: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full pl-12 pr-4 py-3.5 border rounded-xl font-medium transition-all ${
                            isEditing 
                              ? 'border-blue-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 text-zinc-900' 
                              : 'border-zinc-200 bg-white text-zinc-700 disabled:opacity-100'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Gender & Age Row */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Gender */}
                      <div className="relative"> 
                        <label className="block text-sm font-semibold text-zinc-900 mb-2">Giới tính</label>
                        <select
                          value={isEditing ? editData?.gender || '' : userData?.gender || ''}
                          onChange={(e) => editData && setEditData({ ...editData, gender: e.target.value })}
                          disabled={!isEditing}
                          className={`w-full px-4 py-3.5 border rounded-xl font-medium transition-all appearance-none ${
                            isEditing 
                              ? 'border-blue-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 text-zinc-900 cursor-pointer' 
                              : 'border-zinc-200 bg-white text-zinc-700 disabled:opacity-100'
                          }`}
                        >
                          <option value="">-- Chọn --</option>
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                        </select>
                        {/* Biểu tượng mũi tên cho select */}
                        <div className="pointer-events-none absolute inset-y-0 right-0 top-7 flex items-center px-4 text-zinc-500">
                           <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>

                      {/* Age */}
                      <div>
                        <label className="block text-sm font-semibold text-zinc-900 mb-2">Tuổi</label>
                        <input
                          type="number"
                          min="1"        
                          max="120"
                          value={isEditing ? editData?.age || '' : userData?.age || ''}
                          onChange={(e) => editData && setEditData({ ...(editData as any), age: parseInt(e.target.value) })}
                          disabled={!isEditing}
                          className={`w-full px-4 py-3.5 border rounded-xl font-medium transition-all ${
                            isEditing 
                              ? 'border-blue-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 text-zinc-900' 
                              : 'border-zinc-200 bg-white text-zinc-700 disabled:opacity-100'
                          }`}
                          placeholder="VD: 25"
                        />
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Vai trò tài khoản</label>
                      <div className="relative">
                        <Shield className="absolute left-4 top-3.5 text-blue-500" size={20} />
                        <input
                          type="text"
                          value={getRoleDisplayName(userData.role || '')}
                          disabled
                          className="w-full pl-12 pr-4 py-3.5 border border-zinc-200 rounded-xl bg-blue-50/50 text-blue-700 font-bold cursor-default"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Join Date Banner */}
                  {userData.createdAt && (
                    <div className="mt-8 p-5 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">Thành viên HomeMart</p>
                        <p className="text-sm text-zinc-500">
                          Tham gia từ ngày {new Date(userData.createdAt).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ================== TAB: ĐƠN HÀNG CỦA TÔI ================== */}
            {activeTab === 'orders' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-4xl shadow-sm border border-zinc-200 p-8 flex items-center justify-between bg-linear-to-r from-blue-50/30 to-white">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Lịch sử đơn hàng</h2>
                    <p className="text-sm text-zinc-500 mt-1">Theo dõi quá trình vận chuyển và quản lý các đơn hàng đã đặt</p>
                  </div>
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-100">
                    {orders.length} đơn hàng
                  </div>
                </div>

                {loadingOrders ? (
                  <div className="bg-white rounded-4xl border border-zinc-200 p-20 text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-500 font-medium">Đang tải danh sách đơn hàng...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-white rounded-4xl border border-zinc-200 p-20 text-center shadow-sm">
                    <div className="w-20 h-20 bg-zinc-50 text-zinc-300 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShoppingBag size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-2">Bạn chưa có đơn hàng nào</h3>
                    <p className="text-zinc-500 mb-8">Hãy khám phá thêm nhiều sản phẩm hấp dẫn tại HomeMart nhé!</p>
                    <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md">
                      Mua sắm ngay <ChevronRight size={18} />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.orderId} className="bg-white rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                        <div className="p-6 sm:p-8">
                          {/* Order Header */}
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-100">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                <ShoppingBag size={24} />
                              </div>
                              <div>
                                <h4 className="font-bold text-zinc-900">Đơn hàng #{order.orderId}</h4>
                                <p className="text-sm text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                  <Calendar size={14} /> {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                order.status?.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                order.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                'bg-blue-50 text-blue-600 border-blue-100'
                              }`}>
                                {order.status === 'Pending' ? 'Chờ xác nhận' : order.status}
                              </span>
                              <p className="text-lg font-black text-blue-600">
                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(order.totalAmount)}
                              </p>
                            </div>
                          </div>

                          {/* Order Items Preview */}
                          <div className="space-y-4">
                            {order.details?.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl border border-zinc-100 overflow-hidden shrink-0 bg-white p-1">
                                  <img 
                                    src={
                                      Array.isArray(item.imageUrls) ? item.imageUrls[0] : 
                                      (item.imageUrls?.startsWith('http') ? item.imageUrls : `http://localhost:5270/${item.imageUrls}`)
                                    } 
                                    alt={item.name}
                                    className="w-full h-full object-cover rounded-lg"
                                    onError={(e) => e.currentTarget.src = 'https://placehold.co/100x100?text=SP'}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-bold text-zinc-800 text-sm truncate">{item.name}</h5>
                                  <p className="text-xs text-zinc-500 mt-1">Số lượng: {item.quantity} × {new Intl.NumberFormat("vi-VN").format(item.unitPrice)}đ</p>
                                </div>
                              </div>
                            ))}
                            {order.details?.length > 2 && (
                              <p className="text-xs text-zinc-400 font-medium pl-20">... và {order.details.length - 2} sản phẩm khác</p>
                            )}
                          </div>

                          {/* Footer Action */}
                          <div className="mt-6 pt-6 border-t border-zinc-100 flex justify-end">
                            <Link 
                              href={`/orders/${order.orderId}`}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all shadow-sm"
                            >
                              Xem chi tiết đơn <ChevronRight size={16} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: CÀI ĐẶT (BẢO MẬT & ĐỔI MẬT KHẨU) */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-4xl shadow-sm border border-zinc-200 overflow-hidden animate-in fade-in duration-500">
                {/* Header */}
                <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between gap-4 bg-zinc-50/50">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Bảo mật tài khoản</h2>
                    <p className="text-sm text-zinc-500 mt-1">Cập nhật mật khẩu thường xuyên để bảo vệ tài khoản của bạn</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-sm">
                    <Shield size={24} />
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-8 max-w-2xl">
                  <form onSubmit={handleChangePassword} className="space-y-6">
                    {/* Mật khẩu cũ */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Mật khẩu hiện tại</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 text-zinc-400" size={20} />
                        <input
                          type={showOldPassword ? "text" : "password"}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="Nhập mật khẩu cũ..."
                          className="w-full pl-12 pr-12 py-3.5 border border-zinc-200 rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-4 top-3.5 text-zinc-400 hover:text-blue-600 transition"
                        >
                          {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* Mật khẩu mới */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Mật khẩu mới</label>
                      <div className="relative">
                        <Shield className="absolute left-4 top-3.5 text-zinc-400" size={20} />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Nhập mật khẩu mới..."
                          className="w-full pl-12 pr-12 py-3.5 border border-zinc-200 rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-3.5 text-zinc-400 hover:text-blue-600 transition"
                        >
                          {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {/* <p className="text-xs text-zinc-400 mt-2 ml-1">Mật khẩu từ 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt.</p> */}
                    </div>
                    {/* Xác nhận mật khẩu mới */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Xác nhận mật khẩu mới</label>
                      <div className="relative">
                        <Shield className="absolute left-4 top-3.5 text-zinc-400" size={20} />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới..."
                          className="w-full pl-12 pr-12 py-3.5 border border-zinc-200 rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-3.5 text-zinc-400 hover:text-blue-600 transition"
                        >
                          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {/* Dòng báo khớp mật khẩu */}
                      {confirmPassword.length > 0 && (
                        <p className={`mt-2 ml-1 text-sm font-medium ${newPassword === confirmPassword ? "text-emerald-600" : "text-red-500"}`}>
                          {newPassword === confirmPassword ? "✓ Mật khẩu xác nhận đã khớp." : "✗ Mật khẩu xác nhận chưa khớp."}
                        </p>
                      )}
                    </div>

                    {/* BẢNG 5 TIÊU CHÍ */}
                    <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4">
                      <p className="mb-3 text-sm font-semibold text-zinc-700">Mật khẩu phải có:</p>
                      <div className="space-y-2.5">
                        {passwordChecks.map((item) => (
                          <div key={item.label} className="flex items-center gap-2.5 text-sm">
                            <span className={`h-2 w-2 rounded-full transition-colors duration-300 ${item.valid ? "bg-emerald-500" : "bg-zinc-300"}`} />
                            <span className={`transition-colors duration-300 ${item.valid ? "text-emerald-700 font-medium" : "text-zinc-500"}`}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-zinc-100">
                      <button
                        type="submit"
                        disabled={isChangingPwd || !oldPassword || !newPassword || !confirmPassword || !isPasswordStrong || newPassword !== confirmPassword}
                        className="inline-flex items-center justify-center w-full gap-2 px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md disabled:bg-zinc-300 disabled:cursor-not-allowed"
                      >
                        {isChangingPwd ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Save size={18} />
                        )}
                        Cập nhật mật khẩu
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}