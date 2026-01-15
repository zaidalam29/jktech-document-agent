import api from "../axios";

// Handle API errors consistently
const handleApiError = async (apiCall) => {
  try {
    return await apiCall();
  } catch (error) {
    const status = error.response?.status || null;
    let message = "Network Error";

    if (status === 400) message = "Bad Request";
    else if (status === 401) message = "Unauthorized";
    else if (status === 403) message = "Forbidden";
    else if (status === 404) message = "Not Found";
    else if (status === 500) message = "Internal Server Error";

    // Throw structured error for frontend
    throw { message, status, details: error.response?.data || error.message };
  }
};

// Get all documents
export const getDocuments = async () => {
  return handleApiError(() => api.get("/documents"));
};

// Upload a document with validation
export const uploadDocument = async (formData) => {
  const file = formData.get("file");

  // Basic validation
  if (!file) throw { message: "No file provided", status: 400 };
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  const maxSize = 20 * 1024 * 1024; // 20 MB max

  if (!allowedTypes.includes(file.type)) {
    throw { message: "Invalid file type", status: 415 };
  }
  if (file.size > maxSize) {
    throw { message: "File too large (max 20 MB)", status: 413 };
  }

  return handleApiError(() =>
    api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
};

// Delete a document by ID
export const deleteDocument = async (id) => {
  const docId = parseInt(id);
  if (isNaN(docId)) throw { message: "Invalid document ID", status: 400 };

  return handleApiError(() => api.delete(`/documents/${docId}`));
};

// Download a document by ID
export const downloadDocument = async (id) => {
  const docId = parseInt(id);
  if (isNaN(docId)) throw { message: "Invalid document ID", status: 400 };

  return handleApiError(() =>
    api.get(`/documents/${docId}/download`, { responseType: "blob" })
  );
};
