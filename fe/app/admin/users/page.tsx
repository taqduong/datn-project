'use client';

import React, { useEffect, useState } from 'react';
import { fetchUsers, createUser, updateUser, toggleUserStatus } from '@/services/api';  
import { UserPlus, Filter, Edit, Lock, Unlock, ShieldAlert } from 'lucide-react';

type User = {
  id: number;
  username: string;
  fullName: string;
  password?: string;
  phone: string;
  role: string;
  email: string;
  gender?: string;
  age?: number;
  isActive: boolean;
};

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all'); 
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  const [form, setForm] = useState<Omit<User, 'id' | 'isActive'>>({
    username: '',
    password: '',
    fullName: '',
    role: 'nhanvien',
    phone: '',
    email: '',
    gender: 'male', 
    age: '' as any,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);

  const loadData = () => {
    fetchUsers().then(res => setUsers(res.data as User[])); 
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUserRole(user.role?.toLowerCase() || '');
      setCurrentUserId(user.id);
    }
    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    // Nếu là nhân viên, mặc định tạo nguoimua. Nếu là admin, để nhanvien làm mặc định
    const defaultRole = currentUserRole === 'nhanvien' ? 'nguoimua' : 'nhanvien';
    setForm({ username: '', password: '', fullName: '', role: defaultRole, phone: '', email: '', gender: 'male', age: '' as any });
    setModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setIsEditing(true);
    setEditUserId(user.id);
    setForm({
      username: user.username,
      password: '', 
      fullName: user.fullName,
      role: user.role,
      phone: user.phone || '',
      email: user.email,
      gender: user.gender || 'male',
      age: user.age || '' as any
    });
    setModalOpen(true);
  };

  const handleToggleStatus = async (id: number, currentActive: boolean) => {
    if (currentUserId === id) {
      alert("Lỗi: Bạn không thể tự khóa tài khoản của chính mình!");
      return;
    }
    const action = currentActive ? "KHÓA" : "MỞ KHÓA";
    if (!window.confirm(`Bạn có chắc chắn muốn ${action} tài khoản này?`)) return;
    try {
      await toggleUserStatus(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Có lỗi xảy ra khi cập nhật trạng thái");
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.age !== undefined && String(form.age) !== "") {
      const ageNum = Number(form.age);
      if (ageNum < 1 || ageNum > 120) {
        alert("Tuổi phải là số dương nằm trong khoảng từ 1 đến 120!");
        return; 
      }
    }

    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(form.phone)) {
      alert('Số điện thoại phải gồm 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09');
      return;
    }

    // Chỉ check mật khẩu nếu là THÊM MỚI và KHÔNG PHẢI là tạo Người mua
    if (!isEditing && form.role !== 'nguoimua') {
      const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
      if (!passRegex.test(form.password!)) {
        alert('Mật khẩu phải từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*)');
        return;
      }
    }

    const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined
    };

    try {
      if (isEditing && editUserId) {
        await updateUser(editUserId, payload);
        alert("Cập nhật thông tin thành công!");
      } else {
        await createUser(payload);
        alert(form.role === 'nguoimua' ? "Đã tạo tài khoản và gửi email kích hoạt cho khách hàng!" : "Tạo tài khoản thành công!");
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Thao tác thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  };

  const filteredUsers = users.filter(user => {
    if (roleFilter === 'all') return true;
    return user.role.toLowerCase() === roleFilter;
  });

  return (
    <div className="pt-16 px-8 min-h-screen bg-slate-50 font-sans text-gray-800 pb-10">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 select-none">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><UserPlus size={24}/></div>
            Quản lý người dùng
          </h1>
          
          <div className="relative inline-flex items-center">
            <div className="absolute left-3 text-slate-400"><Filter size={18} /></div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="nguoimua">Người mua</option>
              <option value="nhanvien">Nhân viên</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {(currentUserRole === 'admin' || currentUserRole === 'nhanvien') && (
          <button
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:bg-blue-700 transition-colors shrink-0"
            onClick={handleOpenAddModal}
          >
            <UserPlus className="w-5 h-5" />
            <span className="font-semibold">Thêm tài khoản</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-200">
        <table className="w-full border-collapse text-sm text-gray-700">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wide text-xs">
              <th className="py-4 px-6 border-b border-slate-200 text-left">Người dùng</th>
              <th className="py-4 px-6 border-b border-slate-200 text-left">Liên hệ</th>
              <th className="py-4 px-6 border-b border-slate-200 text-center">Vai trò</th>
              <th className="py-4 px-6 border-b border-slate-200 text-center">Trạng thái</th>
              <th className="py-4 px-6 border-b border-slate-200 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500 italic">Không tìm thấy người dùng nào phù hợp.</td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-800">{user.fullName}</div>
                    <div className="text-xs text-slate-500 font-medium">@{user.username}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-slate-700">{user.phone || 'Chưa cập nhật'}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                      ${user.role.toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : ''}
                      ${user.role.toLowerCase() === 'nhanvien' ? 'bg-blue-100 text-blue-700 border border-blue-200' : ''}
                      ${user.role.toLowerCase() === 'nguoimua' ? 'bg-slate-100 text-slate-700 border border-slate-200' : ''}
                    `}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold border
                      ${user.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}
                    `}>
                      {user.isActive ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {(currentUserRole === 'admin' || (currentUserRole === 'nhanvien' && user.role.toLowerCase() === 'nguoimua') || currentUserId === user.id) ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEditModal(user)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"><Edit size={16} /></button>
                        <button onClick={() => handleToggleStatus(user.id, user.isActive)} className={`p-2 rounded-lg transition-colors ${user.isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                          {user.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                      </div>
                    ) : <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Chỉ xem</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveUser} className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full flex flex-col gap-5 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-100 pb-3">{isEditing ? 'Sửa thông tin tài khoản' : 'Thêm tài khoản mới'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Tên đăng nhập *</label>
                  <input name="username" value={form.username} onChange={handleChange} disabled={isEditing} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-blue-500 outline-none disabled:bg-slate-100" required />
                </div>
                
                {/* Quản lý Form State: Loại bỏ trường Mật khẩu đối với Role "Khách hàng" */}
                {!isEditing && (
                   form.role !== 'nguoimua' ? (
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Mật khẩu *</label>
                      <input name="password" type="password" value={form.password} onChange={handleChange} required className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                    </div>
                   ) : (
                    <div className="flex items-center pt-5">
                      <p className="text-[11px] text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-100 italic leading-tight">
                        ℹ️ Hệ thống sẽ gửi email để khách hàng tự đặt mật khẩu.
                      </p>
                    </div>
                   )
                )}
              </div>

              <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Họ và tên *</label>
                  <input name="fullName" value={form.fullName} onChange={handleChange} required className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Số điện thoại *</label>
                  <input name="phone" value={form.phone} onChange={handleChange} required className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Email *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Vai trò *</label>
                  <select 
                    name="role" 
                    value={form.role} 
                    onChange={handleChange} 
                    disabled={(isEditing && form.role === 'nguoimua') || (!isEditing && currentUserRole === 'nhanvien')}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    {((isEditing && form.role === 'nguoimua') || (!isEditing && currentUserRole === 'nhanvien')) ? (
                      <option value="nguoimua">Người mua</option>
                    ) : isEditing ? (
                      <><option value="nhanvien">Nhân viên</option><option value="admin">Admin</option></>
                    ) : (
                      <><option value="nguoimua">Người mua</option><option value="nhanvien">Nhân viên</option><option value="admin">Admin</option></>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Giới tính</label>
                  <select name="gender" value={form.gender} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none bg-white">
                    <option value="male">Nam</option><option value="female">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Tuổi</label>
                  <input type="number" name="age" min="1" max="120" value={form.age} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" className="px-5 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition" onClick={() => setModalOpen(false)}>Hủy bỏ</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition">{isEditing ? 'Lưu cập nhật' : 'Tạo tài khoản'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}