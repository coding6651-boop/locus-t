import { useNavigate } from "react-router-dom";

export default function Account() {
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
      <h1 className="text-lg sm:text-xl font-semibold text-black tracking-[-0.02em] mb-6">Account</h1>

      <div className="glass-card rounded-xl p-4 sm:p-5 space-y-4">
        <div>
          <p className="text-[10px] sm:text-xs text-black/40 mb-1">Email</p>
          <p className="text-sm text-black">user@example.com</p>
        </div>
        <div className="border-t border-black/5" />
        <div>
          <p className="text-[10px] sm:text-xs text-black/40 mb-1">Plan</p>
          <p className="text-sm text-black">Starter</p>
        </div>
        <div className="border-t border-black/5" />
        <div>
          <p className="text-[10px] sm:text-xs text-black/40 mb-1">License Status</p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-sm text-black">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
