import Link from "next/link";
import { ShieldCheck, Truck, Headphones, Award } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Về HomeMart</h1>
          <p className="text-lg text-slate-600">
            Hệ thống mua sắm đồ gia dụng thông minh hàng đầu Việt Nam. Chúng tôi không chỉ bán sản phẩm, chúng tôi mang đến giải pháp nâng tầm không gian sống của bạn.
          </p>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20 bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Câu chuyện của chúng tôi</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed text-justify">
              <p>
                Được thành lập với sứ mệnh mang đến những tiện ích tốt nhất cho gia đình Việt, <strong>HomeMart</strong> luôn nỗ lực tìm kiếm và cung cấp các sản phẩm đồ gia dụng, thiết bị điện tử chất lượng cao từ các thương hiệu uy tín trên toàn thế giới.
              </p>
              <p>
                Điểm khác biệt của HomeMart chính là việc tiên phong ứng dụng <strong>Trí tuệ nhân tạo (AI)</strong> vào trải nghiệm mua sắm. Với Trợ lý ảo thông minh, khách hàng luôn nhận được sự tư vấn tận tình, chính xác và cá nhân hóa 24/7.
              </p>
              <p>
                Chúng tôi cam kết không ngừng đổi mới để mỗi trải nghiệm mua sắm của bạn tại HomeMart đều là một niềm vui!
              </p>
            </div>
            <div className="mt-8">
              <Link href="/products" className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-700">
                Khám phá sản phẩm ngay
              </Link>
            </div>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden bg-slate-100">
            {/* Thay ảnh này bằng ảnh thật của sếp nếu có */}
            <img 
              src="/homemart.png"
              alt="HomeMart Office" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-10">Tại sao chọn HomeMart?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Chính hãng 100%</h3>
              <p className="text-slate-600">Sản phẩm được nhập khẩu chính ngạch, đầy đủ giấy tờ và bảo hành chính hãng.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-6">
                <Truck size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Giao hàng hỏa tốc</h3>
              <p className="text-slate-600">Mạng lưới vận chuyển siêu tốc, đảm bảo hàng hóa đến tay bạn an toàn và nhanh chóng.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mb-6">
                <Headphones size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Hỗ trợ 24/7 với AI</h3>
              <p className="text-slate-600">Trợ lý ảo AI thông minh luôn sẵn sàng giải đáp và hỗ trợ lên đơn hàng bất cứ lúc nào.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 mb-6">
                <Award size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Giá cả cạnh tranh</h3>
              <p className="text-slate-600">Cam kết mang lại mức giá tốt nhất thị trường cùng hàng ngàn mã Voucher ưu đãi mỗi ngày.</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}