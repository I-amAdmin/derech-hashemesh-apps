import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL as string);
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
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div dir="rtl" style={{ fontFamily: "sans-serif", padding: "2rem", color: "#333" }}>
          <h1 style={{ color: "#c00" }}>אירעה שגיאה בטעינת האפליקציה</h1>
          <p>אנא רענן את הדף. אם הבעיה נמשכת, פנה לתמיכה.</p>
          <details style={{ marginTop: "1rem", background: "#f5f5f5", padding: "1rem", borderRadius: "6px" }}>
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

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
