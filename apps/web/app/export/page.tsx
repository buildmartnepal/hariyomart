import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Boxes, FileCheck2, Globe2, MapPinned, PackageCheck, Plane, ShieldCheck, Sprout, Truck } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
import { ExportInquiryForm } from '@/components/ExportInquiryForm';

export const metadata: Metadata = {
  title: 'Source & Export Nepal Products | Hariyo Mart Nepal',
  description: 'Source Nepal-origin herbs, spices, tea, coffee, honey, grains, fruit products and local producer goods with supplier, lot, packing and export-document workflows.',
  alternates: { canonical: '/export' },
};

export default async function ExportPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const params = await searchParams;
  const requestedProduct = params.product ? catalog.products.find((product) => product.slug === params.product) : undefined;
  const exportProducts = catalog.products.filter((product) => product.exportReady).slice(0, 12);
  const exportCount = catalog.products.filter((product) => product.exportReady).length;
  return (
    <main className="export-page">
      <section className="export-hero">
        <div className="container export-hero-grid">
          <div className="export-hero-copy">
            <span className="eyebrow">Nepal Origin Supply & Export Desk</span>
            <h1>From Nepal’s farms and local producers to <span>city kitchens and global shelves.</span></h1>
            <p>Hariyo Mart combines a Nepal-origin marketplace with a sourcing SaaS: discover products, qualify suppliers, confirm live lots, collect specifications and documents, request samples, manage packing and move qualified trade inquiries toward shipment.</p>
            <div className="hero-actions"><Link className="btn btn-primary" href="/shop?query=export">Browse Nepal catalog <ArrowRight size={17}/></Link><a className="btn btn-secondary" href="#trade-rfq">Request sourcing / export quote</a></div>
            <div className="export-hero-stats"><span><b>420</b><small>catalog SKUs</small></span><span><b>210</b><small>product families</small></span><span><b>28</b><small>sourcing clusters</small></span><span><b>7</b><small>provinces</small></span></div>
          </div>
          <div className="export-network-graphic" aria-label="Nepal origin to global buyer sourcing flow">
            <div className="export-network-core"><Sprout/><b>NEPAL ORIGIN</b><small>farmer · cooperative · local producer</small></div>
            <div className="export-network-node n1"><MapPinned/><span>Source cluster</span></div>
            <div className="export-network-node n2"><PackageCheck/><span>Lot & grade</span></div>
            <div className="export-network-node n3"><FileCheck2/><span>Documents</span></div>
            <div className="export-network-node n4"><Boxes/><span>Packing</span></div>
            <div className="export-network-node n5"><Plane/><span>Export / air cargo</span></div>
            <div className="export-network-node n6"><Globe2/><span>Global buyer</span></div>
          </div>
        </div>
      </section>

      <section className="section export-principles"><div className="container"><div className="split-heading"><div><span className="eyebrow">Trade-ready by process, not by marketing claim</span><h2 className="section-title">Every commercial lot is re-qualified before quotation.</h2></div><p className="section-copy">A seed catalog can describe authentic Nepal product types and sourcing regions, but production export requires the actual supplier, lot, specification, documents and destination rules to match. Hariyo keeps those checks explicit.</p></div><div className="export-principle-grid">{[
        [<ShieldCheck key="s"/>, 'Supplier & origin', 'Confirm the farmer, cooperative or processor, registration references and actual sourcing location.'],
        [<PackageCheck key="p"/>, 'Lot specification', 'Reconfirm grade, size, moisture, shelf life, processing, quantity and packing against the available lot.'],
        [<FileCheck2 key="f"/>, 'Compliance documents', 'Collect only valid lot/supplier documents such as lab results, phytosanitary or origin documents when applicable.'],
        [<Truck key="t"/>, 'Logistics & Incoterms', 'Quote lead time, pickup, consolidation, air/road/sea routing and commercial terms after destination review.'],
      ].map(([icon,title,copy]) => <article key={String(title)}><span>{icon}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>

      <section className="section soft-section"><div className="container"><div className="split-heading"><div><span className="eyebrow">Export-oriented discovery</span><h2 className="section-title">{exportCount}+ seeded trade profiles across Nepal-origin categories.</h2></div><Link href="/shop" className="text-link">Open full catalog <ArrowRight size={16}/></Link></div><div className="grid product-grid export-product-grid">{exportProducts.map((product) => <ProductCard key={product.slug} product={product} />)}</div></div></section>

      <section className="section"><div className="container export-market-grid"><div><span className="eyebrow">Domestic supply network</span><h2 className="section-title">Serve Nepal’s major city markets first—then qualify the right products for international trade.</h2><p className="section-copy">Hariyo is designed for Kathmandu Valley, Pokhara, Bharatpur, Biratnagar–Itahari–Dharan, Janakpur, Birgunj, Hetauda, Butwal–Bhairahawa, Nepalgunj and Dhangadhi supply flows, while the Export Desk handles qualified international inquiries separately.</p><div className="city-chip-grid">{['Kathmandu Valley','Pokhara','Bharatpur','Biratnagar','Itahari','Dharan','Janakpur','Birgunj','Hetauda','Butwal','Bhairahawa','Nepalgunj','Dhangadhi'].map((city)=><span key={city}>{city}</span>)}</div></div><aside className="export-category-panel"><BadgeCheck/><h3>Priority Nepal-origin categories</h3><ul><li>Large cardamom, ginger, turmeric and spices</li><li>Orthodox tea, herbal infusions and specialty coffee</li><li>Honey, lentils, grains, walnuts and dried fruit</li><li>Dried botanicals, cultivated wellness herbs and essential oils</li><li>Fruit preparations, pickles, specialty foods and private-label products</li><li>Seasonal fresh fruit and vegetables where route/cold-chain feasibility works</li></ul></aside></div></section>

      <section id="trade-rfq" className="section export-rfq-section"><div className="container export-rfq-layout"><div className="export-rfq-copy"><span className="eyebrow">Buyer sourcing desk</span><h2>Request a commercial sourcing review.</h2><p>Tell us the destination, quantity, grade, packaging and documents you need. Hariyo records the inquiry, matches suitable sourcing clusters and turns it into a supplier/lot qualification workflow.</p><div className="export-rfq-steps"><span><b>01</b>Buyer requirement</span><span><b>02</b>Supplier & lot match</span><span><b>03</b>Sample / document review</span><span><b>04</b>Quotation & shipment plan</span></div></div><ExportInquiryForm productSlug={requestedProduct?.slug} productName={requestedProduct?.name} /></div></section>
    </main>
  );
}
