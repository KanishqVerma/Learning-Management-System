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
const userModel = require("./models/user");
const adminModel = require("./models/admin");
const videoModel = require("./models/video");

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

// For local uploads
// const __filename = fileURLToPath(import.meta.url);
// const _dirname = path.dirname(_filename);

// Multer setup
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

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

// app.get("/userdashboard", (req, res) => {
//   res.render("includes/user_dashboard.ejs", { page: "userdashboard" });
// });

app.get("/admindashboard", (req, res) => {
  res.render("includes/admin_dashboard", { page: "admindashboard" });
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

    res.redirect("/admindashboard"); // redirect to videos page after upload
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload failed");
  }
});

// app.get("/show-videos", async (req, res) => {
//   try {
//     const videos = await videoModel.find().sort({ createdAt: -1 });
//     res.render("showVideos", { videos });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Error loading videos");
//   }
// });

// app.get("/course/:courseName", async (req, res) => {
//   try {
//     const courseName = req.params.courseName;
//     const videos = await videoModel.find({ course: courseName }).sort({ createdAt: -1 });

//     const selectedVideoId = req.query.v;
//     const currentVideo = selectedVideoId ? await videoModel.findById(selectedVideoId) : videos[0];

//     res.render("includes/show.ejs", { videos, courseName });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error loading course videos");
//   }
// });

// app.get("/course/:courseName", async (req, res) => {
//   try {
//     const courseName = decodeURIComponent(req.params.courseName);

//     // Get all videos for that course
//     const videos = await videoModel.find({ course: courseName }).sort({ createdAt: -1 });

//     // Check if a specific video is requested using ?v=videoId
//     const selectedVideoId = req.query.v;

//     // If ?v= is passed, find that video; otherwise, take the first one
//     const currentVideo = selectedVideoId ? await videoModel.findById(selectedVideoId) : videos[0];

//     // Render show.ejs and pass everything
//     res.render("includes/show", { videos, currentVideo, courseName });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error loading course videos");
//   }
// });

app.get("/course/:courseName", async (req, res) => {
  try {
    const courseName = decodeURIComponent(req.params.courseName);

    // get all videos of that course
    const videos = await videoModel.find({ course: courseName }).sort({ createdAt: -1 });

    // check which video is selected
    const selectedVideoId = req.query.v;
    const currentVideo = selectedVideoId ? await videoModel.findById(selectedVideoId) : videos[0]; // default = first video

    res.render("includes/show", { videos, currentVideo, courseName });
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

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});
