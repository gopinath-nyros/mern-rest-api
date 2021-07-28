const fs = require("fs");

// validator
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const User = require("../models/user");

// import error handling model
const HttpError = require("../models/http-error");
const getCoordinates = require("../util/geo-location");
const Place = require("../models/place");

const cloudinary = require("../util/cloudinary");
const { log } = require("console");

// get all places of all users
const getAllPlaces = async (req, res, next) => {
  console.log("GET ALL PLACES TRIGGER");
  let { page, size } = req.query;
  const skip = (page - 1) * size;
  const limit = parseInt(size);
  let places;
  let placesCount;
  try {
    places = await Place.find({}, "-cloudinary_id")
      .skip(skip)
      .limit(limit)
      .sort({ created_at: "desc" })
      .populate({
        path: "creator",
        select: "username",
      });
    placesCount = await Place.countDocuments({});
    console.log(placesCount);
  } catch (e) {
    const error = new HttpError(
      "somethig went wrong, please try later and try",
      404
    );
    return next(error);
  }
  // res.status(201).json({ message: "all places of users" });
  res.json({
    count: placesCount,
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const getPlaceById = async (req, res, next) => {
  console.log("GET PLACE BY ID TRIGGER");

  const placeID = req.params.pid;
  let place;

  try {
    place = await Place.findById(placeID);
  } catch (err) {
    const error = new HttpError(
      "something went wrong could not find the place",
      500
    );
    return next(error);
  }

  // if no data found
  if (!place) {
    const error = new HttpError(
      "could not find the place for the given ID",
      404
    );
    return next(error);
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userID = req.params.uid;
  let { page, size } = req.query;
  console.log(page);
  console.log(size);
  if (!page) {
    page = 1;
  }
  if (!size) {
    size = 5;
  }

  let placesCount;
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userID).populate({
      path: "places",
      options: {
        limit: parseInt(size),
        skip: (page - 1) * size,
        sort: { created_at: "desc" },
      },
    });
    placesCount = await Place.countDocuments({
      creator: userID,
    });
  } catch (err) {
    const error = new HttpError(
      "something went wrong could not find the place",
      500
    );
    return next(error);
  }

  // if no user data found
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    console.log(userWithPlaces);
    return res.json({
      userid: userWithPlaces._id.toString(),
      message: "no place found",
    });
  }

  res.json({
    count: placesCount,
    page,
    size,
    userid: userWithPlaces._id.toString(),
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

// create place POST request
const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("plese check your data", 422));
  }
  let { title, description, address } = req.body;
  const captialString = (str) =>
    str[0].toUpperCase() + str.slice(1).toLowerCase();
  title = title.trim();
  title = title.split(" ").map(captialString);
  title = title.join(" ");
  description = description.trim();
  description =
    description[0].toUpperCase() + description.slice(1).toLowerCase();
  address = address.trim();

  let coordinates;
  try {
    coordinates = await getCoordinates(address);
  } catch (err) {
    return next(err);
  }

  // cloudinary
  let image_url;
  let cloudinaryID;
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "mern/places/",
    });
    image_url = result.secure_url;
    cloudinaryID = result.public_id;
  } catch (err) {
    const error = new HttpError("something went wrong in cloudinary", 500);
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: image_url,
    creator: req.userData.userId,
    cloudinary_id: cloudinaryID,
  });

  // checking wether the user (creator) is there or not in DB
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (e) {
    const error = new HttpError("creating place failed, try later", 404);
    return next(error);
  }

  // if no user
  if (!user) {
    const error = new HttpError("could not find the user for given ID", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    // to save the created place in DB
    await createdPlace.save({ session: sess });
    // save place ID to user collection
    await user.places.push(createdPlace); // initially it is an empty [ ] in user collection
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("creating place failed please try again", 500);
    return next(error);
  }
  res.status(201).json({ place: createdPlace });
};

// update requests
const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("plese check your data", 422);
  }
  const { title, description } = req.body;
  const placeID = req.params.pid;

  let place;
  // first find the item by place id and make a copy
  try {
    place = await Place.findById(placeID);
  } catch (err) {
    const error = new HttpError(
      "something went wrong could not update the place.",
      500
    );
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You are not allowed to edit this place", 401);
    return next(error);
  }

  place.title = title;
  place.description = description;

  // now update the original
  try {
    await place.save();
  } catch (e) {
    const error = new HttpError(
      "something went wrong could not update the place..",
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject() });
};

// delete requests
const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (e) {
    const error = new HttpError(
      "something went wrong could not delete the place..",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("could not find the place for this ID", 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to Delete this place",
      404
    );
    return next(error);
  }

  // get the path for deleting images
  // const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    // delete image from cloudinary
    await cloudinary.uploader.destroy(place.cloudinary_id);
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (e) {
    const error = new HttpError(
      "something went wrong could not delete the place..",
      500
    );
    return next(error);
  }

  // delete image using unlink
  // fs.unlink(imagePath, (err) => {
  //   console.log(err);
  // });

  res.status(200).json({ message: "deleted successfully!" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
exports.getAllPlaces = getAllPlaces;
