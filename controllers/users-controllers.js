// validator
const { validationResult } = require("express-validator");

// for password hash - bcrypt
const bcrypt = require("bcrypt");

// jwt
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

const getUsers = async (req, res, next) => {
  console.log(`${req.method} REQUEST FOR TO GET ALL USERS INCOMING...`);
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError("somethig went wrong, please try later", 404);
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  console.log(`${req.method} REQUEST FOR SIGNUP INCOMING..`);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError("plese check your data", 422));
  }

  const { username, email, password } = req.body;
  // console.log(email);
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
    // console.log(existingUser);
  } catch (err) {
    const error = new HttpError("signup failed please try later", 500);
    return next(error);
  }

  if (existingUser) {
    // console.log(`${existingUser.email} exists already`);
    const err = new HttpError(
      `${existingUser.email} exists already, please login instead`,
      422
    );
    return next(err);
  }

  // hasing password
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    const err = new HttpError("could not create user, please try again", 500);
    return next(err);
  }

  const createdUser = new User({
    username,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("signup failed! please try later", 500);
    return next(error);
  }

  // generating the JWT
  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (e) {
    const error = new HttpError("signup failed! please try later", 500);
    return next(error);
  }

  // res.status(201).json({ user: createdUser.toObject({ getters: true }) });
  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
  console.log(`${req.method} LOGIN REQUEST INCOMING...`);
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
    console.log(existingUser);
  } catch (err) {
    const error = new HttpError("Login failed please try later", 500);
    return next(error);
  }

  // if (!existingUser || existingUser.password !== password) {
  if (!existingUser) {
    const error = new HttpError("Invalid credentials", 403);
    return next(error);
  }

  // checking password with hashed password - valid or not
  let isValidPassword;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const e = new HttpError(
      "unable to login, please check your credentials",
      500
    );
    return next(e);
  }

  if (!isValidPassword) {
    const error = new HttpError("Invalid credentials", 403);
    return next(error);
  }

  console.log("before token");
  console.log(process.env.JWT_KEY);

  // generating the JWT
  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (e) {
    const error = new HttpError("Logging In failed! please try later", 500);
    return next(error);
  }

  console.log(token);

  res.json({
    // message: `logged-in as ${existingUser.email}`,
    // user: existingUser.toObject({ getters: true }),
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

module.exports = {
  getUsers,
  signup,
  login,
};
