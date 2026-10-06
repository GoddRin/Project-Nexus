import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * A Newsroom post's body. Markdown with tables, strikethrough and task lists (GFM); raw HTML in
 * the source is not rendered (react-markdown's default), and links leave in a new tab safely.
 * Styled with the SCIC tokens so it reads in both themes.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("space-y-4 text-[15px] leading-7 text-text-secondary", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h2 className="mt-8 font-display text-2xl font-bold tracking-[-0.02em] text-text-primary" {...p} />,
          h2: (p) => <h2 className="mt-8 font-display text-xl font-bold tracking-[-0.02em] text-text-primary" {...p} />,
          h3: (p) => <h3 className="mt-6 font-display text-lg font-semibold text-text-primary" {...p} />,
          p: (p) => <p {...p} />,
          strong: (p) => <strong className="font-semibold text-text-primary" {...p} />,
          a: ({ href, ...p }) => {
            const external = !!href && /^https?:\/\//i.test(href);
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="font-medium text-scic-green underline decoration-scic-green/40 underline-offset-2 hover:decoration-scic-green dark:text-scic-green-bright"
                {...p}
              />
            );
          },
          ul: (p) => <ul className="list-disc space-y-1.5 pl-5 marker:text-scic-green-energy" {...p} />,
          ol: (p) => <ol className="list-decimal space-y-1.5 pl-5 marker:font-mono marker:text-text-muted" {...p} />,
          blockquote: (p) => <blockquote className="border-l-2 border-scic-green-energy pl-4 italic text-text-primary" {...p} />,
          hr: () => <hr className="border-border-hairline" />,
          code: (p) => <code className="rounded bg-scic-green/10 px-1.5 py-0.5 font-mono text-[13px] text-text-primary" {...p} />,
          pre: (p) => <pre className="overflow-x-auto rounded-xl border border-border-hairline bg-bg-panel-subtle p-4 font-mono text-[13px]" {...p} />,
          table: (p) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...p} />
            </div>
          ),
          th: (p) => <th className="border-b border-border-subtle px-3 py-2 text-left font-semibold text-text-primary" {...p} />,
          td: (p) => <td className="border-b border-border-hairline px-3 py-2" {...p} />,
          // eslint-disable-next-line @next/next/no-img-element -- images inside a post come from any address the author used
          img: ({ alt, ...p }) => <img alt={alt ?? ""} loading="lazy" className="rounded-xl border border-border-hairline" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
