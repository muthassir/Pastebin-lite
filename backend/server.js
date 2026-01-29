require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const pasteRoutes = require("./routes/pastes.routes.js");

const Paste = require("./models/Paste.js");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use("/api/pastes", pasteRoutes);

const getCurrentTime = (req) => {
  if (process.env.TEST_MODE === "1" && req.headers["x-test-now-ms"]) {
    return new Date(parseInt(req.headers["x-test-now-ms"]));
  }
  return new Date();
};

app.get("/p/:id", async (req, res) => {
  const now = getCurrentTime(req);
  const paste = await Paste.findById(req.params.id);
  
  if (!paste) {
    return res.status(404).send("<h1>Paste not found</h1>");
  }

  const isExpired = paste.expiresAt && now > paste.expiresAt;
  const viewsExceeded = paste.maxViews !== null && paste.viewsUsed >= paste.maxViews;

  if (isExpired || viewsExceeded) {
    return res.status(404).send("<h1>Paste not found or expired</h1>");
  }

  paste.viewsUsed += 1;
  await paste.save();

  const escapedContent = paste.content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  res.send(`<pre>${escapedContent}</pre>`);
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