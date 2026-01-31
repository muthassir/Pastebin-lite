const mongoose = require("mongoose");

const pasteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  expiresAt: { type: Date }, 
  maxViews: { type: Number },
  viewsUsed: { type: Number, default: 0 }
});

module.exports = mongoose.model("Paste", pasteSchema);