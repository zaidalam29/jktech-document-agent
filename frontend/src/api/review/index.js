import api from "../axios";

export const addReview = (bookId, data) =>
  api.post(`/books/${bookId}/reviews`, data);

export const getReviews = (bookId) =>
  api.get(`/books/${bookId}/reviews`);
