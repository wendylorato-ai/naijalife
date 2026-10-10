import "./globals.css";

export const metadata = {
  title: "NaijaLife — Lekki",
  description: "NaijaLife 3D Lagos life simulation — fullscreen district, improved character and city."
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
