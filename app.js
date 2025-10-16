const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const dotenv = require("dotenv");



app.use(express.json());
app.use(express.urlencoded({ extended: true }));