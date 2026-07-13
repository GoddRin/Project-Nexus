import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
 title: "Project Nexus — Site Operations Portal",
 description:
 "Site Operations Portal for Tumauini Hydroelectric Power Plant. Internal operations management by Sta. Clara International Corporation.",
};

import { Providers } from "./providers";

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="en" suppressHydrationWarning className={cn("h-full subpixel-antialiased", "font-sans", geist.variable)}>
 <body className="min-h-full flex flex-col bg-background text-foreground">
 <Providers>
 {children}
 </Providers>
 </body>
 </html>
 );
}
