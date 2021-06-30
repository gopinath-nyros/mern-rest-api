const express = require("express");

const { check } = require("express-validator");

// import error handling model
const HttpError = require("../models/http-error");

// import check-auth
const checkAuth = require("../middleware/check-auth");

// import the places controller
const placesController = require("../controllers/places-controller");
const fileUpload = require("../middleware/file-upload");

const router = express.Router();

// places
router.get("/:pid", placesController.getPlaceById);

// users
router.get("/user/:uid", placesController.getPlacesByUserId);

router.use(checkAuth);

// post requests
router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesController.createPlace
);

// update requests
router.patch(
  "/:pid",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  placesController.updatePlace
);

// delete requests
router.delete("/:pid", placesController.deletePlace);

module.exports = router;
