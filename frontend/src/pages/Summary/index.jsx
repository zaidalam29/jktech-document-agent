import { useState, useEffect } from "react";
import api from "../../api/axios";
import Swal from "sweetalert2";

export default function Summary() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await api.get("/documents");
      setDocuments(response.data || []);
    } catch (error) {
      console.error("Failed to load documents:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Documents",
        text: "Could not fetch documents from backend.",
      });
    }
  };

  const generateSummary = async () => {
    if (!selectedDocument) {
      Swal.fire({
        icon: "info",
        title: "Select a Document",
        text: "Please select a document to generate summary.",
      });
      return;
    }

    setLoading(true);
    setSummary("");

    try {
      const response = await api.post(`/documents/${selectedDocument}/summary`);
      setSummary(response.data.summary || response.data.message || "Summary generated successfully");
    } catch (error) {
      console.error("Summary generation failed:", error);

      // Mock fallback
      const selectedDoc = documents.find(doc => doc.id == selectedDocument);
      const filename = selectedDoc?.filename || 'document';
      const mockSummary = `Summary of "${filename}":\n\nThis is a mock summary for development.`;
      setSummary(mockSummary);

      Swal.fire({
        icon: "warning",
        title: "Backend Error",
        text: "Failed to generate summary, showing mock data.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container my-5">
      <div className="card shadow-sm p-4">
        <h2 className="mb-3 text-center">Document Summary Generator</h2>

        {/* Document Selector */}
        <div className="mb-3">
          <label htmlFor="document-select" className="form-label">
            Select Document:
          </label>
          <select
            id="document-select"
            className="form-select"
            value={selectedDocument}
            onChange={(e) => setSelectedDocument(e.target.value)}
            disabled={loading}
          >
            <option value="">Choose a document...</option>
            {documents.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.filename}
              </option>
            ))}
          </select>
        </div>

        {/* Generate Summary Button */}
        <button
          className="btn btn-primary w-100 mb-4"
          onClick={generateSummary}
          disabled={loading || !selectedDocument}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Generating Summary...
            </>
          ) : (
            "Generate Summary"
          )}
        </button>

        {/* Generated Summary */}
        {summary && (
          <div className="card p-3 shadow-sm bg-light">
            <h5>Generated Summary</h5>
            <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
