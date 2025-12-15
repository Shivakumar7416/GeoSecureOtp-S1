const ADMIN_EMAILS = ["admin@gmail.com"];

function getUserRole(email) {
  return ADMIN_EMAILS.includes(email) ? "ADMIN" : "USER";
}

module.exports = { getUserRole };
