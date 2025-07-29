const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log(err));

// ✅ Models
const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  googleId: String
}));
const Note = mongoose.model("Note", new mongoose.Schema({
  userId: String,
  content: String
}));

// ✅ JWT Middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
}

// ✅ Signup
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token, user });
});

// ✅ Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: "User not found" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ msg: "Wrong password" });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token, user });
});

// ✅ Google Login
app.post("/google-login", async (req, res) => {
  const { name, email, googleId } = req.body;
  let user = await User.findOne({ email });
  if (!user) user = await User.create({ name, email, googleId });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token, user });
});

// ✅ OTP Storage
const otpStore = {};

// ✅ Send OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}`
  });

  res.json({ msg: "OTP sent" });
});

// ✅ Verify OTP
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (otpStore[email] !== otp) return res.status(400).json({ msg: "Invalid OTP" });

  let user = await User.findOne({ email });
  if (!user) user = await User.create({ name: email.split("@")[0], email, password: "" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  delete otpStore[email];
  res.json({ token, user });
});

// ✅ Notes CRUD
app.get("/notes", auth, async (req, res) => res.json(await Note.find({ userId: req.user })));
app.post("/notes", auth, async (req, res) => res.json(await Note.create({ userId: req.user, content: req.body.content })));
app.delete("/notes/:id", auth, async (req, res) => { 
  await Note.deleteOne({ _id: req.params.id, userId: req.user });
  res.json({ msg: "Deleted" });
});

// ✅ Start Server
app.listen(5000, () => console.log("🚀 Backend running on http://localhost:5000"));
