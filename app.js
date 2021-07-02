const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();

// mongoose
const mongoose = require("mongoose");
app.use(express.json());
const HttpError = require("./models/http-error");

// routes register
const placesRoute = require("./routes/places-routes");
const userRoute = require("./routes/users-routes");

// for serving the images, we use this middleware
app.use("/uploads/images", express.static(path.join("uploads", "images")));

// to fix CORS we attach some HEADERS to RESPONSE
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/places", placesRoute);
app.use("/api/users", userRoute);

// for request with wrong path (url) or unsupported routes
app.use((req, res, next) => {
  const error = new HttpError("could not find this route", 404);
  throw error;
});

// error handling middleware
app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured" });
});

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.9593i.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("CONNECTION ESTABLISHED...");
    app.listen(process.env.PORT || 5000);
  })
  .catch((err) => console.log(err));
