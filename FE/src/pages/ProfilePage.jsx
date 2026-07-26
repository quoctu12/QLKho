import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../contexts/AuthContext";

function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState(user || null);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await axiosClient.get("/auth/profile");
      const responseData = response?.data ?? response;
      const profileData = responseData?.data || responseData?.user || responseData;

      const normalizedProfile = {
        id: profileData?.id || user?.id || "",
        full_name: profileData?.full_name || user?.full_name || "",
        email: profileData?.email || user?.email || "",
        role_id: profileData?.role_id || user?.role_id || "",
        role: profileData?.role || user?.role || "",
        status: profileData?.status || user?.status || "active",
        created_at: profileData?.created_at || "",
      };

      setProfile(normalizedProfile);
      setFullName(normalizedProfile.full_name);
    } catch (err) {
      console.error("Lỗi tải hồ sơ cá nhân:", err);

      if (user) {
        setProfile(user);
        setFullName(user.full_name || "");
      } else {
        setError(err.response?.data?.message || "Không thể tải thông tin hồ sơ cá nhân.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedFullName = fullName.trim();

    if (!normalizedFullName) {
      setError("Vui lòng nhập họ và tên.");
      setSuccess("");
      return;
    }

    if (normalizedFullName.length < 2) {
      setError("Họ và tên phải có ít nhất 2 ký tự.");
      setSuccess("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await axiosClient.put("/auth/profile", {
        full_name: normalizedFullName,
      });

      const responseData = response?.data ?? response;
      const updatedProfile = responseData?.data || responseData?.user || responseData;

      setProfile((previous) => ({
        ...previous,
        ...updatedProfile,
      }));

      setFullName(updatedProfile?.full_name || normalizedFullName);

      updateUser({
        ...updatedProfile,
        full_name: updatedProfile?.full_name || normalizedFullName,
      });

      setSuccess(responseData?.message || "Cập nhật hồ sơ thành công.");
    } catch (err) {
      console.error("Lỗi cập nhật hồ sơ:", err);

      setError(err.response?.data?.message || "Không thể cập nhật hồ sơ.");
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

  function getStatusName(status) {
    if (status === "active" || status === "ACTIVE" || status === 1 || status === "1") return "Đang hoạt động";
    if (status === "inactive" || status === "INACTIVE" || status === 0 || status === "0") return "Đã khóa";
    return status || "Không xác định";
  }

  function getStatusClass(status) {
    if (status === "active" || status === "ACTIVE" || status === 1 || status === "1") return "bg-success";
    return "bg-secondary";
  }

  function getInitials(fullNameValue) {
    if (!fullNameValue) return "U";

    const words = fullNameValue.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) return "U";
    if (words.length === 1) return words[0].charAt(0).toUpperCase();

    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  if (loading) {
    return <p>Đang tải hồ sơ cá nhân...</p>;
  }

  if (!profile) {
    return <div className="alert alert-warning">Không tìm thấy thông tin tài khoản.</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">Hồ sơ cá nhân</h1>
        <p className="text-muted mb-0">Xem và cập nhật thông tin tài khoản đang đăng nhập.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-5">
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                style={{ width: "96px", height: "96px", fontSize: "32px" }}
              >
                {getInitials(profile.full_name)}
              </div>

              <h5 className="mb-1">{profile.full_name || "Người dùng"}</h5>
              <p className="text-muted mb-3">{getRoleName(profile.role)}</p>
              <span className={`badge ${getStatusClass(profile.status)}`}>
                {getStatusName(profile.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-4">Thông tin tài khoản</h5>

              <form onSubmit={handleSubmit}>
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label">Họ và tên</label>

                    <input
                      type="text"
                      className="form-control"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      maxLength={100}
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input type="text" className="form-control bg-light" value={profile.email || ""} disabled />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Vai trò</label>
                    <input type="text" className="form-control bg-light" value={getRoleName(profile.role)} disabled />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Trạng thái</label>
                    <input type="text" className="form-control bg-light" value={getStatusName(profile.status)} disabled />
                  </div>

                  {profile.id && (
                    <div className="col-md-6">
                      <label className="form-label">Mã tài khoản</label>
                      <input type="text" className="form-control bg-light" value={profile.id} disabled />
                    </div>
                  )}
                </div>

                <div className="d-flex gap-2 mt-4">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <i className="bi bi-save me-2" />
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>

                  <button type="button" className="btn btn-outline-secondary" onClick={loadProfile} disabled={saving}>
                    <i className="bi bi-arrow-clockwise me-2" />
                    Tải lại
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;