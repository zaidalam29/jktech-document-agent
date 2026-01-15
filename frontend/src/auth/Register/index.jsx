// Using the exact same component structure as Login.jsx
import { useState } from "react";
import { register } from "../../api/auth";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";

export default function Register() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please enter username and password",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await register(form);

      localStorage.setItem("user", JSON.stringify({ username: form.username }));

      Swal.fire({
        icon: "success",
        title: "Register Successful",
        text: `Welcome, ${form.username}!`,
        timer: 1500,
        showConfirmButton: false,
      });

      navigate("/login");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Register Failed",
        text: error?.response?.data?.message || "Username may already exist",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card shadow p-4" style={{ maxWidth: "400px", margin: "80px auto" }}>
        <h2 className="text-center mb-4">Register</h2>

        <div className="mb-3">
          <label className="form-label">Username</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            placeholder="Enter password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button className="btn btn-primary w-100 mb-3" onClick={submit} disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="text-center text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-decoration-none">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}