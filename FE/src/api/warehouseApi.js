import axiosClient from "./axiosClient";

export async function getWarehouses() {
  const response = await axiosClient.get("/warehouses");
  return response.data.data;
}

export async function createWarehouse(warehouseData) {
  const response = await axiosClient.post(
    "/warehouses",
    warehouseData
  );

  return response.data;
}

export async function updateWarehouse(id, warehouseData) {
  const response = await axiosClient.put(
    `/warehouses/${id}`,
    warehouseData
  );

  return response.data;
}

export async function deleteWarehouse(id) {
  const response = await axiosClient.delete(
    `/warehouses/${id}`
  );

  return response.data;
}