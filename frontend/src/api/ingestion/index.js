import api from "../axios";

export const runIngestion = () =>
  api.post("/ingestion/run");

export const getIngestionStatus = () =>
  api.get("/ingestion/status");
