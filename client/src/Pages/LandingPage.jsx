import React from "react";
import { useAppStore } from "../shared/store/useAppStore";

const LandingPage = ({ navigate }) => {
  const { isAuthenticated } = useAppStore();

  const handleStart = () => {
    if (isAuthenticated) {
      navigate("/generate-certificate");
    } else {
      navigate("/user/login");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#121212] text-white flex flex-col relative overflow-hidden font-sans select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#1ed760]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="w-full h-16 px-6 sm:px-12 flex items-center justify-between border-b border-white/5 bg-[#121212]/80 backdrop-blur-md z-50 sticky top-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-white to-[#1ed760] bg-clip-text text-transparent">
            Certificate Studio
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <button
              onClick={() => navigate("/generate-certificate")}
              className="px-4 py-1.5 bg-[#1ed760] text-black font-bold text-xs rounded-full hover:bg-[#1aa34a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              Go to Studio
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/user/login")}
                className="text-white/70 hover:text-white text-xs font-bold transition-all duration-200 cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/user/login")}
                className="px-4 py-1.5 bg-[#1ed760] text-black font-bold text-xs rounded-full hover:bg-[#1aa34a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:py-24 z-10">
        {/* Hero Section */}
        <section className="max-w-[800px] text-center flex flex-col items-center gap-6 mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] sm:text-xs font-bold text-[#1ed760] tracking-wide uppercase">
            ⚡ Clean, Fast & Automated
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] m-0 bg-gradient-to-b from-white to-[#b3b3b3] bg-clip-text text-transparent">
            Generate & Deliver Beautiful Certificates in Seconds
          </h1>
          <p className="text-sm sm:text-lg text-[#b3b3b3] max-w-[620px] leading-relaxed m-0 font-medium">
            Connect your Canva designs, import recipient data lists from Excel, place placeholders with real-time stage previews, and bulk deliver high-deliverability PDF credentials directly to your users' inboxes.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 w-full justify-center">
            <button
              onClick={handleStart}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#1ed760] text-black font-black rounded-full text-sm hover:bg-[#1aa34a] hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(30,215,96,0.3)] active:translate-y-0 select-none transition-all duration-200 cursor-pointer text-center"
            >
              Start Designing Now
            </button>
            {!isAuthenticated && (
              <button
                onClick={() => navigate("/user/login")}
                className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-full text-sm hover:-translate-y-0.5 active:translate-y-0 select-none transition-all duration-200 cursor-pointer text-center"
              >
                Create Free Account
              </button>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-[1000px] w-full flex flex-col items-center gap-12">
          <div className="text-center">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight m-0">Designed for Seamless Credentials Workflow</h2>
            <p className="text-xs sm:text-sm text-[#b3b3b3] mt-2 max-w-[500px]">Everything you need to customize, generate, deliver, and verify certificates in one beautiful interface.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[#181818]/60 border border-white/5 backdrop-blur-sm flex flex-col gap-3 hover:border-[#1ed760]/30 hover:bg-[#181818]/80 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-[#1ed760]/10 flex items-center justify-center text-lg text-[#1ed760]">
                🎨
              </div>
              <h3 className="text-lg font-bold m-0 text-white">Visual Design Stage</h3>
              <p className="text-xs sm:text-sm text-[#b3b3b3] leading-relaxed m-0">
                Drag-and-drop text placeholders, choose from an array of Google Fonts, customize alignments, dynamic wrapping, and set specific branding colors with live canvas previewing.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[#181818]/60 border border-white/5 backdrop-blur-sm flex flex-col gap-3 hover:border-[#1ed760]/30 hover:bg-[#181818]/80 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-[#1ed760]/10 flex items-center justify-center text-lg text-[#1ed760]">
                📊
              </div>
              <h3 className="text-lg font-bold m-0 text-white">Excel Bulk Automation</h3>
              <p className="text-xs sm:text-sm text-[#b3b3b3] leading-relaxed m-0">
                Upload your class list or registration spreadsheet and automatically populate recipient names, emails, and custom variables into separate high-fidelity PDF certificates.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[#181818]/60 border border-white/5 backdrop-blur-sm flex flex-col gap-3 hover:border-[#1ed760]/30 hover:bg-[#181818]/80 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-[#1ed760]/10 flex items-center justify-center text-lg text-[#1ed760]">
                📧
              </div>
              <h3 className="text-lg font-bold m-0 text-white">Smart Spam-Free Deliveries</h3>
              <p className="text-xs sm:text-sm text-[#b3b3b3] leading-relaxed m-0">
                Deliver credentials directly to primary inboxes. Using clean, standardized paragraphs-based email bodies instead of heavy templates minimizes triggers for spam filters.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-[#181818]/60 border border-white/5 backdrop-blur-sm flex flex-col gap-3 hover:border-[#1ed760]/30 hover:bg-[#181818]/80 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-[#1ed760]/10 flex items-center justify-center text-lg text-[#1ed760]">
                🔒
              </div>
              <h3 className="text-lg font-bold m-0 text-white">Instant QR Verification</h3>
              <p className="text-xs sm:text-sm text-[#b3b3b3] leading-relaxed m-0">
                Generate and embed secure QR codes on recipient certificates automatically. Anyone can scan to verify authenticity instantly on the web app.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Bottom Banner */}
        <section className="w-full max-w-[1000px] mt-16 sm:mt-24 p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-violet-900/20 to-[#1ed760]/5 border border-white/5 relative overflow-hidden flex flex-col items-center gap-4 text-center">
          <div className="absolute inset-0 bg-[#1ed760]/5 blur-[80px] pointer-events-none" />
          <h2 className="text-xl sm:text-3xl font-bold m-0 z-10">Streamline Your Certification Process Today</h2>
          <p className="text-xs sm:text-sm text-[#b3b3b3] max-w-[500px] m-0 z-10">No setup fees. Create templates, connect your Canva assets, and send credentials in minutes.</p>
          <button
            onClick={handleStart}
            className="px-8 py-3 bg-[#1ed760] text-black font-bold rounded-full text-sm hover:bg-[#1aa34a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer mt-2 z-10"
          >
            Get Started Free
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-white/5 bg-[#121212] text-[#7c7c7c] text-xs flex flex-col sm:flex-row items-center justify-between px-6 sm:px-12 gap-4">
        <span>&copy; {new Date().getFullYear()} Certificate Studio. All rights reserved.</span>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
