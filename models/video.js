const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  topic: String,
  course: String,
  description: String,
  summary: String,
  videoUrl: String,
  thumbnailUrl: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Video", videoSchema);
