import { useEffect, useState } from "react";
import { getUnits, createUnit, updateUnit, deleteUnit } from "../api/unitApi";

function UnitListPage() {
  const [units, setUnits] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUnits();
  }, []);

  async function handleDelete(unit) {
    const confirmed = window.confirm(
        `Bạn có chắc muốn xóa đơn vị tính "${unit.name}" không?`
    );

    if (!confirmed) {
        return;
    }

    try {
        const result = await deleteUnit(unit.id);

        alert(result.message);

        await loadUnits();

        if (editingId === unit.id) {
        handleCancelEdit();
        }
    } catch (err) {
        console.error("Lỗi xóa đơn vị tính:", err);

        alert(
        err.response?.data?.message ||
            "Không thể xóa đơn vị tính."
        );
    }
  }

  async function loadUnits() {
    try {
      setLoading(true);

      const data = await getUnits();
      setUnits(data);
    } catch (err) {
      console.error("Lỗi tải đơn vị tính:", err);
      setError("Không thể tải danh sách đơn vị tính.");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(unit) {
    setEditingId(unit.id);

    setFormData({
        name: unit.name || "",
        description: unit.description || "",
    });
  }

  function handleCancelEdit() {
    setEditingId(null);

    setFormData({
        name: "",
        description: "",
    });

    setError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) {
        setError("Vui lòng nhập tên đơn vị tính.");
        return;
    }

    try {
        setSaving(true);

        if (editingId) {
        await updateUnit(editingId, {
            name: formData.name.trim(),
            description: formData.description.trim(),
        });

        alert("Cập nhật đơn vị tính thành công.");
        } else {
        await createUnit({
            name: formData.name.trim(),
            description: formData.description.trim(),
        });

        alert("Thêm đơn vị tính thành công.");
        }

        setEditingId(null);

        setFormData({
        name: "",
        description: "",
        });

        await loadUnits();
    } catch (err) {
        console.error(err);

        setError(
        err.response?.data?.message ||
            "Không thể lưu đơn vị tính."
        );
    } finally {
        setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">Quản lý đơn vị tính</h1>
        <p className="text-muted mb-0">
          Quản lý các đơn vị như chai, thùng, hộp, gói và kilogram.
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
                {editingId ? "Sửa đơn vị tính" : "Thêm đơn vị tính"}
              </h5>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">
                    Tên đơn vị
                  </label>

                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ví dụ: Chai"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Mô tả
                  </label>

                  <textarea
                    name="description"
                    className="form-control"
                    rows="4"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Nhập mô tả đơn vị tính"
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
                        ? "Cập nhật"
                        : "Thêm đơn vị tính"}
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
                Danh sách đơn vị tính
              </h5>

              {loading ? (
                <p>Đang tải dữ liệu...</p>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tên đơn vị</th>
                        <th>Mô tả</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>

                    <tbody>
                      {units.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center text-muted"
                          >
                            Chưa có đơn vị tính.
                          </td>
                        </tr>
                      ) : (
                        units.map((unit) => (
                          <tr key={unit.id}>
                            <td>{unit.id}</td>
                            <td>{unit.name}</td>
                            <td>
                              {unit.description ||
                                "Không có mô tả"}
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-warning me-2"
                                    onClick={() => handleEdit(unit)}
                                >
                                    Sửa
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDelete(unit)}
                                >
                                    Xóa
                                </button>
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

export default UnitListPage;