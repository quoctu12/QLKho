import axiosClient from "./axiosClient";

/*
|--------------------------------------------------------------------------
| Lấy danh sách phiếu nhập
|--------------------------------------------------------------------------
*/

export async function getStockIns(params = {}) {
  const response = await axiosClient.get(
    "/stock-ins",
    {
      params,
    }
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết phiếu nhập
|--------------------------------------------------------------------------
*/

export async function getStockInById(id) {
  const response = await axiosClient.get(
    `/stock-ins/${id}`
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Tạo phiếu nhập
|--------------------------------------------------------------------------
*/

export async function createStockIn(stockInData) {
  const response = await axiosClient.post(
    "/stock-ins",
    stockInData
  );

  return response.data;
}