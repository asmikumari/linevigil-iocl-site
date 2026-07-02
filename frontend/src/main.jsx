import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo
    });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0F0D] flex items-center justify-center p-6 text-slate-300 font-mono">
          <div className="max-w-2xl w-full glass-panel border border-red-500/30 rounded-2xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl"></div>
            <div className="flex items-center space-x-3 mb-6 border-b border-red-500/20 pb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <h1 className="text-sm font-black text-red-400 uppercase tracking-widest">CRITICAL SYSTEM ERROR CAUGHT</h1>
            </div>
            <p className="text-xs font-bold text-white mb-4 uppercase tracking-wider">
              {this.state.error && this.state.error.toString()}
            </p>
            <div className="bg-black/50 border border-slate-900 rounded-xl p-4 overflow-auto max-h-60 custom-scrollbar text-[9px] text-slate-500 leading-normal whitespace-pre-wrap uppercase">
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>
            <div className="mt-6 flex justify-between items-center text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
              <span>Identity: LineVigil Integrity Sys</span>
              <button 
                onClick={() => { window.location.href = '/'; localStorage.clear(); }} 
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded transition-all"
              >
                Reset Session Cache
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Initialize theme from localStorage so pages without Header (e.g. Login)
// reflect user preference immediately on load.
try {
  const preferred = localStorage.getItem('theme');
  if (preferred === 'light') document.body.classList.add('light');
  else document.body.classList.remove('light');
} catch (e) {
  // ignore if localStorage isn't available in some environments
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
