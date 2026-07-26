import axiosClient from "./axiosClient";

export async function getUsers() {
  const response = await axiosClient.get("/users");
  return response.data.data;
}

export async function createUser(data) {
  const response = await axiosClient.post("/users", data);
  return response.data;
}

export async function updateUser(id, data) {
  const response = await axiosClient.put(`/users/${id}`, data);
  return response.data;
}

export async function updateUserStatus(id, status) {
  const response = await axiosClient.patch(
    `/users/${id}/status`,
    { status }
  );

  return response.data;
}

export async function resetUserPassword(id, newPassword) {
  const response = await axiosClient.patch(
    `/users/${id}/reset-password`,
    {
      new_password: newPassword,
    }
  );

  return response.data;
}