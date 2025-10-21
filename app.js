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
  res.render("layouts/boilerplate.ejs");
});

// ===== ROUTES =====

// Dashboard + subpages (Sidebar)
app.get("/userdashboard", (req, res) => {
  res.render("includes/user_dashboard");
});

app.get("/admindashboard", (req, res) => {
  res.render("includes/admin_dashboard");
});

app.get("/video_upload", (req, res) => {
  res.render("includes/video_upload");
});

app.get("/courses", (req, res) => {
  res.render("includes/courses");
});

app.get("/certificates", (req, res) => {
  res.render("includes/certificates");
});

app.get("/profile", (req, res) => {
  res.render("includes/profile");
});

app.get("/help", (req, res) => {
  res.render("includes/help");
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
