import { useEffect, useState } from "react";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../api/supplierApi";

function SupplierListPage() {
  const [suppliers, setSuppliers] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function handleDelete(supplier) {
    const confirmed = window.confirm(
        `Bạn có chắc muốn xóa nhà cung cấp "${supplier.name}" không?`
    );

    if (!confirmed) {
        return;
    }

    try {
        const result = await deleteSupplier(supplier.id);

        alert(result.message);
        await loadSuppliers();

        if (editingId === supplier.id) {
        handleCancelEdit();
        }
    } catch (err) {
        console.error("Lỗi xóa nhà cung cấp:", err);

        alert(
        err.response?.data?.message ||
            "Không thể xóa nhà cung cấp."
        );
    }
  }

  function handleEdit(supplier) {
    setEditingId(supplier.id);

    setFormData({
        name: supplier.name || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        email: supplier.email || "",
    });

    setError("");
  }

  function handleCancelEdit() {
    setEditingId(null);

    setFormData({
        name: "",
        phone: "",
        address: "",
        email: "",
    });

    setError("");
  }

  async function loadSuppliers() {
    try {
      setLoading(true);

      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error("Lỗi tải nhà cung cấp:", err);
      setError("Không thể tải danh sách nhà cung cấp.");
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

 async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) {
        setError("Vui lòng nhập tên nhà cung cấp.");
        return;
    }

    const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        email: formData.email.trim(),
    };

    try {
        setSaving(true);

        if (editingId) {
        await updateSupplier(editingId, payload);
        alert("Cập nhật nhà cung cấp thành công.");
        } else {
        await createSupplier(payload);
        alert("Thêm nhà cung cấp thành công.");
        }

        setEditingId(null);

        setFormData({
        name: "",
        phone: "",
        address: "",
        email: "",
        });

        await loadSuppliers();
    } catch (err) {
        console.error("Lỗi lưu nhà cung cấp:", err);

        setError(
        err.response?.data?.message ||
            "Không thể lưu nhà cung cấp."
        );
    } finally {
        setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">
          Quản lý nhà cung cấp
        </h1>

        <p className="text-muted mb-0">
          Quản lý thông tin các đơn vị cung cấp hàng hóa.
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
                {editingId ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"}
              </h5>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">
                    Tên nhà cung cấp
                  </label>

                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ví dụ: Công ty ABC"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Số điện thoại
                  </label>

                  <input
                    type="text"
                    name="phone"
                    className="form-control"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Ví dụ: 0901234567"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Ví dụ: abc@gmail.com"
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
                    placeholder="Nhập địa chỉ nhà cung cấp"
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
                        : "Thêm nhà cung cấp"}
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
                Danh sách nhà cung cấp
              </h5>

              {loading ? (
                <p>Đang tải dữ liệu...</p>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tên nhà cung cấp</th>
                        <th>Liên hệ</th>
                        <th>Địa chỉ</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>

                    <tbody>
                      {suppliers.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="text-center text-muted"
                          >
                            Chưa có nhà cung cấp.
                          </td>
                        </tr>
                      ) : (
                        suppliers.map((supplier) => (
                          <tr key={supplier.id}>
                            <td>{supplier.id}</td>

                            <td>
                              <strong>{supplier.name}</strong>
                            </td>

                            <td>
                              <div>
                                {supplier.phone ||
                                  "Không có số điện thoại"}
                              </div>

                              <div className="text-muted small">
                                {supplier.email ||
                                  "Không có email"}
                              </div>
                            </td>

                            <td>
                              {supplier.address ||
                                "Không có địa chỉ"}
                            </td>

                            <td className="text-nowrap">
                                <div className="d-flex gap-2 flex-nowrap">
                                    <button
                                    type="button"
                                    className="btn btn-sm btn-outline-warning"
                                    onClick={() => handleEdit(supplier)}
                                    >
                                    Sửa
                                    </button>

                                    <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDelete(supplier)}
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

export default SupplierListPage;