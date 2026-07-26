import axiosClient from "./axiosClient";

export async function getGates() {
  const response = await axiosClient.get("/gates");
  return response.data.data;
}

export async function createGate(gateData) {
  const response = await axiosClient.post("/gates", gateData);
  return response.data;
}

export async function updateGate(id, gateData) {
  const response = await axiosClient.put(`/gates/${id}`, gateData);
  return response.data;
}

export async function deleteGate(id) {
  const response = await axiosClient.delete(`/gates/${id}`);
  return response.data;
}