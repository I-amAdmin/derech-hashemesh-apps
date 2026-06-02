import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

try {
  const { setBaseUrl } = await import("@workspace/api-client-react");
  if (import.meta.env.VITE_API_URL) {
    setBaseUrl(import.meta.env.VITE_API_URL as string);
    console.log("[main] API base URL set to", import.meta.env.VITE_API_URL);
  }
} catch (e) {
  console.error("[main] Failed to configure API base URL:", e);
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] caught render error:", error, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div dir="rtl" style={{ fontFamily: "sans-serif", padding: "2rem", color: "#333" }}>
          <h1 style={{ color: "#c00" }}>אירעה שגיאה בטעינת האפליקציה</h1>
          <p>אנא רענן את הדף. אם הבעיה נמשכת, פנה לתמיכה.</p>
          <details open style={{ marginTop: "1rem", background: "#f5f5f5", padding: "1rem", borderRadius: "6px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>פרטי השגיאה</summary>
            <pre style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  const container = document.getElementById("root");
  if (!container) throw new Error('Element #root not found in document');
  createRoot(container).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
} catch (e) {
  console.error("[main] Fatal error mounting React app:", e);
  const body = document.body;
  body.innerHTML = `
    <div dir="rtl" style="font-family:sans-serif;padding:2rem;color:#333">
      <h1 style="color:#c00">שגיאה קריטית — האפליקציה לא נטענה</h1>
      <p>אנא רענן את הדף או פנה לתמיכה.</p>
      <pre style="background:#f5f5f5;padding:1rem;border-radius:6px;white-space:pre-wrap;font-size:0.85rem">${String(e)}</pre>
    </div>`;
}
