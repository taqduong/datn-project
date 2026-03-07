import axios from "axios";
//Tạo một instance axios dùng chung cho toàn bộ FE
const api = axios.create({
  baseURL: "http://localhost:5270/api", //Địa chỉ backend API
  headers: {
    "Content-Type": "application/json",
  },
});
//Product API
//Lấy danh sách sản phẩm
export const fetchProducts = () => api.get("/products");
//Lấy chi tiết sản phẩm theo ID
export const fetchProductById = (id: number) => api.get(`/products/${id}`);
//Thêm sản phẩm mới
export const createProduct = (data : any) => api.post("/products", data);
//Cập nhật sản phẩm
export const updateProduct = (id: number, data: any) => api.put(`/products/${id}`, data);
//Xóa sản phẩm
export const deleteProduct = (id: number) => api.delete(`/products/${id}`);
//Export mặc định
export default api;