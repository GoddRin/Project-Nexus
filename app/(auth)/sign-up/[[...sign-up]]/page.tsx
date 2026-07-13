import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignUpPage() {
 return (
 <div className="flex justify-center">
 <SignUp
 appearance={{
 theme: dark,
 variables: {
 colorPrimary: "#1FB6A6",
 colorBackground: "#121C21",
 colorInput: "#182329",
 colorInputForeground: "#EDEFF1",
 colorForeground: "#EDEFF1",
 colorMutedForeground: "#7C8B91",
 colorBorder: "#22303688",
 borderRadius: "0.5rem",
 fontFamily: "'IBM Plex Sans', sans-serif",
 },
 elements: {
 card: "shadow-none border border-border-hairline",
 headerTitle: "font-display",
 formButtonPrimary:
 "bg-flow-teal hover:bg-flow-teal/90 text-bg-base font-medium",
 footerActionLink: "text-flow-teal hover:text-flow-teal/80",
 // Social / OAuth buttons
 socialButtonsBlockButton:
 "!bg-white/[0.08] !border !border-white/[0.12] hover:!bg-white/[0.14] !text-white !transition-all",
 socialButtonsBlockButtonText: "!text-white !font-medium",
 },
 }}
 fallbackRedirectUrl="/dashboard"
 />
 </div>
 );
}
