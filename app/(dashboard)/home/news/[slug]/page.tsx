import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, MapPinned, Pin, UserRound } from "lucide-react";
import { Markdown } from "@/components/home/news/Markdown";
import { NewsComposer } from "@/components/home/news/NewsComposer";
import { COMPANY_NAME } from "@/lib/home/companyFacts";
import { HOME_HREF, atlasHref } from "@/lib/home/links";
import { NEWS_CATEGORY_LABEL, getNewsPostBySlug, readingMinutes } from "@/lib/home/newsPosts";

type Props = { params: Promise<{ slug: string }> };

const longDate = (d: Date) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsPostBySlug(slug).catch(() => null);
  if (!post) return { title: `Newsroom — ${COMPANY_NAME}` };
  return { title: `${post.title} — SCIC Newsroom`, description: post.excerpt ?? undefined };
}

/** One Newsroom post: cover, category, author, date and reading time, the story, its project. */
export default async function NewsPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getNewsPostBySlug(slug).catch(() => null);
  if (!post) notFound();
  const local = !!post.coverImage && post.coverImage.startsWith("/");

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 md:px-6 lg:pb-12">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href={`${HOME_HREF}#newsroom`} className="group inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
          Nexus Home
        </Link>
        <NewsComposer
          post={{
            id: post.id, title: post.title, category: post.category, excerpt: post.excerpt, body: post.body, coverImage: post.coverImage,
            projectId: post.projectId, pinned: post.pinned, expiresAt: post.expiresAt ? post.expiresAt.toISOString() : null,
          }}
        />
      </div>

      {post.coverImage && (
        <div className="atlas-skeleton relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-3xl border border-border-hairline">
          {local ? (
            <Image src={post.coverImage} alt="" fill priority quality={90} sizes="(max-width: 768px) 200vw, 1536px" className="object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- an author-supplied address on any host
            <img src={post.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
      )}

      <header>
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-scic-green/30 bg-scic-green/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-scic-green dark:text-scic-green-bright">
            {NEWS_CATEGORY_LABEL[post.category]}
          </span>
          {post.pinned && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
              <Pin className="h-3 w-3" aria-hidden /> Pinned
            </span>
          )}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-text-primary md:text-4xl">{post.title}</h1>
        {post.excerpt && <p className="mt-3 text-lg leading-7 text-text-secondary">{post.excerpt}</p>}
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" aria-hidden />{post.author.name}</span>
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden /><time dateTime={post.publishedAt.toISOString()}>{longDate(post.publishedAt)}</time></span>
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" aria-hidden />{readingMinutes(post.body)} min read</span>
        </p>
      </header>

      <hr className="my-6 border-border-hairline" />
      <Markdown>{post.body}</Markdown>

      {post.project && (
        <aside className="glass-scic-card mt-10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="home-eyebrow">Related project</p>
              <p className="mt-1 truncate font-display text-lg font-semibold text-text-primary">{post.project.name}</p>
            </div>
            <Link href={atlasHref(post.project.slug)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-scic-green px-3.5 text-sm font-medium text-white hover:bg-scic-green-energy">
              <MapPinned className="h-4 w-4" aria-hidden /> Open on the National Map
            </Link>
          </div>
        </aside>
      )}
    </article>
  );
}
