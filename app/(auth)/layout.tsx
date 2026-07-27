import Image from "next/image";
import { FlowLine } from "@/components/shared/FlowLine";

export default function AuthLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
 <div className="relative flex min-h-screen items-center justify-center bg-bg-base">
 {/* Flow Line watermark behind auth card */}
 <FlowLine className="h-40 opacity-60" />

 {/* Brand lockup */}
 <div className="relative z-10 flex w-full max-w-md flex-col items-center px-4">
 {/* SCIC Logo area */}
 <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-[#121C21] p-1.5 border border-slate-200/80 dark:border-white/10 shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <Image
              src="/logo.png"
              alt="SCIC THEPP Logo"
              width={64}
              height={64}
              className="h-full w-full object-contain rounded-xl dark:hidden"
              priority
            />
            <Image
              src="/logo-dark.png"
              alt="SCIC THEPP Dark Logo"
              width={64}
              height={64}
              className="hidden h-full w-full object-contain rounded-xl dark:block"
              priority
            />
          </div>
 <div className="text-center">
            <h1 className="font-display text-xl font-semibold text-text-primary">
              SCIC THEPP
            </h1>
 <p className="mt-0.5 text-xs text-text-muted">
 Site Operations Portal
 </p>
 </div>
 </div>

 {/* Auth form (Clerk component) */}
 <div className="w-full">{children}</div>

 {/* SCIC tagline */}
 <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-text-muted">
 Sta. Clara International Corporation · Renew Your Energy
 </p>
 </div>
 </div>
 );
}
