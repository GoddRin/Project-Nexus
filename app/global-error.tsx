"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070D12] text-[#EDEFF1] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#0E1720]/90 border border-[#1E293B] rounded-2xl p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono text-xl font-bold">
            SCIC
          </div>
          <h1 className="text-xl font-bold mb-2 text-white">System Reconnecting</h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            A temporary network or serverless function delay occurred while loading SCIC THEPP. Click below to reconnect immediately.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 rounded-xl bg-[#006699] hover:bg-[#005580] text-white text-xs font-semibold tracking-wide transition shadow-lg"
          >
            Reconnect Now
          </button>
        </div>
      </body>
    </html>
  );
}
