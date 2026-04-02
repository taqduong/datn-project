'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, Store, CheckCircle, ArrowRight } from 'lucide-react'
import { authAPI } from '@/services/api'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem('rememberedUser')
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setFormData({
        username: parsedUser.username || '',
        password: parsedUser.password || '' 
      })
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsLoading(true)

    if (!formData.username || !formData.password) {
      setError('Vui lòng điền đầy đủ thông tin')
      setIsLoading(false)
      return
    }
    
    try {
      const res = await authAPI.login({username: formData.username, password: formData.password})
      const { token, user } = res.data as { token: string; user: any }
      
      if (rememberMe) {
        localStorage.setItem('rememberedUser', JSON.stringify({
          username: formData.username,
          password: formData.password 
        }))
      } else {
        localStorage.removeItem('rememberedUser')
      }

      // NAVBAR CẬP NHẬT LẠI SỐ LƯỢNG:
      window.dispatchEvent(new Event('cartUpdated'));
      window.dispatchEvent(new Event('wishlistUpdated'));

      setSuccess(true)

      setTimeout(() => {
        window.dispatchEvent(new Event('storage'))
        router.push('/')
      }, 1500)

    } catch (error: any) {
      console.error(error)
      setError(error?.response?.data?.message || 'Đăng nhập thất bại')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        {/* Card Đăng nhập - Bo góc xl chuẩn */}
        <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl shadow-blue-900/10 border border-slate-200 p-8 sm:p-10">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-tr from-blue-600 to-indigo-500 rounded-xl mb-5 shadow-lg shadow-blue-500/30 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <Store className="text-white" size={32} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-700 to-indigo-700 mb-2 tracking-tight">
              HomeMart
            </h1>
            <p className="text-sm text-slate-500 font-medium">Đăng nhập để trải nghiệm mua sắm</p>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg animate-pulse">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-emerald-500" size={20} />
                <p className="text-emerald-700 text-sm font-semibold">Đăng nhập thành công! Đang chuyển hướng...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg text-center">
              <p className="text-rose-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1 uppercase tracking-wide">
                Tên đăng nhập
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Nhập username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  disabled={isLoading || success}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1 uppercase tracking-wide">
                Mật khẩu
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  disabled={isLoading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={isLoading || success}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  disabled={isLoading || success} 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <div className="w-5 h-5 border-2 border-slate-300 rounded bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors flex items-center justify-center">
                   {/* Dấu tích ✓ sẽ hiện ra khi checkbox được chọn */}
                   {rememberMe && (
                     <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                     </svg>
                   )}
                </div>
                <span className="ml-2.5 text-sm font-medium text-slate-600 group-hover:text-slate-900">Ghi nhớ tôi</span>
              </label>
              <Link href="/forgot-password" className="text-sm font-bold text-blue-600 hover:text-indigo-600">
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading || success}
              className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-70 mt-4 outline-none focus:ring-4 focus:ring-blue-500/40"
            >
              {success ? 'Thành công' : isLoading ? 'Đang xác thực...' : 'Đăng nhập ngay'}
              {!isLoading && !success && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-slate-500">
            Khách hàng mới?{' '}
            <Link href="/register" className="text-blue-600 font-bold hover:underline underline-offset-4">
              Tạo tài khoản HomeMart
            </Link>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            ← Quay về trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}