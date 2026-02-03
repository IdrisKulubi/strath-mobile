import { Metadata } from "next";
import { ensureStartsWith } from "./utils";



const { TWITTER_CREATOR, TWITTER_SITE } = process.env;
const twitterCreator = TWITTER_CREATOR
  ? ensureStartsWith(TWITTER_CREATOR, "@")
  : undefined;
const twitterSite = TWITTER_SITE
  ? ensureStartsWith(TWITTER_SITE, "https://")
  : undefined;
export function constructMetadata({
  title = "Strathspace - Find Your Perfect Match at Strathspace",
  description = "Connect with fellow students and find meaningful relationships",
  image = "https://res.cloudinary.com/db0i0umxn/image/upload/v1770120805/Screenshot_2026-02-03_151259_juqoxn.png",
  icons = "/favicon.ico",
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  icons?: string;
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
        },
      ],
    },
    ...(twitterCreator &&
      twitterSite && {
        twitter: {
          card: "summary_large_image",
          creator: twitterCreator,
          site: twitterSite,
        },
      }),
    icons,
    metadataBase: new URL("https://strathspace.com/"),
    ...(noIndex && {
      robots: {
        index: true,
        follow: true,
      },
    }),
  };
}