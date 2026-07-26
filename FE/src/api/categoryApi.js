import axiosClient from "./axiosClient";

export async function getCategories() {
  const response = await axiosClient.get("/categories");
  return response.data.data;
}

export async function createCategory(categoryData) {
  const response = await axiosClient.post("/categories", categoryData);
  return response.data;
}

export async function updateCategory(id, categoryData) {
  const response = await axiosClient.put(`/categories/${id}`, categoryData);
  return response.data;
}

export async function deleteCategory(id) {
  const response = await axiosClient.delete(`/categories/${id}`);
  return response.data;
}