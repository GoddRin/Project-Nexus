"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AtlasMarkdownRendererProps {
  content: string;
}

export const AtlasMarkdownRenderer: React.FC<AtlasMarkdownRendererProps> = ({ content }) => {
  return (
    <div className="atlas-ai-markdown space-y-2 text-sm leading-relaxed text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-white mt-3 mb-1.5 border-b border-white/10 pb-1 font-mono tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-sky-400 mt-2.5 mb-1 font-mono tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-slate-200 mt-2 mb-1 uppercase tracking-wider font-mono">
              {children}
            </h3>
          ),
          p: ({ node, children }) => {
            const hasBlockChild = (node as any)?.children?.some(
              (child: any) =>
                child.tagName === "img" ||
                child.tagName === "table" ||
                child.tagName === "pre" ||
                child.tagName === "div"
            );
            if (hasBlockChild) {
              return <div className="text-xs leading-relaxed text-slate-200 mb-2 last:mb-0">{children}</div>;
            }
            return <p className="text-xs leading-relaxed text-slate-200 mb-2 last:mb-0">{children}</p>;
          },
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-300 mb-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-0.5 text-xs text-slate-300 mb-2">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-0.5 leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-white bg-sky-500/10 px-1 py-0.5 rounded text-[11px] font-mono border border-sky-500/20">
              {children}
            </strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-sky-400/60 pl-2.5 py-0.5 my-2 text-xs italic text-slate-300 bg-white/5 rounded-r">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2.5 rounded-lg border border-white/10 bg-slate-900/60 shadow-inner">
              <table className="min-w-full divide-y divide-white/10 text-left text-[11px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-800/80 font-mono text-slate-300 uppercase tracking-wider text-[10px]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/5 text-slate-300 font-sans">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-white/5 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-2.5 py-1.5 font-medium border-b border-white/10 font-mono">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2.5 py-1.5 text-slate-200">
              {children}
            </td>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-black/40 text-sky-300 font-mono text-[10px] border border-white/10">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
