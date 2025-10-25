const express = require("express");
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
const session = require("express-session");
const bodyParser = require("body-parser");
const userModel = require("./models/user");
const adminModel = require("./models/admin");
const videoModel = require("./models/video");
const MongoStore = require("connect-mongo");
const app = express();
const cookieParser = require("cookie-parser");
const { URLSearchParams } = require("url");
const { isAuthenticated } = require("./middleware.js");
const flash = require("flash");
const PORT = process.env.PORT || 5000;

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
app.use(express.static("public"));

app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath); // add this line too

// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
//     cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
//   })
// );

app.use(
  session({
    secret: process.env.SESSION_SECRET,       
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:  process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60,           // 14 days
    }),
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, 
    },   
  })
);


app.use(async (req, res, next) => {
  // res.locals.success = req.flash("success");
  // res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

app.get("/", (req, res) => {
  res.render("layouts/boilerplate.ejs", { page: "home" });
});

const admins = [
  {
    uniqueId: process.env.ADMIN1_ID,
    password: process.env.ADMIN1_PASSWORD,
    name: process.env.ADMIN1_NAME,
    role: "admin",
  },
  {
    uniqueId: process.env.ADMIN2_ID,
    password: process.env.ADMIN2_PASSWORD,
    name: process.env.ADMIN2_NAME,
    role: "admin",
  },
];

app.post("/logout", (req, res) => {
  console.log("logging out");
  req.session.destroy(() => res.redirect("/"));
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

app.get("/show_certificate", (req, res) => {
  res.render("includes/show_certificate.ejs", { page: "show_certificate" });
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

// app.get("/profile", (req, res) => {
//   res.render("includes/profile", { page: "profile" });
// });

app.get("/help", (req, res) => {
  res.render("includes/help", { page: "help" });
});

app.get("/developed_by", (req, res) => {
  res.render("includes/developed_by", { page: "developed_by" });
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

    res.render("includes/show", { page: "show", videos, currentVideo, courseName });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading course videos");
  }
});

// ✅ Add in your routes file
app.post("/watch/:videoId", async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).send("Login required");

    const videoId = req.params.videoId;
    const userIdentifier = req.session.user.id; // could be _id or enrollmentId

    // Try fetching by Mongo _id first, fallback to enrollmentId
    const user =
      (await userModel.findById(userIdentifier)) ||
      (await userModel.findOne({ enrollmentId: userIdentifier }));

    if (!user) return res.status(404).send("User not found");

    // ✅ Prevent duplicates
    const alreadyWatched = user.watchedVideos.some(
      (v) => v.videoId.toString() === videoId
    );

    if (!alreadyWatched) {
      user.watchedVideos.push({ videoId });
      await user.save();
    }

    res.status(200).send("Progress updated");
  } catch (err) {
    console.error("Error updating progress:", err);
    res.status(500).send("Error updating progress");
  }
});



app.get("/userdashboard", async (req, res) => {
  try {
    // 🔸 Check if user is logged in
    if (!req.session.user) {
      return res.redirect("/login");
    }

    // 🔸 Fetch the logged-in user's data from DB if needed
    const user = await userModel.findOne({ enrollmentId: req.session.user.id }).populate("watchedVideos.videoId");
    // Get unique course names from all videos
    const courses = await videoModel.distinct("course");

     const progressData = {};

    // If you want, you can also fetch some videos for thumbnails
    const courseThumbnails = {};
    // for (const course of courses) {
    //   // const firstVideo = await videoModel.findOne({ course });
    //   courseThumbnails[course] = "";
    // const total = await videoModel.countDocuments({ course });
    // const watched = user.watchedVideos.filter(v => v.videoId?.course === course).length;
    // const progress = total > 0 ? Math.round((watched / total) * 100) : 0;
    // progressData[course] = progress;
    // }


      for (const course of courses) {
      // 🔸 (Optional) Fetch first video thumbnail per course
      const firstVideo = await videoModel.findOne({ course });
      courseThumbnails[course] = firstVideo?.thumbnailUrl || "";

      // 🔸 Calculate progress
      const total = await videoModel.countDocuments({ course });
      const watched = user.watchedVideos.filter(v => v.videoId?.course === course).length;
      const progress = total > 0 ? Math.round((watched / total) * 100) : 0;
      progressData[course] = progress;
    }

    res.render("includes/user_dashboard.ejs", { page: "userdashboard", courses, courseThumbnails, user,progressData });
    // res.render("user/userdashboard", { courses, courseThumbnails });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dashboard");
  }
});

// SIGNUP TRY
app.post("/signup", async (req, res) => {
  try {
    const { name, enrollmentId, password, collegeName, batch } = req.body;

    if (!enrollmentId || !password) return res.status(400).send("password and enrollmentID required");

    const existing = await userModel.findOne({ enrollmentId });
    if (existing) return res.status(400).send("User already registered");

    const passwordHash = await bcrypt.hash(password, 10);
    const passwordEncrypted = encrypt(password);

    const user = await userModel.create({ name, enrollmentId, passwordHash, passwordEncrypted, collegeName, batch });

    // res.status(201).json({ message: "Registered", userId: user._id });
    res.redirect("/showuser");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.post("/login", async (req, res) => {
  const { uniqueId, password } = req.body;

  // 1️⃣ Check if admin (from .env)
  const admin = admins.find((a) => a.uniqueId === uniqueId && a.password === password);

  if (admin) {
    req.session.user = {
      id: admin.uniqueId,
      name: admin.name,
      role: admin.role,
    };
    return res.redirect("/admin/dashboard");
  }

  // 2️⃣ Else check MongoDB user
  const user = await userModel.findOne({ enrollmentId: uniqueId });
  if (!user) {
    return res.status(401).render("users/login", { error: "User not found", values: { uniqueId }, page: "login" });
  }

  // if (user.password !== password) {
  //   return res.status(401).render("users/login", { error: "Incorrect password", values: { uniqueId }, page: "login" });
  // }

  console.log(user);

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).render("users/login", { error: "Incorrect password", values: { uniqueId }, page: "login" });
  }

  // success
  req.session.user = {
    id: user.enrollmentId,
    name: user.name,
    role: user.role || "user",
  };

  res.redirect("/userdashboard");
  // res.render("includes/user_dashboard.ejs", { page: "userdashboard",user });
});

app.get("/showuser", async (req, res) => {
  try {
    const users = await userModel.find().lean();

    // decrypt passwords for each user
    const usersWithPlaintext = users.map((user) => {
      const decryptedPassword = decrypt(user.passwordEncrypted);
      return { ...user, plaintextPassword: decryptedPassword };
    });

    res.render("includes/showuser.ejs", {
      page: "showuser",
      users: usersWithPlaintext,
    });
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



app.get("/profile", async (req, res) => {
  try {
    // ✅ 1. Check if user is logged in
    if (!req.session.user) {
      return res.redirect("/login");
    }

    console.log("Logged-in session user:", req.session.user);
    // ✅ 2. Get user ID from session
    const userId = req.session.user.id;

    // ✅ 3. Fetch user details using correct field name
    const user = await userModel.findOne({ enrollmentId: userId }).lean();
    console.log("Fetched user:", user);

    if (!user) {
      return res.status(404).render("includes/profile", {
        layout: "layouts/boilerplate",
        title: "Profile",
        user: null,
        message: "User not found",
        page: "profile",
      });
    }

    // ✅ 4. Render EJS with user data
    res.render("includes/profile", {
      user,
      page: "profile",
    });
  } catch (err) {
    console.error("Profile route error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log("server is listening to port 8080");
});
