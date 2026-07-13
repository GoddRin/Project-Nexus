"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, X, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxUser = {
  id: string;
  name: string;
  role?: string;
};

type Props = {
  /** name attr used in the hidden input submitted to the form action */
  inputName?: string;
  users: ComboboxUser[];
  defaultValue?: string; // userId
  defaultQuery?: string; // raw text if no userId
  placeholder?: string;
  required?: boolean;
  fallbackName?: string; // name attribute for a hidden input containing the raw query text
};

export function UserCombobox({
  inputName = "assignedToId",
  users,
  defaultValue = "",
  placeholder = "Search or type a name...",
  required = false,
  fallbackName,
  defaultQuery = "",
}: Props) {
  const defaultUser = users.find((u) => u.id === defaultValue);

  const [query, setQuery] = useState(defaultUser?.name || defaultQuery);
  const [selectedId, setSelectedId] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // HTML5 Form Validation hook
  useEffect(() => {
    if (required && inputRef.current) {
      if (!selectedId) {
        inputRef.current.setCustomValidity("Please select a valid user from the dropdown.");
      } else {
        inputRef.current.setCustomValidity("");
      }
    }
  }, [required, selectedId]);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = useCallback((user: ComboboxUser) => {
    setQuery(user.name);
    setSelectedId(user.id);
    setOpen(false);
  }, []);

  const handleClear = useCallback(() => {
    setQuery("");
    setSelectedId("");
    inputRef.current?.focus();
    setOpen(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedId(""); // typing deselects — will submit empty (Unassigned)
    setOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Hidden input that actually goes to the form action */}
      <input type="hidden" name={inputName} value={selectedId} />
      {fallbackName && (
        <input type="hidden" name={fallbackName} value={query} />
      )}

      {/* Combobox input */}
      <div
        className={cn(
          "flex items-center gap-2 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-sm text-text-primary transition-colors",
          open && "border-flow-teal ring-1 ring-flow-teal"
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none placeholder:text-text-muted/50 text-text-primary"
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-text-muted hover:text-text-primary transition-colors"
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-muted transition-transform",
              open && "rotate-180"
            )}
          />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/[0.08] bg-bg-panel shadow-xl overflow-hidden">
          {/* Unassigned option */}
          {!required && (
            <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              setSelectedId("");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-text-muted hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05]">
              <User className="h-3.5 w-3.5 text-text-muted" />
            </div>
            <span>Unassigned</span>
          </button>
          )}

          {filtered.length > 0 ? (
            <div className="border-t border-white/[0.05] max-h-52 overflow-y-auto">
              {filtered.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(user)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors",
                    selectedId === user.id
                      ? "bg-flow-teal/10 text-flow-teal"
                      : "text-text-primary hover:bg-white/[0.04]"
                  )}
                >
                  {/* Avatar initials */}
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      selectedId === user.id
                        ? "bg-flow-teal/20 text-flow-teal"
                        : "bg-white/[0.08] text-text-muted"
                    )}
                  >
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="truncate font-medium">{user.name}</span>
                    {user.role && (
                      <span className="text-[11px] text-text-muted truncate">
                        {user.role.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim().length > 0 ? (
            <div className="border-t border-white/[0.05] px-3 py-3 text-xs text-text-muted">
              No matching users.{" "}
              <span className="text-flow-teal">
                &ldquo;{query}&rdquo; will be left unassigned.
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
