import neonRequiem from "@/assets/poster-neon-requiem.jpg";
import midnightLedger from "@/assets/poster-midnight-ledger.jpg";
import paperLanterns from "@/assets/poster-paper-lanterns.jpg";
import doubleShift from "@/assets/poster-double-shift.jpg";
import rustkeeper from "@/assets/poster-rustkeeper.jpg";
import monsoonLetters from "@/assets/poster-monsoon-letters.jpg";

export const POSTERS: Record<string, string> = {
  "neon-requiem": neonRequiem,
  "midnight-ledger": midnightLedger,
  "paper-lanterns": paperLanterns,
  "double-shift": doubleShift,
  rustkeeper: rustkeeper,
  "monsoon-letters": monsoonLetters,
};

export function posterFor(slug: string) {
  return POSTERS[slug] ?? neonRequiem;
}

export type SeatTier = "Silver" | "Gold" | "Premium";

export const TIERS: { tier: SeatTier; rows: string[]; price: number }[] = [
  { tier: "Silver", rows: ["A", "B", "C"], price: 150 },
  { tier: "Gold", rows: ["D", "E", "F"], price: 250 },
  { tier: "Premium", rows: ["G", "H", "I"], price: 400 },
];

export const SEATS_PER_ROW = 10;
export const TOTAL_SEATS = TIERS.length * 3 * SEATS_PER_ROW;

export function tierForSeat(seat: string): SeatTier {
  const row = seat.charAt(0);
  return TIERS.find((t) => t.rows.includes(row))?.tier ?? "Silver";
}

export function priceForSeat(seat: string): number {
  const row = seat.charAt(0);
  return TIERS.find((t) => t.rows.includes(row))?.price ?? 150;
}

export function totalFor(seats: string[]): number {
  return seats.reduce((sum, seat) => sum + priceForSeat(seat), 0);
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function bookingReference(): string {
  return `BKG-${Date.now().toString().slice(-8)}`;
}

export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const diff = Math.round(
    (new Date(date.toDateString()).getTime() - new Date(today.toDateString()).getTime()) / 86400000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function dateTimeLabel(iso: string): string {
  return `${dayLabel(iso)}, ${timeLabel(iso)}`;
}

export function durationLabel(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
