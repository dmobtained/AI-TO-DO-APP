import './globals.css'
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-datadenkt-navy text-datadenkt-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
