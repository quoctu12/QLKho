import axios from "axios";

/*
|--------------------------------------------------------------------------
| Tạo Axios Client dùng chung
|--------------------------------------------------------------------------
|
| Không cố định Content-Type ở đây.
| Axios sẽ tự chọn:
| - application/json khi gửi object
| - multipart/form-data khi gửi FormData
|
*/

const axiosClient = axios.create({
  baseURL: "http://localhost:3000/api",
});

/*
|--------------------------------------------------------------------------
| Gắn token vào mỗi request
|--------------------------------------------------------------------------
*/

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    /*
     * Nếu dữ liệu là FormData, xóa Content-Type nếu đang tồn tại.
     * Trình duyệt sẽ tự thêm multipart/form-data cùng boundary chính xác.
     */
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/*
|--------------------------------------------------------------------------
| Xử lý response và phiên đăng nhập hết hạn
|--------------------------------------------------------------------------
*/

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;