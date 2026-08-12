import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/md3-tokens.css";
import "./styles/global.css";

// Set initial mode attribute for MD3 token switching (light/dark).
// The settings store will update this dynamically.
document.documentElement.setAttribute("data-mode", "dark");

// NOTE: React.StrictMode is intentionally NOT used. Its dev-only double-mount
// invokes effect cleanup, which disposes the xterm instance and kills the PTY
// session. A terminal app cannot tolerate that.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
