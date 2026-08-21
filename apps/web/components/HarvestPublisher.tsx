'use client';
import Image from 'next/image';
import { ChangeEvent, FormEvent, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Crosshair,
  PackagePlus,
  Save,
  Send,
  UploadCloud,
} from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { useAuth } from './AuthProvider';
export function HarvestPublisher() {
  const auth = useAuth();
  const [coords, setCoords] = useState({ lat: 27.7172, lng: 85.324 });
  const [located, setLocated] = useState(false);
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocated(true);
        setMessage('Listing origin updated to your current farm location.');
      },
      () =>
        setMessage(
          'Location permission was not granted. Your configured farm location will remain the reference point.',
        ),
      { maximumAge: 300000, timeout: 8000 },
    );
  }
  async function uploadPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!auth.user) {
      setMessage('Sign in with your farmer account before uploading a crop photo.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Use a JPEG, PNG or WebP crop photo.');
      e.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage('Crop photos must be 8 MB or smaller.');
      e.target.value = '';
      return;
    }
    setPhotoBusy(true);
    setMessage('Uploading crop photo…');
    try {
      const body = new FormData();
      body.append('file', file);
      const uploaded: any = await auth.apiRequest('/uploads', {
        method: 'POST',
        body,
      });
      if (!uploaded.url) throw new Error('Cloudflare R2 crop photo upload failed');
      setPhotoUrl(String(uploaded.url));
      setMessage('Crop photo uploaded and attached to this harvest.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setPhotoBusy(false);
    }
  }
  async function uploadGalleryPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, 8 - galleryUrls.length));
    if (!files.length) return;
    if (!auth.user) {
      setMessage('Sign in with your farmer account before uploading gallery photos.');
      e.target.value = '';
      return;
    }
    setPhotoBusy(true);
    setMessage(`Uploading ${files.length} gallery photo${files.length > 1 ? 's' : ''}…`);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)
          throw new Error('Gallery photos must be JPEG/PNG/WebP and 8 MB or smaller.');
        const body = new FormData();
        body.append('file', file);
        const result: any = await auth.apiRequest('/uploads', { method: 'POST', body });
        if (result?.url) uploaded.push(String(result.url));
      }
      setGalleryUrls((current) => Array.from(new Set([...current, ...uploaded])).slice(0, 8));
      setMessage('Gallery photos attached to this harvest.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gallery upload failed');
    } finally {
      setPhotoBusy(false);
      e.target.value = '';
    }
  }
  async function publish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('busy');
    setMessage('');
    const fd = new FormData(e.currentTarget);
    const harvestDate = String(fd.get('harvestDate') || '');
    const directImage = String(fd.get('imageUrl') || '').trim();
    const payload = {
      name: String(fd.get('name')),
      category: String(fd.get('category')),
      province: String(fd.get('province')),
      district: String(fd.get('district')),
      municipality: String(fd.get('municipality')),
      unit: String(fd.get('unit')),
      price: Number(fd.get('price')),
      stock: Number(fd.get('stock')),
      minimumOrder: Number(fd.get('minimumOrder') || 1),
      organic: fd.get('organic') === 'on',
      grade: String(fd.get('grade') || ''),
      ...(harvestDate ? { harvestDate } : {}),
      harvestWindow: String(fd.get('harvestWindow') || ''),
      uniqueStory: String(fd.get('uniqueStory') || ''),
      shortDescription: String(fd.get('shortDescription') || ''),
      image: photoUrl || directImage || undefined,
      images: galleryUrls,
      lat: coords.lat,
      lng: coords.lng,
      deliveryRadiusKm: Number(fd.get('deliveryRadiusKm') || 35),
      wholesale: fd.get('wholesale') === 'on',
      subscription: fd.get('subscription') === 'on',
      exportReady: fd.get('exportReady') === 'on',
      exportStatus: fd.get('exportReady') === 'on' ? 'supplier-review' : 'domestic-ready',
      hsCodeHint: String(fd.get('hsCodeHint') || ''),
      botanicalName: String(fd.get('botanicalName') || ''),
      originAltitude: String(fd.get('originAltitude') || ''),
      harvestSeason: String(fd.get('harvestSeason') || ''),
      processingMethod: String(fd.get('processingMethod') || ''),
      typicalShelfLifeDays: Number(fd.get('typicalShelfLifeDays') || 0),
      storageGuidance: String(fd.get('storageGuidance') || ''),
      tradePack: String(fd.get('tradePack') || ''),
      exportMoq: Number(fd.get('exportMoq') || 0),
      leadTimeDays: Number(fd.get('leadTimeDays') || 0),
      destinationMarkets: String(fd.get('destinationMarkets') || '').split(',').map((item) => item.trim()).filter(Boolean),
      traceabilityLevel: 'supplier + farm/cluster + lot',
      complianceNote: 'Export and certification claims require document review for the actual supplier lot before quotation.',
      sourceType: 'seller-entered farm/local producer listing',
    };
    try {
      if (!auth.user) {
        localStorage.setItem(`hariyo-harvest-draft-${Date.now()}`, JSON.stringify(payload));
        setStatus('done');
        setMessage(
          'Saved as a local harvest draft. Sign in with a farmer account to submit it for review.',
        );
        return;
      }
      if (!['farmer', 'vendor', 'admin'].includes(auth.user.role))
        throw new Error('A farmer or vendor account is required to publish harvests.');
      const data: any = await auth.apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStatus('done');
      setPhotoUrl('');
      setGalleryUrls([]);
      setMessage(
        `Harvest submitted as ${data.status || 'pending_review'}. Marketplace staff can activate it after seller and listing review.`,
      );
      e.currentTarget.reset();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Unable to publish harvest');
    }
  }
  return (
    <div className="harvest-publisher">
      <div className="harvest-intro">
        <div>
          <span className="eyebrow">Live inventory</span>
          <h2>List today’s harvest</h2>
          <p>
            Publish exactly what is available now. Buyers can discover it by farm location,
            category, freshness and delivery radius.
          </p>
        </div>
        <button type="button" className="btn btn-soft" onClick={locate}>
          <Crosshair size={17} />
          {located ? 'Farm location attached' : 'Use farm location'}
        </button>
      </div>
      {status === 'done' ? (
        <div className="harvest-done">
          <CheckCircle2 size={46} />
          <h3>Harvest saved</h3>
          <p>{message}</p>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setStatus('idle');
              setMessage('');
            }}
          >
            <PackagePlus size={17} /> List another harvest
          </button>
        </div>
      ) : (
        <form onSubmit={publish} className="harvest-form">
          <section>
            <h3>Product & harvest</h3>
            <div className="form-2">
              <label>
                Product name
                <input name="name" required placeholder="Fresh Akabare Chilli" />
              </label>
              <label>
                Category
                <select name="category" required>
                  {catalog.categories.map((c) => (
                    <option value={c.slug} key={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-3">
              <label>
                Quantity available
                <input name="stock" type="number" min="0" step="0.1" required placeholder="25" />
              </label>
              <label>
                Unit
                <input name="unit" required placeholder="kg / bunch / crate" />
              </label>
              <label>
                Minimum order
                <input name="minimumOrder" type="number" min="0.1" step="0.1" defaultValue="1" />
              </label>
            </div>
            <div className="form-3">
              <label>
                Price (NPR)
                <input name="price" type="number" min="0" step="0.01" required />
              </label>
              <label>
                Grade
                <input name="grade" placeholder="Premium / Grade A" />
              </label>
              <label>
                Harvest date
                <input name="harvestDate" type="date" />
              </label>
            </div>
            <label>
              Freshness note
              <input name="harvestWindow" placeholder="Harvested this morning / within 24 hours" />
            </label>
          </section>
          <section>
            <h3>Origin & delivery</h3>
            <div className="form-3">
              <label>
                Province
                <select name="province" defaultValue="bagmati">
                  {catalog.provinces.map((p) => (
                    <option value={p.slug} key={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                District
                <input name="district" required defaultValue="Kathmandu" />
              </label>
              <label>
                Municipality
                <input name="municipality" required defaultValue="Kathmandu" />
              </label>
            </div>
            <label>
              Delivery radius (km)
              <input name="deliveryRadiusKm" type="number" min="1" max="1000" defaultValue="35" />
            </label>
            <div className="seller-toggles">
              <label>
                <input type="checkbox" name="organic" /> Organic / natural claim
              </label>
              <label>
                <input type="checkbox" name="wholesale" defaultChecked /> Wholesale available
              </label>
              <label>
                <input type="checkbox" name="subscription" /> Repeat subscription
              </label>
            </div>
            <div className="export-listing-panel">
              <div><span className="eyebrow">Trade & export profile</span><p>Optional. Marking a product export-ready starts document review; it does not publish unverified certification claims.</p></div>
              <label className="export-ready-toggle"><input type="checkbox" name="exportReady" /> Prepare this listing for wholesale / export RFQs</label>
              <div className="form-3">
                <label>HS code hint<input name="hsCodeHint" placeholder="e.g. 0908.30 — confirm before shipment" /></label>
                <label>Botanical / scientific name<input name="botanicalName" placeholder="Optional for herbs and botanicals" /></label>
                <label>Origin altitude<input name="originAltitude" placeholder="e.g. 1,400–1,900 m" /></label>
              </div>
              <div className="form-3">
                <label>Trade pack<input name="tradePack" placeholder="10 kg carton / 25 kg bag / 1 L can" /></label>
                <label>Export MOQ<input name="exportMoq" type="number" min="0" step="0.1" placeholder="100" /></label>
                <label>Lead time (days)<input name="leadTimeDays" type="number" min="0" max="365" placeholder="7" /></label>
              </div>
              <div className="form-2">
                <label>Harvest / supply season<input name="harvestSeason" placeholder="Seasonal or year-round processing stock" /></label>
                <label>Typical shelf life (days)<input name="typicalShelfLifeDays" type="number" min="0" placeholder="365" /></label>
              </div>
              <label>Processing method<input name="processingMethod" placeholder="Fresh graded / shade dried / steam distilled / roasted" /></label>
              <label>Storage guidance<input name="storageGuidance" placeholder="Cool, dry, sealed; or cold chain requirements" /></label>
              <label>Target markets<input name="destinationMarkets" placeholder="Germany, UAE, Japan, United States" /></label>
            </div>
          </section>
          <section>
            <h3>Photos & product story</h3>
            <label className="photo-drop">
              <Camera />
              <span>
                <b>
                  {photoBusy
                    ? 'Uploading crop photo…'
                    : photoUrl
                      ? 'Crop photo attached'
                      : 'Upload actual crop photo'}
                </b>
                <small>Private Cloudflare R2 upload · JPEG, PNG or WebP · maximum 8 MB.</small>
              </span>
              <UploadCloud />
              <input
                className="photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadPhoto}
              />
            </label>
            <label className="photo-drop">
              <Camera />
              <span><b>{galleryUrls.length ? `${galleryUrls.length} gallery photos attached` : 'Add more product photos'}</b><small>Up to 8 buyer-facing photos · close-up, packaging, origin and size reference.</small></span>
              <UploadCloud />
              <input className="photo-input" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={photoBusy || galleryUrls.length >= 8} onChange={uploadGalleryPhotos} />
            </label>
            {galleryUrls.length > 0 && <div className="harvest-gallery-preview">{galleryUrls.map((src, index) => <div key={src}><Image src={src} alt={`Product gallery ${index + 1}`} width={180} height={136} sizes="180px" /><button type="button" onClick={() => setGalleryUrls((items) => items.filter((item) => item !== src))} aria-label={`Remove gallery photo ${index + 1}`}>×</button></div>)}</div>}
            <label>
              Or existing Hariyo R2 media path
              <input
                name="imageUrl"
                type="text"
                placeholder="/api/media/products/…"
                defaultValue={photoUrl}
              />
            </label>
            <label>
              Short buyer description
              <textarea
                name="shortDescription"
                rows={3}
                placeholder="Fresh, traceable and grown on our family farm…"
              />
            </label>
            <label>
              Farm story / unique quality
              <textarea
                name="uniqueStory"
                rows={5}
                placeholder="Tell buyers about the variety, soil, altitude, traditional method, harvest, family or cooperative behind it."
              />
            </label>
          </section>
          {message && (
            <div className={`form-message ${status === 'error' ? 'error' : ''}`}>{message}</div>
          )}
          <div className="harvest-actions">
            <button
              type="button"
              className="btn btn-soft"
              onClick={() =>
                setMessage('The current form remains on this device until you leave this page.')
              }
            >
              <Save size={17} /> Keep draft open
            </button>
            <button className="btn btn-primary" disabled={status === 'busy' || photoBusy}>
              <Send size={17} />
              {status === 'busy' ? 'Submitting…' : 'Submit harvest for marketplace'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
