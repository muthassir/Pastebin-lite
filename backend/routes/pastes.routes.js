const express = require("express");
const router = express.Router();
const Paste = require("../models/Paste.js");

const getCurrentTime = (req) => {
  if (process.env.TEST_MODE === "1" && req.headers["x-test-now-ms"]) {
    return new Date(parseInt(req.headers["x-test-now-ms"]));
  }
  return new Date();
};

const buildUrl = (pasteId) => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  return `${baseUrl}/p/${pasteId}`;
};

router.post("/", async (req, res) => {
  const { content, ttl_seconds, max_views } = req.body;

  if (!content || typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "Content is required" });
  }

  if (ttl_seconds && (typeof ttl_seconds !== "number" || ttl_seconds < 1)) {
    return res.status(400).json({ error: "ttl_seconds must be integer ≥ 1" });
  }

  if (max_views && (typeof max_views !== "number" || max_views < 1)) {
    return res.status(400).json({ error: "max_views must be integer ≥ 1" });
  }

  let expiresAt = null;
  if (ttl_seconds && ttl_seconds >= 1) {
    expiresAt = new Date(Date.now() + ttl_seconds * 1000);
  }

  const paste = new Paste({
    content: content.trim(),
    expiresAt,
    maxViews: max_views || null
  });

  await paste.save();

  res.json({
    id: paste._id,
    url: buildUrl(paste._id)
  });
});

router.get("/:id", async (req, res) => {
  const now = getCurrentTime(req);
  const paste = await Paste.findById(req.params.id);
  
  if (!paste) {
    return res.status(404).json({ error: "Paste not found" });
  }

  const isExpired = paste.expiresAt && now > paste.expiresAt;
  const viewsExceeded = paste.maxViews !== null && paste.viewsUsed >= paste.maxViews;

  if (isExpired || viewsExceeded) {
    return res.status(404).json({ error: "Paste not found or expired" });
  }

  paste.viewsUsed += 1;
  await paste.save();

  const remainingViews = paste.maxViews !== null ? paste.maxViews - paste.viewsUsed : null;
  
  res.json({
    content: paste.content,
    remaining_views: remainingViews >= 0 ? remainingViews : 0,
    expires_at: paste.expiresAt
  });
});

module.exports = router;