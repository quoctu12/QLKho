import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem("token"));

  function login(authData) {
    const { token: newToken, user: newUser } = authData;

    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  }

  function updateUser(updatedUser) {
    const mergedUser = {
      ...user,
      ...updatedUser,
    };

    localStorage.setItem("user", JSON.stringify(mergedUser));
    setUser(mergedUser);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        login,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth phải được dùng trong AuthProvider");
  }

  return context;
}