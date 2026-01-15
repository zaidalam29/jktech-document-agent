import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [review, setReview] = useState({
    user_id: 1,
    review_text: "",
    rating: 5,
  });
  const [loading, setLoading] = useState(false);

  // -------------------------
  // Fetch book details
  // -------------------------
  const fetchBook = async () => {
    const res = await api.get(`/books/${id}`);
    setBook(res.data);
  };

  // -------------------------
  // Fetch reviews
  // -------------------------
  const fetchReviews = async () => {
    const res = await api.get(`/books/${id}/reviews`);
    setReviews(res.data);
  };

  // -------------------------
  // Generate AI Summary
  // -------------------------
  const generateSummary = async () => {
    setLoading(true);
    await api.post(`/books/${id}/generate-summary`);
    await fetchBook();
    setLoading(false);
  };

  // -------------------------
  // Submit review
  // -------------------------
  const submitReview = async () => {
    await api.post(`/books/${id}/reviews`, review);
    setReview({ ...review, review_text: "" });
    fetchReviews();
  };

  // -------------------------
  // Delete book
  // -------------------------
  const deleteBook = async () => {
    if (window.confirm("Delete this book?")) {
      await api.delete(`/books/${id}`);
      navigate("/books");
    }
  };

  useEffect(() => {
    fetchBook();
    fetchReviews();
  }, []);

  if (!book) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>{book.title}</h2>
      <p><b>Author:</b> {book.author}</p>
      <p><b>Genre:</b> {book.genre}</p>
      <p><b>Year:</b> {book.year_published}</p>

      {/* SUMMARY */}
      <h3>Summary</h3>
      {book.summary ? (
        <p>{book.summary}</p>
      ) : (
        <p>No summary available</p>
      )}

      <button onClick={generateSummary} disabled={loading}>
        {loading ? "Generating..." : "Generate AI Summary"}
      </button>

      <hr />

      {/* REVIEWS */}
      <h3>Reviews</h3>
      {reviews.length === 0 && <p>No reviews yet</p>}

      {reviews.map((r) => (
        <div key={r.id} style={{ borderBottom: "1px solid #ccc" }}>
          <p>{r.review_text}</p>
          <small>Rating: ⭐ {r.rating}</small>
        </div>
      ))}

      {/* ADD REVIEW */}
      <h4>Add Review</h4>
      <textarea
        placeholder="Write your review"
        value={review.review_text}
        onChange={(e) =>
          setReview({ ...review, review_text: e.target.value })
        }
      />
      <br />
      <input
        type="number"
        min="1"
        max="5"
        value={review.rating}
        onChange={(e) =>
          setReview({ ...review, rating: Number(e.target.value) })
        }
      />
      <br />
      <button onClick={submitReview}>Submit Review</button>

      <hr />

      {/* DELETE */}
      <button
        onClick={deleteBook}
        style={{ color: "white", background: "red" }}
      >
        Delete Book
      </button>
    </div>
  );
}
