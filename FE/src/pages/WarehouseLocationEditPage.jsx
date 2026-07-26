import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getWarehouses } from "../api/warehouseApi";

import {
  getWarehouseLocationById,
  updateWarehouseLocation,
} from "../api/warehouseLocationApi";

function WarehouseLocationEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [warehouses, setWarehouses] = useState([]);

  const [formData, setFormData] = useState({
    warehouse_id: "",
    location_code: "",
    location_name: "",
    max_containers: "0",
    warning_threshold_percent: "80",
    status: "active",
  });

  const [usedContainers, setUsedContainers] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Tải dữ liệu ban đầu
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadInitialData();
  }, [id]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const [warehouseData, locationData] = await Promise.all([
        getWarehouses(),
        getWarehouseLocationById(id),
      ]);

      setWarehouses(
        Array.isArray(warehouseData) ? warehouseData : []
      );

      setFormData({
        warehouse_id: String(locationData.warehouse_id || ""),
        location_code: locationData.location_code || "",
        location_name: locationData.location_name || "",
        max_containers: String(locationData.max_containers || 0),
        warning_threshold_percent: String(
          locationData.warning_threshold_percent || 80
        ),
        status: locationData.status || "active",
      });

      setUsedContainers(
        Number(locationData.used_containers || 0)
      );
    } catch (err) {
      console.error("Lỗi tải vị trí kho:", err);

      setError(
        err.response?.data?.message ||
          "Không thể tải thông tin vị trí kho."
      );
    } finally {
      setLoading(false);
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

    if (
      maxContainers > 0 &&
      maxContainers < usedContainers
    ) {
      return `Sức chứa không được nhỏ hơn số container đang dùng (${usedContainers}).`;
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
  | Cập nhật vị trí kho
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
      setSaving(true);
      setError("");

      await updateWarehouseLocation(id, {
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
      console.error("Lỗi cập nhật vị trí kho:", err);

      setError(
        err.response?.data?.message ||
          "Không thể cập nhật vị trí kho."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted">
        <div
          className="spinner-border spinner-border-sm"
          role="status"
        />
        Đang tải thông tin vị trí kho...
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Sửa vị trí kho
          </h1>

          <p className="text-muted mb-0">
            Cập nhật thông tin vị trí lưu trữ và sức chứa container.
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
                  disabled={saving}
                  onChange={handleChange}
                >
                  <option value="">
                    Chọn kho
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
                  disabled={saving}
                  onChange={handleChange}
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
                  disabled={saving}
                  onChange={handleChange}
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
                    disabled={saving}
                    onChange={handleChange}
                  />

                  <span className="input-group-text">
                    container
                  </span>
                </div>

                <div className="form-text">
                  Đang dùng: {usedContainers} container.
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
                    disabled={saving}
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
                  disabled={saving}
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

            <div className="alert alert-warning mt-4 mb-0">
              <strong>Lưu ý:</strong>{" "}
              Không thể đặt sức chứa nhỏ hơn số container hiện đang sử dụng trong vị trí này.
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={saving}
                onClick={() => navigate("/warehouse-locations")}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
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
                    <i className="bi bi-save me-2" />
                    Lưu thay đổi
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

export default WarehouseLocationEditPage;