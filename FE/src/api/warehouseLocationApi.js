import axiosClient from "./axiosClient";

/*
|--------------------------------------------------------------------------
| Lấy danh sách vị trí kho
|--------------------------------------------------------------------------
*/

export async function getWarehouseLocations(params = {}) {
  const response = await axiosClient.get(
    "/warehouse-locations",
    {
      params,
    }
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết vị trí kho
|--------------------------------------------------------------------------
*/

export async function getWarehouseLocationById(id) {
  const response = await axiosClient.get(
    `/warehouse-locations/${id}`
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Tạo vị trí kho
|--------------------------------------------------------------------------
*/

export async function createWarehouseLocation(data) {
  const response = await axiosClient.post(
    "/warehouse-locations",
    data
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Cập nhật vị trí kho
|--------------------------------------------------------------------------
*/

export async function updateWarehouseLocation(id, data) {
  const response = await axiosClient.put(
    `/warehouse-locations/${id}`,
    data
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Khóa / mở khóa vị trí kho
|--------------------------------------------------------------------------
*/

export async function updateWarehouseLocationStatus(id, status) {
  const response = await axiosClient.patch(
    `/warehouse-locations/${id}/status`,
    {
      status,
    }
  );

  return response.data;
}