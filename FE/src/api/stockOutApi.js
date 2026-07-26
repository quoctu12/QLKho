import axiosClient from "./axiosClient";

/*
|--------------------------------------------------------------------------
| Lấy danh sách phiếu xuất
|--------------------------------------------------------------------------
*/

export async function getStockOuts(params = {}) {
  const response = await axiosClient.get(
    "/stock-outs",
    {
      params,
    }
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết phiếu xuất
|--------------------------------------------------------------------------
*/

export async function getStockOutById(id) {
  const response = await axiosClient.get(
    `/stock-outs/${id}`
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Tạo phiếu xuất
|--------------------------------------------------------------------------
*/

export async function createStockOut(stockOutData) {
  const response = await axiosClient.post(
    "/stock-outs",
    stockOutData
  );

  return response.data;
}
