import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

import { useAuth } from "./contexts/AuthContext";

import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import UserListPage from "./pages/UserListPage";

import ProductListPage from "./pages/ProductListPage";
import ProductCreatePage from "./pages/ProductCreatePage";
import ProductEditPage from "./pages/ProductEditPage";
import ProductDetailPage from "./pages/ProductDetailPage";

import CategoryListPage from "./pages/CategoryListPage";
import UnitListPage from "./pages/UnitListPage";
import PackagingListPage from "./pages/PackagingListPage";
import SupplierListPage from "./pages/SupplierListPage";

import WarehouseListPage from "./pages/WarehouseListPage";
import GateListPage from "./pages/GateListPage";
import WarehouseLocationListPage from "./pages/WarehouseLocationListPage";
import WarehouseLocationCreatePage from "./pages/WarehouseLocationCreatePage";
import WarehouseLocationEditPage from "./pages/WarehouseLocationEditPage";

import StoragePricingPage from "./pages/StoragePricingPage";
import StoragePolicyListPage from "./pages/StoragePolicyListPage";

import StockInListPage from "./pages/StockInListPage";
import StockInCreatePage from "./pages/StockInCreatePage";
import StockInDetailPage from "./pages/StockInDetailPage";

import StockOutListPage from "./pages/StockOutListPage";
import StockOutCreatePage from "./pages/StockOutCreatePage";
import StockOutDetailPage from "./pages/StockOutDetailPage";

import InventoryPage from "./pages/InventoryPage";
import ReportPage from "./pages/ReportPage";

function HomeRedirect() {
  const {
    user,
    isAuthenticated,
  } = useAuth();

  if (
    !isAuthenticated ||
    !user
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const currentRole = String(
    user.role || ""
  ).toUpperCase();

  const homePath =
    currentRole === "STAFF"
      ? "/products"
      : "/dashboard";

  return (
    <Navigate
      to={homePath}
      replace
    />
  );
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        element={<ProtectedRoute />}
      >
        <Route
          element={<AdminLayout />}
        >
          {/* Chỉ ADMIN */}
          <Route
            element={
              <RoleRoute
                allowedRoles={[
                  "ADMIN",
                ]}
              />
            }
          >
            <Route
              path="/users"
              element={
                <UserListPage />
              }
            />
          </Route>

          {/* ADMIN, MANAGER và STAFF */}
          <Route
            element={
              <RoleRoute
                allowedRoles={[
                  "ADMIN",
                  "MANAGER",
                  "STAFF",
                ]}
              />
            }
          >
            <Route
              path="/profile"
              element={
                <ProfilePage />
              }
            />

            <Route
              path="/products"
              element={
                <ProductListPage />
              }
            />

            <Route
              path="/products/create"
              element={
                <ProductCreatePage />
              }
            />

            <Route
              path="/products/:id"
              element={
                <ProductDetailPage />
              }
            />

            <Route
              path="/suppliers"
              element={
                <SupplierListPage />
              }
            />

            <Route
              path="/warehouses"
              element={
                <WarehouseListPage />
              }
            />

            <Route
              path="/gates"
              element={
                <GateListPage />
              }
            />

            <Route
              path="/warehouse-locations"
              element={
                <WarehouseLocationListPage />
              }
            />

            <Route
              path="/storage-pricing"
              element={
                <StoragePricingPage />
              }
            />

            <Route
              path="/storage-policies"
              element={
                <StoragePolicyListPage />
              }
            />

            <Route
              path="/stock-ins"
              element={
                <StockInListPage />
              }
            />

            <Route
              path="/stock-ins/create"
              element={
                <StockInCreatePage />
              }
            />

            <Route
              path="/stock-ins/:id"
              element={
                <StockInDetailPage />
              }
            />

            <Route
              path="/stock-outs"
              element={
                <StockOutListPage />
              }
            />

            <Route
              path="/stock-outs/create"
              element={
                <StockOutCreatePage />
              }
            />

            <Route
              path="/stock-outs/:id"
              element={
                <StockOutDetailPage />
              }
            />

            <Route
              path="/inventory"
              element={
                <InventoryPage />
              }
            />
          </Route>

          {/* Chỉ ADMIN và MANAGER */}
          <Route
            element={
              <RoleRoute
                allowedRoles={[
                  "ADMIN",
                  "MANAGER",
                ]}
              />
            }
          >
            <Route
              path="/dashboard"
              element={
                <DashboardPage />
              }
            />

            <Route
              path="/products/:id/edit"
              element={
                <ProductEditPage />
              }
            />

            <Route
              path="/categories"
              element={
                <CategoryListPage />
              }
            />

            <Route
              path="/units"
              element={
                <UnitListPage />
              }
            />

            <Route
              path="/packaging"
              element={
                <PackagingListPage />
              }
            />

            <Route
              path="/warehouse-locations/create"
              element={
                <WarehouseLocationCreatePage />
              }
            />

            <Route
              path="/warehouse-locations/:id/edit"
              element={
                <WarehouseLocationEditPage />
              }
            />

            <Route
              path="/reports"
              element={
                <ReportPage />
              }
            />
          </Route>
        </Route>
      </Route>

      <Route
        path="/"
        element={<HomeRedirect />}
      />

      <Route
        path="*"
        element={<HomeRedirect />}
      />
    </Routes>
  );
}

export default App;