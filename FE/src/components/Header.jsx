import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

function Header({ onToggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  function handleLogout() {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn đăng xuất không?"
    );

    if (!confirmed) {
      return;
    }

    logout();

    navigate("/login", {
      replace: true,
    });
  }

  function getPageTitle() {
    const pathname = location.pathname;

    if (pathname === "/dashboard") {
      return "Tổng quan hệ thống";
    }

    if (pathname === "/users") {
      return "Quản lý tài khoản";
    }

    if (pathname === "/products/create") {
      return "Thêm sản phẩm";
    }

    if (
      pathname.startsWith("/products/") &&
      pathname.endsWith("/edit")
    ) {
      return "Chỉnh sửa sản phẩm";
    }

    if (
      pathname.startsWith("/products/") &&
      pathname !== "/products/create"
    ) {
      return "Chi tiết sản phẩm";
    }

    if (pathname === "/products") {
      return "Quản lý sản phẩm";
    }

    if (pathname === "/categories") {
      return "Quản lý danh mục";
    }

    if (pathname === "/units") {
      return "Quản lý đơn vị tính";
    }

    if (pathname === "/packaging") {
      return "Quản lý quy cách đóng gói";
    }

    if (pathname === "/suppliers") {
      return "Quản lý nhà cung cấp";
    }

    if (pathname === "/warehouses") {
      return "Quản lý kho";
    }

    if (pathname === "/gates") {
      return "Quản lý cổng kho";
    }

    if (pathname === "/stock-ins/create") {
      return "Tạo phiếu nhập kho";
    }

    if (
      pathname.startsWith("/stock-ins/") &&
      pathname !== "/stock-ins/create"
    ) {
      return "Chi tiết phiếu nhập kho";
    }

    if (pathname === "/stock-ins") {
      return "Quản lý nhập kho";
    }

    if (pathname === "/stock-outs/create") {
      return "Tạo phiếu xuất kho";
    }

    if (
      pathname.startsWith("/stock-outs/") &&
      pathname !== "/stock-outs/create"
    ) {
      return "Chi tiết phiếu xuất kho";
    }

    if (pathname === "/stock-outs") {
      return "Quản lý xuất kho";
    }

    if (pathname === "/inventory") {
      return "Quản lý tồn kho";
    }

    if (pathname === "/reports") {
      return "Báo cáo kho";
    }

    if (pathname === "/profile") {
      return "Hồ sơ cá nhân";
    }

    return "Hệ thống quản lý kho";
  }

  function getRoleName(role) {
    const roleNames = {
      ADMIN: "Quản trị viên",
      MANAGER: "Quản lý kho",
      STAFF: "Nhân viên kho",
    };

    return (
      roleNames[role] ||
      role ||
      "Người dùng"
    );
  }

  function getInitials(fullName) {
    if (!fullName) {
      return "U";
    }

    const words = fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) {
      return "U";
    }

    if (words.length === 1) {
      return words[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      words[0].charAt(0) +
      words[words.length - 1].charAt(0)
    ).toUpperCase();
  }

  return (
    <header className="app-header bg-white border-bottom shadow-sm">
      <div className="d-flex align-items-center justify-content-between px-3 px-md-4 py-3">
        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
            onClick={onToggleSidebar}
            aria-label="Mở hoặc đóng thanh menu"
          >
            <i className="bi bi-list fs-5" />
          </button>

          <div>
            <h1 className="h5 mb-0">
              {getPageTitle()}
            </h1>

            <small className="text-muted">
              Hệ thống quản lý kho WMS
            </small>
          </div>
        </div>

        <div className="dropdown">
          <button
            type="button"
            className="btn border-0 p-0"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label="Mở menu người dùng"
          >
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                style={{
                  width: "42px",
                  height: "42px",
                  flexShrink: 0,
                }}
              >
                {getInitials(
                  user?.full_name
                )}
              </div>

              <div className="text-start d-none d-sm-block">
                <div className="fw-semibold text-dark">
                  {user?.full_name ||
                    "Người dùng"}
                </div>

                <div className="text-muted small">
                  {getRoleName(
                    user?.role
                  )}
                </div>
              </div>

              <i className="bi bi-chevron-down text-muted small d-none d-sm-inline" />
            </div>
          </button>

          <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
            <li>
              <div className="px-3 py-2">
                <div className="fw-semibold">
                  {user?.full_name ||
                    "Người dùng"}
                </div>

                <div className="text-muted small">
                  {user?.email ||
                    "Không có email"}
                </div>

                <div className="text-muted small">
                  {getRoleName(
                    user?.role
                  )}
                </div>
              </div>
            </li>

            <li>
              <hr className="dropdown-divider" />
            </li>

            <li>
              <button
                type="button"
                className="dropdown-item"
                onClick={() =>
                  navigate("/profile")
                }
              >
                <i className="bi bi-person me-2" />
                Hồ sơ cá nhân
              </button>
            </li>

            <li>
              <button
                type="button"
                className="dropdown-item text-danger"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right me-2" />
                Đăng xuất
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}

export default Header;