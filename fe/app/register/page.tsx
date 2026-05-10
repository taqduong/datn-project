'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, User, Phone, Store, AtSign, ArrowRight, CheckCircle } from 'lucide-react'
import { authAPI } from '@/services/api'

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '',
    age: ''
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!formData.username || !formData.fullName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword || !formData.gender || !formData.age) {
      setError('Vui lòng điền đầy đủ thông tin')
      setIsLoading(false)
      return
    }

    // 0. Validate dữ liệu tuổi (Ngăn chặn giá trị âm hoặc vượt quá giới hạn)
    const ageNum = Number(formData.age);
    if (ageNum < 1 || ageNum > 120) {
      setError('Độ tuổi không hợp lệ (Phải từ 1 đến 120)')
      setIsLoading(false)
      return
    }

    // 1. KIỂM TRA SĐT (10 số, đầu 03, 05, 07, 08, 09)
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Số điện thoại phải gồm 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09')
      setIsLoading(false)
      return
    }

    // 2. KIỂM TRA MẬT KHẨU 
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!passRegex.test(formData.password)) {
      setError('Mật khẩu phải từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*)')
      setIsLoading(false)
      return
    }

    // 3. KIỂM TRA XÁC NHẬN MẬT KHẨU
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu nhập lại không khớp!')
      setIsLoading(false)
      return
    }

    try {
      const ageNumber = Number(formData.age)
      const payload = {
        username: formData.username,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        gender: formData.gender,
        age: ageNumber
      }

      await authAPI.register(payload)
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Đăng ký thất bại, vui lòng thử lại'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl shadow-blue-900/10 border border-slate-200 p-8 sm:p-10">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-tr from-blue-600 to-indigo-500 rounded-xl mb-5 shadow-lg shadow-blue-500/30 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <Store className="text-white" size={32} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-700 to-indigo-700 mb-2 tracking-tight">
              Tham gia HomeMart
            </h1>
            <p className="text-sm text-slate-500 font-medium">Tạo tài khoản để bắt đầu mua sắm</p>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg animate-pulse">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-emerald-500" size={20} />
                <p className="text-emerald-700 text-sm font-semibold">Thành công! Đang chuyển đến Đăng nhập...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg text-center">
              <p className="text-rose-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1 uppercase tracking-wide">Tên đăng nhập</label>
                <div className="relative group">
                  <AtSign className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="duong"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1 uppercase tracking-wide">Độ tuổi</label>
                <input
                  type="number"
                  placeholder="22"
                  min="1"
                  max="120"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1 uppercase tracking-wide">Họ và tên</label>
              <div className="relative group">
                <User className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1 uppercase tracking-wide">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="email"
                      placeholder="abc@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1 uppercase tracking-wide">SĐT</label>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="tel"
                      placeholder="0912345678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
               </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ml-1 uppercase tracking-wide">Giới tính</label>
              <div className="grid grid-cols-2 gap-3"> 
                {['male', 'female'].map((g) => (   
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`py-3 text-sm font-bold rounded-lg border transition-all ${
                      formData.gender === g 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                        : 'bg-white border-slate-300 text-slate-600 hover:border-blue-400'
                    }`}
                  >
                    {g === 'male' ? 'Nam' : 'Nữ'}      
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mật khẩu (từ 8 ký tự, gồm chữ, số, ký tự đặc biệt)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-9 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Xác nhận lại mật khẩu"
                  value={formData.confirmPassword}
                  required
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-9 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3.5 text-slate-400">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || success}
              className="group w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-70 mt-4 outline-none focus:ring-4 focus:ring-blue-500/40"
            >
              {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
              {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-slate-500">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-blue-600 font-bold hover:underline underline-offset-4 transition-all">
              Đăng nhập tại đây
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}