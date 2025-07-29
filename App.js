import React, { useState, useEffect } from "react";
import axios from "axios";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"; // Replace

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const signup = async () => {
    const res = await axios.post("/signup", form);
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
  };
  const login = async () => {
    const res = await axios.post("/login", { email: form.email, password: form.password });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
  };
  const googleLoginSuccess = async (cred) => {
    const decoded = jwtDecode(cred.credential);
    const res = await axios.post("/google-login", { name: decoded.name, email: decoded.email, googleId: decoded.sub });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
  };
  const sendOtp = async () => { await axios.post("/send-otp", { email: form.email }); alert("OTP Sent"); setOtpMode(true); };
  const verifyOtp = async () => {
    const res = await axios.post("/verify-otp", { email: form.email, otp });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setOtpMode(false);
  };

  const fetchNotes = async () => {
    const res = await axios.get("/notes", { headers: { Authorization: `Bearer ${token}` } });
    setNotes(res.data);
  };
  const addNote = async () => { await axios.post("/notes", { content: note }, { headers: { Authorization: `Bearer ${token}` } }); setNote(""); fetchNotes(); };
  const deleteNote = async (id) => { await axios.delete(`/notes/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchNotes(); };

  useEffect(() => { if (token) fetchNotes(); }, [token]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div style={{ padding: 20, maxWidth: 400 }}>
        {!token ? (
          <>
            <h2>Login / Signup</h2>
            {!otpMode ? (
              <>
                <input name="name" placeholder="Name" onChange={handleChange} /><br />
                <input name="email" placeholder="Email" onChange={handleChange} /><br />
                <input name="password" type="password" placeholder="Password" onChange={handleChange} /><br />
                <button onClick={signup}>Signup</button>
                <button onClick={login}>Login</button>
                <button onClick={sendOtp}>Login with OTP</button>
                <h3>Or Google Login</h3>
                <GoogleLogin onSuccess={googleLoginSuccess} onError={() => alert("Google Login Failed")} />
              </>
            ) : (
              <>
                <h3>Enter OTP sent to {form.email}</h3>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" /><br />
                <button onClick={verifyOtp}>Verify OTP</button>
                <button onClick={() => setOtpMode(false)}>Cancel</button>
              </>
            )}
          </>
        ) : (
          <>
            <h2>Your Notes</h2>
            <input value={note} placeholder="New note" onChange={(e) => setNote(e.target.value)} />
            <button onClick={addNote}>Add</button>
            <ul>
              {notes.map(n => (
                <li key={n._id}>{n.content} <button onClick={() => deleteNote(n._id)}>X</button></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
