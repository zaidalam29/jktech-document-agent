const ROUTES = {
  PUBLIC: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
  },
  PRIVATE: {
    DASHBOARD: '/dashboard',
    DOCUMENTS: {
      LIST: '/documents',
      UPLOAD: '/documents/upload',
      VIEW: '/documents/:id',
    },
    INGESTION: '/ingestion',
    QA: {
      ASK: '/qa/ask',
      HISTORY: '/qa/history',
    },
    ADMIN: {
      USERS: '/admin/users',
      SETTINGS: '/admin/settings',
      ANALYTICS: '/admin/analytics',
    },
    PROFILE: '/profile',
    BOOKS: {
      LIST: '/books',
      CREATE: '/books/create',
      MY_BOOKS: '/books/my-books',
      DETAILS: '/books/:id',
      EDIT: '/books/:id/edit',
      REVIEWS: '/books/:id/reviews',
    },
  },
  ERROR: {
    404: '/404',
    500: '/500',
  },
};

export default ROUTES;