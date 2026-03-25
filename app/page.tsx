import Link from 'next/link'
import { ArrowRight, Zap, Globe, Shield, Brain } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      {/* Nav */}
      <header className="border-b border-gray-100 dark:border-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            Myntro
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Now live — claim your page
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-50 sm:text-6xl">
            Your Web3 identity,{' '}
            <span className="text-gray-400">all in one link</span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-gray-500 dark:text-gray-400">
            Share your links, showcase achievements, display community affiliations,
            and let visitors tip you in SOL — all with an AI assistant that knows your story.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-gray-700 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Create your page — it&apos;s free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-gray-200 px-6 py-3.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
            >
              Sign in
            </Link>
          </div>
        </div>

        <p className="mt-14 text-xs text-gray-400 dark:text-gray-600">
          Free to create. No credit card required.
        </p>
      </main>

      {/* Features */}
      <section id="features" className="border-t border-gray-100 bg-gray-50 dark:border-gray-900 dark:bg-gray-950">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Everything in one place
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Globe className="h-5 w-5" />}
              title="Digital identity"
              description="A clean profile with bio, links, location, and community affiliation badges."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Solana tipping"
              description="Receive SOL, USDC, or USDT tips directly from visitors — no middleman."
            />
            <FeatureCard
              icon={<Brain className="h-5 w-5" />}
              title="AI assistant"
              description="Upload your CV and let an AI answer visitor questions about your background."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Community badges"
              description="Display your DAO and protocol affiliations with verified community logos."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm text-gray-400 dark:text-gray-600">
          <span>© 2026 Myntro</span>
          <span>Built on Solana</span>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  )
}
