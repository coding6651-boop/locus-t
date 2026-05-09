import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ParallaxProvider } from "./components/ParallaxContext";
import { motion } from "framer-motion";
import { useParallax } from "./components/ParallaxContext";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { TrustLogos } from "./components/TrustLogos";
import { SectionDivider } from "./components/SectionDivider";
import { WhatIsLocus } from "./components/WhatIsLocus";
import { Features } from "./components/Features";
import { WhyLocus } from "./components/WhyLocus";
import { Stats } from "./components/Stats";
import { WhoItsFor } from "./components/WhoItsFor";
import { Terminal } from "./components/Terminal";
import { Pricing } from "./components/Pricing";
import { FAQ } from "./components/FAQ";
import { Newsletter } from "./components/Newsletter";
import { ScrollProgress } from "./components/ScrollProgress";
import { CursorLight } from "./components/CursorLight";
import { BackToTop } from "./components/BackToTop";
import { Footer } from "./components/Footer";
import Changelog from "./pages/Changelog";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Account from "./pages/Account";
import Requests from "./pages/Requests";

function ParallaxBackground() {
  const { y1, y2, y3, scale1, scale2, opacity1, opacity2, opacity3 } = useParallax();

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
      <motion.div
        className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-black/[0.03] to-transparent rounded-full blur-3xl"
        style={{ y: y1, scale: scale1, opacity: opacity1 }}
      />
      <motion.div
        className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-gradient-to-l from-black/[0.02] to-transparent rounded-full blur-3xl"
        style={{ y: y2, scale: scale2, opacity: opacity2 }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-gradient-to-tr from-black/[0.02] to-transparent rounded-full blur-3xl"
        style={{ y: y3, opacity: opacity3 }}
      />
    </div>
  );
}

function HomePage() {
  return (
    <>
      <ParallaxBackground />
      <CursorLight />
      <ScrollProgress />
      <main>
        <Hero />
        <SectionDivider />
        <TrustLogos />
        <SectionDivider />
        <WhatIsLocus />
        <Features />
        <WhyLocus />
        <SectionDivider />
        <Stats />
        <WhoItsFor />
        <Terminal />
        <Pricing />
        <FAQ />
        <Newsletter />
      </main>
    </>
  );
}

function AppContent() {
  const location = useLocation();
  const isAuth = location.pathname === "/login" || location.pathname === "/register";
  const isDashboard = location.pathname.startsWith("/dashboard");
  const showFooter = location.pathname !== "/changelog" && !isAuth && !isDashboard;

  return (
    <>
      {!isAuth && !isDashboard && <Nav />}
      {!isAuth && !isDashboard && <ParallaxBackground />}
      {!isAuth && !isDashboard && <CursorLight />}
      {!isAuth && !isDashboard && <ScrollProgress />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/requests" element={<Requests />} />
        <Route path="/dashboard/account" element={<Account />} />
      </Routes>
      {showFooter && <Footer />}
      {!isAuth && !isDashboard && <BackToTop />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ParallaxProvider>
        <div className="min-h-screen relative">
          <AppContent />
        </div>
      </ParallaxProvider>
    </BrowserRouter>
  );
}
