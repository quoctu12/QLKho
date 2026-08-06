import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getWarehouses } from "../api/warehouseApi";

import {
  getWarehouseLocations,
  updateWarehouseLocationStatus,
} from "../api/warehouseLocationApi";

import { useAuth } from "../contexts/AuthContext";

function WarehouseLocationListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentRole = String(
    user?.role || ""
  ).toUpperCase();

  const canManageLocation = [
    "ADMIN",
    "MANAGER",
  ].includes(currentRole);

  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [filters, setFilters] = useState({
    warehouse_id: "",
    keyword: "",
    status: "",
  });

  const [loading, setLoading] = useState(true);

  const [
    loadingWarehouses,
    setLoadingWarehouses,
  ] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    loadWarehouses();
    loadLocations();
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

  async function loadLocations(params = {}) {
    try {
      setLoading(true);
      setError("");

      const data =
        await getWarehouseLocations(params);

      setLocations(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải vị trí kho:",
        err
      );

      setLocations([]);

      setError(
        err.response?.data?.message ||
          "Không thể tải danh sách vị trí kho."
      );
    } finally {
      setLoading(false);
    }
  }

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

    if (filters.keyword.trim()) {
      params.keyword =
        filters.keyword.trim();
    }

    if (filters.status) {
      params.status = filters.status;
    }

    return params;
  }

  function handleSearch(event) {
    event.preventDefault();

    loadLocations(buildFilterParams());
  }

  function handleResetFilters() {
    setFilters({
      warehouse_id: "",
      keyword: "",
      status: "",
    });

    loadLocations();
  }

  async function handleToggleStatus(location) {
    if (!canManageLocation) {
      alert(
        "Bạn không có quyền thay đổi trạng thái vị trí kho."
      );
      return;
    }

    const nextStatus =
      location.status === "active"
        ? "inactive"
        : "active";

    const confirmMessage =
      nextStatus === "active"
        ? `Bạn có chắc muốn mở khóa vị trí ${location.location_code}?`
        : `Bạn có chắc muốn khóa vị trí ${location.location_code}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setError("");

      await updateWarehouseLocationStatus(
        location.id,
        nextStatus
      );

      await loadLocations(
        buildFilterParams()
      );
    } catch (err) {
      console.error(
        "Lỗi cập nhật trạng thái vị trí kho:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Không thể cập nhật trạng thái vị trí kho."
      );
    }
  }

  function getCapacityBadge(location) {
    if (location.capacity_status === "full") {
      return (
        <span className="badge bg-danger">
          Đã đầy
        </span>
      );
    }

    if (location.capacity_status === "warning") {
      return (
        <span className="badge bg-warning text-dark">
          Sắp đầy
        </span>
      );
    }

    if (location.capacity_status === "normal") {
      return (
        <span className="badge bg-success">
          Bình thường
        </span>
      );
    }

    return (
      <span className="badge bg-secondary">
        Chưa cấu hình
      </span>
    );
  }

  function getStatusBadge(status) {
    if (status === "active") {
      return (
        <span className="badge bg-success">
          Đang dùng
        </span>
      );
    }

    return (
      <span className="badge bg-secondary">
        Đã khóa
      </span>
    );
  }

  function getProgressBarClass(location) {
    if (location.capacity_status === "full") {
      return "bg-danger";
    }

    if (location.capacity_status === "warning") {
      return "bg-warning";
    }

    if (location.capacity_status === "normal") {
      return "bg-success";
    }

    return "bg-secondary";
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString(
      "vi-VN"
    );
  }

  const tableColumnCount =
    canManageLocation ? 11 : 10;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            {canManageLocation
              ? "Quản lý vị trí kho"
              : "Danh sách vị trí kho"}
          </h1>

          <p className="text-muted mb-0">
            Theo dõi vị trí lưu trữ, sức chứa
            container và cảnh báo vị trí sắp đầy.
          </p>
        </div>

        {canManageLocation && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              navigate(
                "/warehouse-locations/create"
              )
            }
          >
            <i className="bi bi-plus-lg me-2" />
            Thêm vị trí
          </button>
        )}
      </div>

      {currentRole === "STAFF" && (
        <div className="alert alert-info">
          Bạn chỉ được xem và tra cứu vị trí kho,
          không được thêm, sửa, khóa hoặc mở khóa vị trí.
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="row g-3 align-items-end">
              <div className="col-xl-4 col-md-6">
                <label
                  className="form-label"
                  htmlFor="location-keyword"
                >
                  Tìm kiếm
                </label>

                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <i className="bi bi-search" />
                  </span>

                  <input
                    id="location-keyword"
                    type="search"
                    name="keyword"
                    className="form-control"
                    value={filters.keyword}
                    onChange={handleFilterChange}
                    placeholder="Mã vị trí, tên vị trí hoặc tên kho"
                  />
                </div>
              </div>

              <div className="col-xl-3 col-md-6">
                <label
                  className="form-label"
                  htmlFor="location-warehouse"
                >
                  Kho
                </label>

                <select
                  id="location-warehouse"
                  name="warehouse_id"
                  className="form-select"
                  value={filters.warehouse_id}
                  disabled={loadingWarehouses}
                  onChange={handleFilterChange}
                >
                  <option value="">
                    {loadingWarehouses
                      ? "Đang tải kho..."
                      : "Tất cả kho"}
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

              <div className="col-xl-2 col-md-6">
                <label
                  className="form-label"
                  htmlFor="location-status"
                >
                  Trạng thái
                </label>

                <select
                  id="location-status"
                  name="status"
                  className="form-select"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">
                    Tất cả
                  </option>

                  <option value="active">
                    Đang dùng
                  </option>

                  <option value="inactive">
                    Đã khóa
                  </option>
                </select>
              </div>

              <div className="col-xl-3 col-md-6">
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
                    onClick={handleResetFilters}
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

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h5 className="card-title mb-0">
              Danh sách vị trí kho
            </h5>

            <div className="text-muted small">
              Tổng số vị trí:{" "}
              <strong>{locations.length}</strong>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Kho</th>
                  <th>Mã vị trí</th>
                  <th>Tên vị trí</th>
                  <th>Sức chứa</th>
                  <th>Đã dùng</th>
                  <th>Còn trống</th>
                  <th>Tỷ lệ dùng</th>
                  <th>Trạng thái sức chứa</th>
                  <th>Trạng thái</th>

                  {canManageLocation && (
                    <th>Thao tác</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={tableColumnCount}
                      className="text-center text-muted py-5"
                    >
                      <span className="spinner-border spinner-border-sm me-2" />
                      Đang tải vị trí kho...
                    </td>
                  </tr>
                ) : locations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tableColumnCount}
                      className="text-center text-muted py-5"
                    >
                      <i className="bi bi-grid-3x3-gap fs-2 d-block mb-2" />
                      Chưa có vị trí kho phù hợp.
                    </td>
                  </tr>
                ) : (
                  locations.map((location, index) => {
                    const usedPercent = Math.min(
                      Number(
                        location.used_percent || 0
                      ),
                      100
                    );

                    return (
                      <tr
                        key={location.id}
                        className={
                          location.capacity_status === "full"
                            ? "table-danger"
                            : location.capacity_status ===
                                "warning"
                              ? "table-warning"
                              : ""
                        }
                      >
                        <td>{index + 1}</td>

                        <td>
                          {location.warehouse_name}
                        </td>

                        <td>
                          <strong>
                            {location.location_code}
                          </strong>
                        </td>

                        <td>
                          {location.location_name}
                        </td>

                        <td className="text-nowrap">
                          <strong>
                            {formatNumber(
                              location.max_containers
                            )}
                          </strong>{" "}
                          container
                        </td>

                        <td className="text-nowrap">
                          {formatNumber(
                            location.used_containers
                          )}{" "}
                          container
                        </td>

                        <td className="text-nowrap">
                          {formatNumber(
                            location.available_containers
                          )}{" "}
                          container
                        </td>

                        <td style={{ minWidth: "160px" }}>
                          <div className="d-flex justify-content-between small mb-1">
                            <span>
                              {Number(
                                location.used_percent || 0
                              )}
                              %
                            </span>

                            <span className="text-muted">
                              Cảnh báo{" "}
                              {Number(
                                location.warning_threshold_percent ||
                                  0
                              )}
                              %
                            </span>
                          </div>

                          <div
                            className="progress"
                            style={{ height: "7px" }}
                          >
                            <div
                              className={`progress-bar ${getProgressBarClass(
                                location
                              )}`}
                              style={{
                                width: `${usedPercent}%`,
                              }}
                            />
                          </div>
                        </td>

                        <td>
                          {getCapacityBadge(location)}
                        </td>

                        <td>
                          {getStatusBadge(location.status)}
                        </td>

                        {canManageLocation && (
                          <td className="text-nowrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary me-2"
                              onClick={() =>
                                navigate(
                                  `/warehouse-locations/${location.id}/edit`
                                )
                              }
                            >
                              Sửa
                            </button>

                            <button
                              type="button"
                              className={`btn btn-sm ${
                                location.status === "active"
                                  ? "btn-outline-danger"
                                  : "btn-outline-success"
                              }`}
                              onClick={() =>
                                handleToggleStatus(
                                  location
                                )
                              }
                            >
                              {location.status === "active"
                                ? "Khóa"
                                : "Mở khóa"}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="alert alert-info mb-0 mt-3">
            <strong>Ghi chú:</strong>{" "}
            Sức chứa được tính theo số container.
            Khi nhập kho, hệ thống kiểm tra vị trí còn
            đủ sức chứa hay không.
          </div>
        </div>
      </div>
    </div>
  );
}

export default WarehouseLocationListPage;