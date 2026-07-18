"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignOutPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    signOut().then(() => {
      router.push("/sign-in");
    });
  }, [signOut, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-bg-base text-text-primary">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Signing you out...</h2>
        <p className="text-sm text-text-muted">Clearing session cookies.</p>
      </div>
    </div>
  );
}
