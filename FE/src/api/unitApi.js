import axiosClient from "./axiosClient";

export async function getUnits() {
  const response = await axiosClient.get("/units");
  return response.data.data;
}

export async function createUnit(unitData) {
  const response = await axiosClient.post("/units", unitData);
  return response.data;
}

export async function updateUnit(id, unitData) {
  const response = await axiosClient.put(`/units/${id}`, unitData);
  return response.data;
}

export async function deleteUnit(id) {
  const response = await axiosClient.delete(`/units/${id}`);
  return response.data;
}