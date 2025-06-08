const http = require("http");

let counter = 0;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html");
  counter++;
  res.write(`<p>Request #${counter}!</p><p>\n`);
  res.write(`<p><pre><code>`);
  res.write(`${req.method} ${req.url}\n`);
  res.write(
    `${Object.entries(req.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n")}`
  );
  res.write(`</code></pre></p>\n`);
  res.write(
    `<form method="POST" action="."><input type="text" name="name" placeholder="Enter your name"><button type="submit">Submit</button></form></p>`
  );
  res.write(`Request body:<hr><p><pre><code>`);
  req.pipe(res, { end: true });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
