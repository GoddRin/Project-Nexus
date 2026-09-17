import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Fallback redirect route for /dashboard/digital-twin -> /digital-twin
 * Preserves the camera preset query parameters (e.g. ?preset=temfacil-office)
 */
export default async function DashboardDigitalTwinRedirect({ searchParams }: PageProps) {
  const params = await searchParams;
  const preset = params?.preset;

  if (typeof preset === "string" && preset.trim().length > 0) {
    redirect(`/digital-twin?preset=${encodeURIComponent(preset.trim())}`);
  }

  redirect("/digital-twin");
}
