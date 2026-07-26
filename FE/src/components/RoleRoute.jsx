import {
  Navigate,
  Outlet,
} from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (!allowedRoles.includes(user.role)) {
    const fallbackPath =
      user.role === "STAFF"
        ? "/products"
        : "/dashboard";

    return (
      <Navigate
        to={fallbackPath}
        replace
      />
    );
  }

  return <Outlet />;
}

export default RoleRoute;