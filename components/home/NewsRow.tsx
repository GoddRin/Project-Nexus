import React, { Suspense } from "react";
import { NewsComposer } from "@/components/home/news/NewsComposer";
import { Newsroom } from "@/components/home/news/Newsroom";
import { TrendingNow } from "@/components/home/news/TrendingNow";
import { getCompanyFeed } from "@/lib/home/companyFeed";
import { getAllTrending } from "@/lib/home/newsAggregator";

/** Server loader for the Newsroom: the feed's first thirty items, and the composer for publisher roles */
export async function NewsroomSection() {
  const feed = await getCompanyFeed({ limit: 30 });
  return (
    <Newsroom
      initial={feed}
      composer={
        // (keyed: the element crosses from the server into a client component's children)
        <Suspense key="composer" fallback={null}>
          <NewsComposer />
        </Suspense>
      }
    />
  );
}

/** Server loader for Trending Now: all four sections (each cached thirty minutes) */
export async function TrendingSection() {
  return <TrendingNow initial={await getAllTrending()} />;
}
