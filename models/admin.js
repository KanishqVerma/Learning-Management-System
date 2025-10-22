const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  uniqueId: {
    type: String,
    required: true,
  },
  videoUrls: {
    type: [String], //array of strings
    default: [],
  },
});

module.exports = mongoose.model("Admin", adminSchema);
