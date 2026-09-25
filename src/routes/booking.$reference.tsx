import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Ticket } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, dateTimeLabel, posterFor } from "@/lib/cinema";

export const Route = createFileRoute("/booking/$reference")({
  head: () => ({
    meta: [
      { title: "Booking confirmed — Cineverse" },
      { name: "description", content: "Your Cineverse ticket summary and booking reference." },
      { property: "og:title", content: "Booking confirmed — Cineverse" },
      { property: "og:description", content: "Your ticket summary and booking reference." },
    ],
  }),
  component: BookingConfirmation,
});

function BookingConfirmation() {
  const { reference } = Route.useParams();
  const { user, loading } = useAuth();

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["booking", reference, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "reference, seats, total_amount, status, created_at, showtimes(screen, theatre, starts_at, movies(title, slug))",
        )
        .eq("reference", reference)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loading || isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Ticket not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user
            ? "We couldn't find a booking with this reference on your account."
            : "Log in to view this booking."}
        </p>
        <Button asChild className="mt-6">
          <Link to={user ? "/" : "/auth"} search={user ? {} : { mode: "login" }}>
            {user ? "Browse movies" : "Log in"}
          </Link>
        </Button>
      </div>
    );
  }

  const show = data.showtimes as unknown as {
    screen: string;
    theatre: string;
    starts_at: string;
    movies: { title: string; slug: string };
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-8" />
        </span>
        <h1 className="mt-4 font-display text-4xl">Booking confirmed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your seats are locked in. Show this reference at the counter.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-4 border-b border-dashed border-border p-5">
          <img
            src={posterFor(show.movies.slug)}
            alt=""
            loading="lazy"
            width={704}
            height={1056}
            className="h-24 w-16 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0">
            <h2 className="truncate font-display text-2xl">{show.movies.title}</h2>
            <p className="text-sm text-muted-foreground">
              {show.theatre} · {show.screen}
            </p>
            <p className="text-sm text-muted-foreground">{dateTimeLabel(show.starts_at)}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-5 p-5 text-sm">
          <div>
            <dt className="text-xs tracking-wider text-muted-foreground uppercase">Booking ref</dt>
            <dd className="font-mono font-semibold text-primary">{data.reference}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wider text-muted-foreground uppercase">Status</dt>
            <dd className="font-semibold text-success">{data.status}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wider text-muted-foreground uppercase">Seats</dt>
            <dd className="font-semibold">{data.seats.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wider text-muted-foreground uppercase">Total paid</dt>
            <dd className="font-display text-2xl text-foreground">{formatINR(data.total_amount)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/my-bookings">
            <Ticket className="size-4" /> My bookings
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/">Book another movie</Link>
        </Button>
      </div>
    </div>
  );
}
