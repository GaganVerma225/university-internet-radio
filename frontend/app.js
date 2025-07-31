const express = require("express");
const path = require("path");
const app = express();

const PORT = 8000;

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Open broadcaster: http://192.168.55.60:8000/broadcaster.html`);
  console.log(`Open listener:   http://192.168.55.60:8000/listener.html`);
});
