"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Pin } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { timeAgo } from "@/lib/home/time";
import type { CompanyFeedItem } from "@/lib/home/types";
import { FEED_LABEL } from "./FeedRow";

/**
 * The lead story of the Newsroom: the pinned post, else the newest item with a photograph, else
 * the newest item. A large card with its cover (a slow push-in under the pointer), a scrim so
 * the title reads on any photograph, the category, the title and the excerpt. A story without a
 * photograph gets the brand's own backdrop (aurora and contours) with the company mark, not a
 * stock picture.
 */
export function FeaturedStory({ item, now }: { item: CompanyFeedItem; now: Date | null }) {
  const local = !!item.coverImage && item.coverImage.startsWith("/");
  const inner = (
    <>
      <div className="absolute inset-0 overflow-hidden">
        {item.coverImage ? (
          local ? (
            <Image
              src={item.coverImage}
              alt=""
              fill
              quality={90}
              sizes="(max-width: 1024px) 200vw, 1280px"
              className="object-cover transition-transform duration-[9000ms] ease-out group-hover:scale-[1.08] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- an author-supplied address on any host
            <img src={item.coverImage} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-[9000ms] ease-out group-hover:scale-[1.08] motion-reduce:transition-none" />
          )
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--scic-navy-dark)_0%,color-mix(in_srgb,var(--scic-green)_42%,var(--scic-navy-dark))_62%,color-mix(in_srgb,var(--scic-green-energy)_70%,var(--scic-navy-dark))_100%)]">
            <div className="home-aurora" aria-hidden>
              <i />
              <i />
              <i />
            </div>
            <div className="home-contours" aria-hidden />
            <BrandLogo variant="mark" height={132} className="absolute right-6 top-6 opacity-25 [&_img:first-child]:hidden [&_img:last-child]:block" />
          </div>
        )}
        {/* scrim: always dark, so the white title reads on any photograph in either theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/5" aria-hidden />
      </div>
      <div className="relative flex h-full min-h-[320px] flex-col justify-end p-5 md:p-6">
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-scic-green px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            {FEED_LABEL[item.category] ?? item.category}
          </span>
          {item.pinned && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
              <Pin className="h-3 w-3" aria-hidden /> Pinned
            </span>
          )}
        </p>
        <h3 className="mt-2.5 font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-white md:text-[1.75rem]">{item.title}</h3>
        {item.excerpt && <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-white/80">{item.excerpt}</p>}
        <p className="mt-3 flex items-center justify-between gap-3 font-mono text-[11px] text-white/70">
          <span className="truncate">
            {[item.kind === "PRESS" ? item.source : item.projectName, now && item.publishedAt ? timeAgo(item.publishedAt, now) : null].filter(Boolean).join(" · ")}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-sans text-sm font-medium text-white">
            Read {item.external ? <ArrowUpRight className="h-4 w-4" aria-hidden /> : <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />}
          </span>
        </p>
      </div>
    </>
  );
  const cls =
    "group relative block h-full overflow-hidden rounded-2xl border border-border-hairline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green-energy";
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={item.href} className={cls}>
      {inner}
    </Link>
  );
}
