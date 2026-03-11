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
      params: { keyword },
    }),
};
// ================= Auth API =================
export const authAPI = {
  register: (data: RegisterPayload) =>
    api.post("/users/register", data),

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

export const registerUser = authAPI.register;
export const loginUser = authAPI.login;

export default api;
// ================= Chatbot API (demo) =================
export const fetchChatbotAnswer = async (message: string): Promise<string> => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  return `Bạn vừa hỏi: "${message}". Đây là câu trả lời demo từ chatbot.`;
};