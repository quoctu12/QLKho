import axiosClient from "./axiosClient";

export async function getInventoryBatches(params = {}) {
  const response = await axiosClient.get(
    "/inventory/batches",
    {
      params,
    }
  );

  return response.data.data;
}

export async function getInventorySummary() {
  const response = await axiosClient.get(
    "/inventory/summary"
  );

  return response.data.data;
}

export async function getInventoryByProduct() {
  const response = await axiosClient.get(
    "/inventory/products"
  );

  return response.data.data;
}