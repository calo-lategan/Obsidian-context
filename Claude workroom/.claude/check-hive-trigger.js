const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "hive-triggers");
try {
  const files = fs.readdirSync(dir).filter((f) => f.startsWith("trigger-"));
  if (files.length > 0) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf8"));
    console.log("[HIVE MESSAGE] " + data.message);
    files.forEach((f) => fs.unlinkSync(path.join(dir, f)));
  }
} catch (e) {
  // No triggers or dir missing — silent
}
