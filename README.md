# JKTech Document Intelligence & QnA System

**Author:** Zaid Alam
**Role:** Full Stack Developer & Generative AI Engineer

This repository contains a **full-stack document intelligence platform** with **AI-powered search and summarization** capabilities.
It consists of **backend (FastAPI + PostgreSQL)** and **frontend (React + Nginx)**, fully dockerized for local development and deployment.

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

#### Authentication

* `POST /auth/signup` – Register user
* `POST /auth/login` – Login and receive JWT
* `POST /auth/logout` – Logout
* `POST /auth/create-admin` – Create admin

#### Books

* `POST /books` – Create book
* `GET /books` – List books
* `GET /books/{id}` – Book details
* `PUT /books/{id}` – Update book
* `DELETE /books/{id}` – Delete book
* `POST /books/{id}/generate-summary` – AI summary
* `POST /books/{id}/reindex` – Rebuild search index

#### Reviews

* `POST /books/{id}/reviews` – Add review
* `GET /books/{id}/reviews` – List reviews
* `GET /books/{id}/summary` – AI summary of reviews

#### Search & Indexing

* `GET /search` – Semantic search
* `POST /search` – Search via request body
* `POST /reindex-all` – Reindex all data

#### Admin (Restricted)

* `POST /admin/users` – Create user
* `GET /admin/users` – List users
* `PUT /admin/users/{id}` – Update user
* `DELETE /admin/users/{id}` – Delete user
* `GET /admin/users/roles` – List roles
* `POST /admin/users/roles` – Create role

#### Documents

* `POST /documents/upload` – Upload document
* `GET /documents` – List documents
* `GET /documents/{id}/download` – Download document
* `DELETE /documents/{id}` – Delete document

---

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
DB_HOST=db
DB_PORT=5432
DB_NAME=book_management
DB_USER=postgres
DB_PASSWORD=Badshahkhan@123
LLM_KEY=your_api_key
USE_S3=false
```

#### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:8000
```

---

## Run Project with Docker Compose

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

## Project Structure

```
jktech-document-agent/
├── backend/
│   ├── app/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── .env
├── docker-compose.yml
└── README.md
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
* Frontend Application: `http://localhost:3000`

---

© 2026 Zaid Alam
Full Stack Developer & Gen AI Engineer
JKTech Version 2.0
