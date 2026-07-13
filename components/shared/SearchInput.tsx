"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search as SearchIcon } from "lucide-react";

interface SearchInputProps {
 placeholder?: string;
}

export function SearchInput({ placeholder = "Search..." }: SearchInputProps) {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const [, startTransition] = useTransition();

 const currentSearch = searchParams.get("search") ?? "";
 const [value, setValue] = useState(currentSearch);
 const [prevSearch, setPrevSearch] = useState(currentSearch);

 if (currentSearch !== prevSearch) {
 setPrevSearch(currentSearch);
 setValue(currentSearch);
 }

 // Debounced URL update
 useEffect(() => {
 const delayDebounceFn = setTimeout(() => {
 if (value === currentSearch) return;

 const params = new URLSearchParams(searchParams.toString());
 if (value) {
 params.set("search", value);
 } else {
 params.delete("search");
 }

 startTransition(() => {
 router.replace(`${pathname}?${params.toString()}`);
 });
 }, 300);

 return () => clearTimeout(delayDebounceFn);
 }, [value, currentSearch, pathname, router, searchParams]);

 return (
 <div className="relative w-full md:w-80">
 <input
 type="text"
 value={value}
 onChange={(e) => setValue(e.target.value)}
 placeholder={placeholder}
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 />
 <SearchIcon className="absolute left-3.5 top-2.5 h-4 w-4 text-text-muted/60" />
 </div>
 );
}
export default SearchInput;
