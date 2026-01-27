// Save tokens + optional user data
export const setAuthData = ({ accessToken, refreshToken, user }) => {
  if (accessToken) {
    localStorage.setItem("accessToken", accessToken);
  }

  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }

  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
};

// Get access token
export const getToken = () => {
  return localStorage.getItem("accessToken");
};

// Get refresh token
export const getRefreshToken = () => {
  return localStorage.getItem("refreshToken");
};

// Clear everything related to auth
export const clearAuthData = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};


// ---- BACKWARD COMPATIBILITY ----
export const refreshToken = getRefreshToken;
export const clearTokens = clearAuthData;
