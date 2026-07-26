import axiosClient from "./axiosClient";

export async function getStoragePricing(params = {}) {
  const response = await axiosClient.get("/storage-pricing", {
    params,
  });

  return response.data.data;
}

export async function createStoragePricing(data) {
  const response = await axiosClient.post("/storage-pricing", data);

  return response.data;
}

export async function updateStoragePricingStatus(id, status) {
  const response = await axiosClient.patch(
    `/storage-pricing/${id}/status`,
    {
      status,
    }
  );

  return response.data;
}