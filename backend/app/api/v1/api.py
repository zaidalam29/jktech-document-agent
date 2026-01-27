from fastapi import APIRouter
from app.api.v1.endpoints import auth, books, reviews, summaries, admin, documents, ingestion, rag_status, qa, recommendations

api_router = APIRouter()

# Include auth routes
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(books.router, prefix="/books", tags=["Books"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])
api_router.include_router(summaries.router, prefix="/summaries", tags=["Summaries"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(ingestion.router, prefix="/ingestion", tags=["Ingestion"])
api_router.include_router(rag_status.router, prefix="/rag", tags=["RAG"])
api_router.include_router(qa.router, prefix="/qa", tags=["Q&A"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])