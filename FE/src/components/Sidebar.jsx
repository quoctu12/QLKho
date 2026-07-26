import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Sidebar({ isOpen }) {
  const { user } = useAuth();

  const menuItems = [
    {
      path: "/dashboard",
      label: "Tổng quan",
      icon: "bi-grid",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/users",
      label: "Tài khoản",
      icon: "bi-people",
      roles: ["ADMIN"],
    },
    {
      path: "/products",
      label: "Sản phẩm",
      icon: "bi-box",
      roles: ["ADMIN", "MANAGER", "STAFF"],
    },
    {
      path: "/categories",
      label: "Danh mục",
      icon: "bi-tags",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/units",
      label: "Đơn vị tính",
      icon: "bi-rulers",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/packaging",
      label: "Quy cách đóng gói",
      icon: "bi-boxes",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/suppliers",
      label: "Nhà cung cấp",
      icon: "bi-truck",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/warehouses",
      label: "Kho",
      icon: "bi-building",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/warehouse-locations",
      label: "Vị trí lưu trữ",
      icon: "bi-geo-alt",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/storage-pricing",
      label: "Đơn giá lưu kho",
      icon: "bi-cash-coin",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/gates",
      label: "Cổng kho",
      icon: "bi-door-open",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/stock-ins",
      label: "Nhập kho",
      icon: "bi-box-arrow-in-down",
      roles: ["ADMIN", "MANAGER", "STAFF"],
    },
    {
      path: "/stock-outs",
      label: "Xuất kho",
      icon: "bi-box-arrow-up",
      roles: ["ADMIN", "MANAGER", "STAFF"],
    },
    {
      path: "/inventory",
      label: "Tồn kho",
      icon: "bi-clipboard-data",
      roles: ["ADMIN", "MANAGER", "STAFF"],
    },
    {
      path: "/reports",
      label: "Báo cáo",
      icon: "bi-bar-chart-line",
      roles: ["ADMIN", "MANAGER"],
    },
  ];

  const visibleMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <aside
      className={`sidebar ${
        isOpen ? "sidebar-show" : "sidebar-hide"
      }`}
    >
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <i className="bi bi-boxes" />
        </div>

        <div className="sidebar-brand-text">
          <h2>WMS</h2>
          <span>Quản lý kho bãi</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <i className={`bi ${item.icon}`} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;