import { useState } from "react";
import { login } from "../../api/auth";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";

export default function Login() {
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
      const res = await login(form); // token save inside api/auth.js

      if (res.access_token || res.token) {
        Swal.fire({
          icon: "success",
          title: "Login Successful",
          text: `Welcome, ${form.username}!`,
          timer: 1500,
          showConfirmButton: false,
        });
        navigate("/books"); // redirect after successful login
      } else {
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: "Invalid username or password",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong. Try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mobile-specific CSS */}
      <style>
        {`
          /* Desktop View */
          @media (min-width: 992px) {
            .desktop-login-container {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            
            .desktop-login-card {
              width: 100%;
              max-width: 420px;
              border-radius: 16px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
              border: none;
              overflow: hidden;
            }
            
            .desktop-login-card .card-body {
              padding: 40px;
            }
            
            .desktop-login-title {
              color: #2c3e50;
              font-weight: 700;
              margin-bottom: 30px;
            }
          }
          
          /* Mobile View */
          @media (max-width: 991.98px) {
            /* Full screen mobile container */
            .mobile-login-container {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            /* Mobile login card - CENTERED */
            .mobile-login-card {
              width: 100%;
              max-width: 360px;
              border-radius: 12px;
              box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
              border: none;
              background: white;
            }
            
            .mobile-login-card .card-body {
              padding: 30px 25px;
            }
            
            .mobile-login-title {
              font-size: 1.5rem;
              font-weight: 600;
              margin-bottom: 25px;
              color: #2c3e50;
              text-align: center;
            }
            
            .mobile-form-label {
              font-size: 0.9rem;
              font-weight: 500;
              color: #495057;
              margin-bottom: 8px;
            }
            
            .mobile-form-input {
              font-size: 0.95rem;
              padding: 12px 15px;
              border-radius: 8px;
              border: 1px solid #ced4da;
            }
            
            .mobile-form-input:focus {
              border-color: #667eea;
              box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
            }
            
            .mobile-login-btn {
              padding: 12px;
              font-size: 1rem;
              font-weight: 500;
              border-radius: 8px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border: none;
              margin-top: 10px;
            }
            
            .mobile-login-btn:disabled {
              opacity: 0.7;
            }
            
            .mobile-register-link {
              font-size: 0.9rem;
              text-align: center;
              margin-top: 20px;
              color: #6c757d;
            }
            
            .mobile-register-link a {
              color: #667eea;
              font-weight: 500;
              text-decoration: none;
            }
            
            .mobile-register-link a:hover {
              text-decoration: underline;
            }
            
            /* Extra small screens */
            @media (max-width: 576px) {
              .mobile-login-container {
                padding: 15px;
              }
              
              .mobile-login-card {
                max-width: 100%;
                border-radius: 10px;
              }
              
              .mobile-login-card .card-body {
                padding: 25px 20px;
              }
              
              .mobile-login-title {
                font-size: 1.3rem;
                margin-bottom: 20px;
              }
              
              .mobile-form-input {
                padding: 10px 12px;
                font-size: 0.9rem;
              }
              
              .mobile-login-btn {
                padding: 10px;
                font-size: 0.95rem;
              }
            }
            
            /* Very small screens */
            @media (max-width: 360px) {
              .mobile-login-container {
                padding: 10px;
              }
              
              .mobile-login-card .card-body {
                padding: 20px 15px;
              }
              
              .mobile-login-title {
                font-size: 1.2rem;
              }
              
              .mobile-form-input {
                padding: 8px 10px;
              }
            }
          }
          
          /* Common styles */
          .login-gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
        `}
      </style>

      {/* Desktop View */}
      <div className="desktop-login-container d-none d-lg-block">
        <div className="card desktop-login-card">
          <div className="card-body">
            <h2 className="desktop-login-title">Login</h2>
            
            <div className="mb-4">
              <label className="form-label fw-medium">Username</label>
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Enter username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-medium">Password</label>
              <input
                type="password"
                className="form-control form-control-lg"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <button 
              className="btn btn-primary btn-lg w-100 mb-4 py-3 fw-medium" 
              onClick={submit} 
              disabled={loading}
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>

            <p className="text-center text-muted mb-0">
              Don't have an account?{" "}
              <Link to="/register" className="text-decoration-none fw-medium" style={{ color: '#667eea' }}>
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="mobile-login-container d-lg-none">
        <div className="card mobile-login-card">
          <div className="card-body">
            <h2 className="mobile-login-title">Login</h2>
            
            <div className="mb-3">
              <label className="mobile-form-label">Username</label>
              <input
                type="text"
                className="form-control mobile-form-input"
                placeholder="Enter username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="mobile-form-label">Password</label>
              <input
                type="password"
                className="form-control mobile-form-input"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <button 
              className="btn btn-primary w-100 mobile-login-btn" 
              onClick={submit} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>

            <p className="mobile-register-link">
              Don't have an account?{" "}
              <Link to="/register">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}