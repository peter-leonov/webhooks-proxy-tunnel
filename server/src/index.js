const http = require("http");

let counter = 0;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html");
  counter++;
  res.write(`<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
>`);
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
    `<p><form method="POST" action="."><input type="text" name="name" value="example value for POST"><button type="submit">POST</button></form></p>`
  );
  res.write(
    `<p><button onclick="fetch('.', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'example value for PATCH' }) }).then(response => response.text()).then(text => document.write(text))">PATCH</button></p>`
  );
  res.write(`Request body:<hr><p><pre><code>`);
  req.pipe(res, { end: true });
});

const PORT = Number(process.argv[2] || "3000");
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
