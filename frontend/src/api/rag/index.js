import api from "../axios";

// Mock RAG responses for development
const mockSearchResults = [
  {
    id: 1,
    title: "How the Internet Works",
    content: "The internet is a global network of computers that communicate using standardized protocols. When you open a website, your request travels through multiple servers using DNS, HTTP/HTTPS, and TCP/IP before the response is sent back to your browser.",
    source: "networking_basics.pdf",
    score: 0.91,
    metadata: {
      page: 5,
      chapter: "Chapter 1: Internet Fundamentals"
    }
  },
  {
    id: 2,
    title: "Healthy Lifestyle Habits",
    content: "A healthy lifestyle includes balanced nutrition, regular physical activity, proper sleep, and stress management. These habits improve physical health, mental well-being, and overall quality of life.",
    source: "health_guidebook.pdf",
    score: 0.88,
    metadata: {
      page: 12,
      chapter: "Chapter 2: Daily Wellness"
    }
  },
  {
    id: 3,
    title: "Basics of Financial Planning",
    content: "Financial planning is the process of managing income, expenses, savings, and investments to achieve long-term financial stability and personal goals such as buying a house or retirement.",
    source: "finance_basics.pdf",
    score: 0.85,
    metadata: {
      page: 20,
      chapter: "Chapter 3: Personal Finance"
    }
  }
];


const handleApiError = async (apiCall, mockResponse) => {
  try {
    return await apiCall();
  } catch (error) {
    if (error.message === 'Network Error' || error.code === 'ECONNREFUSED' || 
        error.response?.status === 500 || error.response?.status === 404 || error.response?.status === 403) {
      console.warn('Backend not available, using mock RAG data');
      return { data: mockResponse };
    }
    throw error;
  }
};

export const searchRAG = (query, options = {}) => handleApiError(
  () => api.post("/rag/search", { 
    query, 
    max_results: options.maxResults || 10,
    threshold: options.threshold || 0.7
  }),
  query ? mockSearchResults.filter(result => 
    result.content.toLowerCase().includes(query.toLowerCase()) ||
    result.title.toLowerCase().includes(query.toLowerCase())
  ) : mockSearchResults
);

export const generateAnswer = (query, context) => handleApiError(
  () => api.post("/rag/generate", { query, context }),
  {
    answer: `Based on the provided context, ${query.toLowerCase().includes('what') ? 'here is what I found' : 'the answer is'}: This is a generated response based on the search results. The information comes from multiple sources in your document collection.`,
    sources: context.map(item => item.source),
    confidence: 0.85
  }
);

export const getRAGStats = () => handleApiError(
  () => api.get("/rag/stats"),
  {
    total_documents: 1234,
    indexed_documents: 1200,
    total_embeddings: 45678,
    last_updated: new Date().toISOString(),
    index_status: "healthy"
  }
);

export const rebuildIndex = () => handleApiError(
  () => api.post("/rag/rebuild-index"),
  {
    message: "Index rebuild started",
    job_id: "rebuild_" + Date.now(),
    estimated_time: "5-10 minutes"
  }
);