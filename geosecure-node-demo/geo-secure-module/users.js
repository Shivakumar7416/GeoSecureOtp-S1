let users = {};

function addUser(adminEmail, userEmail, getUserRole) {
  if (getUserRole(adminEmail) !== "ADMIN") {
    throw new Error("Only admin can add users");
  }

  users[userEmail] = { enabled: true };
  return "User added";
}

function disableUser(adminEmail, userEmail, getUserRole) {
  if (getUserRole(adminEmail) !== "ADMIN") {
    throw new Error("Only admin can disable users");
  }

  if (users[userEmail]) users[userEmail].enabled = false;
  return "User disabled";
}

function isUserEnabled(email) {
  return users[email] && users[email].enabled;
}

module.exports = { addUser, disableUser, isUserEnabled };
