'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  User, Mail, Phone, Shield, Edit2, Save, X,
  ShoppingBag, Heart, Settings, LogOut, Calendar, ChevronRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api' 
import { updateUser } from '@/services/api'
import { uploadAvatar } from '@/services/api'


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

  // Load thông tin user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = localStorage.getItem('user')
        let user = storedUser ? JSON.parse(storedUser) : null

        const userId = user?.id || id
        if (userId) {
          try {
            const res = await api.get(`/users/${userId}`)
            if (res.data) {
              user = res.data
              localStorage.setItem('user', JSON.stringify(user))
            }
          } catch (err) {
            console.warn('⚠️ Không thể lấy user từ API, fallback sang localStorage.')
          }
        }

        if (user) {
          const formattedUser: UserData = {
            id: user.id,
            username: user.username || '',
            fullName: user.fullName || user.username || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'Customer',
            avatar: user.avatar || user.Avatar || '',
            gender: user.gender || undefined, 
            age: user.age || undefined,      
            createdAt: user.createdAt || user.createdDate || null
          }
          setUserData(formattedUser)
          setEditData(formattedUser)
        }
      } catch (error) {
        console.error('❌ Lỗi khi tải thông tin người dùng:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [id])

  // Lấy danh sách đơn hàng
  useEffect(() => {
    const fetchOrders = async () => {
      if (activeTab !== 'orders' || !userData?.id) return
      setLoadingOrders(true)
      try {
        const res = await api.get(`/users/${userData.id}/orders`)
        setOrders((res.data as any).data || [])
      } catch (err) {
        console.error('❌ Lỗi khi lấy đơn hàng:', err)
      } finally {
        setLoadingOrders(false)
      }
    }
    fetchOrders()
  }, [activeTab, userData])

// Lưu thay đổi
  const handleSave = async () => {
    if (!editData || !userData?.id) return;

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
        alert('✅ Cập nhật thông tin thành công!');
      } else {
        alert('⚠️ Cập nhật thất bại, vui lòng thử lại!');
      }
    } catch (error) {
      console.error('❌ Lỗi khi cập nhật thông tin:', error);
      alert('❌ Có lỗi xảy ra khi cập nhật thông tin người dùng.');
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

      alert('✅ Đã cập nhật ảnh đại diện thành công!');

    } catch (error) {
      console.error('❌ Lỗi tải ảnh lên:', error);
      alert('❌ Có lỗi xảy ra khi cập nhật ảnh đại diện.');
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

  // Role Formatter
  const getRoleDisplayName = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'Quản trị viên'
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
                  <span>Cài đặt</span>
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
                      <div>
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
                          <option value="other">Khác</option>
                        </select>
                      </div>

                      {/* Age */}
                      <div>
                        <label className="block text-sm font-semibold text-zinc-900 mb-2">Tuổi</label>
                        <input
                          type="number"
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

            {/* TAB PLACEHOLDER: ORDER / SETTINGS */}
            {activeTab !== 'info' && (
              <div className="bg-white rounded-4xl shadow-sm border border-zinc-200 p-12 text-center">
                <div className="w-20 h-20 bg-zinc-50 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'orders' ? <ShoppingBag size={32} /> : <Settings size={32} />}
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">Đang cập nhật...</h2>
                <p className="text-zinc-500">Tính năng này sẽ sớm ra mắt trong tương lai.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}