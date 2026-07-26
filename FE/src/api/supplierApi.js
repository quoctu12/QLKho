import axiosClient from "./axiosClient";

export async function getSuppliers() {
  const response = await axiosClient.get("/suppliers");
  return response.data.data;
}

export async function createSupplier(supplierData) {
  const response = await axiosClient.post("/suppliers", supplierData);
  return response.data;
}

export async function updateSupplier(id, supplierData) {
  const response = await axiosClient.put(`/suppliers/${id}`, supplierData);
  return response.data;
}

export async function deleteSupplier(id) {
  const response = await axiosClient.delete(`/suppliers/${id}`);
  return response.data;
}