import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ticket } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, dateTimeLabel, posterFor } from "@/lib/cinema";

export const Route = createFileRoute("/my-bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — Cineverse" },
      {
        name: "description",
        content: "Your Cineverse ticket history with booking references, seats and amounts paid.",
      },
      { property: "og:title", content: "My Bookings — Cineverse" },
      { property: "og:description", content: "Your ticket history and booking references." },
    ],
  }),
  component: MyBookings;
});

type BookingRow = {
  id: string;
  reference: string;
  seats: string[];
  total_amount: number;
  status: string;
  created_at: string;
  showtimes: {
    screen: string;
    theatre: string;
    starts_at: string;
    movies: { title: string; slug: string };
  };
};

function MyBookings() {
  const { user, loading } = useAuth();

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, reference, seats, total_amount, status, created_at, showtimes(screen, theatre, starts_at, movies(title, slug))",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as BookingRow[];
    },
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Your bookings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Log in to see your ticket history and booking references.
        </p>
        <Button asChild className="mt-6">
          <Link to="/auth" search={{ mode: "login", redirect: "/my-bookings" }}>
            Log in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-display text-4xl">My Bookings</h1>
      <p className="text-sm text-muted-foreground">Most recent tickets first.</p>

      {isLoading ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
          <Ticket className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No bookings yet. Pick a movie and grab your seats.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">Browse movies</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {data.map((booking) => (
            <Link
              key={booking.id}
              to="/booking/$reference"
              params={{ reference: booking.reference }}
              className="block rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/60"
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <img
                  src={posterFor(booking.showtimes.movies.slug)}
                  alt=""
                  loading="lazy"
                  width={704}
                  height={1056}
                  className="h-24 w-16 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0">
                  <h2 className="truncate font-display text-2xl">
                    {booking.showtimes.movies.title}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {booking.showtimes.theatre} · {booking.showtimes.screen} ·{" "}
                    {dateTimeLabel(booking.showtimes.starts_at)}
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Seats: </span>
                    {booking.seats.join(", ")}
                  </p>
                  <p className="font-mono text-xs text-primary">{booking.reference}</p>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center">
                  <Badge className="bg-success/15 text-success">{booking.status}</Badge>
                  <span className="font-display text-2xl">{formatINR(booking.total_amount)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
