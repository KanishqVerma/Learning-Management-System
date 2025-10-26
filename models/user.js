const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  enrollmentId: {
    type: String,
    required: true,
  },
  collegeName: {
    type: String,
    required: true,
  },
  // enrolledCourses: [
  //   {
  //     course: String, // course name
  //     progress: { type: Number, default: 0 }, // in percentage
  //   },
  // ],

  passwordHash: {
    type: String,
    required: true,
  }, // bcrypt hash used for login

  passwordEncrypted: {
    type: String,
    required: true,
  }, // AES-encrypted plaintext for admin viewing (base64)
  batch: {
    type: String,
    required: true,
  },
   watchedVideos: [
    {
      videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
      watchedAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("User", userSchema);
