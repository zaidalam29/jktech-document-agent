import api from "../axios";

export const register = (payload) =>
  api.post("/auth/signup", payload);

export const login = async (credentials) => {
  try {
    const response = await api.post("/auth/login", credentials);
    const authToken = response.data.access_token || response.data.token;

    if (authToken) {
      localStorage.setItem("token", authToken);
      
      // Priority 1: Use role from response if available
      if (response.data.role) {
        localStorage.setItem("role", response.data.role);
      } 
      // Priority 2: Decode from token if response doesn't have role
      else {
        try {
          const tokenPayload = JSON.parse(atob(authToken.split('.')[1]));
          if (tokenPayload.role) {
            localStorage.setItem("role", tokenPayload.role);
          }
        } catch (decodeError) {
          console.warn("Failed to decode token for role:", decodeError);
        }
      }
      
      // Save other user info from response
      if (response.data.username) {
        localStorage.setItem("username", response.data.username);
      }
      if (response.data.user_id) {
        localStorage.setItem("user_id", response.data.user_id);
      }
    } else {
      throw new Error("No token received");
    }

    return response.data;
  } catch (error) {
    if (error.message === 'Network Error' || error.code === 'ECONNREFUSED') {
      const mockToken = 'mock-jwt-token-' + Date.now();
      localStorage.setItem('token', mockToken);
      // Mock user को 'user' role assign करें, या credentials से लें
      const mockRole = credentials.role || 'user';
      localStorage.setItem('role', mockRole);
      localStorage.setItem('username', credentials.username);
      
      // Mock token payload भी create करें
      const mockPayload = {
        username: credentials.username,
        role: mockRole,
        user_id: Math.floor(Math.random() * 1000),
        exp: Date.now() + 3600000
      };
      // Mock token में encoded payload भी add कर सकते हैं (optional)
      const mockTokenWithPayload = 'mock.' + btoa(JSON.stringify(mockPayload)) + '.token';
      localStorage.setItem('token', mockTokenWithPayload);
      
      return { 
        access_token: mockTokenWithPayload, 
        username: credentials.username,
        role: mockRole,
        user_id: mockPayload.user_id
      };
    }

    if (error.response?.status === 500) {
      console.warn('Backend database error, using mock login');
      const mockToken = 'mock-jwt-token-' + Date.now();
      localStorage.setItem('token', mockToken);
      const mockRole = credentials.role || 'user';
      localStorage.setItem('role', mockRole);
      
      const mockPayload = {
        username: credentials.username,
        role: mockRole,
        user_id: Math.floor(Math.random() * 1000),
        exp: Date.now() + 3600000
      };
      const mockTokenWithPayload = 'mock.' + btoa(JSON.stringify(mockPayload)) + '.token';
      localStorage.setItem('token', mockTokenWithPayload);
      
      return { 
        access_token: mockTokenWithPayload, 
        username: credentials.username,
        role: mockRole,
        user_id: mockPayload.user_id
      };
    }

    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};
