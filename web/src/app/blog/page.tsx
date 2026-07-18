import { QuiverlyWordmark } from "@/components/brand/quiverly-brand";
import { BlogList } from "@/components/marketing/blog-list";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { QuiverlyFooter } from "@/components/marketing/quiverly-footer";
import { telegramBotUrl } from "@/lib/marketing";

export const metadata = {
  title: "Blog · Quiverly",
  description:
    "Ops notes and CSE endpoint changes — Quiverly product journal.",
};

/** Watermelon blog-1 stub — empty until real posts land. */
export default function BlogPage() {
  const botUrl = telegramBotUrl();

  return (
    <div className="chime-atmosphere flex min-h-full flex-1 flex-col">
      <MarketingNav />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-14"
      >
        <QuiverlyWordmark size="lg" priority />
        <BlogList
          className="mt-10"
          heading="Notes from the wire"
          description="Short ops notes — CSE endpoint changes, poller status, product fence. Not investment tips."
          ctaText="Home"
          ctaHref="/"
          posts={[]}
        />
      </main>
      <QuiverlyFooter telegramHref={botUrl} />
    </div>
  );
}
