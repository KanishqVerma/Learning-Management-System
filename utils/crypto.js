// utils/crypto.js
const crypto = require("crypto");
require("dotenv").config();
const ALGO = "aes-256-gcm";
const KEY = process.env.PW_SECRET_KEY;
const KEY_BUF = Buffer.from(KEY, "base64"); // generate with: crypto.randomBytes(32).toString('base64')
function encrypt(text) {
  const iv = crypto.randomBytes(12); // 96-bit recommended for GCM
  const cipher = crypto.createCipheriv(ALGO, KEY_BUF, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store iv + tag + encrypted in base64
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decrypt(b64) {
  const data = Buffer.from(b64, "base64");
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY_BUF, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

module.exports = { encrypt, decrypt };
