import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <Link to="/" className="flex items-center gap-2 mb-6 justify-center">
          <img src="/locus-logo.png" alt="Locus" className="w-7 h-7" />
          <span className="font-semibold text-black text-lg">Locus</span>
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-lg sm:text-xl font-semibold text-black tracking-[-0.02em]">Create your account</h1>
          <p className="mt-1 text-xs text-black/40">Start coding with Locus in minutes</p>
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <form onSubmit={(e) => { e.preventDefault(); navigate("/dashboard"); }} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-black/60 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused(null)}
                placeholder="John Doe"
                className={`w-full bg-white/50 border rounded-xl px-3.5 py-2.5 text-sm text-black placeholder:text-black/20 outline-none transition-all ${
                  focused === "name"
                    ? "border-black/20 bg-white/70 shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                    : "border-black/8"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-black/60 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                placeholder="you@example.com"
                className={`w-full bg-white/50 border rounded-xl px-3.5 py-2.5 text-sm text-black placeholder:text-black/20 outline-none transition-all ${
                  focused === "email"
                    ? "border-black/20 bg-white/70 shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                    : "border-black/8"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-black/60 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                placeholder="••••••••"
                className={`w-full bg-white/50 border rounded-xl px-3.5 py-2.5 text-sm text-black placeholder:text-black/20 outline-none transition-all ${
                  focused === "password"
                    ? "border-black/20 bg-white/70 shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                    : "border-black/8"
                }`}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-black/90 active:scale-[0.98]"
            >
              Create Account
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-black/35 mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-black font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
