import axios from "axios";

// ================= Base URL =================
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api";

// ================= Axios Instance =================
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
// ================= Interceptor =================
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);
api.interceptors.response.use(
  (response) => response, // Trả về bình thường nếu API gọi thành công (200 OK)
  (error) => {
    // Nếu Backend trả về lỗi 401 (Unauthorized - Token hết hạn hoặc chưa login)
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        // 1. Âm thầm xóa Token đã "chết" khỏi localStorage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        
        // 2. Phát tín hiệu cho các Component (như Navbar) biết để cập nhật lại giao diện (ẩn avatar đi)
        window.dispatchEvent(new Event("userUpdated"));
      }
      // DÒNG NÀY ĐỂ BỊT MIỆNG BẢNG ĐỎ KHI HẾT HẠN TOKEN
      return Promise.resolve({ data: [] });
    }
    // Giữ nguyên dòng này cho các lỗi khác (500, 404, 400...)
    return Promise.reject(error);
  }
);

// ================= Types =================
export interface Category {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  stock: number;
  discount?: number;
  priceAfterDiscount?: number;
  categoryId: number;
  categoryName?: string;
  createdAt?: string;
  additionalImages?: string[];
  soldCount?: number;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: number;
  variantName: string;
  color?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  discount?: number; // % giảm giá riêng của biến thể (nếu có)
  priceAfterDiscount: number; // Giá sau giảm cuối cùng (C# tính hộ rồi)
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface CreateProductPayload {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  stock: number;
  discount?: number;
  categoryId: number;
  variants?: {
    variantName: string;
    color?: string;
    price: number;
    stock: number;
    imageUrl?: string;
    discount?: number; 
  }[];
}

export interface UpdateProductPayload {
  name?: string;
  price?: number;
  description?: string;
  imageUrl?: string;
  stock?: number;
  discount?: number;
  categoryId?: number;
  retainedAdditionalImages?: string[];
  variants?: {
    variantName: string;
    color?: string;
    price: number;
    stock: number;
    imageUrl?: string;
    discount?: number; 
  }[];
}

export interface UploadImageResponse {
  imageUrls: string[];
}
export interface RegisterPayload {
  username: string;
  password: string;
  fullName: string;
  phone: string;
  email: string;
  gender?: string;
  age?: number;
  role?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string | null; // Token lấy từ URL có thể null
  newPassword: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}
export interface AuthUser {
  id?: number;
  username: string;
  fullName?: string;
  role?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  gender?: string;
  age?: number;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface CartItem {
  cartItemId: number;
  productId: number;
  quantity: number;
  variantId?: number; 
  variantName?: string; 
  variantColor?: string;
  variantPrice?: number;
  variantDiscount?: number;
  variantImage?: string;
  variantImageUrl?: string; 
  product: {
    id: number;
    name: string;
    price: number;
    discount?: number;
    priceAfterDiscount: number;
    imageUrl?: string;
  };
}

export interface CartRequest {
  productId: number;
  quantity: number;
  variantId?: number;
}

export interface CheckoutPayload {
  fullName: string;
  phone: string;
  address: string;
  email?: string;
  city?: string;
  district?: string;
  ward?: string;
  note?: string;
  paymentMethod: string;
  buyNowProductId?: number; 
  buyNowQuantity?: number;  
  buyNowVariantId?: number;
  discountAmount?: number;
}

export interface OrderDetailDto {
  productId: number;
  variantId?: number;    
  variantName?: string;
  variantColor?: string;
  productName: string;
  quantity: number;
  price: number;
  imageUrl: string;
}

export interface OrderDto {
  orderId: number;
  orderDate: string;
  totalAmount: number;
  status: string;
  refundStatus: string;
  fullName: string;
  phone: string;
  address: string;
  email?: string;
  city?: string;
  district?: string;
  ward?: string;
  note?: string;
  orderDetails: OrderDetailDto[];
  paymentMethod: string;
  discountAmount?: number;
  shippingFee?: number;
  appliedVoucherCode?: string;
}

export interface AnalyticsSummary {
  productId: number;
  productName: string;
  views: number;
  addToCartCount: number;
  purchaseCount: number;
  lastUpdated: string;
}

export interface ReviewDto {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: string;
  isVerifiedPurchase: boolean;
  variantName?: string;
}

export interface CreateReviewPayload {
  productId: number;
  orderId: number;
  rating: number;
  comment?: string;
}

export interface ReviewResponse {
  totalReviews: number;
  averageRating: number;
  reviews: ReviewDto[];
}

export interface CanReviewResponse {
  canReview: boolean;
  reason?: string;
}

export interface VoucherDto {
  id: number;
  code: string;
  title: string;
  description: string;
  isFreeship: boolean;
  discountPercent?: number;
  discountValue?: number;
  maxDiscountAmount?: number;
  minOrderValue: number;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export interface ContactPayload {
  fullName: string;
  email: string;
  subject?: string;
  content: string;
}

export interface ContactMessageDto {
  id: number;
  fullName: string;
  email: string;
  subject?: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface ChatMessageDto {
  id: number;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
}
// ================= Categories API =================
export const categoriesAPI = {
  getAll: () => api.get<Category[]>("/categories"),

  getById: (id: number | string) =>
    api.get<Category>(`/categories/${id}`),

  create: (data: CreateCategoryPayload) =>
    api.post<Category>("/categories", data),

  update: (id: number | string, data: CreateCategoryPayload) =>
    api.put(`/categories/${id}`, data),

  delete: (id: number | string) =>
    api.delete(`/categories/${id}`),
};

// ================= Products API =================
export const productsAPI = {
  getAll: () => api.get<Product[]>("/products"),

  getById: (id: number | string) =>
    api.get<Product>(`/products/${id}`),

  create: (data: CreateProductPayload) =>
    api.post<Product>("/products", data),

  update: (id: number | string, data: UpdateProductPayload) =>
    api.put<Product>(`/products/${id}`, data),

  delete: (id: number | string) =>
    api.delete(`/products/${id}`),

  getByCategory: (categoryId: number | string) =>
    api.get<Product[]>(`/products/categories/${categoryId}`),

  search: (keyword: string) =>
    api.get<Product[]>("/products/search", {
      params: { keyword: keyword.trim() },
    }),

  uploadImages: (id: number | string, formData: FormData) =>
    api.post<{ message: string; urls: string[] }>(
      `/products/${id}/upload-images`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    ),
};
// ================= Carts API =================
export const cartAPI = {
  // api.get<CartItem[]> giúp Axios hiểu kết quả trả về là một mảng các CartItem
  get: () => api.get<CartItem[]>("/cart/get"),

  add: (data: CartRequest) => api.post("/cart/add", data),

  updateQuantity: (data: CartRequest) => api.put("/cart/update-quantity", data),

  remove: (productId: number | string, variantId?: number) => {
    const query = variantId ? `?variantId=${variantId}` : "";
    return api.delete(`/cart/remove/${productId}${query}`);
  }
};
// ================= Auth API =================
export const authAPI = {
  register: (data: RegisterPayload) =>
    api.post("/users/register", data),

  forgotPassword: (data: ForgotPasswordPayload) =>
    api.post("/users/forgot-password", data),

  resetPassword: (data: ResetPasswordPayload) =>
    api.post("/users/reset-password", data),

  changePassword: (data: ChangePasswordPayload) =>
    api.put("/auth/change-password", data),

  login: async (data: LoginPayload) => {
    const res = await api.post<LoginResponse>("/auth/login", data);

    if (typeof window !== "undefined") {
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }

      window.dispatchEvent(new Event("userUpdated"));
    }

    return res;
  },
  logout: () => {
    // 1. Xóa sạch dữ liệu trong bộ nhớ máy tính
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // 2. Thông báo cho toàn bộ Website biết là User đã thoát
      window.dispatchEvent(new Event("userUpdated"));
    }
    
    // 3. Có thể gọi thêm API logout ở Backend nếu cần xóa session/blacklist token
    return api.post("/auth/logout");
  },
};



// ================= Upload API =================
export const uploadImage = (formData: FormData) => {
  return api.post<UploadImageResponse>("/files/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
// ================= Users API =================
export const fetchUsers = () =>
  api.get('/users', { headers: { 'Content-Type': 'application/json' } })

export const createUser = (data: RegisterPayload) => api.post('/users', data)

export const updateUser = (id: number, data: RegisterPayload) => api.put(`/users/${id}`, data)

export const uploadAvatar = (userId: number, avatarFile: File) => {
  const formData = new FormData();
  formData.append("avatarFile", avatarFile);

  return api.post(`/files/upload-avatar/${userId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// ================= Orders API =================
export const ordersAPI = {
  checkout: (data: CheckoutPayload) => api.post("/Order/checkout", data),
  getAdminOrders: () => api.get<OrderDto[]>("/Order/admin"),
  getUserOrders: () => api.get<OrderDto[]>("/Order"),
  getById: (id: number | string) => api.get<OrderDto>(`/Order/${id}`),
  delete: (id: number | string) => api.delete(`/Order/${id}`),
  updateStatus: (id: number | string, status: string) => api.put(`/Order/${id}/status`, { status }),
  cancel: (id: number | string) => api.put(`/Order/${id}/cancel`),
  confirmRefund: (id: number | string) => api.put(`/Order/${id}/confirm-refund`),
};

// ================= Wishlist API =================
export const wishlistAPI = {
  // 1. Lấy danh sách (Backend tự biết là của ai nhờ Token)
  getAll: () => api.get('/wishlist'),
  
  // 2. Thêm vào yêu thích (Bắn thẳng productId lên URL)
  add: (productId: number) => api.post(`/wishlist/${productId}`),
  
  // 3. Xóa khỏi yêu thích
  remove: (productId: number) => api.delete(`/wishlist/${productId}`),

  // 4. Xóa sạch sành sanh giỏ yêu thích
  clear: () => api.delete('/wishlist/clear'),
}

// ================= Analytics API =================
export const analyticsAPI = {
  // 1. Ghi nhận lượt xem
  trackView: (productId: number) => 
    api.post(`/analytics/view/${productId}`),

  // 2. Ghi nhận lượt thêm giỏ hàng
  trackAddToCart: (productId: number) => 
    api.post(`/analytics/cart/${productId}`),

  // 3. Ghi nhận lượt mua
  trackPurchase: (productId: number, quantity: number) => 
    api.post(`/analytics/purchase/${productId}`, quantity, {
      headers: { "Content-Type": "application/json" } // Gửi số lượng dạng số
    }),

  // 4. Lấy báo cáo cho Admin
  getSummary: () => 
    api.get<AnalyticsSummary[]>("/analytics/summary"),
};

// ================= Reviews API =================
export const reviewsAPI = {
  // 1. Lấy danh sách đánh giá của 1 sản phẩm
  getByProduct: (productId: number | string) =>
    api.get<ReviewResponse>(`/reviews/product/${productId}`),

  // 2. Gửi đánh giá mới
  add: (data: CreateReviewPayload) =>
    api.post<{ message: string; isVerifiedPurchase: boolean }>("/reviews", data),

  // 3. Kiểm tra xem user có được phép đánh giá không
  checkCanReview: (productId: number | string) =>
    api.get<CanReviewResponse>(`/reviews/can-review/${productId}`),
};

// ================= Recommendation & Tracking API =================
export const trackingAPI = {
  log: (data: { productId: number, actionType: string }) => 
    api.post("/tracking/log", data),
};

export const recommendationsAPI = {
  getSimilar: (productId: number | string) => 
    api.get<Product[]>(`/recommendations/similar/${productId}`),
    
  getForYou: () => 
    api.get<Product[]>("/recommendations/for-you"),

  getRecentlyViewed: () => 
    api.get<Product[]>("/recommendations/recently-viewed"),
};

// ================= Vouchers API (Admin) =================
export const voucherAPI = {
  getAllAdmin: () => api.get<VoucherDto[]>("/Voucher/admin"),
  create: (data: Partial<VoucherDto>) => api.post("/Voucher", data),
  update: (id: number, data: Partial<VoucherDto>) => api.put(`/Voucher/${id}`, data),
  delete: (id: number) => api.delete(`/Voucher/${id}`)
};

// ================= Contact API =================
export const contactAPI = {
  submit: (data: ContactPayload) => 
    api.post<{ success: boolean; message: string }>("/contact", data),
  getAllAdmin: () => api.get<ContactMessageDto[]>("/contact"),
  markAsRead: (id: number) => api.put(`/contact/${id}/read`),
  reply: (id: number, replyContent: string) => 
    api.post<{ success: boolean; message: string }>(`/contact/${id}/reply`, { replyContent }),
};

// ================= Chat API =================
export const chatAPI = {
  getUserHistory: () => api.get<ChatMessageDto[]>("/chat/history"),
  getAdminChatUsers: () => api.get("/chat/admin/users"),
  getHistoryWithUser: (userId: number | string) => api.get<ChatMessageDto[]>(`/chat/admin/history/${userId}`),
  markAsRead: (userId: number | string) => api.put(`/chat/admin/read/${userId}`)
};

// ================= Helper Exports =================
export const fetchCategories = categoriesAPI.getAll;
export const fetchCategoryById = categoriesAPI.getById;
export const createCategory = categoriesAPI.create;
export const updateCategory = categoriesAPI.update;
export const deleteCategory = categoriesAPI.delete;

export const fetchProducts = productsAPI.getAll;
export const fetchProductById = productsAPI.getById;
export const fetchProductsByCategory = productsAPI.getByCategory;
export const searchProducts = productsAPI.search;
export const createProduct = productsAPI.create;
export const updateProduct = productsAPI.update;
export const deleteProduct = productsAPI.delete;
export const uploadProductImages = productsAPI.uploadImages;

export const registerUser = authAPI.register;
export const loginUser = authAPI.login;
export const logoutUser = authAPI.logout;
export const changePassword = authAPI.changePassword;

export const fetchCart = cartAPI.get;
export const addToCart = (productId: number, quantity: number, variantId?: number) => 
  cartAPI.add({ productId, quantity, variantId });
export const updateCartItem = (productId: number, quantity: number, variantId?: number) => cartAPI.updateQuantity({ productId, quantity, variantId });
export const removeCartItem = cartAPI.remove;

export const checkoutOrder = ordersAPI.checkout;
export const fetchAdminOrders = ordersAPI.getAdminOrders;
export const fetchUserOrders = ordersAPI.getUserOrders;
export const fetchOrderById = ordersAPI.getById;
export const deleteOrder = ordersAPI.delete;
export const updateOrderStatus = ordersAPI.updateStatus;
export const cancelOrder = ordersAPI.cancel;
export const confirmRefundOrder = ordersAPI.confirmRefund;

export const fetchWishlist = wishlistAPI.getAll
export const addToWishlist = wishlistAPI.add
export const removeFromWishlist = wishlistAPI.remove
export const clearWishlist = wishlistAPI.clear

export const fetchAnalyticsSummary = analyticsAPI.getSummary;
export const trackProductView = analyticsAPI.trackView;
export const trackProductAddToCart = analyticsAPI.trackAddToCart;
export const trackProductPurchase = analyticsAPI.trackPurchase;

export const fetchReviewsByProduct = reviewsAPI.getByProduct;
export const addReview = reviewsAPI.add;
export const checkCanReview = reviewsAPI.checkCanReview;

export const logUserActivity = trackingAPI.log;
export const fetchSimilarProducts = recommendationsAPI.getSimilar;
export const fetchForYouProducts = recommendationsAPI.getForYou;
export const fetchRecentlyViewed = recommendationsAPI.getRecentlyViewed;

export const fetchAdminVouchers = voucherAPI.getAllAdmin;
export const createAdminVoucher = voucherAPI.create;
export const updateAdminVoucher = voucherAPI.update;
export const deleteAdminVoucher = voucherAPI.delete;

export const forgotPassword = authAPI.forgotPassword;
export const resetPassword = authAPI.resetPassword;

export const submitContactForm = contactAPI.submit;
export const fetchAdminContacts = contactAPI.getAllAdmin;
export const markContactAsRead = contactAPI.markAsRead;
export const replyContactForm = contactAPI.reply;

export const fetchUserChatHistory = chatAPI.getUserHistory;
export const fetchAdminChatUsers = chatAPI.getAdminChatUsers;
export const fetchHistoryWithUser = chatAPI.getHistoryWithUser;
export const markChatAsRead = chatAPI.markAsRead;

export default api;



export const resolveImgUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

// ================= Chatbot API =================
export const fetchChatbotAnswer = async (message: string, history: any[] = [], userId?: number) => { 
  try {
    const res = await api.post("/chatbot", { 
      question: message,
      history: history,
      userId: userId
    });
    
    // res.data sẽ chứa { success: true, answer: "..." } từ C# trả về
    return res.data; 
  } catch (error: any) {
    console.error("Lỗi gọi Chatbot API (Tổng quan):", error);
    
    // ĐOẠN NÀY LÀ QUAN TRỌNG NHẤT ĐỂ BẮT BỆNH C#
    if (error.response && error.response.data) {
      console.error("LỖI CHI TIẾT TỪ C# TRẢ VỀ:", error.response.data);
    }

    // Quăng lỗi ra để catch() bên component ChatBox hiển thị câu "đang gặp sự cố kết nối..."
    throw error; 
  }
};