import type { Metadata } from "next";
import { Pixelify_Sans, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/site";
import { PALETTE_CSS_VARS } from "@/lib/palette";
import { BlockedScreen } from "@/components/BlockedScreen";
import { ToastHost } from "@/components/pixel/ToastHost";
import "./globals.css";

// Only the weights the site actually draws, Latin subset, swap so text never
// waits on a font. next/font self-hosts them: no third-party font CSS.

// Display: titles, buttons, labels and HUD text. 500 for labels, 700 for titles.
const pixelDisplay = Pixelify_Sans({
  variable: "--f-display",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

// Body copy.
const bodySans = Instrument_Sans({
  variable: "--f-body",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// Code and the posting textarea. Always left-aligned.
const codeMono = JetBrains_Mono({
  variable: "--f-code",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
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
      logo: `${SITE_URL}/icon.png`,
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
      className={`${pixelDisplay.variable} ${bodySans.variable} ${codeMono.variable} h-full antialiased dark`}
      style={PALETTE_CSS_VARS}
    >
      <body className="min-h-full flex flex-col bg-ink text-paper">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <BlockedScreen />
        <ToastHost />
        <Analytics />
      </body>
    </html>
  );
}
