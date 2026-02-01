// src/tests/mocks/bookMocks.js
export const mockBook = {
  id: 1,
  title: 'Test Book',
  author: 'Test Author',
  genre: 'Fiction',
  year_published: 2024,
  content: 'Test content',
  summary: 'AI generated summary'
};

export const mockBooksList = [
  mockBook,
  {
    id: 2,
    title: 'Another Book',
    author: 'Another Author',
    genre: 'Non-Fiction',
    year_published: 2023
  }
];

export const mockBookWithReviews = {
  ...mockBook,
  reviews: [
    {
      id: 1,
      rating: 5,
      review_text: 'Great book!',
      user: { name: 'Test User' }
    }
  ]
};