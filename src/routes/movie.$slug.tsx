import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Star, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { posterFor, durationLabel, dayLabel, timeLabel, TOTAL_SEATS, TIERS, formatINR } from "@/lib/cinema";

export const Route = createFileRoute("/movie/$slug")({
  head: ({ params }) => {
    const title = params.slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${title} — Showtimes & Tickets | Cineverse` },
        {
          name: "description",
          content: `See the synopsis, cast and today's showtimes for ${title}, then pick your seats at Cineverse.`,
        },
        { property: "og:title", content: `${title} — Showtimes & Tickets | Cineverse` },
        {
          property: "og:description",
          content: `Showtimes, seat availability and instant booking for ${title}.`,
        },
      ],
    };
  },
  component: MovieDetails,
});

type Showtime = {
  id: string;
  screen: string;
  theatre: string;
  starts_at: string;
  total_seats: number;
};

function MovieDetails() {
  const { slug } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["movie", slug],
    queryFn: async () => {
      const { data: movie, error } = await supabase
        .from("movies")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!movie) throw notFound();

      const { data: showtimes, error: stError } = await supabase
        .from("showtimes")
        .select("id, screen, theatre, starts_at, total_seats")
        .eq("movie_id", movie.id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at");
      if (stError) throw stError;

      const ids = (showtimes ?? []).map((s) => s.id);
      const taken: Record<string, number> = {};
      if (ids.length) {
        const { data: seats, error: seatError } = await supabase
          .from("booked_seats")
          .select("showtime_id")
          .in("showtime_id", ids);
        if (seatError) throw seatError;
        for (const row of seats ?? []) {
          taken[row.showtime_id] = (taken[row.showtime_id] ?? 0) + 1;
        }
      }

      return { movie, showtimes: (showtimes ?? []) as Showtime[], taken };
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }
  if (!data) return null;

  const { movie, showtimes, taken } = data;
  const grouped = showtimes.reduce<Record<string, Showtime[]>>((acc, show) => {
    const key = dayLabel(show.starts_at);
    (acc[key] ??= []).push(show);
    return acc;
  }, {});

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <img
          src={posterFor(movie.slug)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top opacity-25"
        />
        <div className="hero-fade absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[260px_minmax(0,1fr)]">
          <img
            src={posterFor(movie.slug)}
            alt={`${movie.title} poster`}
            width={704}
            height={1056}
            className="mx-auto w-44 rounded-xl shadow-[var(--shadow-poster)] md:mx-0 md:w-full"
          />
          <div className="min-w-0">
            <h1 className="font-display text-4xl leading-none sm:text-6xl">{movie.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge className="bg-accent text-accent-foreground">
                <Star className="mr-1 size-3 fill-current" />
                {Number(movie.rating).toFixed(1)}
              </Badge>
              <Badge variant="secondary">{movie.genre}</Badge>
              <Badge variant="secondary">{movie.language}</Badge>
              <Badge variant="outline">{movie.certificate}</Badge>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="size-4" /> {durationLabel(movie.duration_min)}
              </span>
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {movie.synopsis}
            </p>
            <div className="mt-5">
              <h2 className="font-display text-xl text-muted-foreground">Cast</h2>
              <p className="text-sm">{(movie.movie_cast ?? []).join(" · ")}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {TIERS.map((t) => (
                <span key={t.tier} className="rounded-md border border-border bg-card/70 px-3 py-1.5">
                  {t.tier} · {formatINR(t.price)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="font-display text-3xl">Select a showtime</h2>
        <p className="text-sm text-muted-foreground">Cineverse Grand · 3 screens</p>

        {showtimes.length === 0 ? (
          <p className="mt-6 rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
            No upcoming shows for this movie right now.
          </p>
        ) : (
          <div className="mt-8 space-y-8">
            {Object.entries(grouped).map(([day, shows]) => (
              <div key={day}>
                <h3 className="mb-3 font-display text-2xl text-primary">{day}</h3>
                <div className="space-y-4">
                  {Object.entries(
                    shows.reduce<Record<string, Showtime[]>>((acc, s) => {
                      (acc[s.screen] ??= []).push(s);
                      return acc;
                    }, {}),
                  ).map(([screen, screenShows]) => (
                    <div
                      key={screen}
                      className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{screen}</p>
                        <p className="text-xs text-muted-foreground">Dolby Atmos</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {screenShows.map((show) => {
                          const left = (show.total_seats ?? TOTAL_SEATS) - (taken[show.id] ?? 0);
                          return (
                            <Link
                              key={show.id}
                              to="/book/$showtimeId"
                              params={{ showtimeId: show.id }}
                              className="group rounded-lg border border-border bg-secondary/40 px-4 py-2 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/15"
                            >
                              <span className="block text-sm font-semibold">
                                {timeLabel(show.starts_at)}
                              </span>
                              <span
                                className={
                                  left <= 15
                                    ? "flex items-center justify-center gap-1 text-[11px] text-primary"
                                    : "flex items-center justify-center gap-1 text-[11px] text-muted-foreground"
                                }
                              >
                                <Users className="size-3" /> {left} seats left
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
