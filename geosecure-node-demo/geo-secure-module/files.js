let files = [];

function uploadFile(adminEmail, fileName, getUserRole) {
  if (getUserRole(adminEmail) !== "ADMIN") {
    throw new Error("Only admin can upload files");
  }

  const file = {
    id: "file_" + Date.now(),
    name: fileName,
    active: true
  };

  files.push(file);
  return "File uploaded";
}

function disableFile(adminEmail, fileId, getUserRole) {
  if (getUserRole(adminEmail) !== "ADMIN") {
    throw new Error("Only admin can manage files");
  }

  const file = files.find(f => f.id === fileId);
  if (file) file.active = false;
  return "File disabled";
}

function getFiles() {
  return files;
}

module.exports = { uploadFile, disableFile, getFiles };
