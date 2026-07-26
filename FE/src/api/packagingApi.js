import axiosClient from "./axiosClient";

export async function getPackaging() {
  const response = await axiosClient.get("/packaging");
  return response.data.data;
}

export async function getPackagingByProduct(productId) {
  const response = await axiosClient.get(`/packaging/product/${productId}`);
  return response.data.data;
}

export async function createPackaging(packagingData) {
  const response = await axiosClient.post("/packaging", packagingData);
  return response.data;
}

export async function updatePackaging(id, packagingData) {
  const response = await axiosClient.put(`/packaging/${id}`, packagingData);
  return response.data;
}

export async function deletePackaging(id) {
  const response = await axiosClient.delete(`/packaging/${id}`);
  return response.data;
}