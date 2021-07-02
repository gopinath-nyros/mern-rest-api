const axios = require("axios");
const HttpError = require("../models/http-error");
const API_KEY = process.env.POSITION_STACK_API;

async function getCoordinates(address) {
  const response = await axios.get(
    `http://api.positionstack.com/v1/forward?access_key=${API_KEY}&query=${address}`
  );
  const data = response.data;
  if (!data) {
    const error = new HttpError(
      "could not find the location for the given address",
      422
    );
    throw error;
  }
  const latitude = data.data[0].latitude;
  const longitude = data.data[0].longitude;
  return (coordinates = {
    lat: latitude,
    lng: longitude,
  });
}

module.exports = getCoordinates;
