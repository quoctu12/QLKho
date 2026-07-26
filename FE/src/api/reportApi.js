import axiosClient from "./axiosClient";

export async function getDashboardSummary() {
  const response = await axiosClient.get(
    "/reports/dashboard-summary"
  );

  return response.data.data;
}

export async function getStockMovementReport(params = {}) {
  const response = await axiosClient.get(
    "/reports/stock-movement",
    {
      params,
    }
  );

  return response.data.data;
}

export async function getInventoryByWarehouse() {
  const response = await axiosClient.get(
    "/reports/inventory-by-warehouse"
  );

  return response.data.data;
}