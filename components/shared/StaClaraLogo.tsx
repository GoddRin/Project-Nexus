import { cn } from "@/lib/utils";

export function StaClaraLogo({ className }: { className?: string }) {
 return (
 <svg 
 viewBox="0 0 32 32" 
 fill="currentColor" 
 xmlns="http://www.w3.org/2000/svg"
 className={cn(className)}
 >
 <path d="M16 2L2 9V23L16 30L30 23V9L16 2ZM16 5.5L26 10.5L16 15.5L6 10.5L16 5.5ZM4 12.5L14 17.5V26.5L4 21.5V12.5ZM18 26.5V17.5L28 12.5V21.5L18 26.5Z" />
 </svg>
 );
}
