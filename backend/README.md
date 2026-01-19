# Document Intelligence & QnA Backend

JKTech Internal Backend System  
Author: **Zaid Alam**  
Role: *Full Stack Developer & Generative AI Engineer*

---

## Overview

This backend service is designed to manage **books, documents, users, and reviews** while providing **AI-powered search and summarization** capabilities.

The system follows a **Retrieval-Augmented Generation (RAG)** approach to deliver context-aware responses from stored content.  
All documents and assets are stored on the **local server** and indexed for semantic search.

---

## Core Modules

### Book Management
- Create, update, view, and delete books
- Generate automated AI summaries
- Recommend related books based on content similarity

### Review Management
- Submit reviews with ratings
- Retrieve book-specific reviews
- Generate summarized feedback using AI

### Intelligent Search (RAG)
- Natural language query support
- Semantic search powered by vector embeddings
- Automatic reindexing on data updates

### User Access Control
- JWT-based authentication
- Role-based authorization
- Administrative user and role management

### Document Handling
- Upload documents for processing
- Download stored files
- Remove documents when required
- Local file system storage

---

## API Routes

### Authentication

**POST /auth/signup**  
Registers a new user in the system.

**POST /auth/login**  
Authenticates a user and issues a JWT token.

**POST /auth/logout**  
Terminates the current user session.

**POST /auth/create-admin**  
Creates an administrator account.

---

### Books

**POST /books**  
Creates a new book entry.

**GET /books**  
Returns all available books.

**GET /books/{id}**  
Fetches details of a specific book.

**PUT /books/{id}**  
Updates an existing book record.

**DELETE /books/{id}**  
Deletes a book from the system.

**POST /books/{id}/generate-summary**  
Generates an AI-based summary for the selected book.

**POST /books/{id}/reindex**  
Rebuilds the search index for the book.

---

### Reviews

**POST /books/{id}/reviews**  
Adds a review and rating for a book.

**GET /books/{id}/reviews**  
Retrieves all reviews linked to the book.

**GET /books/{id}/summary**  
Generates a summarized overview of reviews using AI.

---

### Search & Indexing

**GET /search**  
Executes a semantic search using query parameters.

**POST /search**  
Executes a semantic search using request body input.

**POST /reindex-all**  
Reindexes all books and documents.

**GET /debug/embeddings**  
Provides embedding data for debugging purposes.

---

### Administration (Restricted)

**POST /admin/users**  
Creates a new user.

**GET /admin/users**  
Lists all users.

**PUT /admin/users/{id}**  
Updates user information.

**DELETE /admin/users/{id}**  
Deletes a user.

**GET /admin/users/roles**  
Returns available roles.

**POST /admin/users/roles**  
Creates a new role.

---

### Documents

**POST /documents/upload**  
Uploads a document for storage and indexing.

**GET /documents**  
Lists all uploaded documents.

**GET /documents/{id}/download**  
Downloads a document by ID.

**DELETE /documents/{id}**  
Deletes a document from the system.

---

## Project Setup Guide

### System Requirements

- Python 3.10 or higher
- PostgreSQL database
- OpenRouter API key

---

### Installation

```bash
git clone <repository-url>
cd jktech_backend_book_management_with_agent
pip install -r requirements.txt

```

### Environment (.env)

```env
DB_HOST=localhost  // DB_HOST=db in docker container
DB_PORT=5432
DB_NAME=jktech_document_agent
DB_USER=postgres
DB_PASSWORD=your_password

LLM_KEY=your_api_key
```

### Run Server

```bash
uvicorn app.main:app --reload
```

---

## Testing

```bash
pytest tests/ -v
```

---

## Retrieval-Augmented Generation (RAG) Implementation

This project integrates a Retrieval-Augmented Generation (RAG) workflow to deliver accurate and context-aware AI responses from stored content.

---

### Text Embedding Generation

All books, reviews, and documents are converted into numerical vectors using a transformer-based language model.  
These embeddings capture the semantic meaning of the text rather than relying on keyword matching.

A lightweight sentence-level embedding model is used to balance performance and accuracy.

---

### Vector Storage

Generated embeddings are stored in memory during runtime.  
This allows fast access and comparison without relying on an external vector database.

---

### Content Indexing

Whenever a book or review is added, updated, or removed, the system automatically regenerates embeddings.  
This ensures that search results always reflect the most recent data.

---

### Semantic Retrieval

When a user submits a search query or question, the query is transformed into an embedding.  
The system then compares this vector against stored embeddings using cosine similarity to identify the most relevant content.

---

### AI Response Generation

The retrieved context is passed to the language model, which generates a response grounded in the actual stored data.  
This approach reduces hallucinations and improves answer relevance.

---

### Summary

The RAG pipeline enables:
- Meaning-based search instead of keyword matching
- Automatic content synchronization through reindexing
- Fast and accurate retrieval using vector similarity
- Reliable AI-generated answers backed by real data
---
## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Tech Stack

- FastAPI
- PostgreSQL
- SQLAlchemy
- JWT Authentication
- Sentence Transformers (RAG)
- Pytest

---

# Docker & CI/CD

### Run Project using Docker (Step by Step)
 
This project uses  **Python FastAPI** with **PostgreSQL** and runs fully using **Docker**.  
Follow the steps below to run the project on your system.

---

## Step 1: Install Required Software

Make sure these are installed on your system:

- Docker Desktop  
- Git (optional)

---

## Step 2: Go to Project Folder

Open terminal / command prompt and go to project directory:

```bash
cd jktech_backend_book_management_with_agent
```

---

## Step 3: Create `.env` File

Create a file named **`.env`** in the project root folder.

### `.env` Example

```env
APP_ENV=development
DEBUG=true

DB_HOST=db
DB_PORT=5432
DB_NAME=book_management
DB_USER=postgres
DB_PASSWORD=password

LLM_KEY=your_openrouter_api_key
USE_S3=false
```

---

## Step 4: PostgreSQL Runs Automatically

You do NOT need to install PostgreSQL manually.

Docker will:
- Create PostgreSQL container
- Create database automatically
- Save data using Docker volume

---

## Step 5: Stop Old Containers (If Any)

```bash
docker-compose down -v
```

---

## Step 6: Build and Start Project

```bash
docker-compose up --build
```

---

## Step 7: Open Application

- http://localhost:8000  
- http://localhost:8000/docs

---

## Stop Project

```bash
docker-compose down
```

---

# CI/CD Setup (GitHub Actions) – Step by Step Guide

---

## Current Status

- Dockerized App: Done

- PostgreSQL via Docker: Done

- GitHub Actions (CI): Enabled

- Auto Deploy (CD): Requires Server

- SSH Keys Ready: Yes (PEM available)

---

## CI vs CD 

### CI – Continuous Integration
- Runs automatically on **every push**
- Builds Docker image
- Ensures project is buildable

### CD – Continuous Deployment
- Requires a **server (EC2 / VPS)**
- Uses **SSH (PEM key)**
- Deploys updated containers

---

## Step 1: Project Structure

Make sure your project contains:

```
.
├── app/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .github/
│   └── workflows/
│       └── ci.yml
└── README.md
```

---

## Step 2: GitHub Actions – CI Workflow

Path:
```
.github/workflows/ci.yml
```

```yaml
name: FastAPI Docker CI/CD

on:
  push:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      
      - name: Checkout source code
        uses: actions/checkout@v4

     
      - name: Check Docker version
        run: docker --version

      - name: Deploy to Server using SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_IP }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            echo "Connected to server"

            cd /var/www/jktech_backend_book_management_with_agent

            echo "Pulling latest code"
            git pull origin main

            echo "Stopping old containers"
            docker-compose down

            echo "Building & starting containers"
            docker-compose up --build -d

            echo "Deployment completed"

```

---

## 🛠 Step 3: Push Code to GitHub

```bash
git add .
git commit -m "Enable CI with GitHub Actions"
git push origin main
```

Go to **GitHub → Actions Tab**  
You will see workflow **running successfully** 

---

## Step 4: SSH Keys

- PEM file
- Server (Required)

SSH keys authenticate to a server  
Keys **do not replace** a server

---

## Step 5: Enable CD (When Server is Available)

Once you have an EC2 / VPS:

### Add GitHub Secrets:

When you enable deployment, add these secrets in GitHub:

- SERVER_IP
Server public IP address

- SERVER_USER
Example: ubuntu

- SSH_PRIVATE_KEY
Content of your PEM file

---

## Example CD Job 

```yaml
- name: Deploy to Server
  uses: appleboy/ssh-action@v1.0.0
  with:
    host: ${{ secrets.SERVER_IP }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      cd /var/www/app
      git pull
      docker-compose up -d --build
```

This step is **disabled until server exists**

---

### Summary

- CI: Active

- CD: Pending (server required)

- Docker: Configured

- PostgreSQL: Connected via Docker

- GitHub Actions: Working correctly

---


**Zaid Alam – Full Stack Developer & Gen AI Engineer**
