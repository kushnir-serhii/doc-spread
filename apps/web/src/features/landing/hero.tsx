import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { HeroIllustration } from '@/features/landing/hero-illustration'
import { NicheList } from '@/features/landing/niche-list'

export const Hero = () => {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
      <div className="flex min-w-0 flex-col gap-6">
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Turn any document into a spreadsheet.
        </h1>
        <p className="max-w-xl text-base text-muted-foreground md:text-lg">
          Tell DocSpread what to collect, upload your files, check what AI read, and export clean
          rows.
        </p>
        <NicheList />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="outline" className="min-h-touch">
            <Link to="/sign-in">I have an account</Link>
          </Button>
          <Button asChild size="lg" className="min-h-touch">
            <Link to="/sign-up">
              Get started
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
      <HeroIllustration />
    </section>
  )
}
