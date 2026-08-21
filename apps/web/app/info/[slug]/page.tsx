import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Home, Leaf } from 'lucide-react';
import { infoPageDetails, infoPages } from '@/lib/info-pages';
import { SupportTicketForm } from '@/components/SupportTicketForm';
import { InfoPageContent } from '@/components/InfoPageContent';
import { InfoPageExperience } from '@/components/InfoPageExperience';

export function generateStaticParams() {
  return infoPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = infoPages.find((x) => x.slug === slug);
  return p
    ? {
        title: p.title,
        description: p.summary,
        alternates: { canonical: `/info/${slug}` },
      }
    : {};
}

export default async function Info({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = infoPages.find((x) => x.slug === slug);
  if (!p) notFound();
  const details = infoPageDetails(slug);
  return (
    <main>
      <section className="page-hero info-page-hero">
        <div className="container info-page-hero-inner">
          <nav className="info-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/"><Home size={14} /> Home</Link><span>/</span><span>{p.title}</span>
          </nav>
          <div className="info-hero-copy">
            <span className="eyebrow"><Leaf size={15} /> Hariyo Mart guide</span>
            <h1>{p.title}</h1>
            <p className="section-copy">{p.summary}</p>
          </div>
        </div>
      </section>

      <section className="section info-experience-section">
        <div className="container">
          <InfoPageExperience slug={slug} />
        </div>
      </section>

      {slug === 'contact' ? (
        <section className="section soft-section contact-form-section">
          <div className="container contact-form-layout">
            <div className="contact-form-intro">
              <span className="eyebrow">Create a trackable request</span>
              <h2>Tell us what happened and where you need help.</h2>
              <p>Choose the closest support type, add an order reference when relevant, and keep the description factual. The system creates a ticket number you can retain for follow-up.</p>
              <div className="contact-help-list">
                <span><b>Order issue</b> Missing, damaged, delayed or incorrect fulfilment.</span>
                <span><b>Farmer onboarding</b> Verification, listing, inventory or service-area help.</span>
                <span><b>Business buying</b> Wholesale, recurring procurement or institutional supply.</span>
                <span><b>Technical help</b> Login, account, mobile or accessibility barriers.</span>
              </div>
            </div>
            <SupportTicketForm />
          </div>
        </section>
      ) : null}

      <section className="section info-editorial-section">
        <div className="container info-editorial-layout">
          <aside className="info-editorial-aside">
            <span className="eyebrow">Operational detail</span>
            <h2>What to know before you continue.</h2>
            <p>These built-in notes are production-safe defaults. Administrators can publish richer CMS sections without changing the route or layout.</p>
            <Link href="/how-it-works">See the operating model <ArrowRight size={15} /></Link>
          </aside>
          <InfoPageContent slug={slug} sections={details.sections} highlights={details.highlights} />
        </div>
      </section>

      <section className="section info-final-cta-section">
        <div className="container">
          <div className="info-final-cta">
            <div><span className="eyebrow">Continue with Hariyo</span><h2>Move from information to the right action.</h2><p>Shop nearby harvests, open a farmer store, track an order or create a support ticket from the same marketplace.</p></div>
            <div className="info-final-cta-actions"><Link href="/shop" className="btn btn-primary">Shop fresh <ArrowRight size={16} /></Link><Link href="/sell" className="btn footer-outline-button">Sell on Hariyo</Link><Link href="/info/contact" className="btn footer-outline-button">Get support</Link></div>
          </div>
        </div>
      </section>
    </main>
  );
}
