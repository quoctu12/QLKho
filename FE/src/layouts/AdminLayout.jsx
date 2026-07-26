import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function handleToggleSidebar() {
    setSidebarOpen((previous) => !previous);
  }

  return (
    <div className="admin-layout">
      <Sidebar isOpen={sidebarOpen} />

      <div
        className={`admin-main ${
          sidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        <Header onToggleSidebar={handleToggleSidebar} />

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;