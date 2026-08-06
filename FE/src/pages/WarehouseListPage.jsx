import { useEffect, useState } from "react";

import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "../api/warehouseApi";

import { useAuth } from "../contexts/AuthContext";

function WarehouseListPage() {
  const { user } = useAuth();

  const currentRole = String(
    user?.role || ""
  ).toUpperCase();

  const canManageWarehouse = [
    "ADMIN",
    "MANAGER",
  ].includes(currentRole);

  const [warehouses, setWarehouses] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWarehouses();
  }, []);

  async function loadWarehouses() {
    try {
      setLoading(true);
      setError("");

      const data = await getWarehouses();

      setWarehouses(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error("Lỗi tải kho:", err);

      setWarehouses([]);

      setError(
        err.response?.data?.message ||
          "Không thể tải danh sách kho."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setEditingId(null);

    setFormData({
      name: "",
      address: "",
      description: "",
    });
  }

  function handleEdit(warehouse) {
    if (!canManageWarehouse) {
      alert("Bạn không có quyền sửa kho.");
      return;
    }

    setEditingId(warehouse.id);

    setFormData({
      name: warehouse.name || "",
      address: warehouse.address || "",
      description: warehouse.description || "",
    });

    setError("");
  }

  function handleCancelEdit() {
    resetForm();
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!canManageWarehouse) {
      setError(
        "Bạn không có quyền thêm hoặc cập nhật kho."
      );
      return;
    }

    if (!formData.name.trim()) {
      setError("Vui lòng nhập tên kho.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      description: formData.description.trim(),
    };

    try {
      setSaving(true);

      if (editingId) {
        await updateWarehouse(editingId, payload);
        alert("Cập nhật kho thành công.");
      } else {
        await createWarehouse(payload);
        alert("Thêm kho thành công.");
      }

      resetForm();
      await loadWarehouses();
    } catch (err) {
      console.error("Lỗi lưu kho:", err);

      setError(
        err.response?.data?.message ||
          "Không thể lưu thông tin kho."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(warehouse) {
    if (!canManageWarehouse) {
      alert("Bạn không có quyền xóa kho.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa kho "${warehouse.name}" không?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await deleteWarehouse(
        warehouse.id
      );

      alert(
        result?.message ||
          "Xóa kho thành công."
      );

      if (editingId === warehouse.id) {
        resetForm();
      }

      await loadWarehouses();
    } catch (err) {
      console.error("Lỗi xóa kho:", err);

      alert(
        err.response?.data?.message ||
          "Không thể xóa kho."
      );
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">
          {canManageWarehouse
            ? "Quản lý kho"
            : "Danh sách kho"}
        </h1>

        <p className="text-muted mb-0">
          {canManageWarehouse
            ? "Quản lý thông tin các kho trong hệ thống."
            : "Xem thông tin các kho phục vụ nghiệp vụ nhập xuất."}
        </p>
      </div>

      {currentRole === "STAFF" && (
        <div className="alert alert-info">
          Bạn chỉ được xem danh sách kho, không được
          thêm, sửa hoặc xóa kho.
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="row g-4">
        {canManageWarehouse && (
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  {editingId ? "Sửa kho" : "Thêm kho"}
                </h5>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="warehouse-name"
                    >
                      Tên kho{" "}
                      <span className="text-danger">*</span>
                    </label>

                    <input
                      id="warehouse-name"
                      type="text"
                      name="name"
                      className="form-control"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Ví dụ: Kho trung tâm"
                      disabled={saving}
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="warehouse-address"
                    >
                      Địa chỉ
                    </label>

                    <textarea
                      id="warehouse-address"
                      name="address"
                      className="form-control"
                      rows="3"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Nhập địa chỉ kho"
                      disabled={saving}
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="warehouse-description"
                    >
                      Mô tả
                    </label>

                    <textarea
                      id="warehouse-description"
                      name="description"
                      className="form-control"
                      rows="3"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Nhập mô tả kho"
                      disabled={saving}
                    />
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary flex-grow-1"
                      disabled={saving}
                    >
                      {saving
                        ? "Đang lưu..."
                        : editingId
                          ? "Cập nhật kho"
                          : "Thêm kho"}
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
        )}

        <div
          className={
            canManageWarehouse
              ? "col-lg-8"
              : "col-lg-12"
          }
        >
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">
                  Danh sách kho
                </h5>

                <span className="badge bg-secondary">
                  {warehouses.length} kho
                </span>
              </div>

              {loading ? (
                <div className="text-center text-muted py-5">
                  <span className="spinner-border spinner-border-sm me-2" />
                  Đang tải dữ liệu...
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tên kho</th>
                        <th>Địa chỉ</th>
                        <th>Mô tả</th>

                        {canManageWarehouse && (
                          <th>Thao tác</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {warehouses.length === 0 ? (
                        <tr>
                          <td
                            colSpan={
                              canManageWarehouse ? 5 : 4
                            }
                            className="text-center text-muted py-4"
                          >
                            Chưa có kho.
                          </td>
                        </tr>
                      ) : (
                        warehouses.map((warehouse) => (
                          <tr key={warehouse.id}>
                            <td>{warehouse.id}</td>

                            <td>
                              <strong>{warehouse.name}</strong>
                            </td>

                            <td>
                              {warehouse.address ||
                                "Không có địa chỉ"}
                            </td>

                            <td>
                              {warehouse.description ||
                                "Không có mô tả"}
                            </td>

                            {canManageWarehouse && (
                              <td className="text-nowrap">
                                <div className="d-flex gap-2 flex-nowrap">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-warning"
                                    onClick={() =>
                                      handleEdit(warehouse)
                                    }
                                  >
                                    Sửa
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() =>
                                      handleDelete(warehouse)
                                    }
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            )}
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

export default WarehouseListPage;