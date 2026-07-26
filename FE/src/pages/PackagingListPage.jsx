import { useEffect, useState } from "react";

import { getProducts } from "../api/productApi";
import { getUnits } from "../api/unitApi";

import {
  getPackaging,
  createPackaging,
  updatePackaging,
  deletePackaging,
} from "../api/packagingApi";

function PackagingListPage() {
  const [packagingList, setPackagingList] = useState([]);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);

  const [formData, setFormData] = useState({
    product_id: "",
    unit_id: "",
    quantity_per_unit: "",
    note: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Tải dữ liệu khi mở trang
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadData();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Tải danh sách quy cách, sản phẩm và đơn vị tính
  |--------------------------------------------------------------------------
  |
  | API sản phẩm hiện trả về:
  | {
  |   products: [],
  |   pagination: {}
  | }
  |
  | Vì vậy phải lấy productData.products thay vì gán cả object.
  |
  */

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [packagingData, productData, unitData] = await Promise.all([
        getPackaging(),

        getProducts({
          page: 1,
          limit: 100,
          status: "active",
          sort_by: "name_asc",
        }),

        getUnits(),
      ]);

      setPackagingList(
        Array.isArray(packagingData) ? packagingData : []
      );

      setProducts(
        Array.isArray(productData?.products)
          ? productData.products
          : []
      );

      setUnits(
        Array.isArray(unitData) ? unitData : []
      );
    } catch (err) {
      console.error("Lỗi tải dữ liệu quy cách đóng gói:", err);

      setPackagingList([]);
      setProducts([]);
      setUnits([]);

      setError(
        err.response?.data?.message ||
          "Không thể tải dữ liệu quy cách đóng gói."
      );
    } finally {
      setLoading(false);
    }
  }

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
  | Chọn quy cách cần sửa
  |--------------------------------------------------------------------------
  */

  function handleEdit(item) {
    setEditingId(item.id);

    setFormData({
      product_id: String(item.product_id),
      unit_id: String(item.unit_id),
      quantity_per_unit: String(item.quantity_per_unit),
      note: item.note || "",
    });

    setError("");
  }

  /*
  |--------------------------------------------------------------------------
  | Hủy sửa quy cách
  |--------------------------------------------------------------------------
  */

  function handleCancelEdit() {
    setEditingId(null);

    setFormData({
      product_id: "",
      unit_id: "",
      quantity_per_unit: "",
      note: "",
    });

    setError("");
  }

  /*
  |--------------------------------------------------------------------------
  | Thêm hoặc cập nhật quy cách đóng gói
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (
      !formData.product_id ||
      !formData.unit_id ||
      !formData.quantity_per_unit
    ) {
      setError(
        "Vui lòng chọn sản phẩm, đơn vị tính và nhập số lượng quy đổi."
      );

      return;
    }

    const quantityPerUnit = Number(formData.quantity_per_unit);

    if (
      !Number.isFinite(quantityPerUnit) ||
      quantityPerUnit <= 0
    ) {
      setError("Số lượng quy đổi phải lớn hơn 0.");
      return;
    }

    const payload = {
      product_id: Number(formData.product_id),
      unit_id: Number(formData.unit_id),
      quantity_per_unit: quantityPerUnit,
      note: formData.note.trim(),
    };

    try {
      setSaving(true);

      if (editingId) {
        await updatePackaging(editingId, payload);

        alert("Cập nhật quy cách đóng gói thành công.");
      } else {
        await createPackaging(payload);

        alert("Thêm quy cách đóng gói thành công.");
      }

      setEditingId(null);

      setFormData({
        product_id: "",
        unit_id: "",
        quantity_per_unit: "",
        note: "",
      });

      await loadData();
    } catch (err) {
      console.error("Lỗi lưu quy cách đóng gói:", err);

      setError(
        err.response?.data?.message ||
          "Không thể lưu quy cách đóng gói."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Xóa quy cách đóng gói
  |--------------------------------------------------------------------------
  */

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa quy cách "${item.product_name} - ${item.unit_name}" không?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await deletePackaging(item.id);

      alert(
        result.message ||
          "Xóa quy cách đóng gói thành công."
      );

      if (editingId === item.id) {
        handleCancelEdit();
      }

      await loadData();
    } catch (err) {
      console.error("Lỗi xóa quy cách:", err);

      alert(
        err.response?.data?.message ||
          "Không thể xóa quy cách đóng gói."
      );
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">Quy cách đóng gói</h1>

        <p className="text-muted mb-0">
          Cấu hình số lượng quy đổi theo từng đơn vị sản phẩm.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="row g-4">
        {/* Form thêm và sửa quy cách */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                {editingId ? "Sửa quy cách" : "Thêm quy cách"}
              </h5>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label
                    className="form-label"
                    htmlFor="packaging-product"
                  >
                    Sản phẩm
                  </label>

                  <select
                    id="packaging-product"
                    name="product_id"
                    className="form-select"
                    value={formData.product_id}
                    onChange={handleChange}
                    disabled={loading || saving}
                  >
                    <option value="">
                      {loading
                        ? "Đang tải sản phẩm..."
                        : "Chọn sản phẩm"}
                    </option>

                    {products.map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.sku} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label
                    className="form-label"
                    htmlFor="packaging-unit"
                  >
                    Đơn vị tính
                  </label>

                  <select
                    id="packaging-unit"
                    name="unit_id"
                    className="form-select"
                    value={formData.unit_id}
                    onChange={handleChange}
                    disabled={loading || saving}
                  >
                    <option value="">
                      {loading
                        ? "Đang tải đơn vị tính..."
                        : "Chọn đơn vị tính"}
                    </option>

                    {units.map((unit) => (
                      <option
                        key={unit.id}
                        value={unit.id}
                      >
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label
                    className="form-label"
                    htmlFor="quantity-per-unit"
                  >
                    Số lượng quy đổi
                  </label>

                  <input
                    id="quantity-per-unit"
                    type="number"
                    min="1"
                    step="1"
                    name="quantity_per_unit"
                    className="form-control"
                    value={formData.quantity_per_unit}
                    onChange={handleChange}
                    placeholder="Ví dụ: 24"
                    disabled={saving}
                  />
                </div>

                <div className="mb-3">
                  <label
                    className="form-label"
                    htmlFor="packaging-note"
                  >
                    Ghi chú
                  </label>

                  <textarea
                    id="packaging-note"
                    name="note"
                    className="form-control"
                    rows="3"
                    value={formData.note}
                    onChange={handleChange}
                    placeholder="Ví dụ: 1 thùng gồm 24 chai"
                    disabled={saving}
                  />
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-grow-1"
                    disabled={saving || loading}
                  >
                    {saving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        />
                        Đang lưu...
                      </>
                    ) : editingId ? (
                      "Cập nhật quy cách"
                    ) : (
                      "Thêm quy cách"
                    )}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Danh sách quy cách */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                Danh sách quy cách
              </h5>

              {loading ? (
                <div className="d-flex align-items-center gap-2 text-muted">
                  <div
                    className="spinner-border spinner-border-sm"
                    role="status"
                  />

                  Đang tải dữ liệu...
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Sản phẩm</th>
                        <th>Đơn vị</th>
                        <th>Số lượng quy đổi</th>
                        <th>Ghi chú</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>

                    <tbody>
                      {packagingList.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="text-center text-muted py-4"
                          >
                            Chưa có quy cách đóng gói.
                          </td>
                        </tr>
                      ) : (
                        packagingList.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>

                            <td>
                              <strong>
                                {item.product_name}
                              </strong>

                              <div className="text-muted small">
                                {item.sku}
                              </div>
                            </td>

                            <td>
                              {item.unit_name}
                            </td>

                            <td>
                              {item.quantity_per_unit}
                            </td>

                            <td>
                              {item.note ||
                                "Không có ghi chú"}
                            </td>

                            <td className="text-nowrap">
                              <div className="d-flex gap-2 flex-nowrap">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => handleEdit(item)}
                                >
                                  Sửa
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDelete(item)}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PackagingListPage;