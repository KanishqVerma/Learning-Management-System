const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const dotenv = require("dotenv");
const userModel = require("./models/user");
const adminModel = require("./models/admin");

// app.get("/",(req,res)=>{
//     res.send("Hi , I am root");
// })

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

app.get("/userdashboard", (req, res) => {
  res.render("includes/user_dashboard.ejs", { page: "userdashboard" });
});

app.get("/admindashboard", (req, res) => {
  res.render("includes/admin_dashboard", { page: "admindashboard" });
});

app.get("/video_upload", (req, res) => {
  res.render("includes/video_upload", { page: "video_upload" });
});

app.get("/courses", (req, res) => {
  res.render("includes/courses", { page: "courses" });
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

// Logout → back to landing
app.post("/logout", (req, res) => {
  res.redirect("/");
});


app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});
