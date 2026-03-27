'use client';

import React, { useEffect, useState } from 'react';
import { fetchUsers, createUser } from '@/services/api';  
import { UserPlus, Filter } from 'lucide-react';

type User = {
  id: number;
  username: string;
  fullName: string;
  password: string;
  phone: string;
  role: string;
  email: string;
  gender?: string;
  age?: number;
};

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all'); 
  
  // Đã thêm giá trị mặc định cho gender và age
  const [form, setForm] = useState<Omit<User, 'id'>>({
    username: '',
    password: '',
    fullName: '',
    role: 'nhanvien',
    phone: '',
    email: '',
    gender: 'male', 
    age: '' as any, // Ép kiểu tạm để dễ gõ ô input
  });

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers().then(res => setUsers(res.data as User[])); 
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();

    const isExist = users.some(u => u.username === form.username);
    if (isExist) {
      alert('Tên người dùng đã tồn tại.');
      return;
    }

    // BẮT LỖI REGEX Y CHANG BÊN TRANG ĐĂNG KÝ
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(form.phone)) {
      alert('Số điện thoại phải gồm 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09');
      return;
    }

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!passRegex.test(form.password)) {
      alert('Mật khẩu phải từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*)');
      return;
    }

    // Chuẩn hóa Payload trước khi gửi
    const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined
    };

    createUser(payload)
      .then(res => {
        const newUser = res.data as User;
        setUsers([...users, newUser]);
        setModalOpen(false);
      })
      .catch(err => {
        console.error('Lỗi tạo người dùng:', err);
        alert('Tạo người dùng thất bại (Kiểm tra lại Email).');
      });
  };

  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUserRole(user.role?.toLowerCase() || '');
    }
    
    fetchUsers().then(res => setUsers(res.data as User[])); 
  }, []);

  const filteredUsers = users.filter(user => {
    if (roleFilter === 'all') return true;
    return user.role.toLowerCase() === roleFilter;
  });

  return (
    <div className="pt-16 px-8 min-h-screen bg-white font-sans text-gray-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3 select-none">
            👥 Quản lý người dùng
          </h1>
          
          <div className="relative inline-flex items-center">
            <div className="absolute left-3 text-slate-400">
               <Filter size={18} />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer appearance-none shadow-sm"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: `right 0.5rem center`,
                backgroundRepeat: `no-repeat`,
                backgroundSize: `1.5em 1.5em`,
              }}
            >
              <option value="all">Tất cả vai trò</option>
              <option value="nguoimua">Người mua</option>
              <option value="nhanvien">Nhân viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>
        </div>

        {currentUserRole === 'admin' && (
          <button
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-teal-400 text-white px-5 py-3 rounded-xl shadow-lg hover:brightness-110 transition shrink-0"
            onClick={() => setModalOpen(true)}
            title="Thêm nhân viên mới"
          >
            <UserPlus className="w-6 h-6" />
            <span className="font-semibold">Thêm nhân viên</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-slate-100">
        <table className="w-full border-collapse text-sm text-gray-700">
          <thead>
            <tr className="bg-sky-50 text-sky-900 font-bold uppercase tracking-wide select-none">
              <th className="py-4 px-6 border-b border-sky-100 text-left">ID</th>
              <th className="py-4 px-6 border-b border-sky-100 text-left">Tên người dùng</th>
              <th className="py-4 px-6 border-b border-sky-100 text-left">Họ tên</th>
              <th className="py-4 px-6 border-b border-sky-100 text-left">Số điện thoại</th>
              <th className="py-4 px-6 border-b border-sky-100 text-center">Vai trò</th>
              <th className="py-4 px-6 border-b border-sky-100 text-left">Email</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500 italic">
                  Không tìm thấy người dùng nào phù hợp.
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr
                  key={user.id}
                  className="bg-white hover:bg-sky-50/50 transition-colors border-b border-slate-50"
                >
                  <td className="py-4 px-6 font-medium text-slate-500">#{user.id}</td>
                  <td className="py-4 px-6 font-bold text-slate-800">{user.username}</td>
                  <td className="py-4 px-6 font-medium text-slate-700">{user.fullName}</td>
                  <td className="py-4 px-6">{user.phone || '-'}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                      ${user.role.toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : ''}
                      ${user.role.toLowerCase() === 'nhanvien' ? 'bg-sky-100 text-sky-700 border border-sky-200' : ''}
                      ${user.role.toLowerCase() === 'nguoimua' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : ''}
                    `}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500">{user.email || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm NV */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddUser}
            className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full flex flex-col gap-5 animate-in zoom-in duration-200"
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold text-slate-800 select-none">
                Thêm nhân viên
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Tên đăng nhập <span className="text-red-500">*</span></label>
                <input
                  name="username" value={form.username} onChange={handleChange}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                  required autoFocus
                />
              </div>
              
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Mật khẩu khởi tạo <span className="text-red-500">*</span></label>
                <input
                  name="password" type="password" value={form.password} onChange={handleChange} required
                  placeholder="(từ 8 ký tự, gồm chữ, số, ký tự đặc biệt)" // Đã thêm placeholder
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>

              {/* Đã ghép Tuổi nằm cạnh Họ và tên */}
              <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">Họ và tên</label>
                      <input
                          name="fullName" value={form.fullName} onChange={handleChange}
                          placeholder="VD: Nguyễn Văn A"
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                      />
                  </div>
                  <div>
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">Tuổi</label>
                      <input
                          type="number" name="age" value={form.age} onChange={handleChange}
                          placeholder="VD: 25"
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                      />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">Số điện thoại <span className="text-red-500">*</span></label>
                  <input
                    name="phone" value={form.phone} onChange={handleChange} required
                    placeholder="VD: 0941429190" // Đã thêm placeholder
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">Email <span className="text-red-500">*</span></label>
                  <input
                    name="email" type="email" value={form.email} onChange={handleChange} required
                    placeholder="VD: user@gmail.com" // Đã thêm placeholder
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Đã ghép Vai trò và Giới tính nằm cạnh nhau */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">Vai trò <span className="text-red-500">*</span></label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
                  >
                    <option value="nhanvien">Nhân viên</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">Giới tính</label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </div>
              </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition"
                onClick={() => setModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 shadow-md shadow-sky-500/30 transition"
              >
                Xác nhận tạo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}