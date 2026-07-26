import { useEffect, useState } from "react";
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "../api/warehouseApi";

function WarehouseListPage() {
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
      const data = await getWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error("Lỗi tải kho:", err);
      setError("Không thể tải danh sách kho.");
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

  function handleEdit(warehouse) {
    setEditingId(warehouse.id);

    setFormData({
      name: warehouse.name || "",
      address: warehouse.address || "",
      description: warehouse.description || "",
    });

    setError("");
  }

  function handleCancelEdit() {
    setEditingId(null);

    setFormData({
      name: "",
      address: "",
      description: "",
    });

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

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

      setEditingId(null);

      setFormData({
        name: "",
        address: "",
        description: "",
      });

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
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa kho "${warehouse.name}" không?`
    );

    if (!confirmed) return;

    try {
      const result = await deleteWarehouse(warehouse.id);

      alert(result.message);
      await loadWarehouses();

      if (editingId === warehouse.id) {
        handleCancelEdit();
      }
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
        <h1 className="h4 mb-1">Quản lý kho</h1>
        <p className="text-muted mb-0">
          Quản lý thông tin các kho trong hệ thống.
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
                {editingId ? "Sửa kho" : "Thêm kho"}
              </h5>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">
                    Tên kho
                  </label>

                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ví dụ: Kho trung tâm"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Địa chỉ
                  </label>

                  <textarea
                    name="address"
                    className="form-control"
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Nhập địa chỉ kho"
                  />
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
                    placeholder="Nhập mô tả kho"
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
                Danh sách kho
              </h5>

              {loading ? (
                <p>Đang tải dữ liệu...</p>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tên kho</th>
                        <th>Địa chỉ</th>
                        <th>Mô tả</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>

                    <tbody>
                      {warehouses.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="text-center text-muted"
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