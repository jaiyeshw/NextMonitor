import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-slate-100 p-6 text-center">
      <h2 className="text-4xl font-extrabold font-mono text-blue-500 mb-2">404</h2>
      <p className="text-lg text-slate-300 mb-6">Page not found</p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
