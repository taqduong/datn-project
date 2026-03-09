export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard Admin</h1>
        <p className="mt-2 text-slate-600">
          Chào mừng bạn đến trang quản trị hệ thống thương mại điện tử.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Sản phẩm</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">--</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Danh mục</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">--</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Đơn hàng</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">--</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Người dùng</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">--</p>
        </div>
      </div>
    </div>
  );
}