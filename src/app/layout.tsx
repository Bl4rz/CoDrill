import type { Metadata } from "next";
import { Pixelify_Sans, Press_Start_2P, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/site";
import { PALETTE_CSS_VARS } from "@/lib/palette";
import { BlockedScreen } from "@/components/BlockedScreen";
import "./globals.css";

// Display: titles, buttons, labels and HUD text only. Pixelify Sans stays legible
// at small sizes on a phone, which Press Start 2P does not.
const pixelDisplay = Pixelify_Sans({
  variable: "--f-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// The big titles only (CODRILL, RUN COMPLETE, GAME OVER?). Pixelify Sans draws a
// nearly closed C that reads as an O at title size; this one does not.
const titleFont = Press_Start_2P({
  variable: "--f-title",
  subsets: ["latin"],
  weight: "400",
});

// Body copy. Readable, and not Inter.
const bodySans = IBM_Plex_Sans({
  variable: "--f-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Code and the posting textarea. Always left-aligned.
const codeMono = JetBrains_Mono({
  variable: "--f-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

// Organization/WebSite/SoftwareApplication, not LocalBusiness — Codrill is a
// web-only product with no physical address, and LocalBusiness schema
// requires one (fabricating an address would be misleading structured data,
// not a real improvement).
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free",
      },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixelDisplay.variable} ${titleFont.variable} ${bodySans.variable} ${codeMono.variable} h-full antialiased dark`}
      style={PALETTE_CSS_VARS}
    >
      <body className="min-h-full flex flex-col bg-ink text-paper">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <BlockedScreen />
        <Analytics />
      </body>
    </html>
  );
}
