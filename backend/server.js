require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const pasteRoutes = require("./routes/pastes.routes.js");
const Paste = require("./models/Paste.js");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Database connection error:", err));

const getNow = (req) => {
  if (process.env.TEST_MODE === "1" && req.headers["x-test-now-ms"]) {
    return new Date(parseInt(req.headers["x-test-now-ms"]));
  }
  return new Date();
};

app.use("/api/pastes", pasteRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/p/:id", async (req, res) => {
  try {
    const paste = await Paste.findById(req.params.id);
    const now = getNow(req);

    if (!paste) return res.status(404).send("<h1>Paste not found</h1>");

    const isExpired = paste.expiresAt && now > paste.expiresAt;
    const isOverLimit = paste.maxViews && paste.viewsUsed >= paste.maxViews;

    if (isExpired || isOverLimit) {
      return res.status(404).send("<h1>Paste unavailable or expired</h1>");
    }

    paste.viewsUsed += 1;
    await paste.save();

    const safeContent = paste.content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    res.send(`<html><body style="font-family:monospace;padding:20px;"><pre>${safeContent}</pre></body></html>`);
  } catch (err) {
    res.status(404).send("<h1>Paste not found</h1>");
  }
});

app.get("/api/healthz", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({ ok: false });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));