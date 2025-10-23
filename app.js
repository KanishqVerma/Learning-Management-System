const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const { v2: cloudinary } = require("cloudinary");
const mongoose = require("mongoose");
const fs = require("fs");
const ejsMate = require("ejs-mate");
const dotenv = require("dotenv");
const { encrypt, decrypt } = require("./utils/crypto");
const bcrypt = require("bcrypt");
const userModel = require("./models/user");
const adminModel = require("./models/admin");
const videoModel = require("./models/video");
const { URLSearchParams } = require("url");

// app.get("/",(req,res)=>{
//     res.send("Hi , I am root");
// })

dotenv.config();

// ===== Cloudinary Configuration =====
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongodb connected"))
  .catch((err) => console.log("Error connecting mongodb", err));

// Multer setup
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

const KEY = process.env.PW_SECRET_KEY; // must be 32 bytes base64 or hex (see below)

// helper to ensure key format
if (!KEY) {
  throw new Error("Set PW_SECRET_KEY env var (32 bytes base64 string).");
}

app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath); // add this line too
app.get("/", (req, res) => {
  res.render("layouts/boilerplate.ejs", { page: "home" });
});
// ===== ROUTES =====

app.get("/login", (req, res) => {
  res.render("users/login.ejs", { page: "login" });
});

app.get("/signup", (req, res) => {
  res.render("users/signup.ejs", { page: "signup" });
});

app.get("/", (req, res) => {
  res.render("includes/landing.ejs", { page: "home" });
});


// Admin Dashboard
app.get("/admin/dashboard", async (req, res) => {
  try {
    const videos = await videoModel.find().sort({ createdAt: -1 }); // latest first
    const totalVideos = videos.length;
    const totalCourses = await videoModel.distinct("course");

    res.render("includes/admin_dashboard", { page: "admindashboard", videos, totalCourses, totalVideos });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

//Delete Video
app.post("/video/delete/:id", async (req, res) => {
  try {
    await videoModel.findByIdAndDelete(req.params.id);
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/video_upload", (req, res) => {
  res.render("includes/video_upload", { page: "video_upload" });
});

app.get("/courses", async (req, res) => {
  try {
    // Fetch distinct course names from videos
    const courses = await videoModel.distinct("course");

    // Render template with courses array
    res.render("includes/courses", {
      page: "courses",
      courses, // array of course names
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/certificates", (req, res) => {
  res.render("includes/certificates", { page: "certificates" });
});

app.get("/profile", (req, res) => {
  res.render("includes/profile", { page: "profile" });
});

app.get("/help", (req, res) => {
  res.render("includes/help", { page: "help" });
});

app.get("/developed_by", (req, res) => {
  res.render("includes/developed_by", { page: "developed_by" });
});

// Logout → back to landing
app.post("/logout", (req, res) => {
  res.redirect("/");
});

app.post("/upload-video", upload.single("video"), async (req, res) => {
  try {
    const { topic, course, newCourse, description, summary } = req.body;
    const videoPath = req.file.path;
    const thumbnailPath = `uploads/thumb-${Date.now()}.png`;

    // If "New Course" selected
    const finalCourse = course === "new" ? newCourse : course;

    // Generate thumbnail using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on("end", resolve)
        .on("error", reject)
        .screenshots({
          count: 1,
          folder: "uploads",
          filename: path.basename(thumbnailPath),
          size: "320x240",
        });
    });

    // Upload to Cloudinary
    const videoUpload = await cloudinary.uploader.upload(videoPath, {
      resource_type: "video",
      folder: "lms_videos",
    });

    const thumbUpload = await cloudinary.uploader.upload(thumbnailPath, {
      folder: "lms_thumbnails",
    });

    // Save in MongoDB
    const newVideo = await videoModel.create({
      topic,
      course: finalCourse,
      description,
      summary,
      videoUrl: videoUpload.secure_url,
      thumbnailUrl: thumbUpload.secure_url,
    });

    // Clean up local temp files
    fs.unlinkSync(videoPath);
    fs.unlinkSync(thumbnailPath);

    res.redirect("/admin/dashboard"); // redirect to videos page after upload
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload failed");
  }
});

app.get("/course/:courseName", async (req, res) => {
  try {
    const courseName = decodeURIComponent(req.params.courseName);

    // get all videos of that course
    const videos = await videoModel.find({ course: courseName }).sort({ createdAt: -1 });

    // check which video is selected
    const selectedVideoId = req.query.v;
    const currentVideo = selectedVideoId ? await videoModel.findById(selectedVideoId) : videos[0]; // default = first video
    console.log(videos);

    res.render("includes/show", { page: "show", videos, currentVideo, courseName });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading course videos");
  }
});

app.get("/userdashboard", async (req, res) => {
  try {
    // Get unique course names from all videos
    const courses = await videoModel.distinct("course");

    // If you want, you can also fetch some videos for thumbnails
    const courseThumbnails = {};
    for (const course of courses) {
      // const firstVideo = await videoModel.findOne({ course });
      courseThumbnails[course] = "";
    }
    res.render("includes/user_dashboard.ejs", { page: "userdashboard", courses, courseThumbnails });
    // res.render("user/userdashboard", { courses, courseThumbnails });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dashboard");
  }
});



//   try {
//     const userId = req.user._id; // Assuming you have authentication middleware
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).send("User not found");
//     }

//     // user.enrolledCourses contains courses with progress
//     const courses = user.enrolledCourses; // [{ course: "Web Dev", progress: 60 }, ... ]

//     // Optional: fetch thumbnails for each course
//     const courseThumbnails = {};
//     for (const c of courses) {
//       const firstVideo = await videoModel.findOne({ course: c.course });
//       courseThumbnails[c.course] = firstVideo ? firstVideo.thumbnailUrl : "";
//     }

//     res.render("includes/user_dashboard.ejs", { page: "userdashboard", courses, courseThumbnails });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error loading dashboard");
//   }
// });

// SIGNUP TRY
app.post("/signup", async (req, res) => {
  try {
    const { name, enrollmentId, password, collegeName, batch } = req.body;

    if (!enrollmentId || !password) return res.status(400).send("password and enrollmentID required");

    const existing = await userModel.findOne({ enrollmentId });
    if (existing) return res.status(400).send("Email already registered");

    const passwordHash = await bcrypt.hash(password, 10);
    const passwordEncrypted = encrypt(password);

    const user = await userModel.create({ name, enrollmentId, passwordHash, passwordEncrypted, collegeName, batch });
    res.status(201).json({ message: "Registered", userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Showuser dynamically
app.get("/showuser", async (req, res) => {
  try {
    const users = await userModel.find().lean();
    res.render("includes/showuser.ejs", { page: "showuser" ,users});
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Server Error");
  }
});

// Delete a user from showuser page
app.post("/deleteuser/:id", async (req, res) => {
  try {
    await userModel.findByIdAndDelete(req.params.id);
    res.redirect("/showuser");
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).send("Server Error");
  }
});

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});
