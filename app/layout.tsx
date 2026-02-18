import './globals.css'
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const supabaseScript = `window.__SUPABASE_ENV__={url:${JSON.stringify(supabaseUrl)},key:${JSON.stringify(supabaseAnonKey)}};`
  return (
    <html lang="en">
      <body className="bg-datadenkt-navy text-datadenkt-white">
        <script dangerouslySetInnerHTML={{ __html: supabaseScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
