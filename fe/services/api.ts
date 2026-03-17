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
    }
    // Trả lỗi về cho component tự xử lý tiếp (ví dụ: catch(err) { set giỏ hàng = 0 })
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
}

export interface LoginPayload {
  username: string;
  password: string;
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
}

export interface OrderDetailDto {
  productId: number;
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
  fullName: string;
  phone: string;
  address: string;
  email?: string;
  city?: string;
  district?: string;
  ward?: string;
  note?: string;
  orderDetails: OrderDetailDto[];
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
  comment: string;
  createdAt: string;
  isVerifiedPurchase: boolean;
}

export interface CreateReviewPayload {
  productId: number;
  rating: number;
  comment: string;
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

  remove: (productId: number | string) => api.delete(`/cart/remove/${productId}`),
};
// ================= Auth API =================
export const authAPI = {
  register: (data: RegisterPayload) =>
    api.post("/users/register", data),

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
export const addToCart = (productId: number, quantity: number) => cartAPI.add({ productId, quantity });
export const updateCartItem = (productId: number, quantity: number) => cartAPI.updateQuantity({ productId, quantity });
export const removeCartItem = cartAPI.remove;

export const checkoutOrder = ordersAPI.checkout;
export const fetchAdminOrders = ordersAPI.getAdminOrders;
export const fetchUserOrders = ordersAPI.getUserOrders;
export const fetchOrderById = ordersAPI.getById;
export const deleteOrder = ordersAPI.delete;
export const updateOrderStatus = ordersAPI.updateStatus;
export const cancelOrder = ordersAPI.cancel;

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

export default api;

export const resolveImgUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

// ================= Chatbot API (demo) =================
export const fetchChatbotAnswer = async (message: string): Promise<string> => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  return `Bạn vừa hỏi: "${message}". Đây là câu trả lời demo từ chatbot.`;
};