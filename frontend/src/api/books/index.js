import api from "../axios";

/**
 * Common error handler
 */
const handleApiError = (error) => {
  if (error.response) {
    // Backend responded with error
    const message =
      error.response.data?.message ||
      error.response.data?.detail ||
      "Server error occurred";
    throw new Error(message);
  }

  if (error.request) {
    // Request made but no response
    throw new Error("Backend not reachable. Please try again later.");
  }

  // Something else
  throw new Error(error.message || "Unexpected error occurred");
};

/**
 * Validate numeric ID
 */
const validateId = (id) => {
  if (!id || isNaN(id)) {
    throw new Error("Invalid book ID");
  }
};

/**
 * Validate book payload
 */
const validateBookPayload = (data) => {
  if (!data) throw new Error("Book data is required");

  if (!data.title?.trim()) {
    throw new Error("Title is required");
  }

  if (!data.author?.trim()) {
    throw new Error("Author is required");
  }

  if (data.year_published) {
    const year = Number(data.year_published);
    if (isNaN(year) || year < 1000 || year > new Date().getFullYear() + 1) {
      throw new Error("Invalid year published");
    }
  }
};

/* ===========================
   API FUNCTIONS
=========================== */

export const getBooks = async () => {
  try {
    return await api.get("/books");
  } catch (error) {
    handleApiError(error);
  }
};

export const getBookById = async (id) => {
  try {
    validateId(id);
    return await api.get(`/books/${id}`);
  } catch (error) {
    handleApiError(error);
  }
};

export const addBook = async (data) => {
  try {
    validateBookPayload(data);
    return await api.post("/books", data);
  } catch (error) {
    handleApiError(error);
  }
};

export const updateBook = async (id, data) => {
  try {
    validateId(id);
    validateBookPayload(data);
    return await api.put(`/books/${id}`, data);
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteBook = async (id) => {
  try {
    validateId(id);
    return await api.delete(`/books/${id}`);
  } catch (error) {
    handleApiError(error);
  }
};

export const generateSummary = async (id) => {
  try {
    validateId(id);
    return await api.post(`/books/${id}/generate-summary`);
  } catch (error) {
    handleApiError(error);
  }
};

export const getBookSummary = async (id) => {
  try {
    validateId(id);
    return await api.get(`/books/${id}/summary`);
  } catch (error) {
    handleApiError(error);
  }
};
