const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      throw new Error("Authentication Failed!");
    }

    // here we have token and need to verify it
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    // we have the id which is decoded now
    req.userData = {
      userId: decodedToken.userId,
    };
    next();
  } catch (err) {
    const error = new HttpError("Authentication Failed", 401);
    return next(error);
  }
};
