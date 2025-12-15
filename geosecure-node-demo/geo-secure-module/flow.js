const { getUserRole } = require("./role");
const { setBoundary, getBoundary } = require("./boundary");
const { addUser, disableUser, isUserEnabled } = require("./users");
const { verifyLocation } = require("./geolocation");
const { uploadFile, disableFile, getFiles } = require("./files");
const { accessFile } = require("./access");

// AFTER OTP VERIFIED
async function afterOtpSuccess(email) {
  return getUserRole(email);
}

module.exports = {
  getUserRole,
  setBoundary,
  addUser,
  uploadFile,
  accessFile,
  services: {
    getUserRole,
    isUserEnabled,
    getBoundary,
    verifyLocation,
    getFiles
  }
};
