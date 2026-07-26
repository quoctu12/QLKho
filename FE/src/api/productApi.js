import axiosClient from "./axiosClient";

/*
|--------------------------------------------------------------------------
| Lấy danh sách sản phẩm
|--------------------------------------------------------------------------
|
| params có thể gồm:
| - page
| - limit
| - keyword
| - category_id
| - status
| - sort_by
|
*/

export async function getProducts(params = {}) {
  const response = await axiosClient.get(
    "/products",
    {
      params,
    }
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết sản phẩm
|--------------------------------------------------------------------------
*/

export async function getProductById(id) {
  const response = await axiosClient.get(
    `/products/${id}`
  );

  return response.data.data;
}

/*
|--------------------------------------------------------------------------
| Tạo sản phẩm
|--------------------------------------------------------------------------
*/

export async function createProduct(
  productData
) {
  const response = await axiosClient.post(
    "/products",
    productData
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Cập nhật sản phẩm
|--------------------------------------------------------------------------
*/

export async function updateProduct(
  id,
  productData
) {
  const response = await axiosClient.put(
    `/products/${id}`,
    productData
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Ngừng hoạt động sản phẩm
|--------------------------------------------------------------------------
*/

export async function deactivateProduct(
  id
) {
  const response =
    await axiosClient.patch(
      `/products/${id}/deactivate`
    );

  return response.data;
}