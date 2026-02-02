# JKTech Document Intelligence & Q&A System

**Author:** Zaid Alam
**Role:** Full Stack Developer & Generative AI/ML Engineer

This project features a comprehensive **full-stack platform for document intelligence**, offering **AI-driven search and content summarization**.
It includes a **backend built with FastAPI and PostgreSQL** and a **frontend using React and Nginx**, all fully dockerized for both local development and deployment.
---

## Table of Contents

1. [Overview](#overview)
2. [Core Modules](#core-modules)
3. [API Documentation](#api-documentation)
4. [Project Setup](#project-setup)
5. [Docker & Docker Compose](#docker--docker-compose)
6. [CI/CD](#cicd)
7. [Tech Stack](#tech-stack)
8. [Frontend Features](#frontend-features)
9. [Folder Structure](#folder-structure)
10. [Test Cases](#test-cases)

---

## Overview

The backend manages **books, reviews, users, and documents** with **RAG-based AI search**.
All documents are stored locally and indexed for **semantic retrieval**.

Frontend is a **React application** served via **Nginx** with environment-based configuration to connect with the backend.


---

## Core Modules

### Backend Modules

#### Book Management

* Create, update, view, delete books
* AI-generated summaries
* Related book recommendations

#### Review Management

* Add & retrieve book reviews
* AI-based summary of reviews

#### Intelligent Search (RAG)

* Semantic search using embeddings
* Automatic reindexing on content changes

#### User Access Control

* JWT authentication
* Role-based authorization

#### Document Handling

* Upload, download, delete documents
* Local storage for files

---

### Frontend Features

* Responsive UI (mobile + desktop)
* JWT-based login system
* Dashboard showing books, documents, and statistics
* Book detail view with AI summary
* Upload & download documents
* AI-powered semantic search
* Admin panel for user management

**Environment Variables (frontend)**:

```env
REACT_APP_API_URL=http://localhost:8000
```

> Rebuild frontend after changing environment variables:

```bash
docker-compose build frontend
```

---

## API Documentation

* Swagger UI: `http://localhost:8000/docs`
* ReDoc: `http://localhost:8000/redoc`

### Main Endpoints
# Book Management System API

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/signup` | Register new user | No |
| POST | `/api/v1/auth/login` | Login and get JWT token | No |
| POST | `/api/v1/auth/logout` | Logout user | Yes |
| GET | `/api/v1/auth/me` | Get current user info | Yes |
| GET | `/api/v1/auth/users/details` | Get detailed user info | Yes |

### Book Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/books` | Create new book with AI summary | Yes |
| GET | `/api/v1/books` | Get all books with filters | No |
| GET | `/api/v1/books/my-books` | Get books created by current user | Yes |
| GET | `/api/v1/books/{book_id}` | Get specific book | No |
| PUT | `/api/v1/books/{book_id}` | Update book | Yes |
| DELETE | `/api/v1/books/{book_id}` | Delete book | Yes |
| GET | `/api/v1/books/{book_id}/details` | Get book with reviews | No |
| POST | `/api/v1/books/{book_id}/generate-summary` | Generate AI summary | Yes |
| POST | `/api/v1/books/{book_id}/regenerate-summary` | Regenerate AI summary | Yes |
| POST | `/api/v1/books/{book_id}/reindex` | Reindex for search | Yes |
| GET | `/api/v1/books/{book_id}/summary-info` | Get summary info | No |
| GET | `/api/v1/books/stats/count` | Get total books count | No |

### Review Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/reviews` | Create review | Yes |
| POST | `/api/v1/books/{book_id}/reviews` | Add review to book | Yes |
| GET | `/api/v1/reviews/book/{book_id}` | Get book reviews | No |
| GET | `/api/v1/reviews/my-reviews` | Get user's reviews | Yes |
| GET | `/api/v1/reviews/{review_id}` | Get specific review | No |
| PUT | `/api/v1/reviews/{review_id}` | Update review | Yes |
| DELETE | `/api/v1/reviews/{review_id}` | Delete review | Yes |
| GET | `/api/v1/reviews/book/{book_id}/summary` | Get review statistics | No |
| GET | `/api/v1/books/{book_id}/summary` | AI summary of reviews | No |

### Search & Indexing
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/search` | Semantic search | No |
| POST | `/api/v1/search` | Advanced search | No |
| POST | `/api/v1/reindex-all` | Reindex all data | Yes |

### AI Summarization
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/summaries/book/{book_id}/summary` | AI review analysis | No |
| GET | `/api/v1/summaries/book/{book_id}/summary/quick` | Quick cached summary | No |
| POST | `/api/v1/summaries/book/{book_id}/summary/refresh` | Refresh AI analysis | No |
| GET | `/api/v1/summaries/book/{book_id}/summary/status` | Check summary status | No |
| GET | `/api/v1/summaries/batch` | Get multiple summaries | No |

### Document Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/documents/upload` | Upload document (PDF/TXT) | Yes |
| GET | `/api/v1/documents/` | Get all documents | Yes |
| GET | `/api/v1/documents/my-documents` | Get user's documents | Yes |
| GET | `/api/v1/documents/{document_id}` | Get specific document | Yes |
| DELETE | `/api/v1/documents/{document_id}` | Delete document | Yes |
| GET | `/api/v1/documents/{document_id}/download` | Download document | Yes |

### Ingestion Pipeline
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/ingestion/documents/{document_id}/ingest` | Start ingestion | Yes |
| GET | `/api/v1/ingestion/documents/{document_id}/ingestion-status` | Check status | Yes |
| GET | `/api/v1/ingestion/ingestion-jobs` | Get all jobs | Yes |

### Q&A System
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/qa/ask/{document_id}` | Ask document question | Yes |
| DELETE | `/api/v1/qa/document/{document_id}/rag` | Remove from RAG | Yes |
| GET | `/api/v1/rag/status` | Get RAG status | No |
| GET | `/api/v1/rag/documents` | Get RAG documents | No |

### Recommendations
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/recommendations/` | Personalized recommendations | Yes |
| GET | `/api/v1/recommendations/popular` | Popular books | Yes |
| GET | `/api/v1/recommendations/new` | New releases | Yes |
| POST | `/api/v1/recommendations/clear-cache` | Clear cache | Yes |
| GET | `/api/v1/recommendations/stats` | Get stats | Yes |

### Admin Operations
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/admin/users` | Create user | Yes (Admin) |
| GET | `/api/v1/admin/users` | Get all users | Yes (Admin) |
| PUT | `/api/v1/admin/users/{user_id}` | Update user | Yes (Admin) |
| DELETE | `/api/v1/admin/users/{user_id}` | Delete user | Yes (Admin) |
| GET | `/api/v1/admin/users/roles` | List roles | Yes (Admin) |
| POST | `/api/v1/admin/users/roles` | Create role | Yes (Admin) |
| PUT | `/api/v1/admin/users/{user_id}/roles` | Update roles | Yes (Admin) |
| PUT | `/api/v1/admin/users/{user_id}/toggle-active` | Toggle active status | Yes (Admin) |

### System Health
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Root endpoint | No |
| GET | `/health` | Health check | No |
| GET | `/ping` | Ping | No |
| GET | `/api/info` | API info | No |

## Authentication
**Token Format:** `Bearer <jwt_token>`

**Base URL:** `http://localhost:8000`

## Project Setup

### System Requirements

* Python 3.10+
* Node.js 18+
* Docker Desktop
* PostgreSQL (handled by Docker)
* OpenRouter API Key

---

### Installation

```bash
git clone <repository-url>
cd jktech-document-agent

# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Environment (.env)

#### Backend `.env`

```env
# Application
PROJECT_NAME=Book Management System
VERSION=1.0.0
API_V1_STR=/api/v1
DEBUG=true

# Database (PostgreSQL)
POSTGRES_SERVER=db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=db-password
POSTGRES_DB=db-name
POSTGRES_PORT=5432

# Leave DATABASE_URL empty - it will be auto-constructed
DATABASE_URL=

# Security
SECRET_KEY=secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

# Redis
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=redis123
# REDIS_DB=0

# AI Service (OpenRouter)
OPENROUTER_MODEL=meta-llama/llama-3-70b-instruct
OPENROUTER_API_KEY=yor-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=meta-llama/llama-3-70b-instruct
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7

# CORS
# BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://localhost:5174,http:localhost:3000,http://127.0.0.1:5174
BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:5173

FRONTEND_URL=http://localhost:5173
# Logging
LOG_LEVEL=INFO
```

#### Frontend `.env`

```env
# API Configuration
VITE_API_URL=http://localhost:8000/api/v1

# Environment
VITE_ENV=development
VITE_APP_NAME="Document QA System"
VITE_APP_VERSION=1.0.0

# Features
VITE_FEATURE_REGISTRATION=true
VITE_FEATURE_FILE_UPLOAD=true
VITE_FEATURE_DARK_MODE=true
VITE_FEATURE_MULTI_LANGUAGE=false

# Application Limits
VITE_MAX_UPLOAD_SIZE=10485760
VITE_SESSION_TIMEOUT=1800000
VITE_PAGE_SIZE=10
VITE_MAX_FILE_COUNT=10
VITE_AUTO_LOGOUT_MINUTES=60

# Logging
VITE_LOG_LEVEL=debug
VITE_ENABLE_CONSOLE_LOG=true

# Monitoring
VITE_SENTRY_DSN=
VITE_GOOGLE_ANALYTICS_ID=

# Development Flags
VITE_DEBUG=true
VITE_SHOW_DEV_TOOLS=true
VITE_USE_MOCK_API=false
VITE_MOCK_API_DELAY=500
```

---

## Run Project with Docker Compose

#### Docker docker-compose.yml File

```env
services:
  db:
    image: postgres:15
    container_name: jktech-postgres
    environment:
      POSTGRES_DB: bookdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: Badshahkhan@123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    container_name: jktech-backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    depends_on:
      - db
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    image: node:20-alpine  
    container_name: jktech-frontend
    working_dir: /app
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:5173"
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0 --port 5173"
    stdin_open: true
    tty: true
    depends_on:
      - backend


volumes:
  postgres_data:

```

---


```bash
# Stop old containers if running
docker-compose down -v

# Build and start
docker-compose up --build
```

* Backend: `http://localhost:8000`
* Frontend: `http://localhost:3000`

### Stop Containers

```bash
docker-compose down
```

### Test Backend Command

```bash
docker compose exec backend pytest
```
### Test Frontend Command

```bash
docker compose exec frontend npm test
```
---

## RAG Implementation

1. Text is converted into **vector embeddings**
2. Embeddings stored in memory for **fast semantic search**
3. On search, query vector is compared using **cosine similarity**
4. Relevant content is sent to **language model** for AI response

> Enables meaning-based search & reduces hallucinations.

---

## Docker Notes

* Backend: FastAPI + Uvicorn
* Database: PostgreSQL (docker volume persistent)
* Frontend: React build served via Nginx

---

## CI/CD (GitHub Actions)

* CI builds Docker images on **every push**
* CD deploys to server using SSH & docker-compose (pending server setup)
* Workflow path: `.github/workflows/ci.yml`

```yaml
# CI/CD snippet
- name: Build & Deploy
  run: docker-compose up --build -d
```

---

## Tech Stack

* **Backend:** FastAPI, SQLAlchemy, PostgreSQL, JWT
* **Frontend:** React, Axios, Nginx, Tailwind CSS
* **AI / RAG:** Sentence Transformers
* **DevOps:** Docker, Docker Compose, GitHub Actions

---

## Frontend Extra Features

* Responsive UI (mobile-first)
* Admin panel for users and roles
* AI document summaries
* Offline mode for testing

---

## Running Links

* Backend API Docs: `http://localhost:8000/docs`
* Dcoker Frontend Application: `http://localhost:3000`
* Local Frontend Application: `http://localhost:5173`

---

### Default Admin Login
- **Username:** `admin`  
- **Password:** `12345678`
---

## Test Cases

### Backend Test Case

## 🧪 Test Execution Summary

### Quick Stats
- **Total Tests**: 180
- **✅ Passed**: 178 (98.9%)
- **⏸️ Skipped**: 2 (1.1%)
- **❌ Failed**: 0
- **⏱️ Duration**: 27.99 seconds
- **🏗️ Test Framework**: pytest 9.0.2
- **🐍 Python Version**: 3.10.0

### Test Categories Breakdown
| Module | Tests | Passed | Skipped | Coverage |
|--------|-------|--------|---------|----------|
| Authentication | 19 | 19 | 0 | 100% |
| Admin Management | 18 | 18 | 0 | 100% |
| Books Management | 20 | 20 | 0 | 100% |
| Documents Management | 19 | 19 | 0 | 100% |
| Document Ingestion | 18 | 18 | 0 | 100% |
| Q&A System | 15 | 15 | 0 | 100% |
| RAG Status | 14 | 14 | 0 | 100% |
| Recommendations | 21 | 21 | 0 | 100% |
| Review Analysis | 14 | 12 | 2 | 85.7% |
| Reviews Management | 22 | 22 | 0 | 100% |

## 📊 Detailed Test Results

### Test Session Information


- platform linux -- Python 3.10.0, pytest-9.0.2, pluggy-1.6.0 -- /usr/local/bin/python
- cachedir: .pytest_cache
- rootdir: /app
- configfile: pytest.ini
- testpaths: tests
- plugins: mock-3.15.1, asyncio-1.3.0, anyio-4.12.1, cov-7.0.0
- asyncio: mode=strict, debug=False, asyncio_default_fixture_loop_scope=None, -  asyncio_default_test_loop_scope=function
- collected 180 items


### Module-wise Test Results

#### 1. **Admin Module Tests** (18/18 passed)
- ✅ `test_get_all_users_as_admin`
- ✅ `test_get_all_users_as_regular_user`
- ✅ `test_get_all_users_unauthenticated`
- ✅ `test_update_user_roles_as_admin`
- ✅ `test_update_nonexistent_user_roles`
- ✅ `test_toggle_user_active_status`
- ✅ `test_toggle_nonexistent_user`
- ✅ `test_get_user_by_username`
- ✅ `test_authenticate_user`
- ✅ `test_authenticate_wrong_password`
- ✅ `test_authenticate_inactive_user`
- ✅ `test_get_user_details`
- ✅ `test_count_users`
- ✅ `test_get_role_by_name`
- ✅ `test_get_all_roles`
- ✅ `test_create_and_delete_role`
- ✅ `test_cannot_delete_system_role`
- ✅ `test_admin_production_readiness`

#### 2. **Authentication Module Tests** (19/19 passed)
- ✅ `test_signup_with_valid_credentials`
- ✅ `test_signup_duplicate_username_fails`
- ✅ `test_signup_username_validation`
- ✅ `test_signup_password_validation`
- ✅ `test_login_with_valid_credentials`
- ✅ `test_login_with_wrong_password`
- ✅ `test_login_with_nonexistent_user`
- ✅ `test_login_with_inactive_user`
- ✅ `test_get_current_user_with_valid_token`
- ✅ `test_get_current_user_without_token`
- ✅ `test_get_user_details_with_valid_token`
- ✅ `test_get_user_details_without_token`
- ✅ `test_logout_with_valid_token`
- ✅ `test_logout_without_token`
- ✅ `test_complete_authentication_flow`
- ✅ `test_error_response_format`
- ✅ `test_rate_limiting_not_crashing`
- ✅ `test_password_not_exposed`
- ✅ `test_token_has_expected_structure`
- ✅ `test_production_readiness`

#### 3. **Books Module Tests** (20/20 passed)
- ✅ `test_get_books_public`
- ✅ `test_get_books_with_filters`
- ✅ `test_create_book_with_ai_summary`
- ✅ `test_create_book_unauthenticated`
- ✅ `test_create_book_invalid_data`
- ✅ `test_get_my_books`
- ✅ `test_get_my_books_unauthenticated`
- ✅ `test_get_specific_book`
- ✅ `test_get_book_with_reviews`
- ✅ `test_update_book`
- ✅ `test_update_book_unauthenticated`
- ✅ `test_delete_book`
- ✅ `test_delete_book_unauthenticated`
- ✅ `test_get_books_count`
- ✅ `test_regenerate_summary`
- ✅ `test_get_summary_info`
- ✅ `test_book_validation`
- ✅ `test_user_can_edit_own_book`
- ✅ `test_admin_can_edit_any_book`
- ✅ `test_book_production_readiness`

#### 4. **Documents Module Tests** (19/19 passed)
- ✅ `test_upload_document_txt`
- ✅ `test_upload_document_pdf`
- ✅ `test_upload_document_unauthenticated`
- ✅ `test_upload_invalid_file_type`
- ✅ `test_get_documents`
- ✅ `test_get_documents_with_filters`
- ✅ `test_get_my_documents`
- ✅ `test_get_specific_document`
- ✅ `test_get_nonexistent_document`
- ✅ `test_get_private_document_as_other_user`
- ✅ `test_private_document_workaround`
- ✅ `test_delete_others_document_fails`
- ✅ `test_download_document`
- ✅ `test_document_schemas`
- ✅ `test_document_creation`
- ✅ `test_document_status_enum`
- ✅ `test_user_can_delete_own_document`
- ✅ `test_user_cannot_delete_others_document`
- ✅ `test_upload_document_with_privacy_settings`
- ✅ `test_form_data_boolean_parsing`
- ✅ `test_file_validation`
- ✅ `test_filename_sanitization_fixed`
- ✅ `test_document_production_readiness`

#### 5. **Ingestion Module Tests** (18/18 passed)
- ✅ `test_start_ingestion_unauthenticated`
- ✅ `test_start_ingestion_nonexistent_document`
- ✅ `test_start_ingestion_private_document_as_other_user`
- ✅ `test_start_ingestion_already_ingested`
- ✅ `test_start_ingestion_already_processing`
- ✅ `test_start_ingestion_success`
- ✅ `test_get_ingestion_status_unauthenticated`
- ✅ `test_get_ingestion_status_nonexistent_document`
- ✅ `test_get_ingestion_status_private_document_as_other_user`
- ✅ `test_get_ingestion_status_no_jobs`
- ✅ `test_get_ingestion_status_with_jobs`
- ✅ `test_get_all_ingestion_jobs_unauthenticated`
- ✅ `test_get_all_ingestion_jobs`
- ✅ `test_get_ingestion_jobs_with_filters`
- ✅ `test_ingest_document_step1_success`
- ✅ `test_ingestion_status_enum`
- ✅ `test_ingestion_job_creation`
- ✅ `test_ingestion_job_transitions`
- ✅ `test_ingestion_production_readiness`

#### 6. **Q&A Module Tests** (15/15 passed)
- ✅ `test_ask_document_specific_success`
- ✅ `test_ask_document_no_answer_found`
- ✅ `test_ask_document_short_question`
- ✅ `test_ask_document_long_question`
- ✅ `test_remove_document_from_rag_success`
- ✅ `test_remove_document_from_rag_not_found`
- ✅ `test_ask_document_specific_success` (Service)
- ✅ `test_ask_document_specific_no_answer`
- ✅ `test_delete_document_success`
- ✅ `test_delete_document_failure`
- ✅ `test_qa_service_instantiation`
- ✅ `test_rag_pipeline_instantiation`
- ✅ `test_qa_production_readiness`

#### 7. **RAG Status Module Tests** (14/14 passed)
- ✅ `test_get_rag_status_success`
- ✅ `test_get_rag_status_corrupted_file`
- ✅ `test_get_rag_status_with_realistic_book_data`
- ✅ `test_get_rag_status_empty_database`
- ✅ `test_get_rag_documents_success`
- ✅ `test_get_rag_documents_mixed_data_types`
- ✅ `test_get_rag_documents_performance_large_dataset`
- ✅ `test_get_rag_documents_edge_cases`
- ✅ `test_complete_rag_system_flow`
- ✅ `test_actual_file_path_exists`
- ✅ `test_pickle_file_format`
- ✅ `test_rag_system_health_check`

#### 8. **Recommendations Module Tests** (21/21 passed)
- ✅ `test_get_recommendations_unauthenticated`
- ✅ `test_get_recommendations_success`
- ✅ `test_get_recommendations_with_filters`
- ✅ `test_get_recommendations_force_refresh`
- ✅ `test_get_popular_recommendations_unauthenticated`
- ✅ `test_get_popular_recommendations`
- ✅ `test_get_popular_recommendations_no_books`
- ✅ `test_get_new_releases_unauthenticated`
- ✅ `test_get_new_releases`
- ✅ `test_clear_recommendation_cache_unauthenticated`
- ✅ `test_clear_recommendation_cache_success`
- ✅ `test_get_recommendation_stats_unauthenticated`
- ✅ `test_get_recommendation_stats_success`
- ✅ `test_get_recommendations_success` (Service)
- ✅ `test_get_recommendations_with_filters` (Service)
- ✅ `test_get_service_stats`
- ✅ `test_book_recommendation_schema`
- ✅ `test_recommendation_response_schema`
- ✅ `test_rate_limit_decorator_exists`
- ✅ `test_service_instantiation`
- ✅ `test_recommendation_production_readiness`

#### 9. **Review Analysis Module Tests** (12/14 passed, 2 skipped)
- ✅ `test_get_book_review_summary_advanced_unauthenticated`
- ✅ `test_get_advanced_summary_nonexistent_book`
- ✅ `test_get_quick_summary_nonexistent_book`
- ✅ `test_refresh_advanced_summary_nonexistent_book`
- ✅ `test_get_summary_status_nonexistent_book`
- ⏸️ `test_get_batch_summaries_invalid_ids` (Skipped - Batch endpoints under maintenance)
- ⏸️ `test_get_batch_summaries_too_many` (Skipped - Batch endpoints under maintenance)
- ✅ `test_get_review_summary_success`
- ✅ `test_get_review_summary_no_ai`
- ✅ `test_background_refresh_summary`
- ✅ `test_cache_service_available`
- ✅ `test_review_analysis_production_readiness`

#### 10. **Reviews Module Tests** (22/22 passed)
- ✅ `test_create_review`
- ✅ `test_create_review_unauthenticated`
- ✅ `test_create_duplicate_review`
- ✅ `test_create_review_nonexistent_book`
- ✅ `test_create_review_invalid_rating`
- ✅ `test_create_review_short_text`
- ✅ `test_get_book_reviews`
- ✅ `test_get_book_reviews_nonexistent_book`
- ✅ `test_get_book_review_summary`
- ✅ `test_get_my_reviews`
- ✅ `test_get_my_reviews_unauthenticated`
- ✅ `test_get_specific_review`
- ✅ `test_get_nonexistent_review`
- ✅ `test_update_review`
- ✅ `test_update_others_review_fails`
- ✅ `test_delete_review`
- ✅ `test_admin_can_delete_any_review`
- ✅ `test_review_validation`
- ✅ `test_user_can_update_own_review`
- ✅ `test_user_cannot_update_others_review`
- ✅ `test_get_book_summary`
- ✅ `test_review_production_readiness`

## 🚀 How to Run Tests

### Running All Tests
```bash
docker compose exec backend pytest
```


## 🧪 Frontend Test Execution Summary

### Quick Stats
- **Total Tests**: 139
- **✅ Passed**: 139 (100%)
- **⏸️ Skipped**: 0
- **❌ Failed**: 0
- **⏱️ Duration**: 21.85 seconds
- **🏗️ Test Framework**: Vitest v4.0.18
- **⚛️ React Testing**: Vitest + React Testing Library

### Test Categories Breakdown
| Module Type | Test Files | Tests | Pass Rate |
|------------|------------|-------|-----------|
| Services | 3 | 50 | 100% |
| Pages | 5 | 43 | 100% |
| Contexts | 3 | 15 | 100% |
| Utils | 4 | 37 | 100% |
| Components | 1 | 4 | 100% |
| **Total** | **15** | **139** | **100%** |

## 🚀 Test Execution Command
```bash
docker compose exec frontend npm test
```
### Detailed Test Results

* `src/tests/services/auth.service.test.js` - 28 tests ✓
* `src/tests/services/qa.service.test.js` - 12 tests ✓
* `src/tests/pages/IngestionPage.test.jsx` - 10 tests ✓

  * renders the page correctly ✓
  * calls refresh when refresh button is clicked ✓
  * handles search input ✓
  * button is disabled when no documents are selected ✓
  * shows select documents dropdown button ✓
* `src/tests/utils/token.test.js` - 15 tests ✓
* `src/tests/pages/QAPage.test.jsx` - 12 tests ✓

  * renders the page correctly ✓
  * shows select document dropdown ✓
  * displays documents in dropdown when clicked ✓
  * allows selecting a document from dropdown ✓
  * allows asking a question when document is selected ✓
  * allows clearing answer history ✓
  * shows only ingested documents in dropdown ✓
  * allows searching documents in dropdown ✓
* `src/tests/contexts/ingestion.context.test.jsx` - 5 tests ✓
* `src/tests/services/BookService.test.js` - 10 tests ✓
* `src/tests/pages/Register.test.jsx` - 5 tests ✓

  * renders register form ✓
  * registers successfully and navigates to dashboard ✓
* `src/tests/utils/alerts.test.js` - 10 tests ✓
* `src/tests/pages/DocumentsPage.test.jsx` - 6 tests ✓
* `src/tests/contexts/qa.context.test.jsx` - 6 tests ✓
* `src/tests/contexts/auth.context.test.jsx` - 4 tests ✓

  * login button triggers login function ✓
* `src/tests/utils/validators.test.js` - 10 tests ✓
* `src/tests/utils/logger.test.js` - 2 tests ✓
* `src/tests/components/Login.test.jsx` - 4 tests ✓

  * renders login form ✓
  * updates input values ✓
  * calls login with username and password ✓

---

© 2026 Zaid Alam
Full Stack Developer & Gen AI Engineer
JKTech Version 2.0
