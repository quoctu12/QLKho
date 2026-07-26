import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getProductById } from "../api/productApi";
import { useAuth } from "../contexts/AuthContext";

/*
|--------------------------------------------------------------------------
| Ảnh mặc định khi sản phẩm chưa có ảnh
|--------------------------------------------------------------------------
*/

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">
      <rect width="320" height="320" rx="20" fill="#eef2f7"/>
      <path d="M85 100h150v125H85z" fill="#d6dee8"/>
      <path d="M105 198l40-48 30 30 22-22 38 40H105z" fill="#9aa8b8"/>
      <circle cx="205" cy="130" r="20" fill="#9aa8b8"/>
    </svg>
  `);

function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ADMIN và MANAGER được sửa sản phẩm.
   */
  const canEditProduct = ["ADMIN", "MANAGER"].includes(user?.role);

  /*
  |--------------------------------------------------------------------------
  | Tải thông tin sản phẩm
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadProduct();
  }, [id]);

  async function loadProduct() {
    try {
      setLoading(true);
      setError("");

      const data = await getProductById(id);

      setProduct(data);
    } catch (err) {
      console.error("Lỗi tải thông tin sản phẩm:", err);

      setError(
        err.response?.data?.message ||
          "Không thể tải thông tin sản phẩm."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Định dạng ngày giờ
  |--------------------------------------------------------------------------
  */

  function formatDate(value) {
    if (!value) {
      return "Không có dữ liệu";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Không có dữ liệu";
    }

    return date.toLocaleString("vi-VN");
  }

  /*
  |--------------------------------------------------------------------------
  | Xử lý khi ảnh sản phẩm bị lỗi
  |--------------------------------------------------------------------------
  */

  function handleImageError(event) {
    event.currentTarget.onerror = null;
    event.currentTarget.src = PLACEHOLDER_IMAGE;
  }

  /*
  |--------------------------------------------------------------------------
  | Trạng thái đang tải
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted">
        <div
          className="spinner-border spinner-border-sm"
          role="status"
        />

        Đang tải thông tin sản phẩm...
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Trạng thái lỗi
  |--------------------------------------------------------------------------
  */

  if (error) {
    return (
      <div>
        <div className="alert alert-danger">{error}</div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/products")}
        >
          <i className="bi bi-arrow-left me-2" />
          Quay lại
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <div className="alert alert-warning">
          Không tìm thấy sản phẩm.
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/products")}
        >
          <i className="bi bi-arrow-left me-2" />
          Quay lại
        </button>
      </div>
    );
  }

  const minimumStock = Number(product.minimum_stock || 0);

  return (
    <div>
      {/* Tiêu đề trang */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Chi tiết sản phẩm</h1>

          <p className="text-muted mb-0">
            Xem thông tin chi tiết, ảnh và mức tồn tối thiểu.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {canEditProduct && (
            <button
              type="button"
              className="btn btn-warning"
              onClick={() =>
                navigate(`/products/${product.id}/edit`)
              }
            >
              <i className="bi bi-pencil-square me-2" />
              Sửa sản phẩm
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/products")}
          >
            <i className="bi bi-arrow-left me-2" />
            Quay lại
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-4">
            {/* Ảnh sản phẩm */}
            <div className="col-lg-4">
              <div className="card bg-light border h-100">
                <div className="card-body">
                  <label className="text-muted small mb-3">
                    Ảnh sản phẩm
                  </label>

                  <div
                    className="mx-auto rounded border bg-white d-flex align-items-center justify-content-center overflow-hidden"
                    style={{
                      width: "100%",
                      maxWidth: "320px",
                      aspectRatio: "1 / 1",
                    }}
                  >
                    <img
                      src={product.image_url || PLACEHOLDER_IMAGE}
                      alt={product.name || "Ảnh sản phẩm"}
                      className="w-100 h-100"
                      style={{ objectFit: "contain" }}
                      onError={handleImageError}
                    />
                  </div>

                  {!product.image_url && (
                    <p className="text-muted small text-center mt-3 mb-0">
                      Sản phẩm chưa có ảnh.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Thông tin sản phẩm */}
            <div className="col-lg-8">
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <label className="text-muted small d-block mb-1">
                      ID sản phẩm
                    </label>

                    <p className="fw-semibold mb-0">
                      {product.id}
                    </p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <label className="text-muted small d-block mb-1">
                      Mã SKU
                    </label>

                    <p className="fw-semibold mb-0">
                      {product.sku || "Không có"}
                    </p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <label className="text-muted small d-block mb-1">
                      Tên sản phẩm
                    </label>

                    <p className="fw-semibold mb-0">
                      {product.name || "Không có"}
                    </p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <label className="text-muted small d-block mb-1">
                      Danh mục
                    </label>

                    <p className="mb-0">
                      {product.category_name || "Chưa phân loại"}
                    </p>
                  </div>
                </div>

                {/* Mức tồn tối thiểu */}
                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <label className="text-muted small d-block mb-1">
                      Mức tồn tối thiểu
                    </label>

                    <p className="fw-semibold mb-1">
                      {minimumStock}
                    </p>

                    <div className="small text-muted">
                      {minimumStock > 0
                        ? "Hệ thống cảnh báo khi tồn kho nhỏ hơn hoặc bằng mức này."
                        : "Chưa thiết lập cảnh báo tồn kho thấp."}
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <label className="text-muted small d-block mb-2">
                      Trạng thái
                    </label>

                    <span
                      className={`badge ${
                        product.status === "active"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {product.status === "active"
                        ? "Đang hoạt động"
                        : "Ngừng hoạt động"}
                    </span>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <label className="text-muted small d-block mb-1">
                      Ngày tạo
                    </label>

                    <p className="mb-0">
                      {formatDate(product.created_at)}
                    </p>
                  </div>
                </div>

                <div className="col-12">
                  <div className="border rounded p-3">
                    <label className="text-muted small d-block mb-2">
                      Mô tả
                    </label>

                    <p
                      className="mb-0"
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {product.description || "Không có mô tả"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;