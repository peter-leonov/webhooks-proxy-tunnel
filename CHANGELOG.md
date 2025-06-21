# Changelog

## 2025-06-21

### 🚀 Features

- **Inactivity and total request timeouts** added for better control.

- **Basic Auth** support.

### 🛠 Improvements

- **"Allow list" approach** replaces "block list" for improved access control logic.

- **Request handling** extracted and modularized.

### 🐛 Fixes

- Deployment now receives secrets correctly.

### 📦 Tooling

- **Command-line interface** enhancements and new commands (e.g., `generate-secret`, `rename-worker`).

### 📚 Documentation

- Clearer notes on WebSocket behavior and security practices.

## 2025-06-08

### 🚀 Features

- **Secure token-based authentication** using WebSocket headers and temporary tokens.

### 🛠 Improvements

- **Client-server communication improvements** using pre-flight requests and better error feedback.

### 📦 Tooling

- **Secret generation and management** streamlined with new CLI commands.

### 📚 Documentation

- Web UI polishing and test page styling.
- Enhanced token help text and explanations.
- Updated README and documentation to be more user/product-oriented.
- More consistent CLI messaging and error output.

## 2025-04-18

### 🚀 Features

- **Multiple tunnels** supported in one deployment.

### 🐛 Fixes

- Better error coverage when the target is down.

### 📚 Documentation

- Licensing synced and clarified.
- README and tunnel manual expanded with examples, curl usage, and step-by-step guides.

## 2025-04-07

### 🚀 Features

Initial release.

**Support for proxying HTTP requests** through a Cloudflare Worker using a single Durable Object.
