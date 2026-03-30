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
              BayanBase connects businesses across the Arab world with the right AI companies and solutions. We make it simple for decision-makers to discover, evaluate, and engage with AI providers that understand regional needs and deliver practical results.
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

            <FadeIn inView className="space-y-4 text-lg text-zinc-500 leading-relaxed max-w-3xl mx-auto md:text-center">
              <p>
                Business users waste hours searching scattered directories, outdated
                listings, and generic global platforms. Relevant local and regional AI
                companies remain difficult to find. Language barriers, fragmented
                information, and a lack of trusted reviews turn what should be a
                straightforward discovery process into a frustrating experience.
              </p>
            </FadeIn>
          </div>
        </TimelineNode>

        {/* Our Mission */}
        <TimelineNode label="Our Mission">
          <div className="px-4 sm:px-6 lg:px-8">
            <FadeIn inView>
              <div className="max-w-3xl mx-auto">
                <div className="relative bg-blue-50/50 rounded-2xl border border-blue-100 p-6 md:p-10 lg:p-14 text-center overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400" />
                  <p className="text-fluid-title font-semibold text-zinc-900 leading-tight text-balance">
                    To become the{' '}
                    <span className="text-blue-600">trusted marketplace</span> where Arab
                    businesses discover AI solutions and where AI companies reach the
                    customers they deserve.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </TimelineNode>

        {/* How BayanBase Helps */}
        <TimelineNode label="How BayanBase Helps">
          <div className="px-4 sm:px-6 lg:px-8">
            <FadeIn inView className="space-y-6 text-lg text-zinc-500 leading-relaxed max-w-3xl mx-auto md:text-center">
              <p>
                We built BayanBase to solve this gap. Our platform brings together AI
                companies serving the Arab market in one place, complete with detailed
                profiles and authentic reviews from actual business users. These reviews
                highlight real outcomes, implementation challenges, and value delivered,
                giving you clear insights before you ever reach out.
              </p>
              <p>
                For AI companies, BayanBase opens direct access to buyers across
                Arabic-speaking countries. Instead of struggling with broad marketing or
                cold outreach, providers can showcase their solutions to the right
                audience and build visibility in a growing regional market.
              </p>
            </FadeIn>
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
                <p className="text-lg text-zinc-500 leading-relaxed max-w-2xl mx-auto">
                  We help businesses accelerate their AI adoption by connecting them
                  with capable partners, while enabling strong AI companies to reach the
                  right buyers across the Arab world. A clear and efficient bridge
                  between both sides.
                </p>
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
