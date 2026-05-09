import { useNavigate } from "react-router-dom";

export default function Requests() {
  const navigate = useNavigate();

  return (
    <div>
      <button
        onClick={() => navigate("/dashboard")}
        className="text-xs text-black/40 hover:text-black transition-colors mb-4 flex items-center gap-1"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <h1 className="text-lg sm:text-xl font-semibold text-black tracking-[-0.02em] mb-6">Requests</h1>
      <div className="glass-card rounded-xl p-6 sm:p-8 text-center">
        <p className="text-xs sm:text-sm text-black/40">No requests yet.</p>
        <p className="text-xs text-black/30 mt-1">Your API requests will appear here once you start using Locus.</p>
      </div>
    </div>
  );
}
