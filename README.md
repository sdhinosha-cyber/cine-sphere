# Cine Sphere

Build a modern, full-stack responsive Online Movie Ticket Booking Application with a slick, dark-themed UI (Netflix/Behance inspired).

Key Features & Page Layouts to Build:

1. Navigation & Authentication:
- Header with Logo, Global Search Bar, Navigation Links, and Auth controls.
- Guest view: Show "Login" / "Register" buttons.
- Signed-in view: Display user profile, "My Bookings" link, and Logout button.
- Build modal or dedicated pages for Login & Registration (email, name, password) with form validations.

2. Home Page (Movie Listing & Filtering):
- Responsive grid displaying movie cards with high-quality poster images, Title, Genre, Language, and Ratings.
- Real-time instant search bar for filtering movies by title.
- Filter controls for Genre (Action, Drama, Comedy, Thriller) and Language.
- Clicking a card opens the Movie Details page.

3. Movie Details & Show-time Selection:
- Display movie poster, title, synopsis, duration, cast, genre, and rating.
- List available showtimes grouped by theatre screen and date (e.g., Today, Tomorrow).
- Each showtime badge must clearly display remaining available seats.
- Clicking a showtime proceeds to the Interactive Seat Selection view.

4. Interactive Seat Selection Map:
- Seat map grid separated into categories (Silver, Gold, Premium).
- Clear color indicators: Available (Grey), Selected (Red/Primary), Booked (Disabled/Dark Grey).
- Interactive clicking to select/deselect multiple seats.
- Dynamic live price calculation bar at the bottom showing selected seats list and total amount (₹).
- "Confirm Booking" action button that requires login.

5. Ticket Booking & Confirmation:
- Summary page showing Movie Title, Show Time, Screen, Selected Seats, Total Price, and a unique Booking Reference (e.g., BKG-17109283).
- Instant success state feedback after confirming.

6. Booking History Page (/my-bookings):
- View past ticket history sorted by most recent first.
- Show Ticket Cards with Booking Ref, Movie details, Seats booked, Total Paid, and Status (Confirmed).

Design & Styling:
- Dark Mode Theme: Pure black/dark grey background (#0f0f15) with bold red (#e50914) or vibrant accent highlights.
- Smooth CSS hover effects on movie cards, buttons, and seat map nodes.
- Fully mobile-responsive layout for desktop, tablet, and mobile views.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/40d8b8d0-145b-4a92-8f56-f378a237d58b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
