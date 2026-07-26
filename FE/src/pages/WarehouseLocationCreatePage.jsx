import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getWarehouses } from "../api/warehouseApi";
import { createWarehouseLocation } from "../api/warehouseLocationApi";

function WarehouseLocationCreatePage() {
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState([]);

  const [formData, setFormData] = useState({
    warehouse_id: "",
    location_code: "",
    location_name: "",
    max_containers: "",
    warning_threshold_percent: "80",
    status: "active",
  });

  const [loading, setLoading] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Tải danh sách kho
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadWarehouses();
  }, []);

  async function loadWarehouses() {
    try {
      setLoadingWarehouses(true);

      const data = await getWarehouses();

      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi tải danh sách kho:", err);

      setError(
        err.response?.data?.message ||
          "Không thể tải danh sách kho."
      );
    } finally {
      setLoadingWarehouses(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Xử lý nhập form
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
  | Kiểm tra dữ liệu
  |--------------------------------------------------------------------------
  */

  function validateForm() {
    if (!formData.warehouse_id) {
      return "Vui lòng chọn kho.";
    }

    if (!formData.location_code.trim()) {
      return "Vui lòng nhập mã vị trí.";
    }

    if (!formData.location_name.trim()) {
      return "Vui lòng nhập tên vị trí.";
    }

    const maxContainers = Number(formData.max_containers);

    if (
      !Number.isInteger(maxContainers) ||
      maxContainers < 0
    ) {
      return "Sức chứa tối đa phải là số nguyên không âm.";
    }

    const warningThresholdPercent = Number(
      formData.warning_threshold_percent
    );

    if (
      !Number.isInteger(warningThresholdPercent) ||
      warningThresholdPercent < 1 ||
      warningThresholdPercent > 100
    ) {
      return "Ngưỡng cảnh báo phải nằm trong khoảng từ 1 đến 100.";
    }

    return "";
  }

  /*
  |--------------------------------------------------------------------------
  | Tạo vị trí kho
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(event) {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setLoading(true);
      setError("");

      await createWarehouseLocation({
        warehouse_id: Number(formData.warehouse_id),
        location_code: formData.location_code.trim(),
        location_name: formData.location_name.trim(),
        max_containers: Number(formData.max_containers),
        warning_threshold_percent: Number(
          formData.warning_threshold_percent
        ),
        status: formData.status,
      });

      navigate("/warehouse-locations");
    } catch (err) {
      console.error("Lỗi tạo vị trí kho:", err);

      setError(
        err.response?.data?.message ||
          "Không thể tạo vị trí kho."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Thêm vị trí kho
          </h1>

          <p className="text-muted mb-0">
            Tạo vị trí lưu trữ trong kho và cấu hình sức chứa theo container.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => navigate("/warehouse-locations")}
        >
          <i className="bi bi-arrow-left me-2" />
          Quay lại
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label
                  className="form-label"
                  htmlFor="warehouse_id"
                >
                  Kho <span className="text-danger">*</span>
                </label>

                <select
                  id="warehouse_id"
                  name="warehouse_id"
                  className="form-select"
                  value={formData.warehouse_id}
                  disabled={loadingWarehouses || loading}
                  onChange={handleChange}
                >
                  <option value="">
                    {loadingWarehouses
                      ? "Đang tải kho..."
                      : "Chọn kho"}
                  </option>

                  {warehouses.map((warehouse) => (
                    <option
                      key={warehouse.id}
                      value={warehouse.id}
                    >
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label
                  className="form-label"
                  htmlFor="location_code"
                >
                  Mã vị trí <span className="text-danger">*</span>
                </label>

                <input
                  id="location_code"
                  name="location_code"
                  type="text"
                  className="form-control"
                  value={formData.location_code}
                  disabled={loading}
                  onChange={handleChange}
                  placeholder="VD: A-01, B-02, COLD-01"
                />
              </div>

              <div className="col-md-6">
                <label
                  className="form-label"
                  htmlFor="location_name"
                >
                  Tên vị trí <span className="text-danger">*</span>
                </label>

                <input
                  id="location_name"
                  name="location_name"
                  type="text"
                  className="form-control"
                  value={formData.location_name}
                  disabled={loading}
                  onChange={handleChange}
                  placeholder="VD: Khu A - Dãy 01"
                />
              </div>

              <div className="col-md-3">
                <label
                  className="form-label"
                  htmlFor="max_containers"
                >
                  Sức chứa tối đa
                </label>

                <div className="input-group">
                  <input
                    id="max_containers"
                    name="max_containers"
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    value={formData.max_containers}
                    disabled={loading}
                    onChange={handleChange}
                    placeholder="100"
                  />

                  <span className="input-group-text">
                    container
                  </span>
                </div>

                <div className="form-text">
                  Nhập 0 nếu chưa muốn cấu hình.
                </div>
              </div>

              <div className="col-md-3">
                <label
                  className="form-label"
                  htmlFor="warning_threshold_percent"
                >
                  Ngưỡng cảnh báo
                </label>

                <div className="input-group">
                  <input
                    id="warning_threshold_percent"
                    name="warning_threshold_percent"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    className="form-control"
                    value={formData.warning_threshold_percent}
                    disabled={loading}
                    onChange={handleChange}
                  />

                  <span className="input-group-text">
                    %
                  </span>
                </div>
              </div>

              <div className="col-md-6">
                <label
                  className="form-label"
                  htmlFor="status"
                >
                  Trạng thái
                </label>

                <select
                  id="status"
                  name="status"
                  className="form-select"
                  value={formData.status}
                  disabled={loading}
                  onChange={handleChange}
                >
                  <option value="active">
                    Đang dùng
                  </option>

                  <option value="inactive">
                    Đã khóa
                  </option>
                </select>
              </div>
            </div>

            <div className="alert alert-info mt-4 mb-0">
              <strong>Ghi chú:</strong>{" "}
              Khi nhập kho, hệ thống sẽ kiểm tra số container nhập vào có vượt quá sức chứa của vị trí này hay không.
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={loading}
                onClick={() => navigate("/warehouse-locations")}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="bi bi-save me-2" />
                    Lưu vị trí
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default WarehouseLocationCreatePage;