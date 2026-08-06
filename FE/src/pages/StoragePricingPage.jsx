import { useEffect, useState } from "react";

import { getWarehouses } from "../api/warehouseApi";

import {
  createStoragePricing,
  getStoragePricing,
  updateStoragePricingStatus,
} from "../api/storagePricingApi";

import { useAuth } from "../contexts/AuthContext";

function getTodayInputValue() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function StoragePricingPage() {
  const { user } = useAuth();

  const currentRole = String(
    user?.role || ""
  ).toUpperCase();

  const canManageStoragePricing = [
    "ADMIN",
    "MANAGER",
  ].includes(currentRole);

  const [pricingList, setPricingList] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [filters, setFilters] = useState({
    warehouse_id: "",
    status: "",
  });

  const [formData, setFormData] = useState({
    warehouse_id: "",
    price_per_container_per_day: "",
    effective_from: getTodayInputValue(),
    status: "active",
  });

  const [loading, setLoading] = useState(true);
  const [loadingWarehouses, setLoadingWarehouses] =
    useState(true);

  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Tải dữ liệu ban đầu
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadWarehouses();
    loadPricing();
  }, []);

  async function loadWarehouses() {
    try {
      setLoadingWarehouses(true);

      const data = await getWarehouses();

      setWarehouses(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải danh sách kho:",
        err
      );

      setWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  }

  async function loadPricing(params = {}) {
    try {
      setLoading(true);
      setError("");

      const data = await getStoragePricing(params);

      setPricingList(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải đơn giá lưu kho:",
        err
      );

      setPricingList([]);

      setError(
        err.response?.data?.message ||
          "Không thể tải danh sách đơn giá lưu kho."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Bộ lọc
  |--------------------------------------------------------------------------
  */

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function buildFilterParams() {
    const params = {};

    if (filters.warehouse_id) {
      params.warehouse_id =
        filters.warehouse_id;
    }

    if (filters.status) {
      params.status = filters.status;
    }

    return params;
  }

  function handleSearch(event) {
    event.preventDefault();

    loadPricing(buildFilterParams());
  }

  function handleResetFilters() {
    setFilters({
      warehouse_id: "",
      status: "",
    });

    loadPricing();
  }

  /*
  |--------------------------------------------------------------------------
  | Form đơn giá
  |--------------------------------------------------------------------------
  */

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!canManageStoragePricing) {
      setError(
        "Bạn không có quyền thêm đơn giá lưu kho."
      );

      return;
    }

    const warehouseId = Number(
      formData.warehouse_id
    );

    const price = Number(
      formData.price_per_container_per_day
    );

    if (
      !Number.isInteger(warehouseId) ||
      warehouseId <= 0
    ) {
      setError("Vui lòng chọn kho.");
      return;
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError(
        "Đơn giá lưu kho phải lớn hơn hoặc bằng 0."
      );

      return;
    }

    if (!formData.effective_from) {
      setError(
        "Vui lòng chọn ngày hiệu lực."
      );

      return;
    }

    try {
      setSaving(true);

      const result = await createStoragePricing({
        warehouse_id: warehouseId,

        price_per_container_per_day:
          price,

        effective_from:
          formData.effective_from,

        status: formData.status,
      });

      setSuccessMessage(
        result?.message ||
          "Thêm đơn giá lưu kho thành công."
      );

      setFormData({
        warehouse_id: "",
        price_per_container_per_day: "",
        effective_from: getTodayInputValue(),
        status: "active",
      });

      await loadPricing(
        buildFilterParams()
      );
    } catch (err) {
      console.error(
        "Lỗi tạo đơn giá lưu kho:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Không thể tạo đơn giá lưu kho."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Khóa hoặc mở khóa đơn giá
  |--------------------------------------------------------------------------
  */

  async function handleToggleStatus(pricing) {
    if (!canManageStoragePricing) {
      setError(
        "Bạn không có quyền thay đổi trạng thái đơn giá."
      );

      return;
    }

    const nextStatus =
      pricing.status === "active"
        ? "inactive"
        : "active";

    const confirmMessage =
      nextStatus === "active"
        ? "Bạn có chắc muốn mở lại đơn giá này?"
        : "Bạn có chắc muốn khóa đơn giá này?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setActionId(pricing.id);
      setError("");
      setSuccessMessage("");

      const result =
        await updateStoragePricingStatus(
          pricing.id,
          nextStatus
        );

      setSuccessMessage(
        result?.message ||
          "Cập nhật trạng thái đơn giá thành công."
      );

      await loadPricing(
        buildFilterParams()
      );
    } catch (err) {
      console.error(
        "Lỗi cập nhật trạng thái đơn giá:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Không thể cập nhật trạng thái đơn giá."
      );
    } finally {
      setActionId(null);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Định dạng
  |--------------------------------------------------------------------------
  */

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString(
      "vi-VN",
      {
        style: "currency",
        currency: "VND",
      }
    );
  }

  function formatDate(value) {
    if (!value) {
      return "Không có";
    }

    const matchedDate = String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (matchedDate) {
      return `${matchedDate[3]}/${matchedDate[2]}/${matchedDate[1]}`;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Không hợp lệ";
    }

    return date.toLocaleDateString("vi-VN");
  }

  function getStatusBadge(status) {
    if (status === "active") {
      return (
        <span className="badge bg-success">
          Đang áp dụng
        </span>
      );
    }

    return (
      <span className="badge bg-secondary">
        Đã khóa
      </span>
    );
  }

  const tableColumnCount =
    canManageStoragePricing ? 7 : 6;

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">
          {canManageStoragePricing
            ? "Quản lý đơn giá lưu kho"
            : "Đơn giá lưu kho"}
        </h1>

        <p className="text-muted mb-0">
          {canManageStoragePricing
            ? "Cấu hình đơn giá lưu kho theo container/ngày cho từng kho."
            : "Tra cứu đơn giá lưu kho đang áp dụng cho từng kho."}
        </p>
      </div>

      {currentRole === "STAFF" && (
        <div className="alert alert-info">
          Bạn chỉ được xem đơn giá lưu kho,
          không được thêm, khóa hoặc mở khóa
          đơn giá.
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {/* Form thêm đơn giá */}
      {canManageStoragePricing && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title mb-3">
              Thêm đơn giá lưu kho
            </h5>

            <form onSubmit={handleSubmit}>
              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label
                    className="form-label"
                    htmlFor="pricing-warehouse"
                  >
                    Kho
                  </label>

                  <select
                    id="pricing-warehouse"
                    name="warehouse_id"
                    className="form-select"
                    value={
                      formData.warehouse_id
                    }
                    disabled={
                      loadingWarehouses ||
                      saving
                    }
                    onChange={
                      handleFormChange
                    }
                  >
                    <option value="">
                      {loadingWarehouses
                        ? "Đang tải kho..."
                        : "Chọn kho"}
                    </option>

                    {warehouses.map(
                      (warehouse) => (
                        <option
                          key={warehouse.id}
                          value={warehouse.id}
                        >
                          {warehouse.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="col-md-3">
                  <label
                    className="form-label"
                    htmlFor="pricing-price"
                  >
                    Đơn giá
                  </label>

                  <div className="input-group">
                    <input
                      id="pricing-price"
                      name="price_per_container_per_day"
                      type="number"
                      min="0"
                      step="1000"
                      className="form-control"
                      value={
                        formData
                          .price_per_container_per_day
                      }
                      disabled={saving}
                      onChange={
                        handleFormChange
                      }
                      placeholder="100000"
                    />

                    <span className="input-group-text">
                      VNĐ
                    </span>
                  </div>

                  <div className="form-text">
                    Giá / container / ngày
                  </div>
                </div>

                <div className="col-md-3">
                  <label
                    className="form-label"
                    htmlFor="pricing-effective-from"
                  >
                    Ngày hiệu lực
                  </label>

                  <input
                    id="pricing-effective-from"
                    name="effective_from"
                    type="date"
                    className="form-control"
                    value={
                      formData.effective_from
                    }
                    disabled={saving}
                    onChange={
                      handleFormChange
                    }
                  />
                </div>

                <div className="col-md-2">
                  <label
                    className="form-label"
                    htmlFor="pricing-status"
                  >
                    Trạng thái
                  </label>

                  <select
                    id="pricing-status"
                    name="status"
                    className="form-select"
                    value={formData.status}
                    disabled={saving}
                    onChange={
                      handleFormChange
                    }
                  >
                    <option value="active">
                      Đang áp dụng
                    </option>

                    <option value="inactive">
                      Đã khóa
                    </option>
                  </select>
                </div>

                <div className="col-12">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-save me-2" />
                        Lưu đơn giá
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="row g-3 align-items-end">
              <div className="col-md-5">
                <label
                  className="form-label"
                  htmlFor="filter-warehouse"
                >
                  Lọc theo kho
                </label>

                <select
                  id="filter-warehouse"
                  name="warehouse_id"
                  className="form-select"
                  value={
                    filters.warehouse_id
                  }
                  disabled={
                    loadingWarehouses
                  }
                  onChange={
                    handleFilterChange
                  }
                >
                  <option value="">
                    Tất cả kho
                  </option>

                  {warehouses.map(
                    (warehouse) => (
                      <option
                        key={warehouse.id}
                        value={warehouse.id}
                      >
                        {warehouse.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="col-md-3">
                <label
                  className="form-label"
                  htmlFor="filter-status"
                >
                  Trạng thái
                </label>

                <select
                  id="filter-status"
                  name="status"
                  className="form-select"
                  value={filters.status}
                  onChange={
                    handleFilterChange
                  }
                >
                  <option value="">
                    Tất cả
                  </option>

                  <option value="active">
                    Đang áp dụng
                  </option>

                  <option value="inactive">
                    Đã khóa
                  </option>
                </select>
              </div>

              <div className="col-md-4">
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-grow-1"
                    disabled={loading}
                  >
                    <i className="bi bi-funnel me-2" />
                    Lọc
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={loading}
                    onClick={
                      handleResetFilters
                    }
                    title="Đặt lại bộ lọc"
                  >
                    <i className="bi bi-arrow-counterclockwise" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Danh sách đơn giá */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h5 className="card-title mb-0">
              Danh sách đơn giá lưu kho
            </h5>

            <span className="badge bg-secondary">
              {pricingList.length} đơn giá
            </span>
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Kho</th>
                  <th>Đơn giá</th>
                  <th>Ngày hiệu lực</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>

                  {canManageStoragePricing && (
                    <th>Thao tác</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={
                        tableColumnCount
                      }
                      className="text-center text-muted py-5"
                    >
                      <span className="spinner-border spinner-border-sm me-2" />
                      Đang tải đơn giá lưu kho...
                    </td>
                  </tr>
                ) : pricingList.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        tableColumnCount
                      }
                      className="text-center text-muted py-5"
                    >
                      Chưa có đơn giá lưu kho
                      phù hợp.
                    </td>
                  </tr>
                ) : (
                  pricingList.map(
                    (pricing, index) => (
                      <tr key={pricing.id}>
                        <td>{index + 1}</td>

                        <td>
                          <strong>
                            {
                              pricing.warehouse_name
                            }
                          </strong>
                        </td>

                        <td>
                          <strong className="text-primary">
                            {formatCurrency(
                              pricing
                                .price_per_container_per_day
                            )}
                          </strong>

                          <div className="text-muted small">
                            / container / ngày
                          </div>
                        </td>

                        <td>
                          {formatDate(
                            pricing.effective_from
                          )}
                        </td>

                        <td>
                          {getStatusBadge(
                            pricing.status
                          )}
                        </td>

                        <td>
                          {formatDate(
                            pricing.created_at
                          )}
                        </td>

                        {canManageStoragePricing && (
                          <td>
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                pricing.status ===
                                "active"
                                  ? "btn-outline-danger"
                                  : "btn-outline-success"
                              }`}
                              disabled={
                                actionId ===
                                pricing.id
                              }
                              onClick={() =>
                                handleToggleStatus(
                                  pricing
                                )
                              }
                            >
                              {actionId ===
                              pricing.id
                                ? "Đang xử lý..."
                                : pricing.status ===
                                    "active"
                                  ? "Khóa"
                                  : "Mở khóa"}
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="alert alert-info mb-0 mt-3">
            <strong>Ghi chú:</strong>{" "}
            Khi xuất kho, hệ thống sử dụng đơn
            giá có ngày hiệu lực gần nhất nhưng
            không lớn hơn ngày xuất.
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoragePricingPage;