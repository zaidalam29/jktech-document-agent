import api from "../axios";

const mockUsers = [
    { id: 1, username: "zaid", email: "zaid@gmail.com", role: "SuperAdmin", status: "Active" },
    { id: 2, username: "rahul", email: "rahul@gmail.com", role: "Manager", status: "Active" },
    { id: 3, username: "neha", email: "neha@gmail.com", role: "Viewer", status: "Inactive" }
];

const mockRoles = [
    {
        id: 1,
        name: "SuperAdmin",
        description: "Has complete control over the system including user and role management",
        permissions: ["read", "write", "update", "delete", "manage_users", "manage_roles"]
    },
    {
        id: 2,
        name: "Manager",
        description: "Can manage daily operations and edit records but cannot manage system settings",
        permissions: ["read", "write", "update"]
    },
    {
        id: 3,
        name: "Viewer",
        description: "Can only view data without making any changes",
        permissions: ["read"]
    }
];


let nextUserId = 4;
let nextRoleId = 4;

const handleApiError = async (apiCall, mockResponse) => {
    try {
        return await apiCall();
    } catch (error) {
        if (error.message === 'Network Error' || error.code === 'ECONNREFUSED' ||
            error.response?.status === 500 || error.response?.status === 403) {
            console.warn('Backend not available or access denied, using mock data');
            return { data: mockResponse };
        }
        throw error;
    }
};

// Users API
export const getUsers = () => handleApiError(
    () => api.get("/admin/users"),
    mockUsers
);

export const createUser = (userData) => handleApiError(
    () => api.post("/admin/users", userData),
    (() => {
        const newUser = {
            id: nextUserId++,
            ...userData,
            status: 'Active'
        };
        mockUsers.push(newUser);
        return newUser;
    })()
);

export const updateUser = (id, userData) => handleApiError(
    () => api.put(`/admin/users/${id}`, userData),
    (() => {
        const index = mockUsers.findIndex(user => user.id === parseInt(id));
        if (index !== -1) {
            mockUsers[index] = { ...mockUsers[index], ...userData };
            return mockUsers[index];
        }
        return null;
    })()
);

export const deleteUser = (id) => handleApiError(
    () => api.delete(`/admin/users/${id}`),
    (() => {
        const index = mockUsers.findIndex(user => user.id === parseInt(id));
        if (index !== -1) {
            mockUsers.splice(index, 1);
            return { message: 'User deleted successfully' };
        }
        return null;
    })()
);

// Roles API
export const getRoles = () => handleApiError(
    () => api.get("/admin/roles"),
    mockRoles
);

export const createRole = (roleData) => handleApiError(
    () => api.post("/admin/roles", roleData),
    (() => {
        const newRole = {
            id: nextRoleId++,
            ...roleData
        };
        mockRoles.push(newRole);
        return newRole;
    })()
);

export const updateRole = (id, roleData) => handleApiError(
    () => api.put(`/admin/roles/${id}`, roleData),
    (() => {
        const index = mockRoles.findIndex(role => role.id === parseInt(id));
        if (index !== -1) {
            mockRoles[index] = { ...mockRoles[index], ...roleData };
            return mockRoles[index];
        }
        return null;
    })()
);

export const deleteRole = (id) => handleApiError(
    () => api.delete(`/admin/roles/${id}`),
    (() => {
        const index = mockRoles.findIndex(role => role.id === parseInt(id));
        if (index !== -1) {
            mockRoles.splice(index, 1);
            return { message: 'Role deleted successfully' };
        }
        return null;
    })()
);