async function accessFile(userEmail, fileId, services) {
  const { getUserRole, isUserEnabled, getBoundary, verifyLocation, getFiles } = services;

  if (getUserRole(userEmail) === "ADMIN") {
    return "Admin access granted";
  }

  if (!isUserEnabled(userEmail)) {
    return "User blocked";
  }

  const boundary = getBoundary();
  if (!boundary) {
    return "No boundary set";
  }

  const locationAllowed = await verifyLocation(boundary);
  if (!locationAllowed) {
    return "Access denied due to location";
  }

  const file = getFiles().find(f => f.id === fileId && f.active);
  if (!file) {
    return "File not available";
  }

  return "File access granted";
}

module.exports = { accessFile };
