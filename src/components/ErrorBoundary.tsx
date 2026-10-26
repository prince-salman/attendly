import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Attendly ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch (e) {
      // ignore
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-6 antialiased">
          <div className="max-w-lg w-full bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/10">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Pemulihan Sistem Antarmuka Attendly
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Terjadi kendala saat merender komponen antarmuka.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-slate-950/80 rounded-2xl font-mono text-[11px] text-rose-300 break-all border border-rose-500/20 max-h-40 overflow-auto">
                <div className="font-bold text-rose-400 mb-1">Pesan Kesalahan:</div>
                {this.state.error.toString()}
              </div>
            )}

            <div className="text-[11px] text-slate-400 leading-relaxed">
              Jika baru saja memperbarui data atau lisensi institusi, klik <strong>Reset Cache & Pulihkan</strong> untuk menyegarkan penyimpanan lokal browser.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Muat Ulang Halaman
              </button>

              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Hapus cache localStorage dan muat ulang bersih"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Cache & Pulihkan
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
