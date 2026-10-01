import { useState } from "react";

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      alert("Please enter your username and password.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    onLogin({
      username: username.trim(),
    });
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">

        {/* BRAND */}
        <div className="auth-brand">
          <span className="aura-mark">
            <span className="aura-ring"></span>
            <span className="aura-core"></span>
          </span>

          <span className="brand-name">FORGE</span>
        </div>

        <p className="auth-tagline">
          Train. Fuel. Track. Level up.
        </p>

        {/* LOGIN / SIGNUP TABS */}
        <div className="auth-tabs">

          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setPassword("");
              setConfirmPassword("");
            }}
          >
            Log In
          </button>

          <button
            type="button"
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setPassword("");
              setConfirmPassword("");
            }}
          >
            Sign Up
          </button>

        </div>

        {/* FORM */}
        <form
          className={`auth-form ${mode === "login" ? "active" : ""}`}
          onSubmit={handleSubmit}
        >

          {/* USERNAME */}
          <div className="form-row">
            <label htmlFor="auth-username">
              Username
            </label>

            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          {/* PASSWORD */}
          <div className="form-row">
            <label htmlFor="auth-password">
              Password
            </label>

            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
            />
          </div>

          {/* CONFIRM PASSWORD */}
          {mode === "signup" && (
            <div className="form-row">
              <label htmlFor="auth-confirm-password">
                Confirm Password
              </label>

              <input
                id="auth-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            className="auth-submit"
          >
            {mode === "login"
              ? "Enter FORGE"
              : "Create Account"}
          </button>

        </form>

      </div>
    </div>
  );
}

export default AuthScreen;