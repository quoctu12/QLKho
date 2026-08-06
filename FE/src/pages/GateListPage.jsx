import { useEffect, useState } from "react";

import { getWarehouses } from "../api/warehouseApi";

import {
  getGates,
  createGate,
  updateGate,
  deleteGate,
} from "../api/gateApi";

import { useAuth } from "../contexts/AuthContext";

function GateListPage() {
  const { user } = useAuth();

  const currentRole = String(
    user?.role || ""
  ).toUpperCase();

  const canManageGate = [
    "ADMIN",
    "MANAGER",
  ].includes(currentRole);

  const [gates, setGates] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [formData, setFormData] = useState({
    warehouse_id: "",
    name: "",
    gate_type: "IN",
    description: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [gateData, warehouseData] =
        await Promise.all([
          getGates(),
          getWarehouses(),
        ]);

      setGates(
        Array.isArray(gateData) ? gateData : []
      );

      setWarehouses(
        Array.isArray(warehouseData)
          ? warehouseData
          : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải dữ liệu cổng kho:",
        err
      );

      setGates([]);
      setWarehouses([]);

      setError(
        err.response?.data?.message ||
          "Không thể tải dữ liệu cổng kho."
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
      warehouse_id: "",
      name: "",
      gate_type: "IN",
      description: "",
    });
  }

  function handleEdit(gate) {
    if (!canManageGate) {
      alert("Bạn không có quyền sửa cổng kho.");
      return;
    }

    setEditingId(gate.id);

    setFormData({
      warehouse_id: String(
        gate.warehouse_id || ""
      ),
      name: gate.name || "",
      gate_type: gate.gate_type || "IN",
      description: gate.description || "",
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

    if (!canManageGate) {
      setError(
        "Bạn không có quyền thêm hoặc cập nhật cổng kho."
      );
      return;
    }

    if (
      !formData.warehouse_id ||
      !formData.name.trim()
    ) {
      setError(
        "Vui lòng chọn kho và nhập tên cổng."
      );
      return;
    }

    const payload = {
      warehouse_id: Number(
        formData.warehouse_id
      ),
      name: formData.name.trim(),
      gate_type: formData.gate_type,
      description: formData.description.trim(),
    };

    try {
      setSaving(true);

      if (editingId) {
        await updateGate(editingId, payload);
        alert("Cập nhật cổng kho thành công.");
      } else {
        await createGate(payload);
        alert("Thêm cổng kho thành công.");
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error("Lỗi lưu cổng kho:", err);

      setError(
        err.response?.data?.message ||
          "Không thể lưu thông tin cổng kho."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(gate) {
    if (!canManageGate) {
      alert("Bạn không có quyền xóa cổng kho.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa cổng "${gate.name}" không?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await deleteGate(gate.id);

      alert(
        result?.message ||
          "Xóa cổng kho thành công."
      );

      if (editingId === gate.id) {
        resetForm();
      }

      await loadData();
    } catch (err) {
      console.error("Lỗi xóa cổng kho:", err);

      alert(
        err.response?.data?.message ||
          "Không thể xóa cổng kho."
      );
    }
  }

  function getGateTypeLabel(type) {
    if (type === "IN") {
      return "Cổng nhập";
    }

    if (type === "OUT") {
      return "Cổng xuất";
    }

    return "Nhập và xuất";
  }

  function getGateTypeClass(type) {
    if (type === "IN") {
      return "bg-success";
    }

    if (type === "OUT") {
      return "bg-danger";
    }

    return "bg-primary";
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">
          {canManageGate
            ? "Quản lý cổng kho"
            : "Danh sách cổng kho"}
        </h1>

        <p className="text-muted mb-0">
          {canManageGate
            ? "Quản lý cổng nhập, cổng xuất và cổng dùng chung."
            : "Xem thông tin cổng nhập và cổng xuất của từng kho."}
        </p>
      </div>

      {currentRole === "STAFF" && (
        <div className="alert alert-info">
          Bạn chỉ được xem danh sách cổng kho,
          không được thêm, sửa hoặc xóa.
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="row g-4">
        {canManageGate && (
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  {editingId
                    ? "Sửa cổng kho"
                    : "Thêm cổng kho"}
                </h5>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="gate-warehouse"
                    >
                      Kho{" "}
                      <span className="text-danger">*</span>
                    </label>

                    <select
                      id="gate-warehouse"
                      name="warehouse_id"
                      className="form-select"
                      value={formData.warehouse_id}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">Chọn kho</option>

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

                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="gate-name"
                    >
                      Tên cổng{" "}
                      <span className="text-danger">*</span>
                    </label>

                    <input
                      id="gate-name"
                      type="text"
                      name="name"
                      className="form-control"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Ví dụ: Cổng số 1"
                      disabled={saving}
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="gate-type"
                    >
                      Loại cổng
                    </label>

                    <select
                      id="gate-type"
                      name="gate_type"
                      className="form-select"
                      value={formData.gate_type}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="IN">
                        Cổng nhập
                      </option>

                      <option value="OUT">
                        Cổng xuất
                      </option>

                      <option value="BOTH">
                        Cổng nhập và xuất
                      </option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="gate-description"
                    >
                      Mô tả
                    </label>

                    <textarea
                      id="gate-description"
                      name="description"
                      className="form-control"
                      rows="3"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Nhập mô tả cổng kho"
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
                          ? "Cập nhật cổng"
                          : "Thêm cổng"}
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
            canManageGate
              ? "col-lg-8"
              : "col-lg-12"
          }
        >
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">
                  Danh sách cổng kho
                </h5>

                <span className="badge bg-secondary">
                  {gates.length} cổng
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
                        <th>Kho</th>
                        <th>Tên cổng</th>
                        <th>Loại cổng</th>
                        <th>Mô tả</th>

                        {canManageGate && (
                          <th>Thao tác</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {gates.length === 0 ? (
                        <tr>
                          <td
                            colSpan={
                              canManageGate ? 6 : 5
                            }
                            className="text-center text-muted py-4"
                          >
                            Chưa có cổng kho.
                          </td>
                        </tr>
                      ) : (
                        gates.map((gate) => (
                          <tr key={gate.id}>
                            <td>{gate.id}</td>
                            <td>{gate.warehouse_name}</td>

                            <td>
                              <strong>{gate.name}</strong>
                            </td>

                            <td>
                              <span
                                className={`badge ${getGateTypeClass(
                                  gate.gate_type
                                )}`}
                              >
                                {getGateTypeLabel(
                                  gate.gate_type
                                )}
                              </span>
                            </td>

                            <td>
                              {gate.description ||
                                "Không có mô tả"}
                            </td>

                            {canManageGate && (
                              <td className="text-nowrap">
                                <div className="d-flex gap-2 flex-nowrap">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-warning"
                                    onClick={() =>
                                      handleEdit(gate)
                                    }
                                  >
                                    Sửa
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() =>
                                      handleDelete(gate)
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

export default GateListPage;