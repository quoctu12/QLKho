import axiosClient from "./axiosClient";

export async function loginUser(data) {
  const response = await axiosClient.post(
    "/auth/login",
    data
  );

  return response.data;
}

export async function getProfile() {
  const response = await axiosClient.get(
    "/auth/profile"
  );

  return response.data.data;
}
