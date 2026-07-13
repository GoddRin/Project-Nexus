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
 <div className="mb-8 flex flex-col items-center gap-3">
 <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green">
 <svg
 viewBox="0 0 24 24"
 fill="none"
 className="h-7 w-7 text-white"
 aria-hidden="true"
 >
 <path
 d="M13 3L4 14h7l-2 7 9-11h-7l2-7z"
 fill="currentColor"
 />
 </svg>
 </div>
 <div className="text-center">
 <h1 className="font-display text-xl font-semibold text-text-primary">
 Project Nexus
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
