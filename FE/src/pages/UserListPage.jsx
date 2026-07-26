import { useEffect, useState } from "react";

import {
  createUser,
  getUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from "../api/userApi";

import { useAuth } from "../contexts/AuthContext";

const initialFormData = {
  full_name: "",
  email: "",
  password: "",
  role_id: "2",
  status: "active",
};

function UserListPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(initialFormData);

  const [editingUserId, setEditingUserId] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEditingCurrentUser =
    Number(editingUserId) === Number(currentUser?.id);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await getUsers();

      const userData = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.users)
            ? response.users
            : [];

      setUsers(userData);
    } catch (err) {
      console.error("Lỗi tải người dùng:", err);

      setError(
        err.response?.data?.message ||
          "Không thể tải danh sách tài khoản."
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
    setFormData(initialFormData);
    setEditingUserId(null);
  }

  function handleEdit(selectedUser) {
    setEditingUserId(selectedUser.id);

    setFormData({
      full_name: selectedUser.full_name || "",
      email: selectedUser.email || "",
      password: "",
      role_id: String(selectedUser.role_id || 2),
      status: selectedUser.status || "active",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedFullName = formData.full_name.trim();
    const normalizedEmail = formData.email.trim().toLowerCase();

    if (!normalizedFullName || !normalizedEmail || !formData.role_id) {
      setError("Vui lòng nhập đầy đủ thông tin tài khoản.");
      return;
    }

    if (normalizedFullName.length < 2) {
      setError("Họ và tên phải có ít nhất 2 ký tự.");
      return;
    }

    if (!editingUserId && formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    const payload = {
      full_name: normalizedFullName,
      email: normalizedEmail,
      role_id: Number(formData.role_id),
      status: formData.status,
    };

    if (isEditingCurrentUser) {
      payload.role_id = Number(currentUser.role_id);
      payload.status = currentUser.status || "active";
    }

    try {
      setSaving(true);

      let result;

      if (editingUserId) {
        result = await updateUser(editingUserId, payload);
      } else {
        result = await createUser({
          ...payload,
          password: formData.password,
        });
      }

      setSuccess(
        result?.message ||
          result?.data?.message ||
          (editingUserId
            ? "Cập nhật tài khoản thành công."
            : "Tạo tài khoản thành công.")
      );

      resetForm();
      await loadUsers();
    } catch (err) {
      console.error("Lỗi lưu tài khoản:", err);

      setError(
        err.response?.data?.message ||
          "Không thể lưu tài khoản."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(selectedUser) {
    const isCurrentUser =
      Number(selectedUser.id) === Number(currentUser?.id);

    if (isCurrentUser) {
      setError("Bạn không thể tự khóa tài khoản đang đăng nhập.");
      setSuccess("");
      return;
    }

    const nextStatus =
      selectedUser.status === "active"
        ? "inactive"
        : "active";

    const action =
      nextStatus === "active"
        ? "mở khóa"
        : "khóa";

    const confirmed = window.confirm(
      `Bạn có chắc muốn ${action} tài khoản ${selectedUser.full_name}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const result = await updateUserStatus(
        selectedUser.id,
        nextStatus
      );

      setSuccess(
        result?.message ||
          result?.data?.message ||
          `Đã ${action} tài khoản thành công.`
      );

      await loadUsers();
    } catch (err) {
      console.error("Lỗi thay đổi trạng thái tài khoản:", err);

      setError(
        err.response?.data?.message ||
          "Không thể thay đổi trạng thái tài khoản."
      );
    }
  }

  function openResetPassword(selectedUser) {
    setResetPasswordUser(selectedUser);
    setNewPassword("");
    setError("");
    setSuccess("");
  }

  function closeResetPasswordModal() {
    if (saving) return;

    setResetPasswordUser(null);
    setNewPassword("");
  }

  async function handleResetPassword(event) {
    event.preventDefault();

    if (!resetPasswordUser) return;

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      setSuccess("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const result = await resetUserPassword(
        resetPasswordUser.id,
        newPassword
      );

      setSuccess(
        result?.message ||
          result?.data?.message ||
          "Đặt lại mật khẩu thành công."
      );

      setResetPasswordUser(null);
      setNewPassword("");
    } catch (err) {
      console.error("Lỗi đặt lại mật khẩu:", err);

      setError(
        err.response?.data?.message ||
          "Không thể đặt lại mật khẩu."
      );
    } finally {
      setSaving(false);
    }
  }

  function getRoleName(role) {
    const roleNames = {
      ADMIN: "Quản trị viên",
      MANAGER: "Quản lý kho",
      STAFF: "Nhân viên kho",
    };

    return roleNames[role] || role || "Không xác định";
  }

  function getRoleBadge(role) {
    if (role === "ADMIN") return "bg-danger";
    if (role === "MANAGER") return "bg-primary";
    return "bg-secondary";
  }

  function formatDate(value) {
    if (!value) return "Không có";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Không hợp lệ";
    }

    return date.toLocaleDateString("vi-VN");
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">Quản lý tài khoản</h1>

        <p className="text-muted mb-0">
          Tạo tài khoản, phân quyền, khóa và đặt lại mật khẩu.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                {editingUserId ? "Cập nhật tài khoản" : "Thêm tài khoản"}
              </h5>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Họ và tên</label>

                  <input
                    type="text"
                    name="full_name"
                    className="form-control"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Nhập họ và tên"
                    maxLength={100}
                    disabled={saving}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email</label>

                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@gmail.com"
                    disabled={saving}
                  />
                </div>

                {!editingUserId && (
                  <div className="mb-3">
                    <label className="form-label">Mật khẩu</label>

                    <input
                      type="password"
                      name="password"
                      className="form-control"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Ít nhất 6 ký tự"
                      disabled={saving}
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Vai trò</label>

                  <select
                    name="role_id"
                    className="form-select"
                    value={formData.role_id}
                    onChange={handleChange}
                    disabled={saving || isEditingCurrentUser}
                  >
                    <option value="1">Quản trị viên</option>
                    <option value="3">Quản lý kho</option>
                    <option value="2">Nhân viên kho</option>
                  </select>

                  {isEditingCurrentUser && (
                    <div className="form-text text-warning">
                      Bạn không thể tự thay đổi vai trò của chính mình.
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Trạng thái</label>

                  <select
                    name="status"
                    className="form-select"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={saving || isEditingCurrentUser}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Đã khóa</option>
                  </select>

                  {isEditingCurrentUser && (
                    <div className="form-text text-warning">
                      Bạn không thể tự khóa tài khoản đang đăng nhập.
                    </div>
                  )}
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving
                      ? "Đang lưu..."
                      : editingUserId
                        ? "Cập nhật"
                        : "Tạo tài khoản"}
                  </button>

                  {editingUserId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetForm}
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

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">Danh sách tài khoản</h5>

              {loading ? (
                <p>Đang tải dữ liệu...</p>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Người dùng</th>
                        <th>Vai trò</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>

                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center text-muted">
                            Chưa có tài khoản.
                          </td>
                        </tr>
                      ) : (
                        users.map((listedUser) => {
                          const isCurrentUser =
                            Number(listedUser.id) === Number(currentUser?.id);

                          return (
                            <tr key={listedUser.id}>
                              <td>{listedUser.id}</td>

                              <td>
                                <div className="fw-semibold">
                                  {listedUser.full_name}
                                  {isCurrentUser && (
                                    <span className="badge bg-info text-dark ms-2">
                                      Bạn
                                    </span>
                                  )}
                                </div>

                                <div className="text-muted small">
                                  {listedUser.email}
                                </div>
                              </td>

                              <td>
                                <span className={`badge ${getRoleBadge(listedUser.role)}`}>
                                  {getRoleName(listedUser.role)}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`badge ${
                                    listedUser.status === "active"
                                      ? "bg-success"
                                      : "bg-dark"
                                  }`}
                                >
                                  {listedUser.status === "active"
                                    ? "Hoạt động"
                                    : "Đã khóa"}
                                </span>
                              </td>

                              <td>{formatDate(listedUser.created_at)}</td>

                              <td>
                                <div className="d-flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => handleEdit(listedUser)}
                                    disabled={saving}
                                  >
                                    Sửa
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-warning"
                                    onClick={() => openResetPassword(listedUser)}
                                    disabled={saving}
                                  >
                                    Đổi mật khẩu
                                  </button>

                                  <button
                                    type="button"
                                    className={`btn btn-sm ${
                                      listedUser.status === "active"
                                        ? "btn-outline-danger"
                                        : "btn-outline-success"
                                    }`}
                                    disabled={saving || isCurrentUser}
                                    onClick={() => handleToggleStatus(listedUser)}
                                    title={
                                      isCurrentUser
                                        ? "Không thể tự khóa tài khoản đang đăng nhập"
                                        : ""
                                    }
                                  >
                                    {listedUser.status === "active"
                                      ? "Khóa"
                                      : "Mở khóa"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {resetPasswordUser && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleResetPassword}>
                <div className="modal-header">
                  <h5 className="modal-title">Đặt lại mật khẩu</h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeResetPasswordModal}
                    disabled={saving}
                    aria-label="Đóng"
                  />
                </div>

                <div className="modal-body">
                  <p>
                    Tài khoản:{" "}
                    <strong>{resetPasswordUser.full_name}</strong>
                  </p>

                  <label className="form-label">Mật khẩu mới</label>

                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    autoFocus
                    disabled={saving}
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeResetPasswordModal}
                    disabled={saving}
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Đang xử lý..." : "Xác nhận"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserListPage;