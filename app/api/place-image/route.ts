import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
  }

  // CUSTOM LOCAL IMAGE OVERRIDES
  if (query.toLowerCase().includes("tumauini community hospital")) {
    return NextResponse.json({ imageUrl: "/images/tumauini-hospital-2.jpg" });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    // 1. If Google Maps API Key exists, use it (Most reliable, official photos)
    if (apiKey) {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=photos&key=${apiKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();

      if (searchData.status === "OK" && searchData.candidates && searchData.candidates.length > 0) {
        const candidate = searchData.candidates[0];
        if (candidate.photos && candidate.photos.length > 0) {
          const photoRef = candidate.photos[0].photo_reference;
          return NextResponse.json({ 
            imageUrl: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${apiKey}` 
          });
        }
      }
    }

    // 2. FALLBACK: Free Bing Image Scraper (No API key or credit card required)
    // This scrapes the public Bing Image Search HTML for the first valid JPEG/PNG link
    // We append architectural keywords to force it to return building facades instead of people/news events.
    const enhancedQuery = `${query} building exterior`;
    const fallbackUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(enhancedQuery)}&first=1&ptb=`;
    const fallbackRes = await fetch(fallbackUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    const html = await fallbackRes.text();
    const match = html.match(/murl&quot;:&quot;(https:\/\/[^&]+?\.(?:jpg|jpeg|png))&quot;/i);
    
    if (match && match[1]) {
      return NextResponse.json({ imageUrl: match[1] });
    }

    // If both fail
    return NextResponse.json({ error: "No image found for this location" }, { status: 404 });
    
  } catch (error) {
    console.error("Image Fetch API error:", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
