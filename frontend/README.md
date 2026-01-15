# Document Intelligence & QnA Frontend  

This is a simple React based frontend project for managing books and documents.  
It also supports AI based search to find answers from uploaded documents.  

Project created by **Zaid Alam**.  

---

## Main Features  

- Responsive UI that works on mobile and desktop  
- Login system using JWT authentication  
- Add, update, delete and view books  
- Upload and download documents  
- Search inside documents using AI  
- Admin panel to manage users  
- Get quick summaries of documents using AI  

---

## Application Routes  

/login  
Used for user login and authentication  

/dashboard  
Shows overall information and basic statistics  

/books  
Shows the list of all books and allows searching  

/add-book  
Used to add a new book  

/documents  
Used to upload, view and download documents  

/search  
Used for AI based document search (RAG search)  

/admin  
Used by admin to manage users and roles  

/ai-summary  
Used to generate instant summaries of documents  

---
## Backend Connection Details  

**Main API Address:**  
http://localhost:8000  

### Important API Paths  

Authentication related:  
POST /auth/login  
POST /auth/logout  

Book related:  
GET /books  
POST /books  
PUT /books  
DELETE /books  

Document related:  
POST /documents/upload  
GET /documents/{id}/download  

Search related (RAG):  
POST /search  

Admin related:  
GET /admin/users  
POST /admin/users  

---

## Docker Based Setup  

You can run the project easily using Docker.

```bash
# Create image
docker build -t frontend_book_doc_app .

# Start container
docker run -p 3000:3000 -e REACT_APP_API_URL=http://localhost:8000 frontend_book_doc_app
```

Application will be available at:

http://localhost:3000

---

### Run Project on Local System

# Download project
git clone <repo-url>

# Go inside project folder
cd jktech_frontend_book_management_with_agent

# Install dependencies
npm install

# Start development mode
npm run dev

# Create production files
npm run build

# Test production build
npm run preview

---
## Technology Used

- Frontend Framework: React 18 with Vite and TypeScript  
- Navigation System: React Router v6  
- State Handling: Zustand and React Query  
- Design & Styling: Tailwind CSS with shadcn/ui  
- Forms & Tables: React Hook Form and TanStack Table  
- API Communication: Axios with React Query  
- Charts & Graphs: Recharts  

---

## Smart Capabilities

### Offline Mode Support

- Sample API data is already added  
- Application runs fully without backend  
- Demo records are available for testing  
- Fast reload during development with error handling  

### Ready for Production

- Code is split into smaller parts for faster loading  
- SEO support using React Helmet  
- PWA features are included  
- Bundle size checking tool is available  

---

## API Data Structure

```typescript
interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  rating: number;
}

interface DocumentSearchResult {
  id: string;
  title: string;
  score: number;
  snippet: string;
  summary: string;
}
```
### Speed & Performance

-Final build size is under 150KB (gzipped)

-Lighthouse rating is above 95

-Server response time is below 100ms

-First screen load is under 1.2 seconds

---
### Screen Size Support

-The design is mobile first and works on all screen sizes.

-Mobile: 320px and above

-Tablet: 768px and above

-Desktop: 1024px and above

-Large screens: 1440px and above

### How to Start the Project
- 1. Requirements

```bash
Node.js 18+ , npm 9+ , Docker (if needed)
```
- 2. Environment Configuration
```bash
cp .env.example .env.local
```

- 3. Development Commands

```bash
Copy code
npm run dev        # Start development server on localhost:5173
npm run lint       # Check and improve code quality
npm run test       # Run test cases
npm run storybook  # Open component preview library
```

# Running Links
- Backend API Docs:
 http://localhost:8000/docs

- Frontend Application:
http://localhost:3000


---
© 2026 Zaid Alam
Full Stack Developer and Gen AI Engineer
JKTech Frontend Version 2.0


---