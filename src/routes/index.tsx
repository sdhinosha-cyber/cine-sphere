import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Search, Star, Clock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { posterFor, durationLabel } from "@/lib/cinema";

type Movie = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  genre: string;
  language: string;
  rating: number;
  duration_min: number;
  certificate: string;
};

const GENRES = ["Action", "Drama", "Comedy", "Thriller"];

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" ? { q: search["q"] } : {},
  head: () => ({
    meta: [
      { title: "Now Showing — Cineverse Movie Tickets" },
      {
        name: "description",
        content:
          "Explore now-showing movies by genre and language, then pick your seats and book tickets instantly.",
      },
      { property: "og:title", content: "Now Showing — Cineverse Movie Tickets" },
      {
        property: "og:description",
        content: "Explore now-showing movies, choose showtimes and reserve your seats in seconds.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { q } = Route.useSearch();
  const [term, setTerm] = useState(q ?? "");
  const [genre, setGenre] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);

  useEffect(() => setTerm(q ?? ""), [q]);

  const { data: movies, isLoading } = useQuery({
    queryKey: ["movies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("id, slug, title, synopsis, genre, language, rating, duration_min, certificate")
        .order("rating", { ascending: false });
      if (error) throw error;
      return data as Movie[];
    },
  });

  const languages = useMemo(
    () => Array.from(new Set((movies ?? []).map((m) => m.language))),
    [movies],
  );

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return (movies ?? []).filter(
      (m) =>
        (!needle || m.title.toLowerCase().includes(needle)) &&
        (!genre || m.genre === genre) &&
        (!language || m.language === language),
    );
  }, [movies, term, genre, language]);

  const featured = movies?.[0];

  return (
    <div>
      {featured && (
        <section className="relative overflow-hidden">
          <img
            src={posterFor(featured.slug)}
            alt=""
            width={704}
            height={1056}
            className="absolute inset-0 h-full w-full object-cover object-top opacity-35"
          />
          <div className="hero-fade absolute inset-0" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
            <Badge className="mb-4 bg-primary text-primary-foreground">Featured this week</Badge>
            <h1 className="max-w-2xl font-display text-5xl leading-none sm:text-7xl">
              {featured.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              {featured.synopsis}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 text-accent">
                <Star className="size-4 fill-current" /> {featured.rating.toFixed(1)}
              </span>
              <span>{featured.genre}</span>
              <span>{featured.language}</span>
              <span className="flex items-center gap-1">
                <Clock className="size-4" /> {durationLabel(featured.duration_min)}
              </span>
            </div>
            <Button asChild size="lg" className="mt-7">
              <Link to="/movie/$slug" params={{ slug: featured.slug }}>
                Book tickets
              </Link>
            </Button>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-3xl">Now Showing</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} movie{filtered.length === 1 ? "" : "s"} available
            </p>
          </div>
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Filter by title..."
              aria-label="Filter movies by title"
              className="bg-secondary/60 pl-9"
            />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <FilterChip active={!genre && !language} onClick={() => { setGenre(null); setLanguage(null); }}>
            All
          </FilterChip>
          {GENRES.map((g) => (
            <FilterChip key={g} active={genre === g} onClick={() => setGenre(genre === g ? null : g)}>
              {g}
            </FilterChip>
          ))}
          {languages.map((l) => (
            <FilterChip
              key={l}
              active={language === l}
              onClick={() => setLanguage(language === l ? null : l)}
            >
              {l}
            </FilterChip>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-2/3 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No movies match your search. Try a different title or filter.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((movie) => (
              <Link
                key={movie.id}
                to="/movie/$slug"
                params={{ slug: movie.slug }}
                className="poster-card group block"
              >
                <div className="relative aspect-2/3 overflow-hidden">
                  <img
                    src={posterFor(movie.slug)}
                    alt={`${movie.title} poster`}
                    loading="lazy"
                    width={704}
                    height={1056}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-semibold text-accent backdrop-blur">
                    <Star className="size-3 fill-current" />
                    {movie.rating.toFixed(1)}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="truncate font-display text-xl leading-tight">{movie.title}</h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {movie.genre} · {movie.language} · {movie.certificate}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-all"
          : "rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/60 hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}
