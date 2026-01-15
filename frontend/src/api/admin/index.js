import api from "../axios";

// Users endpoints
export const getUsers = () =>
  api.get("/admin/users");

export const createUser = (userData) =>
  api.post("/admin/users", userData);

export const updateUser = (id, userData) =>
  api.put(`/admin/users/${id}`, userData);

export const deleteUser = (id) =>
  api.delete(`/admin/users/${id}`);

// Roles endpoints
export const getRoles = () =>
  api.get("/admin/users/roles");

// Role creation with query parameter
export const createRole = (roleName) =>
  api.post(`/admin/users/roles?role_name=${encodeURIComponent(roleName)}`);

export const deleteRole = (id) =>
  api.delete(`/admin/users/roles/${id}`);