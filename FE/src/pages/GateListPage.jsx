import { useEffect, useState } from "react";
import { getWarehouses } from "../api/warehouseApi";
import {
  getGates,
  createGate,
  updateGate,
  deleteGate,
} from "../api/gateApi";

function GateListPage() {
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

      const [gateData, warehouseData] = await Promise.all([
        getGates(),
        getWarehouses(),
      ]);

      setGates(gateData);
      setWarehouses(warehouseData);
    } catch (err) {
      console.error("Lỗi tải dữ liệu cổng kho:", err);
      setError("Không thể tải dữ liệu cổng kho.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleEdit(gate) {
    setEditingId(gate.id);

    setFormData({
      warehouse_id: String(gate.warehouse_id),
      name: gate.name || "",
      gate_type: gate.gate_type || "IN",
      description: gate.description || "",
    });

    setError("");
  }

  function handleCancelEdit() {
    setEditingId(null);

    setFormData({
      warehouse_id: "",
      name: "",
      gate_type: "IN",
      description: "",
    });

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!formData.warehouse_id || !formData.name.trim()) {
      setError("Vui lòng chọn kho và nhập tên cổng.");
      return;
    }

    const payload = {
      warehouse_id: Number(formData.warehouse_id),
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

      handleCancelEdit();
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
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa cổng "${gate.name}" không?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await deleteGate(gate.id);

      alert(result.message);
      await loadData();

      if (editingId === gate.id) {
        handleCancelEdit();
      }
    } catch (err) {
      console.error("Lỗi xóa cổng kho:", err);

      alert(
        err.response?.data?.message ||
          "Không thể xóa cổng kho."
      );
    }
  }

  function getGateTypeLabel(type) {
    if (type === "IN") return "Cổng nhập";
    if (type === "OUT") return "Cổng xuất";
    return "Nhập và xuất";
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">Quản lý cổng kho</h1>
        <p className="text-muted mb-0">
          Quản lý cổng nhập, cổng xuất và cổng dùng chung.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                {editingId ? "Sửa cổng kho" : "Thêm cổng kho"}
              </h5>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Kho</label>

                  <select
                    name="warehouse_id"
                    className="form-select"
                    value={formData.warehouse_id}
                    onChange={handleChange}
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
                  <label className="form-label">
                    Tên cổng
                  </label>

                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ví dụ: Cổng số 1"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Loại cổng
                  </label>

                  <select
                    name="gate_type"
                    className="form-select"
                    value={formData.gate_type}
                    onChange={handleChange}
                  >
                    <option value="IN">Cổng nhập</option>
                    <option value="OUT">Cổng xuất</option>
                    <option value="BOTH">
                      Cổng nhập và xuất
                    </option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Mô tả
                  </label>

                  <textarea
                    name="description"
                    className="form-control"
                    rows="3"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Nhập mô tả cổng kho"
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
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                Danh sách cổng kho
              </h5>

              {loading ? (
                <p>Đang tải dữ liệu...</p>
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
                        <th>Thao tác</th>
                      </tr>
                    </thead>

                    <tbody>
                      {gates.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="text-center text-muted"
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
                                className={`badge ${
                                  gate.gate_type === "IN"
                                    ? "bg-success"
                                    : gate.gate_type === "OUT"
                                    ? "bg-danger"
                                    : "bg-primary"
                                }`}
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