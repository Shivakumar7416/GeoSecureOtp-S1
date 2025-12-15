let boundary = null;

function setBoundary(adminEmail, lat, lon, radius, getUserRole) {
  if (getUserRole(adminEmail) !== "ADMIN") {
    throw new Error("Only admin can set boundary");
  }

  boundary = { lat, lon, radius };
  return "Access boundary set successfully";
}

function getBoundary() {
  return boundary;
}

module.exports = { setBoundary, getBoundary };
