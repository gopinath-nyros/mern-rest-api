const axios = require("axios");
const HttpError = require("../models/http-error");
// const GOOGLE_API = 'AIzaSyAPXNpjUXR7TnmYq-cJSVkMn5g1aA-irTU'
const API_KEY = process.env.POSITION_STACK_API;

// async function getCoordinates(address) {
//     const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API}`)
//     const response = await axios.get(`http://api.positionstack.com/v1/forward?access_key=${API_KEY}&query=${address}`)
//     const data = response.data;
//     if (!data) {
//         const error = new HttpError('could not find the location for the given address', 422)
//         throw error;
//     }
//     const latitude = data.data[0].latitude;
//     const longitude = data.data[0].longitude;
//     console.log(`lat is ${latitude} and lng is ${longitude}`);
//     return coordinates = {
//         lat: latitude,
//         lng: longitude
//     };
// }

// dummy function if api is not working, we just send some coordinates
function getCoordinates(address) {
  return (coordinates = {
    lat: 13.0827,
    lng: 80.2707,
  });
}
module.exports = getCoordinates;
