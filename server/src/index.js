const http = require("http");

let counter = 0;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  counter++;
  res.write(`Hello, World #${counter}!\n\n`);
  req.pipe(res, { end: true });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
