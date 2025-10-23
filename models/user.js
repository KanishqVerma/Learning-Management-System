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
  enrolledCourses: [
    {
      course: String,       // course name
      progress: { type: Number, default: 0 } // in percentage
    }
  ]
});
module.exports = mongoose.model("User", userSchema);
