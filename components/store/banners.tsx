"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Banner } from "@/lib/store-types";

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const banner = banners[index];

  useEffect(() => {
    if (banners.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % banners.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (!banner) {
    return null;
  }

  const image = (
    <>
      <img
        src={banner.imageDesktop}
        alt={banner.title}
        className="hidden h-[70vh] min-h-80 w-full object-cover md:block"
      />
      <img
        src={banner.imageMobile}
        alt={banner.title}
        className="h-[70vh] min-h-80 w-full object-cover md:hidden"
      />
    </>
  );

  return (
    <section className="relative bg-black">
      {banner.linkUrl ? (
        <Link href={banner.linkUrl} className="block">
          {image}
        </Link>
      ) : (
        image
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-6 md:p-10">
        <p className="text-2xl font-semibold tracking-tight md:text-4xl">{banner.title}</p>
        {banner.subtitle ? (
          <p className="mt-2 max-w-xl text-sm text-white/80 md:text-base">{banner.subtitle}</p>
        ) : null}
      </div>
      {banners.length > 1 ? (
        <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
          {banners.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Banner ${itemIndex + 1}`}
              onClick={() => setIndex(itemIndex)}
              className={`h-2 w-2 rounded-full ${itemIndex === index ? "bg-[#f5c518]" : "bg-white/40"}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
