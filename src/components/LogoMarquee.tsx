import Image from 'next/image';

interface LogoMarqueeProps {
  companies: { name: string; logo: string }[];
}

export function LogoMarquee({ companies }: LogoMarqueeProps) {
  if (companies.length === 0) return null;

  return (
    <section className="py-12 bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 text-center mb-8">
          Featured Companies
        </p>
      </div>

      {/* Animated marquee */}
      <div className="marquee-container relative overflow-hidden">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-[var(--background)] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-[var(--background)] to-transparent z-10" />

        {/* Scrolling track: two copies for seamless loop */}
        <div className="marquee-track flex items-center gap-8 sm:gap-12">
          {companies.map((company, i) => (
            <div key={`a-${i}`} className="flex-shrink-0 w-[100px] h-[40px] sm:w-[120px] sm:h-[48px] relative grayscale opacity-60">
              <Image
                src={company.logo}
                alt={company.name}
                fill
                className="object-contain"
                sizes="120px"
              />
            </div>
          ))}
          {companies.map((company, i) => (
            <div key={`b-${i}`} className="flex-shrink-0 w-[100px] h-[40px] sm:w-[120px] sm:h-[48px] relative grayscale opacity-60" aria-hidden="true">
              <Image
                src={company.logo}
                alt=""
                fill
                className="object-contain"
                sizes="120px"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Static fallback for reduced motion */}
      <div className="marquee-static hidden max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12">
          {companies.map((company, i) => (
            <div key={i} className="w-[100px] h-[40px] sm:w-[120px] sm:h-[48px] relative grayscale opacity-60">
              <Image
                src={company.logo}
                alt={company.name}
                fill
                className="object-contain"
                sizes="120px"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
