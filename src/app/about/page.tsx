'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FadeIn, StaggerChildren, StaggerItem } from '@/components/ui/MotionWrappers';
import { Card } from '@/components/ui';

function IconBadge({
  color,
  children,
}: {
  color: 'zinc' | 'blue' | 'violet' | 'amber';
  children: React.ReactNode;
}) {
  const bgMap = {
    zinc: 'bg-zinc-100',
    blue: 'bg-blue-50',
    violet: 'bg-violet-50',
    amber: 'bg-amber-50',
  };
  const textMap = {
    zinc: 'text-zinc-600',
    blue: 'text-blue-600',
    violet: 'text-violet-600',
    amber: 'text-amber-600',
  };
  return (
    <div className={`w-10 h-10 shrink-0 rounded-xl ${bgMap[color]} flex items-center justify-center`}>
      <svg
        className={`w-5 h-5 ${textMap[color]}`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        {children}
      </svg>
    </div>
  );
}

function SearchIcon() {
  return (
    <IconBadge color="zinc">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </IconBadge>
  );
}

function ChatBubblesIcon() {
  return (
    <IconBadge color="zinc">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </IconBadge>
  );
}

function GlobeIcon() {
  return (
    <IconBadge color="zinc">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </IconBadge>
  );
}

function StarIcon() {
  return (
    <IconBadge color="zinc">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </IconBadge>
  );
}

function GridIcon() {
  return (
    <IconBadge color="zinc">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </IconBadge>
  );
}

function TrendingUpIcon() {
  return (
    <IconBadge color="zinc">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </IconBadge>
  );
}

function UsersIcon() {
  return (
    <IconBadge color="zinc">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </IconBadge>
  );
}

function EyeIcon() {
  return (
    <IconBadge color="zinc">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </IconBadge>
  );
}

function MapPinIcon() {
  return (
    <IconBadge color="zinc">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </IconBadge>
  );
}

function BoltIcon() {
  return (
    <IconBadge color="zinc">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </IconBadge>
  );
}

function TimelineNode({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative py-8 md:py-10">
      {/* Dot + Label row */}
      <div className="flex items-center gap-3 md:flex-col md:items-center mb-6 md:mb-8">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative z-10 w-8 h-8 md:w-12 md:h-12 rounded-full bg-blue-300 shrink-0 ml-2 md:ml-0"
        />
        <span className="relative z-10 text-xs font-semibold uppercase tracking-wider text-zinc-400 md:mt-3 bg-[#FAFAFA] px-3 py-1">
          {label}
        </span>
      </div>

      {/* Content — covers the line with page background */}
      <div className="pl-14 md:pl-0 relative z-10 bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero — open layout, no card box */}
      <section aria-labelledby="about-hero" className="py-10 lg:py-14 text-center">
        <FadeIn>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-medium border border-zinc-200">
                About BayanBase
              </span>
            </div>
            <h1 id="about-hero" className="text-fluid-hero tracking-tight font-semibold text-zinc-900 text-balance mb-6">
              We are building the{' '}
              <span className="text-blue-600">missing layer</span> of the Arab world&apos;s AI
              ecosystem.
            </h1>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
              The Arab world is investing billions in artificial intelligence. But when a
              business owner needs to find the right AI company to work with? They ask a
              friend. We are here to change that.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* Timeline wrapper */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute top-0 bottom-0 left-6 md:left-1/2 w-0.5 bg-zinc-200 -translate-x-1/2" />

        {/* The Problem */}
        <TimelineNode label="The Problem">
          <div className="px-4 sm:px-6 lg:px-8">
            <FadeIn inView>
              <h2 id="about-problem" className="text-fluid-title tracking-tight font-semibold text-zinc-900 text-balance mb-10 md:text-center">
                Finding AI in the Arab world should not be this hard.
              </h2>
            </FadeIn>

            <FadeIn inView className="space-y-4 text-zinc-500 leading-relaxed max-w-3xl mx-auto md:text-center mb-10">
              <p>
                Let&apos;s be honest. If you are a business owner in Cairo, Riyadh, or
                Dubai and you need an AI solution — what do you do?
              </p>
              <p>
                You ask your friends. You post in WhatsApp groups. You spend hours
                scrolling through LinkedIn. You Google and get results about companies in
                San Francisco, not in your city.{' '}
                <strong className="text-zinc-900 font-medium">
                  There is no single, trusted place where Arab businesses can discover,
                  compare, and review AI companies built for our market.
                </strong>
              </p>
              <p>
                The West has G2 for software reviews, Gartner for enterprise research,
                and CB Insights for market intelligence. Platforms where real users help
                other users make smarter decisions.{' '}
                <strong className="text-zinc-900 font-medium">
                  The Arab world has nothing like this for AI. Until now.
                </strong>
              </p>
            </FadeIn>

            <StaggerChildren inView className="grid md:grid-cols-3 gap-4">
              <StaggerItem>
                <Card className="h-full">
                  <div className="flex items-start gap-4">
                    <SearchIcon />
                    <div>
                      <h3 className="font-semibold text-zinc-900 mb-1">
                        Discovery is broken
                      </h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        There is no central directory of AI companies serving the Arab
                        market. Searching takes hours and the results are often outdated
                        or irrelevant.
                      </p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="h-full">
                  <div className="flex items-start gap-4">
                    <ChatBubblesIcon />
                    <div>
                      <h3 className="font-semibold text-zinc-900 mb-1">
                        Trust is word-of-mouth
                      </h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        Businesses rely on personal connections to find AI providers. If
                        you don&apos;t know the right people, you are stuck guessing.
                      </p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="h-full">
                  <div className="flex items-start gap-4">
                    <GlobeIcon />
                    <div>
                      <h3 className="font-semibold text-zinc-900 mb-1">
                        Our ecosystem is invisible
                      </h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        Hundreds of AI companies across 22 Arab countries are building
                        great products. But they have no shared stage to showcase their
                        work.
                      </p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            </StaggerChildren>
          </div>
        </TimelineNode>

        {/* Our Mission */}
        <TimelineNode label="Our Mission">
          <div className="px-4 sm:px-6 lg:px-8">
            <FadeIn inView>
              <div className="max-w-3xl mx-auto">
                <div className="relative bg-blue-50/50 rounded-2xl border border-blue-100 p-6 md:p-10 lg:p-14 text-center overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400" />
                  <p className="text-xl lg:text-2xl font-semibold text-zinc-900 leading-tight text-balance mb-4">
                    To become the{' '}
                    <span className="text-blue-600">trusted marketplace</span> where Arab
                    businesses discover AI solutions and where AI companies reach the
                    customers they deserve.
                  </p>
                  <p className="text-zinc-500 leading-relaxed max-w-xl mx-auto">
                    We believe the Arab world doesn&apos;t just need to adopt AI — it needs
                    to build, own, and celebrate its own AI ecosystem. One that reflects our
                    languages, our culture, and our way of doing business.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </TimelineNode>

        {/* What We Do */}
        <TimelineNode label="What We Do">
          <div className="px-4 sm:px-6 lg:px-8">
            <FadeIn inView>
              <h2 id="about-whatwedo" className="text-fluid-title tracking-tight font-semibold text-zinc-900 text-balance mb-10 md:text-center">
                Three things. Done right.
              </h2>
            </FadeIn>

            <StaggerChildren inView className="grid md:grid-cols-3 gap-6">
              <StaggerItem>
                <Card className="h-full" padding="lg">
                  <StarIcon />
                  <h3 className="font-semibold text-zinc-900 mt-4 mb-2">
                    Real Reviews from Real Users
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Business owners share honest reviews about AI companies they have
                    worked with. No paid placements. No fake ratings. Just real experiences
                    from people like you.
                  </p>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="h-full" padding="lg">
                  <GridIcon />
                  <h3 className="font-semibold text-zinc-900 mt-4 mb-2">
                    AI Company Directory
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    A complete, searchable directory of AI companies across the Arab world.
                    Filter by country, industry, service type, and company size. Find
                    exactly what you need in minutes, not days.
                  </p>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="h-full" padding="lg">
                  <TrendingUpIcon />
                  <h3 className="font-semibold text-zinc-900 mt-4 mb-2">
                    Market Intelligence &amp; Rankings
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Research reports, trend analysis, and rankings of AI companies — built
                    specifically for our region. Understand where the Arab world&apos;s AI market is
                    heading and who is leading it.
                  </p>
                </Card>
              </StaggerItem>
            </StaggerChildren>
          </div>
        </TimelineNode>

        {/* Our Vision */}
        <TimelineNode label="Our Vision">
          <div className="px-4 sm:px-6 lg:px-8">
            <FadeIn inView>
              <div className="max-w-3xl mx-auto text-center">
                <h2 id="about-vision" className="text-fluid-title tracking-tight font-semibold text-zinc-900 text-balance mb-8">
                  Built by us. For us.
                </h2>
                <div className="space-y-6 text-zinc-500 leading-relaxed">
                  <p>
                    We are not trying to copy the West. We are building something that
                    reflects who we are. A platform that understands that business in the
                    Arab world runs on{' '}
                    <strong className="text-zinc-900 font-medium">
                      trust, relationships, and reputation
                    </strong>{' '}
                    — and brings that online in a way that feels natural.
                  </p>
                  <p>
                    We believe that when an AI company in Amman builds something great, a
                    business owner in Casablanca should be able to find it. When a startup in
                    Cairo solves a real problem, a company in Jeddah should hear about it —{' '}
                    <strong className="text-zinc-900 font-medium">
                      not through luck, but through a system designed to connect them.
                    </strong>
                  </p>
                  <p>
                    The Arab world is full of brilliant AI builders. They just need a stage.
                    And the businesses looking for them need a guide.{' '}
                    <strong className="text-zinc-900 font-medium">
                      BayanBase is both.
                    </strong>
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </TimelineNode>

        {/* What We Believe */}
        <TimelineNode label="What We Believe">
          <div className="px-4 sm:px-6 lg:px-8">
            <FadeIn inView>
              <h2 id="about-values" className="text-fluid-title tracking-tight font-semibold text-zinc-900 text-balance mb-10 md:text-center">
                Our values are simple.
              </h2>
            </FadeIn>

            <StaggerChildren inView className="grid md:grid-cols-2 gap-5">
              <StaggerItem>
                <Card className="h-full">
                  <div className="flex items-start gap-4">
                    <UsersIcon />
                    <div>
                      <h3 className="font-semibold text-zinc-900 mb-1">
                        Community Over Competition
                      </h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        We win when businesses help each other. Every honest review makes
                        the whole ecosystem stronger.
                      </p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="h-full">
                  <div className="flex items-start gap-4">
                    <EyeIcon />
                    <div>
                      <h3 className="font-semibold text-zinc-900 mb-1">
                        Transparency Always
                      </h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        No pay-to-play rankings. No hidden deals. What you see on BayanBase
                        is what real users actually experience.
                      </p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="h-full">
                  <div className="flex items-start gap-4">
                    <MapPinIcon />
                    <div>
                      <h3 className="font-semibold text-zinc-900 mb-1">
                        Local First, Global Ambition
                      </h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        We start with the Arab world because this is home. But great ideas
                        don&apos;t stop at borders.
                      </p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="h-full">
                  <div className="flex items-start gap-4">
                    <BoltIcon />
                    <div>
                      <h3 className="font-semibold text-zinc-900 mb-1">
                        Move Fast, Stay Honest
                      </h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        We are a startup. We ship fast, we learn fast, and we always tell
                        it like it is.
                      </p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            </StaggerChildren>
          </div>
        </TimelineNode>
      </div>

      {/* CTA — open layout, no card box */}
      <section className="py-10 lg:py-14 text-center">
        <FadeIn inView>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-fluid-title tracking-tight font-semibold text-zinc-900 text-balance mb-4">
              Ready to explore the Arab world&apos;s AI ecosystem?
            </h2>
            <p className="text-zinc-500 text-lg mb-8 max-w-xl mx-auto">
              Browse AI companies, read real reviews, and find the right partner for your business.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/search"
                className="inline-flex items-center px-6 py-3 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-colors"
              >
                Browse Directory
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 rounded-xl border border-zinc-200 text-zinc-700 font-semibold hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98] transition-colors"
              >
                List Your Company
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
