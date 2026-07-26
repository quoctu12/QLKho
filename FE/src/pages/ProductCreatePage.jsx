import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createProduct } from "../api/productApi";
import { getCategories } from "../api/categoryApi";

/*
|--------------------------------------------------------------------------
| Cấu hình ảnh sản phẩm
|--------------------------------------------------------------------------
*/

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
      <rect width="240" height="240" rx="16" fill="#eef2f7"/>
      <path d="M65 75h110v95H65z" fill="#d6dee8"/>
      <path d="M80 150l30-35 22 22 17-17 26 30H80z" fill="#9aa8b8"/>
      <circle cx="150" cy="98" r="15" fill="#9aa8b8"/>
    </svg>
  `);

function ProductCreatePage() {
  const navigate = useNavigate();
  const imageInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [formData, setFormData] = useState({
    category_id: "",
    name: "",
    sku: "",
    description: "",
    minimum_stock: "0",
    status: "active",
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Tải danh mục sản phẩm
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();

        setCategories(
          Array.isArray(data) ? data : []
        );
      } catch (err) {
        console.error("Lỗi tải danh mục:", err);

        setError("Không thể tải danh sách danh mục.");
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Giải phóng URL ảnh xem trước
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  /*
  |--------------------------------------------------------------------------
  | Xử lý thay đổi dữ liệu form
  |--------------------------------------------------------------------------
  */

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  /*
  |--------------------------------------------------------------------------
  | Chọn ảnh sản phẩm
  |--------------------------------------------------------------------------
  */

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    setError("");

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Ảnh phải có định dạng JPG, PNG hoặc WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Dung lượng ảnh không được vượt quá 5 MB.");
      event.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setSelectedImage(file);
    setImagePreview(previewUrl);
  }

  /*
  |--------------------------------------------------------------------------
  | Xóa ảnh đã chọn
  |--------------------------------------------------------------------------
  */

  function handleRemoveImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Thêm sản phẩm
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedName = formData.name.trim();
    const normalizedSku = formData.sku.trim();
    const minimumStock = Number(formData.minimum_stock);

    if (
      !formData.category_id ||
      !normalizedName ||
      !normalizedSku
    ) {
      setError(
        "Vui lòng nhập đầy đủ danh mục, tên sản phẩm và mã SKU."
      );

      return;
    }

    if (normalizedName.length > 255) {
      setError("Tên sản phẩm không được vượt quá 255 ký tự.");
      return;
    }

    if (normalizedSku.length > 100) {
      setError("Mã SKU không được vượt quá 100 ký tự.");
      return;
    }

    if (
      !Number.isInteger(minimumStock) ||
      minimumStock < 0
    ) {
      setError(
        "Mức tồn tối thiểu phải là số nguyên lớn hơn hoặc bằng 0."
      );

      return;
    }

    try {
      setSaving(true);

      /*
       * Dùng FormData để gửi dữ liệu và file ảnh.
       */
      const requestData = new FormData();

      requestData.append(
        "category_id",
        String(formData.category_id)
      );

      requestData.append("name", normalizedName);
      requestData.append("sku", normalizedSku);

      requestData.append(
        "description",
        formData.description.trim()
      );

      requestData.append(
        "minimum_stock",
        String(minimumStock)
      );

      requestData.append(
        "status",
        formData.status
      );

      if (selectedImage) {
        requestData.append(
          "image",
          selectedImage
        );
      }

      await createProduct(requestData);

      alert("Thêm sản phẩm thành công.");
      navigate("/products");
    } catch (err) {
      console.error("Lỗi thêm sản phẩm:", err);

      setError(
        err.response?.data?.message ||
          "Không thể thêm sản phẩm."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">
          Thêm sản phẩm
        </h1>

        <p className="text-muted mb-0">
          Nhập thông tin sản phẩm mới vào hệ thống.
        </p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-4">
              {/* Thông tin sản phẩm */}
              <div className="col-lg-8">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label
                      className="form-label"
                      htmlFor="product-sku"
                    >
                      Mã SKU
                      <span className="text-danger ms-1">
                        *
                      </span>
                    </label>

                    <input
                      id="product-sku"
                      type="text"
                      name="sku"
                      className="form-control"
                      value={formData.sku}
                      onChange={handleChange}
                      placeholder="Ví dụ: SP001"
                      maxLength={100}
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label
                      className="form-label"
                      htmlFor="product-name"
                    >
                      Tên sản phẩm
                      <span className="text-danger ms-1">
                        *
                      </span>
                    </label>

                    <input
                      id="product-name"
                      type="text"
                      name="name"
                      className="form-control"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Nhập tên sản phẩm"
                      maxLength={255}
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label
                      className="form-label"
                      htmlFor="product-category"
                    >
                      Danh mục
                      <span className="text-danger ms-1">
                        *
                      </span>
                    </label>

                    <select
                      id="product-category"
                      name="category_id"
                      className="form-select"
                      value={formData.category_id}
                      onChange={handleChange}
                      disabled={loadingCategories || saving}
                    >
                      <option value="">
                        {loadingCategories
                          ? "Đang tải danh mục..."
                          : "Chọn danh mục"}
                      </option>

                      {categories.map((category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label
                      className="form-label"
                      htmlFor="product-status"
                    >
                      Trạng thái
                    </label>

                    <select
                      id="product-status"
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="active">
                        Đang hoạt động
                      </option>

                      <option value="inactive">
                        Ngừng hoạt động
                      </option>
                    </select>
                  </div>

                  {/* Mức tồn tối thiểu */}
                  <div className="col-md-6 mb-3">
                    <label
                      className="form-label"
                      htmlFor="minimum-stock"
                    >
                      Mức tồn tối thiểu
                    </label>

                    <input
                      id="minimum-stock"
                      type="number"
                      name="minimum_stock"
                      className="form-control"
                      min="0"
                      step="1"
                      value={formData.minimum_stock}
                      onChange={handleChange}
                      placeholder="Ví dụ: 20"
                      disabled={saving}
                    />

                    <div className="form-text">
                      Hệ thống sẽ cảnh báo khi tổng tồn kho nhỏ hơn
                      hoặc bằng mức này. Nhập 0 nếu chưa muốn cảnh báo.
                    </div>
                  </div>

                  <div className="col-12 mb-3">
                    <label
                      className="form-label"
                      htmlFor="product-description"
                    >
                      Mô tả
                    </label>

                    <textarea
                      id="product-description"
                      name="description"
                      className="form-control"
                      rows="6"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Nhập mô tả sản phẩm"
                      maxLength={2000}
                      disabled={saving}
                    />

                    <div className="form-text text-end">
                      {formData.description.length}/2000 ký tự
                    </div>
                  </div>
                </div>
              </div>

              {/* Ảnh sản phẩm */}
              <div className="col-lg-4">
                <label className="form-label">
                  Ảnh sản phẩm
                </label>

                <div className="card bg-light border">
                  <div className="card-body text-center">
                    <div
                      className="mx-auto mb-3 rounded border bg-white d-flex align-items-center justify-content-center overflow-hidden"
                      style={{
                        width: "220px",
                        maxWidth: "100%",
                        aspectRatio: "1 / 1",
                      }}
                    >
                      <img
                        src={
                          imagePreview ||
                          PLACEHOLDER_IMAGE
                        }
                        alt="Xem trước ảnh sản phẩm"
                        className="w-100 h-100"
                        style={{
                          objectFit: "contain",
                        }}
                      />
                    </div>

                    <input
                      ref={imageInputRef}
                      type="file"
                      className="form-control"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      disabled={saving}
                    />

                    <div className="form-text text-start mt-2">
                      Chấp nhận JPG, PNG, WEBP. Dung lượng tối đa
                      5 MB.
                    </div>

                    {selectedImage && (
                      <div className="mt-3">
                        <div className="small text-muted text-truncate mb-2">
                          {selectedImage.name}
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={handleRemoveImage}
                          disabled={saving}
                        >
                          <i className="bi bi-trash me-2" />
                          Xóa ảnh đã chọn
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 border-top pt-4 mt-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || loadingCategories}
              >
                {saving ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="bi bi-floppy me-2" />
                    Lưu sản phẩm
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => navigate("/products")}
              >
                <i className="bi bi-arrow-left me-2" />
                Quay lại
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProductCreatePage;