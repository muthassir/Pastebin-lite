const express = require("express");
const router = express.Router();
const Paste = require("../models/Paste.js");

const getNow = (req) => {
  if (process.env.TEST_MODE === "1" && req.headers["x-test-now-ms"]) {
    return new Date(parseInt(req.headers["x-test-now-ms"]));
  }
  return new Date();
};

router.post("/", async (req, res) => {
  const { content, ttl_seconds, max_views } = req.body;

  if (!content || typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "Content is required" });
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

  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.status(201).json({
    id: paste._id,
    url: `${baseUrl}/p/${paste._id}`
  });
});

router.get("/:id", async (req, res) => {
  try {
    const paste = await Paste.findById(req.params.id);
    const now = getNow(req);

    if (!paste) return res.status(404).json({ error: "Paste not found" });

    const isExpired = paste.expiresAt && now > paste.expiresAt;
    const isOverLimit = paste.maxViews && paste.viewsUsed >= paste.maxViews;

    if (isExpired || isOverLimit) {
      return res.status(404).json({ error: "Paste not found or expired" });
    }

    paste.viewsUsed += 1;
    await paste.save();

    res.json({
      content: paste.content,
      remaining_views: paste.maxViews ? Math.max(0, paste.maxViews - paste.viewsUsed) : null,
      expires_at: paste.expiresAt
    });
  } catch (err) {
    res.status(404).json({ error: "Paste not found" });
  }
});

module.exports = router;