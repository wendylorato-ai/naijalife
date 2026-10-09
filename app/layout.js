import "./globals.css";

export const metadata = {
  title: "NaijaLife — Lekki District",
  description: "Explore your Nigerian virtual life in a growing 3D city. Stage 1C playable district prototype."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
