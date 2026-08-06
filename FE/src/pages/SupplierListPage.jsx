import {
  useEffect,
  useState,
} from "react";

import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../api/supplierApi";

import { useAuth } from "../contexts/AuthContext";

function SupplierListPage() {
  const { user } = useAuth();

  const currentRole = String(
    user?.role || ""
  ).toUpperCase();

  const canCreateSupplier = [
    "ADMIN",
    "MANAGER",
    "STAFF",
  ].includes(currentRole);

  const canManageSupplier = [
    "ADMIN",
    "MANAGER",
  ].includes(currentRole);

  const [suppliers, setSuppliers] =
    useState([]);

  const [formData, setFormData] =
    useState({
      name: "",
      phone: "",
      address: "",
      email: "",
    });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [editingId, setEditingId] =
    useState(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Tải nhà cung cấp
  |--------------------------------------------------------------------------
  */

  async function loadSuppliers() {
    try {
      setLoading(true);
      setError("");

      const data =
        await getSuppliers();

      setSuppliers(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải nhà cung cấp:",
        err
      );

      setSuppliers([]);

      setError(
        err.response?.data?.message ||
          "Không thể tải danh sách nhà cung cấp."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Thay đổi biểu mẫu
  |--------------------------------------------------------------------------
  */

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  /*
  |--------------------------------------------------------------------------
  | Sửa nhà cung cấp
  |--------------------------------------------------------------------------
  */

  function handleEdit(supplier) {
    if (!canManageSupplier) {
      alert(
        "Bạn không có quyền sửa nhà cung cấp."
      );

      return;
    }

    setEditingId(supplier.id);

    setFormData({
      name: supplier.name || "",
      phone: supplier.phone || "",
      address:
        supplier.address || "",
      email: supplier.email || "",
    });

    setError("");
  }

  /*
  |--------------------------------------------------------------------------
  | Hủy sửa
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Lưu nhà cung cấp
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!canCreateSupplier) {
      setError(
        "Bạn không có quyền thêm nhà cung cấp."
      );

      return;
    }

    if (
      editingId &&
      !canManageSupplier
    ) {
      setError(
        "Bạn không có quyền cập nhật nhà cung cấp."
      );

      return;
    }

    if (!formData.name.trim()) {
      setError(
        "Vui lòng nhập tên nhà cung cấp."
      );

      return;
    }

    const email =
      formData.email.trim();

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      setError(
        "Email nhà cung cấp không hợp lệ."
      );

      return;
    }

    const payload = {
      name:
        formData.name.trim(),

      phone:
        formData.phone.trim(),

      address:
        formData.address.trim(),

      email,
    };

    try {
      setSaving(true);

      if (editingId) {
        await updateSupplier(
          editingId,
          payload
        );

        alert(
          "Cập nhật nhà cung cấp thành công."
        );
      } else {
        await createSupplier(
          payload
        );

        alert(
          "Thêm nhà cung cấp thành công."
        );
      }

      handleCancelEdit();

      await loadSuppliers();
    } catch (err) {
      console.error(
        "Lỗi lưu nhà cung cấp:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Không thể lưu nhà cung cấp."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Xóa nhà cung cấp
  |--------------------------------------------------------------------------
  */

  async function handleDelete(supplier) {
    if (!canManageSupplier) {
      alert(
        "Bạn không có quyền xóa nhà cung cấp."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa nhà cung cấp "${supplier.name}" không?`
      );

    if (!confirmed) {
      return;
    }

    try {
      const result =
        await deleteSupplier(
          supplier.id
        );

      alert(
        result?.message ||
          "Xóa nhà cung cấp thành công."
      );

      if (
        editingId ===
        supplier.id
      ) {
        handleCancelEdit();
      }

      await loadSuppliers();
    } catch (err) {
      console.error(
        "Lỗi xóa nhà cung cấp:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Không thể xóa nhà cung cấp."
      );
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">
          Nhà cung cấp
        </h1>

        <p className="text-muted mb-0">
          {canManageSupplier
            ? "Quản lý thông tin các đơn vị cung cấp hàng hóa."
            : "Xem và thêm nhà cung cấp mới phục vụ nhập kho."}
        </p>
      </div>

      {currentRole === "STAFF" && (
        <div className="alert alert-info">
          Bạn được thêm nhà cung cấp mới
          nhưng không được sửa hoặc xóa
          nhà cung cấp đã có.
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="row g-4">
        {/* Form thêm hoặc sửa */}
        {canCreateSupplier && (
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  {editingId
                    ? "Sửa nhà cung cấp"
                    : "Thêm nhà cung cấp"}
                </h5>

                <form
                  onSubmit={
                    handleSubmit
                  }
                >
                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="supplier-name"
                    >
                      Tên nhà cung cấp{" "}
                      <span className="text-danger">
                        *
                      </span>
                    </label>

                    <input
                      id="supplier-name"
                      type="text"
                      name="name"
                      className="form-control"
                      value={
                        formData.name
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Ví dụ: Công ty ABC"
                      disabled={saving}
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="supplier-phone"
                    >
                      Số điện thoại
                    </label>

                    <input
                      id="supplier-phone"
                      type="text"
                      name="phone"
                      className="form-control"
                      value={
                        formData.phone
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Ví dụ: 0901234567"
                      disabled={saving}
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="supplier-email"
                    >
                      Email
                    </label>

                    <input
                      id="supplier-email"
                      type="email"
                      name="email"
                      className="form-control"
                      value={
                        formData.email
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Ví dụ: abc@gmail.com"
                      disabled={saving}
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="supplier-address"
                    >
                      Địa chỉ
                    </label>

                    <textarea
                      id="supplier-address"
                      name="address"
                      className="form-control"
                      rows="3"
                      value={
                        formData.address
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Nhập địa chỉ nhà cung cấp"
                      disabled={saving}
                    />
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary flex-grow-1"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Đang lưu...
                        </>
                      ) : editingId ? (
                        "Cập nhật"
                      ) : (
                        "Thêm nhà cung cấp"
                      )}
                    </button>

                    {editingId &&
                      canManageSupplier && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={
                            handleCancelEdit
                          }
                          disabled={
                            saving
                          }
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

        {/* Danh sách */}
        <div
          className={
            canCreateSupplier
              ? "col-lg-8"
              : "col-lg-12"
          }
        >
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">
                  Danh sách nhà cung cấp
                </h5>

                <span className="badge bg-secondary">
                  {suppliers.length} nhà cung cấp
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
                        <th>
                          Tên nhà cung cấp
                        </th>
                        <th>Liên hệ</th>
                        <th>Địa chỉ</th>

                        {canManageSupplier && (
                          <th>Thao tác</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {suppliers.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={
                              canManageSupplier
                                ? 5
                                : 4
                            }
                            className="text-center text-muted py-4"
                          >
                            Chưa có nhà cung cấp.
                          </td>
                        </tr>
                      ) : (
                        suppliers.map(
                          (supplier) => (
                            <tr
                              key={
                                supplier.id
                              }
                            >
                              <td>
                                {supplier.id}
                              </td>

                              <td>
                                <strong>
                                  {
                                    supplier.name
                                  }
                                </strong>
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

                              {canManageSupplier && (
                                <td className="text-nowrap">
                                  <div className="d-flex gap-2 flex-nowrap">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-warning"
                                      onClick={() =>
                                        handleEdit(
                                          supplier
                                        )
                                      }
                                    >
                                      Sửa
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() =>
                                        handleDelete(
                                          supplier
                                        )
                                      }
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          )
                        )
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