import React from 'react';

export default class ErrorBoundary extends React.Component {
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white rounded-2xl border border-red-100 shadow-xl p-8 max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-600">
              <i className="bi bi-exclamation-triangle-fill text-3xl" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Terjadi Kesalahan</h2>
            <p className="text-sm text-slate-500 leading-normal">
              Aplikasi mengalami kendala teknis saat memuat halaman ini. Silakan muat ulang halaman.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-2.5 text-white rounded-xl text-xs font-semibold shadow-sm transition hover:opacity-90 cursor-pointer min-h-[44px]"
                style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
              >
                Segarkan Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
