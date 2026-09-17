import { cn } from "@/lib/utils";

export function StaClaraLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
    >
      {/* Outer Hexagonal Heavy Engineering Shield */}
      <polygon
        points="20,2 37,11.5 37,28.5 20,38 3,28.5 3,11.5"
        className="fill-[#081B33] dark:fill-[#081B33] stroke-[#01770B] dark:stroke-[#10A51D]"
        strokeWidth="1.75"
      />
      {/* Inner Hydro Geometric Interlock */}
      <path
        d="M20 7L32 14V26L20 33L8 26V14L20 7Z"
        className="fill-[#01770B]/20 dark:fill-[#10A51D]/15"
      />
      {/* SCIC Dynamic S/C monogram vectors */}
      <path
        d="M13 15C13 13 16 11 20 11C24 11 27 13 27 16C27 20 14 20 14 24C14 27 17 29 21 29C25 29 27 27 27 27"
        stroke="url(#scic-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Renewable Energy Node */}
      <circle cx="27" cy="13" r="2" fill="#10A51D" className="animate-pulse" />
      <defs>
        <linearGradient id="scic-grad" x1="13" y1="11" x2="27" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10A51D" />
          <stop offset="0.6" stopColor="#01770B" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>
    </svg>
  );
}
