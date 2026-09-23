import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TIERS,
  SEATS_PER_ROW,
  formatINR,
  totalFor,
  bookingReference,
  dateTimeLabel,
  posterFor,
} from "@/lib/cinema";

export const Route = createFileRoute("/book/$showtimeId")({
  head: () => ({
    meta: [
      { title: "Choose your seats — Cineverse" },
      {
        name: "description",
        content: "Pick Silver, Gold or Premium seats on the live seat map and confirm your booking.",
      },
      { property: "og:title", content: "Choose your seats — Cineverse" },
      {
        property: "og:description",
        content: "Interactive seat map with live pricing for your selected show.",
      },
    ],
  }),
  component: SeatSelection,
});

function SeatSelection() {
  const { showtimeId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [booking, setBooking] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["showtime", showtimeId],
    queryFn: async () => {
      const { data: show, error } = await supabase
        .from("showtimes")
        .select("id, screen, theatre, starts_at, total_seats, movies(title, slug, certificate)")
        .eq("id", showtimeId)
        .maybeSingle();
      if (error) throw error;

      const { data: seats, error: seatError } = await supabase
        .from("booked_seats")
        .select("seat_code")
        .eq("showtime_id", showtimeId);
      if (seatError) throw seatError;

      return { show, booked: new Set((seats ?? []).map((s) => s.seat_code)) };
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }
  if (!data?.show) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Show not found</h1>
        <Button asChild className="mt-6">
          <Link to="/">Back to movies</Link>
        </Button>
      </div>
    );
  }

  const { show, booked } = data;
  const movie = show.movies as unknown as { title: string; slug: string; certificate: string };
  const total = totalFor(selected);

  function toggleSeat(seat: string) {
    if (booked.has(seat)) return;
    setSelected((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat].sort(),
    );
  }

  async function confirmBooking() {
    if (!user) {
      navigate({
        to: "/auth",
        search: { mode: "login", redirect: `/book/${showtimeId}` },
      });
      toast.info("Please log in to confirm your booking.");
      return;
    }
    if (selected.length === 0) return;

    setBooking(true);
    const reference = bookingReference();
    try {
      const { data: created, error } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          showtime_id: showtimeId,
          reference,
          seats: selected,
          total_amount: total,
        })
        .select("id, reference")
        .single();
      if (error) throw error;

      const { error: seatError } = await supabase.from("booked_seats").insert(
        selected.map((seat) => ({
          showtime_id: showtimeId,
          booking_id: created.id,
          seat_code: seat,
        })),
      );
      if (seatError) {
        toast.error("Someone just grabbed one of those seats. Please pick again.");
        setSelected([]);
        await refetch();
        return;
      }

      navigate({ to: "/booking/$reference", params: { reference: created.reference } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-40">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={posterFor(movie.slug)}
            alt=""
            loading="lazy"
            width={704}
            height={1056}
            className="h-16 w-11 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl sm:text-3xl">{movie.title}</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {show.theatre} · {show.screen} · {dateTimeLabel(show.starts_at)}
            </p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/movie/$slug" params={{ slug: movie.slug }}>
            Change show
          </Link>
        </Button>
      </div>

      <div className="mt-10 overflow-x-auto">
        <div className="mx-auto w-fit">
          <div className="screen-glow mx-auto mb-8 h-10 w-full max-w-md rounded-t-[50%] border-t-2 border-primary/70" />
          <p className="mb-8 text-center text-xs tracking-[0.3em] text-muted-foreground uppercase">
            Screen this way
          </p>

          {TIERS.map((tier) => (
            <div key={tier.tier} className="mb-7">
              <div className="mb-2 flex items-center justify-between gap-6 text-xs">
                <span className="font-semibold tracking-wider uppercase" style={{ color: `var(--tier-${tier.tier.toLowerCase()})` }}>
                  {tier.tier}
                </span>
                <span className="text-muted-foreground">{formatINR(tier.price)}</span>
              </div>
              <div className="space-y-2">
                {tier.rows.map((row) => (
                  <div key={row} className="flex items-center gap-2">
                    <span className="w-4 text-center text-[11px] text-muted-foreground">{row}</span>
                    <div className="flex gap-1.5">
                      {Array.from({ length: SEATS_PER_ROW }, (_, i) => {
                        const seat = `${row}${i + 1}`;
                        const isBooked = booked.has(seat);
                        const isSelected = selected.includes(seat);
                        return (
                          <button
                            key={seat}
                            type="button"
                            disabled={isBooked}
                            onClick={() => toggleSeat(seat)}
                            aria-label={`Seat ${seat}${isBooked ? " (booked)" : ""}`}
                            aria-pressed={isSelected}
                            className={`seat-node ${isBooked ? "seat-booked" : ""} ${
                              isSelected ? "seat-selected" : ""
                            }`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="seat-node size-4" /> Available
            </span>
            <span className="flex items-center gap-2">
              <span className="seat-node seat-selected size-4" /> Selected
            </span>
            <span className="flex items-center gap-2">
              <span className="seat-node seat-booked size-4" /> Booked
            </span>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">No seats selected yet</span>
              ) : (
                <>
                  <span className="text-muted-foreground">
                    {selected.length} seat{selected.length === 1 ? "" : "s"}:{" "}
                  </span>
                  <span className="font-medium">{selected.join(", ")}</span>
                </>
              )}
            </p>
            <p className="font-display text-2xl text-primary">{formatINR(total)}</p>
          </div>
          <Button size="lg" disabled={selected.length === 0 || booking} onClick={confirmBooking}>
            {booking && <Loader2 className="size-4 animate-spin" />}
            Confirm Booking
          </Button>
        </div>
      </div>
    </div>
  );
}
