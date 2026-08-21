'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, FileCheck2, Globe2, PackageSearch, Send } from 'lucide-react';

const api = process.env.NEXT_PUBLIC_API_URL || '/api';

export function ExportInquiryForm({ productSlug, productName }: { productSlug?: string; productName?: string }) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('busy');
    setMessage('');
    const fd = new FormData(event.currentTarget);
    const payload = {
      companyName: String(fd.get('companyName') || ''),
      contactName: String(fd.get('contactName') || ''),
      email: String(fd.get('email') || ''),
      phone: String(fd.get('phone') || '') || undefined,
      country: String(fd.get('country') || ''),
      buyerType: String(fd.get('buyerType') || 'importer'),
      productSlug: productSlug || String(fd.get('productSlug') || '') || undefined,
      productInterest: productName || String(fd.get('productInterest') || ''),
      quantity: Number(fd.get('quantity') || 0) || undefined,
      unit: String(fd.get('unit') || '') || undefined,
      targetPack: String(fd.get('targetPack') || '') || undefined,
      incoterm: String(fd.get('incoterm') || '') || undefined,
      destinationPort: String(fd.get('destinationPort') || '') || undefined,
      requiredDocuments: String(fd.get('requiredDocuments') || '').split(',').map((item) => item.trim()).filter(Boolean),
      message: String(fd.get('message') || '') || undefined,
    };
    try {
      const response = await fetch(`${api}/export/inquiries`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { inquiryNumber?: string; error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || 'Unable to create trade inquiry');
      setReference(data.inquiryNumber || 'Created');
      setMessage(data.message || 'Trade inquiry received.');
      setStatus('done');
      event.currentTarget.reset();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to create trade inquiry');
    }
  }

  if (status === 'done') {
    return (
      <div className="export-inquiry-success">
        <CheckCircle2 size={42} />
        <span className="eyebrow">Inquiry received</span>
        <h3>{reference}</h3>
        <p>{message}</p>
        <small>Hariyo will qualify the supplier, live lot, packing, documents and destination requirements before issuing a commercial quotation.</small>
      </div>
    );
  }

  return (
    <form className="export-inquiry-form" onSubmit={submit}>
      <div className="export-form-heading"><Globe2 /><div><span className="eyebrow">Global buyer RFQ</span><h3>Tell us what you want to source from Nepal.</h3><p>Catalog profiles are starting points. Final price and compliance are confirmed against the actual supplier lot.</p></div></div>
      <div className="form-2">
        <label>Company<input name="companyName" required placeholder="Company / organisation" autoComplete="organization" /></label>
        <label>Contact person<input name="contactName" required placeholder="Full name" autoComplete="name" /></label>
      </div>
      <div className="form-3">
        <label>Email<input name="email" required type="email" placeholder="buyer@company.com" autoComplete="email" /></label>
        <label>Phone / WhatsApp<input name="phone" placeholder="+..." autoComplete="tel" /></label>
        <label>Country<input name="country" required placeholder="Germany / UAE / Japan" autoComplete="country-name" /></label>
      </div>
      <div className="form-2">
        <label>Buyer type<select name="buyerType" defaultValue="importer"><option value="importer">Importer</option><option value="distributor">Distributor</option><option value="retailer">Retailer</option><option value="hospitality">Hospitality / food service</option><option value="manufacturer">Ingredient manufacturer</option><option value="brand">Private label / brand</option><option value="institution">Institution</option><option value="other">Other</option></select></label>
        <label>Product interest<input name="productInterest" required defaultValue={productName || ''} placeholder="Large cardamom, orthodox tea, dried ginger..." /></label>
      </div>
      <div className="form-3">
        <label>Quantity<input name="quantity" type="number" min="0" step="0.1" placeholder="500" /></label>
        <label>Unit<input name="unit" placeholder="kg / cartons / litres" /></label>
        <label>Target pack<input name="targetPack" placeholder="10 kg carton / private label" /></label>
      </div>
      <div className="form-2">
        <label>Incoterm preference<input name="incoterm" placeholder="EXW / FCA / FOB / CIF — if known" /></label>
        <label>Destination port / airport<input name="destinationPort" placeholder="Frankfurt / Dubai / Tokyo" /></label>
      </div>
      <label>Required documents / tests<input name="requiredDocuments" placeholder="COA, phytosanitary, residue report, certificate of origin..." /></label>
      <label>Message<textarea name="message" rows={5} placeholder="Grade, moisture, cut size, private label, delivery month, samples or other requirements." /></label>
      <div className="export-form-note"><FileCheck2 size={18}/><span>No certification, organic status, HS classification or export permission is implied by a catalog listing. These are verified for the actual supplier and lot.</span></div>
      {message && <div className={`form-message ${status === 'error' ? 'error' : ''}`}>{message}</div>}
      <button className="btn btn-primary" disabled={status === 'busy'}><Send size={17}/>{status === 'busy' ? 'Creating RFQ…' : 'Send sourcing inquiry'}</button>
      <div className="export-form-footer"><PackageSearch size={16}/> Product samples and commercial lots can follow different packing, testing and lead-time workflows.</div>
    </form>
  );
}
