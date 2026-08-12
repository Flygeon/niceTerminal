import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

// NOTE: React.StrictMode is intentionally NOT used. Its dev-only double-mount
// invokes effect cleanup, which disposes the xterm instance and kills the PTY
// session. A terminal app cannot tolerate that.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
