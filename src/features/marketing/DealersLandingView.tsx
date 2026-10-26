import { Handshake, LayoutGrid, Store, Wallet } from 'lucide-react';
import Link from 'next/link';

import { SiteFooter, SiteHeader, buildMarketplaceNav } from '@components/layout';
import { BentoGrid } from '@components/marketplace';
import { Badge, Button, Eyebrow, Heading, SectionHeader } from '@components/ui';

import { DealersDashboardPreview } from './components/DealersDashboardPreview';
import { DealersStorefrontPreview } from './components/DealersStorefrontPreview';
import { dealersLandingContent } from './dealers.landing.content';
import styles from './dealers-landing.module.css';

const PILLAR_ICONS = [
  <LayoutGrid key="estoque" className="size-5" strokeWidth={1.5} aria-hidden />,
  <Store key="vitrine" className="size-5" strokeWidth={1.5} aria-hidden />,
  <Handshake key="ops" className="size-5" strokeWidth={1.5} aria-hidden />,
  <Wallet key="vendas" className="size-5" strokeWidth={1.5} aria-hidden />,
] as const;

export function DealersLandingView() {
  const copy = dealersLandingContent;

  return (
    <div className={styles.dealersLanding}>
      <a href="#conteudo-lojistas" className={styles.dealersLanding__skip}>
        {copy.skipLink}
      </a>

      <SiteHeader
        variant="solid"
        navItems={buildMarketplaceNav('/para-lojistas')}
        showMessages={false}
        showUser={false}
      />

      <header className={styles.dealersLanding__hero} data-theme="dark">
        <div className={styles.dealersLanding__container}>
          <div className={styles.dealersLanding__heroInner}>
            <div className={styles.dealersLanding__heroCopy}>
              <Eyebrow>{copy.hero.eyebrow}</Eyebrow>
              <h1 className={styles.dealersLanding__heroTitle}>
                {copy.hero.titleLines.map((line, index) => (
                  <span key={line} className={styles.dealersLanding__heroTitleLine}>
                    {index > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </h1>
              <p className={styles.dealersLanding__heroLead}>{copy.hero.description}</p>
              <div className={styles.dealersLanding__heroActions}>
                <Button variant="primary" withArrow asChild>
                  <Link href={copy.hero.primaryHref}>{copy.hero.primaryCta}</Link>
                </Button>
                <Button variant="outline" asChild className={styles.dealersLanding__heroSecondary}>
                  <a href={copy.hero.secondaryHref}>{copy.hero.secondaryCta}</a>
                </Button>
              </div>
              <p className={styles.dealersLanding__heroLogin}>
                <Link href={copy.hero.loginHref}>{copy.hero.loginLabel}</Link>
              </p>
            </div>
            <div className={styles.dealersLanding__heroVisual}>
              <DealersDashboardPreview />
            </div>
          </div>
        </div>
      </header>

      <main id="conteudo-lojistas">
        <section className={styles.dealersLanding__section} aria-labelledby="dealers-pillars-title">
          <div className={styles.dealersLanding__container}>
            <SectionHeader
              eyebrow={copy.pillars.eyebrow}
              title={copy.pillars.title}
              titleSecondary={copy.pillars.titleSecondary}
              description={copy.pillars.description}
              className={styles.dealersLanding__sectionHeader}
            />
            <span id="dealers-pillars-title" className="sr-only">
              {copy.pillars.title} {copy.pillars.titleSecondary}
            </span>
            <BentoGrid>
              {copy.pillars.items.map((item, index) => (
                <article key={item.title} className={styles.dealersLanding__pillar}>
                  <div className={styles.dealersLanding__pillarTop}>
                    <div className={styles.dealersLanding__pillarIcon}>{PILLAR_ICONS[index]}</div>
                    <Badge variant="soft">Disponível</Badge>
                  </div>
                  <h3 className={styles.dealersLanding__pillarTitle}>{item.title}</h3>
                  <p className={styles.dealersLanding__pillarDesc}>{item.description}</p>
                </article>
              ))}
            </BentoGrid>
          </div>
        </section>

        <section
          id={copy.demo.id}
          className={styles.dealersLanding__sectionDark}
          data-theme="dark"
          aria-labelledby="dealers-demo-title"
        >
          <div className={styles.dealersLanding__container}>
            <div className={styles.dealersLanding__demoInner}>
              <div className={styles.dealersLanding__demoCopy}>
                <Eyebrow>{copy.demo.eyebrow}</Eyebrow>
                <Heading as="h2" id="dealers-demo-title" className={styles.dealersLanding__onDarkTitle}>
                  {copy.demo.title}
                </Heading>
                <p className={styles.dealersLanding__onDarkLead}>{copy.demo.description}</p>
                <ul className={styles.dealersLanding__demoList}>
                  {copy.demo.modules.map((mod) => (
                    <li key={mod.label} className={styles.dealersLanding__demoItem}>
                      <span className={styles.dealersLanding__demoItemTitle}>{mod.label}</span>
                      <span className={styles.dealersLanding__demoItemHint}>{mod.hint}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.dealersLanding__demoVisual}>
                <DealersDashboardPreview />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.dealersLanding__section} aria-labelledby="dealers-storefront-title">
          <div className={styles.dealersLanding__container}>
            <div className={styles.dealersLanding__storefront}>
              <div className={styles.dealersLanding__storefrontCopy}>
                <Eyebrow>{copy.storefront.eyebrow}</Eyebrow>
                <Heading as="h2" id="dealers-storefront-title">
                  {copy.storefront.title}
                </Heading>
                <p className="text-text-muted">{copy.storefront.description}</p>
                <ul className={styles.dealersLanding__storefrontPoints}>
                  {copy.storefront.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              <DealersStorefrontPreview />
            </div>
          </div>
        </section>

        <section
          className={styles.dealersLanding__sectionMuted}
          aria-labelledby="dealers-roadmap-title"
        >
          <div className={styles.dealersLanding__container}>
            <SectionHeader
              eyebrow={copy.roadmap.eyebrow}
              title={copy.roadmap.title}
              className={styles.dealersLanding__sectionHeader}
            />
            <span id="dealers-roadmap-title" className="sr-only">
              {copy.roadmap.title}
            </span>
            <div className={styles.dealersLanding__roadmap}>
              <article className={styles.dealersLanding__roadmapCard}>
                <Badge variant="soft">Disponível</Badge>
                <h3 className={styles.dealersLanding__roadmapTitle}>{copy.roadmap.availableTitle}</h3>
                <ul className={styles.dealersLanding__roadmapList}>
                  {copy.roadmap.available.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className={styles.dealersLanding__roadmapCardMuted}>
                <Badge variant="neutral">Em evolução</Badge>
                <h3 className={styles.dealersLanding__roadmapTitle}>{copy.roadmap.upcomingTitle}</h3>
                <ul className={styles.dealersLanding__roadmapList}>
                  {copy.roadmap.upcoming.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className={styles.dealersLanding__roadmapHint}>
                  Sem prazos comerciais inventados — evolução contínua do produto.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.dealersLanding__section} aria-labelledby="dealers-steps-title">
          <div className={styles.dealersLanding__container}>
            <SectionHeader
              eyebrow={copy.steps.eyebrow}
              title={copy.steps.title}
              description={copy.steps.description}
              className={styles.dealersLanding__sectionHeader}
            />
            <span id="dealers-steps-title" className="sr-only">
              {copy.steps.title}
            </span>
            <ol className={styles.dealersLanding__steps}>
              {copy.steps.items.map((item) => (
                <li key={item.step} className={styles.dealersLanding__step}>
                  <span className={styles.dealersLanding__stepNum} aria-hidden>
                    {item.step}
                  </span>
                  <div>
                    <h3 className={styles.dealersLanding__stepTitle}>{item.title}</h3>
                    <p className={styles.dealersLanding__stepDesc}>{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.dealersLanding__section} aria-labelledby="dealers-closing-title">
          <div className={styles.dealersLanding__container}>
            <div className={styles.dealersLanding__closing} data-theme="dark">
              <div className={styles.dealersLanding__closingCopy}>
                <Eyebrow>{copy.closing.eyebrow}</Eyebrow>
                <h2 id="dealers-closing-title" className={styles.dealersLanding__closingTitle}>
                  {copy.closing.title}
                </h2>
                <p className={styles.dealersLanding__closingDesc}>{copy.closing.description}</p>
              </div>
              <Button variant="primary" withArrow asChild className={styles.dealersLanding__closingCta}>
                <Link href={copy.closing.href}>{copy.closing.cta}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className={styles.dealersLanding__section} aria-labelledby="dealers-faq-title">
          <div className={styles.dealersLanding__container}>
            <SectionHeader
              eyebrow={copy.faq.eyebrow}
              title={copy.faq.title}
              className={styles.dealersLanding__sectionHeader}
            />
            <span id="dealers-faq-title" className="sr-only">
              {copy.faq.title}
            </span>
            <div className={styles.dealersLanding__faq}>
              {copy.faq.items.map((item) => (
                <details key={item.q} className={styles.dealersLanding__faqItem}>
                  <summary className={styles.dealersLanding__faqQ}>{item.q}</summary>
                  <p className={styles.dealersLanding__faqA}>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
