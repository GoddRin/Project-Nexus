"use client";

import React, { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, ImageIcon, Loader2, PenLine, Pin, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createNewsPost, deleteNewsPost, updateNewsPost, type NewsPostInput } from "@/lib/actions/newsPosts";

// The preview's markdown renderer is fetched only when the composer is opened on its Preview tab
const Markdown = dynamic(() => import("./Markdown").then((m) => m.Markdown), {
  loading: () => <div className="home-shimmer h-40 w-full" aria-hidden />,
});

export interface ComposerPost {
  id: string;
  title: string;
  category: string;
  excerpt: string | null;
  body: string;
  coverImage: string | null;
  projectId: string | null;
  pinned: boolean;
  expiresAt: string | null;
}

export interface NewsComposerDialogProps {
  categories: { value: string; label: string }[];
  projects: { id: string; name: string }[];
  covers: { src: string; label: string }[];
  /** editing an existing post (an "Edit" button); absent for a new one (a "New Post" button) */
  post?: ComposerPost;
}

const field =
  "w-full rounded-xl border border-border-subtle bg-bg-panel px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-scic-green focus:outline-none focus:ring-2 focus:ring-scic-green/25";
const label = "home-eyebrow mb-1.5 block";

const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");

/**
 * The Newsroom composer: title, category, optional project, excerpt, markdown body with a live
 * preview, a cover photograph (one of the project photographs, or an https address), pin and
 * expiry. Shown only to roles that may publish; the server checks the role again on every save.
 */
export function NewsComposerDialog({ categories, projects, covers, post }: NewsComposerDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const blank: NewsPostInput = { title: "", category: categories[0]?.value ?? "ANNOUNCEMENT", excerpt: "", body: "", coverImage: "", projectId: "", pinned: false, expiresAt: "" };
  const initial: NewsPostInput = post
    ? { title: post.title, category: post.category, excerpt: post.excerpt ?? "", body: post.body, coverImage: post.coverImage ?? "", projectId: post.projectId ?? "", pinned: post.pinned, expiresAt: toLocalInput(post.expiresAt) }
    : blank;
  const [form, setForm] = useState<NewsPostInput>(initial);
  const set = <K extends keyof NewsPostInput>(key: K, value: NewsPostInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: "" }));
  };

  const submit = () => {
    startTransition(async () => {
      // (the expiry is typed in the viewer's local time: send it as an exact instant)
      const payload = { ...form, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : "" };
      const result = post ? await updateNewsPost(post.id, payload) : await createNewsPost(payload);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(post ? "Post updated" : "Post published", { description: form.title });
      setOpen(false);
      if (!post) setForm(blank);
      router.refresh();
    });
  };

  const remove = () => {
    if (!post || !window.confirm(`Remove "${post.title}" from the Newsroom?`)) return;
    startTransition(async () => {
      const result = await deleteNewsPost(post.id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Post removed");
      setOpen(false);
      router.push(result.href);
      router.refresh();
    });
  };

  const openComposer = (next: boolean) => {
    setOpen(next);
    if (next) {
      setForm(initial);
      setErrors({});
      setTab("write");
    }
  };

  const err = (key: string) => (errors[key] ? <p className="mt-1 text-xs text-scic-red">{errors[key]}</p> : null);
  const cover = (form.coverImage as string) || "";

  return (
    <Dialog open={open} onOpenChange={(next) => openComposer(next)}>
      {/* (the dialog is opened by state: this project's dialog trigger renders its own button) */}
      {post ? (
        <button type="button" onClick={() => openComposer(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-subtle px-3 text-sm font-medium text-text-primary hover:bg-bg-panel-subtle">
          <PenLine className="h-4 w-4" aria-hidden /> Edit
        </button>
      ) : (
        <button
          type="button"
          onClick={() => openComposer(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--home-solid)] px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--home-solid-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40"
        >
          <Plus className="h-4 w-4" aria-hidden /> New Post
        </button>
      )}
      <DialogContent className="max-h-[92vh] w-[min(96vw,760px)] max-w-none overflow-y-auto sm:max-w-none">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{post ? "Edit post" : "New Newsroom post"}</DialogTitle>
          <DialogDescription>Posts appear on Nexus Home for everyone in the company. Write facts you can stand behind.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <label className={label} htmlFor="np-title">Title</label>
            <input id="np-title" className={field} value={form.title} maxLength={140} required onChange={(e) => set("title", e.target.value)} placeholder="What happened?" />
            {err("title")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="np-category">Category</label>
              <select id="np-category" className={field} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {err("category")}
            </div>
            <div>
              <label className={label} htmlFor="np-project">Project (optional)</label>
              <select id="np-project" className={field} value={(form.projectId as string) || ""} onChange={(e) => set("projectId", e.target.value)}>
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="np-excerpt">Excerpt (optional, shown in the feed)</label>
            <input id="np-excerpt" className={field} value={(form.excerpt as string) || ""} maxLength={280} onChange={(e) => set("excerpt", e.target.value)} placeholder="One or two sentences" />
            {err("excerpt")}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="home-eyebrow" htmlFor="np-body">Body (markdown)</label>
              <div role="tablist" aria-label="Body view" className="inline-flex rounded-lg border border-border-subtle p-0.5 text-xs">
                {(["write", "preview"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium capitalize transition-colors", tab === t ? "bg-[var(--home-solid)] text-white" : "text-text-muted hover:text-text-primary")}
                  >
                    {t === "write" ? <PenLine className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {tab === "write" ? (
              <textarea
                id="np-body"
                className={cn(field, "min-h-[220px] resize-y font-mono text-[13px] leading-6")}
                value={form.body}
                required
                maxLength={20000}
                onChange={(e) => set("body", e.target.value)}
                placeholder={"Write the story.\n\n**Bold**, *italic*, [links](https://...), lists and tables are supported."}
              />
            ) : (
              <div className="min-h-[220px] rounded-xl border border-border-subtle bg-bg-panel-subtle p-4">
                {form.body.trim() ? <Markdown>{form.body}</Markdown> : <p className="text-sm text-text-muted">Nothing to preview yet.</p>}
              </div>
            )}
            {err("body")}
          </div>

          <div>
            <label className={label} htmlFor="np-cover">Cover photograph (optional)</label>
            <div className="flex gap-3">
              <div className="flex h-[72px] w-[108px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-bg-panel-subtle text-text-muted">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a small preview of whatever address was typed
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <input id="np-cover" className={field} value={cover} onChange={(e) => set("coverImage", e.target.value)} placeholder="https://… or pick a project photograph below" />
                <select
                  aria-label="Pick a project photograph"
                  className={field}
                  value={covers.some((c) => c.src === cover) ? cover : ""}
                  onChange={(e) => set("coverImage", e.target.value)}
                >
                  <option value="">Project photographs…</option>
                  {covers.map((c) => (
                    <option key={c.src} value={c.src}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {err("coverImage")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-subtle px-3 py-2.5 text-sm text-text-primary">
              <input type="checkbox" className="h-4 w-4 accent-[var(--scic-green)]" checked={!!form.pinned} onChange={(e) => set("pinned", e.target.checked)} />
              <Pin className="h-4 w-4 text-scic-green" aria-hidden />
              Pin to the top of the Newsroom
            </label>
            <div>
              <label className={label} htmlFor="np-expires">Expires (optional)</label>
              <input id="np-expires" type="datetime-local" className={field} value={(form.expiresAt as string) || ""} onChange={(e) => set("expiresAt", e.target.value)} />
              {err("expiresAt")}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {post && (
                <button type="button" onClick={remove} disabled={pending} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-scic-red hover:bg-scic-red/10 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" aria-hidden /> Remove
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl border border-border-subtle px-4 text-sm font-medium text-text-secondary hover:bg-bg-panel-subtle">
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--home-solid)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--home-solid-hover)] disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {post ? "Save changes" : "Publish"}
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
