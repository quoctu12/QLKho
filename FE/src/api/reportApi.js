import axiosClient from "./axiosClient";

/*
|--------------------------------------------------------------------------
| Tổng quan Dashboard
|--------------------------------------------------------------------------
*/

export async function getDashboardSummary() {
  const response = await axiosClient.get(
    "/reports/dashboard-summary"
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Báo cáo nhập xuất theo ngày
|--------------------------------------------------------------------------
*/

export async function getStockMovementReport(params = {}) {
  const response = await axiosClient.get(
    "/reports/stock-movement",
    {
      params,
    }
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Báo cáo tồn kho theo kho
|--------------------------------------------------------------------------
*/

export async function getInventoryByWarehouse(params = {}) {
  const response = await axiosClient.get(
    "/reports/inventory-by-warehouse",
    {
      params,
    }
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Báo cáo cảnh báo tồn kho
|--------------------------------------------------------------------------
*/

export async function getInventoryAlertReport(params = {}) {
  const response = await axiosClient.get(
    "/reports/inventory-alerts",
    {
      params,
    }
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Danh sách kho và sản phẩm dùng cho bộ lọc
|--------------------------------------------------------------------------
*/

export async function getReportFilterOptions() {
  const response = await axiosClient.get(
    "/reports/filter-options"
  );

  return response.data.data;
}