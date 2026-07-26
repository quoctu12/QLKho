import { useState } from "react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import { loginUser } from "../api/authApi";
import { useAuth } from "../contexts/AuthContext";

function LoginPage() {
  const navigate = useNavigate();

  const {
    user,
    login,
    isAuthenticated,
  } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  function getHomePath(role) {
    if (role === "STAFF") {
      return "/products";
    }

    return "/dashboard";
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (
      !formData.email.trim() ||
      !formData.password
    ) {
      setError(
        "Vui lòng nhập email và mật khẩu."
      );

      return;
    }

    try {
      setLoading(true);

      const result = await loginUser({
        email: formData.email
          .trim()
          .toLowerCase(),

        password: formData.password,
      });

      /*
       * Backend trả về:
       * {
       *   success: true,
       *   data: {
       *     token,
       *     user
       *   }
       * }
       */
      const authData = result.data;

      if (
        !authData?.token ||
        !authData?.user
      ) {
        throw new Error(
          "Dữ liệu đăng nhập không hợp lệ."
        );
      }

      login(authData);

      navigate(
        getHomePath(authData.user.role),
        {
          replace: true,
        }
      );
    } catch (err) {
      console.error(
        "Lỗi đăng nhập:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Đăng nhập thất bại."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Trường hợp người dùng đã đăng nhập
   * nhưng truy cập lại trang /login.
   */
  if (isAuthenticated && user) {
    return (
      <Navigate
        to={getHomePath(user.role)}
        replace
      />
    );
  }

  return (
    <div
      className="
        min-vh-100
        d-flex
        align-items-center
        justify-content-center
        bg-light
        p-3
      "
    >
      <div
        className="card border-0 shadow"
        style={{
          width: "100%",
          maxWidth: 430,
        }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <div className="fs-1 text-primary mb-2">
              <i className="bi bi-box-seam" />
            </div>

            <h1 className="h3 mb-2">
              Đăng nhập
            </h1>

            <p className="text-muted mb-0">
              Hệ thống quản lý kho WMS
            </p>
          </div>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">
                Email
              </label>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-envelope" />
                </span>

                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@gmail.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">
                Mật khẩu
              </label>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-lock" />
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  className="form-control"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={loading}
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Ẩn mật khẩu"
                      : "Hiện mật khẩu"
                  }
                >
                  <i
                    className={`bi ${
                      showPassword
                        ? "bi-eye-slash"
                        : "bi-eye"
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-2" />
                  Đăng nhập
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <small className="text-muted">
              Tài khoản do quản trị viên cấp
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;