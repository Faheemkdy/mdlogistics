import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, AlertOctagon } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen flex flex-col items-center justify-center p-6 text-slate-800"
          style={{ background: '#e0e5ec', fontFamily: 'system-ui, sans-serif' }}
        >
          <div 
            className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white shadow-[20px_20px_40px_rgba(163,177,198,0.6),-20px_-20px_40px_rgba(255,255,255,0.8)] text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-500/10 border border-rose-500/20">
                <AlertOctagon size={40} strokeWidth={1.5} />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-slate-800">Something Went Wrong</h1>
              <p className="text-slate-500 text-sm font-semibold leading-relaxed">
                An unexpected system anomaly has been detected. To protect your data, this view has been safely paused.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200/50 text-left text-xs font-mono text-slate-600 max-h-40 overflow-y-auto custom-scrollbar break-all">
                {this.state.error.name}: {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 text-sm"
              >
                <RefreshCw size={16} />
                Reload App
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-4 px-6 rounded-2xl bg-white text-slate-600 hover:bg-slate-50 font-bold transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200 shadow-sm text-sm"
              >
                <Home size={16} />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
