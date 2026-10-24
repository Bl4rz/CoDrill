import type { Metadata } from "next";
import { Pixelify_Sans, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { PALETTE_CSS_VARS } from "@/lib/palette";
import "./globals.css";

// Display: titles, buttons, labels and HUD text only. Pixelify Sans stays legible
// at small sizes on a phone, which Press Start 2P does not.
const pixelDisplay = Pixelify_Sans({
  variable: "--f-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    default: `${SITE_NAME} — AI Mock Technical Interviews`,
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
    title: `${SITE_NAME} — AI Mock Technical Interviews`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — AI Mock Technical Interviews`,
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
        description: "First mock interview session is free",
      },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixelDisplay.variable} ${bodySans.variable} ${codeMono.variable} h-full antialiased dark`}
      style={PALETTE_CSS_VARS}
    >
      <body className="min-h-full flex flex-col bg-ink text-paper">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
