import api from "../axios";

export const getRecommendations = (params) =>
  api.get("/recommendations", { params });
