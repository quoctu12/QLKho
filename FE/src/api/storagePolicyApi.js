import axiosClient from "./axiosClient";

/*
|--------------------------------------------------------------------------
| Lấy danh sách chính sách lưu kho
|--------------------------------------------------------------------------
*/

export async function getStoragePolicies(params = {}) {
  const response = await axiosClient.get(
    "/storage-policies",
    {
      params,
    }
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết chính sách lưu kho
|--------------------------------------------------------------------------
*/

export async function getStoragePolicyById(id) {
  const response = await axiosClient.get(
    `/storage-policies/${id}`
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Tạo chính sách lưu kho
|--------------------------------------------------------------------------
*/

export async function createStoragePolicy(payload) {
  const response = await axiosClient.post(
    "/storage-policies",
    payload
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Cập nhật chính sách lưu kho
|--------------------------------------------------------------------------
*/

export async function updateStoragePolicy(id, payload) {
  const response = await axiosClient.put(
    `/storage-policies/${id}`,
    payload
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Kích hoạt chính sách lưu kho
|--------------------------------------------------------------------------
*/

export async function activateStoragePolicy(id) {
  const response = await axiosClient.patch(
    `/storage-policies/${id}/activate`
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Ngừng áp dụng chính sách lưu kho
|--------------------------------------------------------------------------
*/

export async function deactivateStoragePolicy(id) {
  const response = await axiosClient.patch(
    `/storage-policies/${id}/deactivate`
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Xóa chính sách lưu kho
|--------------------------------------------------------------------------
*/

export async function deleteStoragePolicy(id) {
  const response = await axiosClient.delete(
    `/storage-policies/${id}`
  );

  return response.data;
}