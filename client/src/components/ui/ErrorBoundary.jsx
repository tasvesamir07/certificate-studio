import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] text-white p-6 font-sans text-center">
          <div className="max-w-md w-full bg-[#181818] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <span className="text-4xl">⚠️</span>
            <h1 className="text-xl font-bold m-0 text-red-400">Something went wrong</h1>
            <p className="text-sm text-[#b3b3b3] leading-relaxed m-0">
              An unexpected error occurred in the application. Please reload or go back to the editor.
            </p>
            <pre className="text-left text-xs bg-black/40 border border-white/5 p-4 rounded-lg overflow-x-auto w-full text-red-300 font-mono max-h-40">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#1ed760] text-black font-bold text-xs rounded-full hover:bg-[#1aa34a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer w-full mt-2"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
