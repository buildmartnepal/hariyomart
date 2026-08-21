import Image from 'next/image';
import Link from 'next/link';
import {
  Accessibility,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  FileText,
  Gift,
  Globe2,
  HandCoins,
  Headphones,
  HeartHandshake,
  Leaf,
  LocateFixed,
  MapPinned,
  Newspaper,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  Route,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Sprout,
  Store,
  Truck,
  Users,
  UtensilsCrossed,
} from 'lucide-react';

type IconKey =
  | 'leaf'
  | 'farmers'
  | 'contact'
  | 'subscriptions'
  | 'bulk'
  | 'recipes'
  | 'sustainability'
  | 'faq'
  | 'returns'
  | 'privacy'
  | 'terms'
  | 'delivery'
  | 'quality'
  | 'careers'
  | 'press'
  | 'loyalty'
  | 'payments'
  | 'accessibility'
  | 'mobile';

const icons = {
  leaf: Leaf,
  farmers: Users,
  contact: Headphones,
  subscriptions: CalendarClock,
  bulk: Building2,
  recipes: UtensilsCrossed,
  sustainability: Sprout,
  faq: CircleHelp,
  returns: RefreshCcw,
  privacy: ShieldCheck,
  terms: FileText,
  delivery: Truck,
  quality: BadgeCheck,
  careers: BriefcaseBusiness,
  press: Newspaper,
  loyalty: Gift,
  payments: CreditCard,
  accessibility: Accessibility,
  mobile: Smartphone,
} satisfies Record<IconKey, typeof Leaf>;

type Experience = {
  icon: IconKey;
  eyebrow: string;
  title: string;
  copy: string;
  image: string;
  imageAlt: string;
  metrics: Array<[string, string]>;
  cards: Array<{ icon: IconKey; title: string; copy: string }>;
  faq: Array<[string, string]>;
  cta: [string, string];
  secondary?: [string, string];
};

const sharedBuyerFaq: Array<[string, string]> = [
  ['Is availability guaranteed?', 'Availability is live and seller-specific. Stock, harvest timing and delivery coverage can change before checkout.'],
  ['Can one order include several sellers?', 'Yes. Hariyo Mart keeps one buyer basket while creating seller-level fulfilment groups behind the scenes.'],
];

const experiences: Record<string, Experience> = {
  about: {
    icon: 'leaf',
    eyebrow: 'Nepal origin, connected to real demand',
    title: 'A sourcing, marketplace and supply operating system for products that begin in Nepal.',
    copy: 'Hariyo Mart is being built to connect farmers, cooperatives and local producers with households, restaurants, retailers, institutions and qualified international buyers. The platform keeps origin, live stock, product specification, delivery fit, trade pack and supplier records connected instead of treating sourcing as a list of anonymous products.',
    image: '/campaigns/fresh-every-corner.webp',
    imageAlt: 'Hariyo Mart Nepal origin farm-to-market visual',
    metrics: [['420', 'catalogue SKUs across retail and trade packs'], ['210', 'distinct Nepal-focused product families'], ['28', 'regional sourcing clusters across all 7 provinces']],
    cards: [
      { icon: 'farmers', title: 'Producer identity stays visible', copy: 'The model supports farms, cooperatives, aggregators and local processors with isolated workspaces, product records, inventory, customers, orders and settlement context.' },
      { icon: 'bulk', title: 'Built beyond household retail', copy: 'Restaurants, hotels, retailers, institutions and trade buyers can use MOQ, wholesale, recurring-order, sourcing and RFQ workflows without creating a separate platform.' },
      { icon: 'quality', title: 'Claims are qualified per supplier and lot', copy: 'A catalogue profile can describe a product category, but certifications, phytosanitary status, test results, final HS classification and export permissions must be verified for the actual supplier and shipment.' },
    ],
    faq: [
      ['Is Hariyo Mart an exporter or only a marketplace?', 'It is designed as a marketplace plus sourcing and export-workflow SaaS. A buyer can discover products and submit an export RFQ, while the actual supplier, lot, documents, packing, Incoterm and logistics are qualified before a trade commitment is made.'],
      ['Are all 420 catalogue items always in stock?', 'No. The catalogue represents product and pack profiles. Live stock, harvest season, supplier availability and serviceability remain dynamic and must be confirmed before an order or quotation.'],
      ['Does “export-ready” mean every legal document is already approved?', 'No. It means the profile is suitable for export enquiry and document review. Certifications, permits, lab reports, phytosanitary requirements and final customs classification are shipment-specific.'],
      ['Who is Hariyo designed for?', 'Nepal farmers and producers, households, restaurants, hotels, retailers, institutional procurement teams, distributors, ingredient buyers and qualified international sourcing teams.'],
    ],
    cta: ['Explore Nepal origin catalogue', '/shop'],
    secondary: ['Open sourcing & export desk', '/export'],
  },
  farmers: {
    icon: 'farmers', eyebrow: 'Producer network', title: 'A digital storefront that keeps the farm visible.', copy: 'Hariyo Mart is designed to help producers publish harvests, manage stock, define realistic delivery coverage and build buyer trust without losing their own identity.', image: '/campaigns/grow-with-hariyo.webp', imageAlt: 'Farmer growing with Hariyo Mart',
    metrics: [['1', 'seller workspace per farm or cooperative'], ['8', 'product photos supported per listing'], ['360°', 'inventory, order and payout visibility']],
    cards: [
      { icon: 'quality', title: 'Verification workflow', copy: 'Seller identity, product claims, media and serviceability can be reviewed before public activation.' },
      { icon: 'delivery', title: 'Real delivery rules', copy: 'Sellers define pickup, same-day capability, radius and minimum-order rules that feed buyer matching.' },
      { icon: 'payments', title: 'Commercial records', copy: 'Orders, settlements, payouts and customer relationships stay connected to the correct seller tenant.' },
    ],
    faq: [['Can cooperatives sell?', 'Yes. The tenant model supports independent farmers, cooperatives and supplier organizations with role-scoped team access.'], ['Can I sell wholesale and retail?', 'Listings can expose retail, wholesale, subscription and minimum-order rules where the seller supports them.'], ['How do buyers find my farm?', 'Location fit, stock, freshness, seller trust, rating and buyer intent contribute to Hariyo Match ranking.']],
    cta: ['Start seller onboarding', '/sell'], secondary: ['Browse verified farms', '/farmers'],
  },
  contact: {
    icon: 'contact', eyebrow: 'Support that reaches the right workflow', title: 'Buyer help, seller onboarding, delivery support and business enquiries.', copy: 'A support request is more useful when it carries the right category, order reference and context. Hariyo Mart creates trackable tickets instead of losing important issues in generic messages.', image: '/campaigns/trusted-marketplace.webp', imageAlt: 'Trusted marketplace support visual',
    metrics: [['4', 'support paths: buyer, seller, logistics, business'], ['1', 'trackable ticket reference per request'], ['0', 'passwords, PINs or OTPs ever required by support']],
    cards: [
      { icon: 'contact', title: 'Order & buyer care', copy: 'Use the order number for missing items, delivery issues, quality complaints, returns or account help.' },
      { icon: 'farmers', title: 'Farmer success', copy: 'Get help with onboarding, verification, product publishing, inventory, delivery radius and seller operations.' },
      { icon: 'bulk', title: 'Business procurement', copy: 'Restaurants, hotels, offices, retailers and institutions can ask about recurring or wholesale supply.' },
    ],
    faq: [['What should I include in a support ticket?', 'Share your name, reachable contact, the relevant order number if available, a clear subject and the minimum evidence needed to understand the issue.'], ['What should I never send?', 'Never send passwords, OTPs, payment PINs, full card details, private API keys or Cloudflare secrets.'], ['How are urgent issues handled?', 'Urgent order issues can be marked as urgent in the ticket form so operators can triage them separately from general enquiries.']],
    cta: ['Track an existing order', '/track'], secondary: ['Read delivery information', '/info/delivery'],
  },
  subscriptions: { icon: 'subscriptions', eyebrow: 'Repeat fresh baskets', title: 'Recurring produce without pretending every harvest is identical.', copy: 'Subscription rules preserve frequency, delivery market and seller availability while allowing seasonal pauses and approved substitutions.', image: '/marketing/hariyo-platform-ad.png', imageAlt: 'Hariyo Mart platform experience', metrics: [['Weekly', 'or monthly scheduling'], ['Pause', 'without deleting the basket'], ['Seasonal', 'substitution controls']], cards: [{ icon: 'subscriptions', title: 'Flexible cadence', copy: 'Set a repeat schedule around the household or business buying rhythm.' }, { icon: 'quality', title: 'Season-aware products', copy: 'Availability remains tied to real seller stock rather than a static subscription promise.' }, { icon: 'delivery', title: 'Serviceable delivery', copy: 'The chosen market and seller coverage stay part of every recurring order.' }], faq: sharedBuyerFaq, cta: ['Browse repeat-ready products', '/shop'], secondary: ['Manage buyer account', '/account/subscriptions'] },
  'bulk-orders': { icon: 'bulk', eyebrow: 'Professional procurement', title: 'Source local produce with the details a business buyer actually needs.', copy: 'Bulk buying works best when grade, unit, MOQ, schedule, seller, delivery and price are compared together.', image: '/campaigns/connect-suppliers.webp', imageAlt: 'Supplier connection visual', metrics: [['MOQ', 'visible before buying'], ['Multi-seller', 'fulfilment supported'], ['Recurring', 'procurement workflows']], cards: [{ icon: 'bulk', title: 'Institution-ready', copy: 'Suitable for restaurants, hotels, schools, retailers, offices and hospitality buyers.' }, { icon: 'quality', title: 'Grade and pack context', copy: 'Compare product grade, pack, origin and availability—not only price.' }, { icon: 'delivery', title: 'Scheduled fulfilment', copy: 'Use delivery windows and seller serviceability to plan repeat supply.' }], faq: sharedBuyerFaq, cta: ['Open wholesale marketplace', '/shop'], secondary: ['Contact procurement support', '/info/contact'] },
  recipes: { icon: 'recipes', eyebrow: 'Season-led cooking', title: 'Start recipes with what Nepal is harvesting now.', copy: 'Hariyo content is designed to connect food stories back to available categories, origin and regional context.', image: '/hero-vegetables.jpg', imageAlt: 'Fresh vegetables for seasonal recipes', metrics: [['Seasonal', 'ingredient discovery'], ['Regional', 'food knowledge'], ['Shop', 'from ingredient categories']], cards: [{ icon: 'recipes', title: 'Cook with availability', copy: 'Use live marketplace categories as the starting point for meal planning.' }, { icon: 'leaf', title: 'Respect local variation', copy: 'Regional names and preparation styles should be credited rather than flattened into one “correct” recipe.' }, { icon: 'quality', title: 'Traceable ingredients', copy: 'Where possible, connect ingredients back to origin, seller and current availability.' }], faq: [['Will every recipe ingredient always be available?', 'No. Seasonal recipes should adapt to what sellers are actually listing in the selected market.'], ['Are recipes medical advice?', 'No. Recipe content is culinary information and does not replace professional nutritional or medical advice.']], cta: ['Browse fresh ingredients', '/shop'], secondary: ['Read marketplace stories', '/blog'] },
  sustainability: { icon: 'sustainability', eyebrow: 'Practical sustainability', title: 'Prefer measurable operating improvements over vague green claims.', copy: 'Hariyo can support closer matching, route visibility, packaging pilots and spoilage records—but claims should stay tied to evidence.', image: '/campaigns/fresh-every-corner.webp', imageAlt: 'Fresh local food network visual', metrics: [['Distance', 'included in discovery'], ['Route', 'fit before fulfilment'], ['Evidence', 'before sustainability claims']], cards: [{ icon: 'delivery', title: 'Shorter feasible routes', copy: 'Nearby does not automatically mean better, but distance-aware discovery can reduce unnecessary routing.' }, { icon: 'sustainability', title: 'Packaging experiments', copy: 'Reusable or lower-waste packaging should be tracked as an operational practice, not a slogan.' }, { icon: 'quality', title: 'Spoilage visibility', copy: 'Inventory and fulfilment records can help identify waste patterns and improve planning.' }], faq: [['Does Hariyo label every local product sustainable?', 'No. Local origin alone is not enough to support a sustainability claim.'], ['What can be measured?', 'Distance, route, packaging practice, waste/spoilage records and sourcing evidence can be reviewed where the operation captures them.']], cta: ['Discover nearby products', '/nearby'], secondary: ['Read quality standards', '/info/quality'] },
  faq: { icon: 'faq', eyebrow: 'Quick answers', title: 'Understand ordering, delivery, accounts and seller workflows before you commit.', copy: 'The marketplace intentionally keeps availability, serviceability and role permissions explicit so buyers and sellers know what changes in real time.', image: '/marketing/hariyo-platform-ad.png', imageAlt: 'Hariyo marketplace interface', metrics: [['Live', 'stock and serviceability'], ['Role-based', 'buyer and seller workspaces'], ['Trackable', 'orders and support']], cards: [{ icon: 'leaf', title: 'Marketplace basics', copy: 'Learn how location, sellers, carts and fulfilments work together.' }, { icon: 'payments', title: 'Payments & refunds', copy: 'Understand launch payment methods, provider readiness and refund handling.' }, { icon: 'contact', title: 'Need a person?', copy: 'Open a support ticket when a question depends on your order or account.' }], faq: sharedBuyerFaq.concat([['How do I get support?', 'Open the Contact & Support page to create a trackable ticket.']]), cta: ['Open support', '/info/contact'], secondary: ['See how Hariyo works', '/how-it-works'] },
  returns: { icon: 'returns', eyebrow: 'Fair quality resolution', title: 'Report genuine problems quickly and keep the evidence connected to the order.', copy: 'Fresh products vary naturally, so return review compares what arrived with the listing, grade, pack and fulfilment record.', image: '/campaigns/trusted-marketplace.webp', imageAlt: 'Marketplace trust visual', metrics: [['Order-linked', 'issue review'], ['Photo', 'evidence when useful'], ['Seller', 'response workflow']], cards: [{ icon: 'returns', title: 'Document the issue', copy: 'Reference the order and photograph damaged, spoiled or incorrect goods when appropriate.' }, { icon: 'quality', title: 'Compare expectations', copy: 'Natural size or colour variation is evaluated against the advertised grade and product description.' }, { icon: 'contact', title: 'Keep a support trail', copy: 'A ticket creates a reference for buyer, seller and operator follow-up.' }], faq: [['Can every fresh product be returned?', 'Not automatically. Perishable-product cases are reviewed against the listing, condition, fulfilment record and evidence.'], ['What if I received the wrong item?', 'Open a support ticket with the order reference and item details so the fulfilment can be checked.']], cta: ['Open a support ticket', '/info/contact'], secondary: ['Track your order', '/track'] },
  privacy: { icon: 'privacy', eyebrow: 'Data with a purpose', title: 'Use personal data to operate the marketplace—not to collect more than necessary.', copy: 'Location, address, account, order and support data support matching and fulfilment. Permissions and account controls should remain visible.', image: '/campaigns/premium-logo.webp', imageAlt: 'Hariyo Mart brand mark', metrics: [['Permission', 'for browser/mobile location'], ['Role-based', 'protected access'], ['Control', 'over saved addresses']], cards: [{ icon: 'privacy', title: 'Location choice', copy: 'Share device location or choose a city/radius manually.' }, { icon: 'quality', title: 'Data minimization', copy: 'Capture only what the marketplace needs for account, fulfilment, support and compliance workflows.' }, { icon: 'contact', title: 'Privacy questions', copy: 'Use support for account-data questions without sending passwords or secret credentials.' }], faq: [['Do I have to share GPS location?', 'No. Buyers can choose a city and radius instead where the interface supports it.'], ['Can I remove saved addresses?', 'Yes. Saved address controls belong in the buyer account workspace.']], cta: ['Manage buyer account', '/account/settings'], secondary: ['Contact support', '/info/contact'] },
  terms: { icon: 'terms', eyebrow: 'Marketplace responsibilities', title: 'Clear operating expectations for buyers, sellers and platform teams.', copy: 'Terms connect accurate listings, lawful account use, reachable delivery details and traceable operational records.', image: '/campaigns/trusted-marketplace.webp', imageAlt: 'Trusted marketplace graphic', metrics: [['Accurate', 'seller listings'], ['Lawful', 'account use'], ['Traceable', 'order and admin records']], cards: [{ icon: 'terms', title: 'Seller responsibility', copy: 'Keep stock, grade, price, origin and delivery information accurate.' }, { icon: 'farmers', title: 'Buyer responsibility', copy: 'Use the marketplace lawfully and provide usable fulfilment details.' }, { icon: 'privacy', title: 'Operational trace', copy: 'Orders, support actions and sensitive administration can be recorded for accountability.' }], faq: [['Do terms replace seller-specific delivery rules?', 'No. Product and seller fulfilment rules remain part of the actual purchase context.'], ['Where should disputes start?', 'Use the support workflow so the issue stays linked to the correct order, seller and evidence.']], cta: ['Read delivery information', '/info/delivery'], secondary: ['Contact support', '/info/contact'] },
  delivery: { icon: 'delivery', eyebrow: 'Serviceability before checkout', title: 'Delivery is a route and seller capability—not a national blanket promise.', copy: 'Hariyo exposes radius, pickup, same-day eligibility and seller fulfilment context so buyers can make a realistic decision.', image: '/campaigns/connect-suppliers.webp', imageAlt: 'Connected delivery and supplier graphic', metrics: [['Radius', 'seller-specific coverage'], ['Pickup', 'where supported'], ['Split', 'multi-seller fulfilments']], cards: [{ icon: 'delivery', title: 'Seller-specific coverage', copy: 'Every seller can operate a different service area, fee and cutoff.' }, { icon: 'bulk', title: 'Several farms, one basket', copy: 'A buyer can check out once while the platform creates seller-level fulfilment groups.' }, { icon: 'contact', title: 'Track and resolve', copy: 'Order tracking and support retain the correct fulfilment context.' }], faq: sharedBuyerFaq, cta: ['Find nearby products', '/nearby'], secondary: ['Track an order', '/track'] },
  quality: { icon: 'quality', eyebrow: 'Product expectations', title: 'Quality starts with a clear listing and continues through fulfilment feedback.', copy: 'Unit, grade, origin, harvest context, media and natural variation should be understandable before purchase.', image: '/campaigns/trusted-marketplace.webp', imageAlt: 'Verified marketplace quality visual', metrics: [['Grade', 'and pack context'], ['Harvest', 'and origin notes'], ['Feedback', 'through reviews and support']], cards: [{ icon: 'quality', title: 'Listing review', copy: 'Product claims, media and serviceability can be moderated before activation.' }, { icon: 'farmers', title: 'Seller accountability', copy: 'Inventory, reviews and support history can reveal repeat operational problems.' }, { icon: 'returns', title: 'Resolution loop', copy: 'Returns and complaints feed back into seller and product quality decisions.' }], faq: [['Does verified seller mean every product is guaranteed?', 'No. Verification is an operational status, while individual product condition still depends on listing accuracy and fulfilment.'], ['How can buyers help improve quality?', 'Accurate reviews and order-linked support reports provide useful feedback.']], cta: ['Shop verified products', '/shop'], secondary: ['Read returns policy', '/info/returns'] },
  careers: { icon: 'careers', eyebrow: 'Build the local food operating layer', title: 'Work where technology, agriculture, logistics and marketplace operations meet.', copy: 'Future roles can span engineering, quality, seller success, operations, delivery coordination, editorial and analytics.', image: '/campaigns/grow-with-hariyo.webp', imageAlt: 'Grow with Hariyo Mart', metrics: [['Tech', 'and marketplace roles'], ['Field', 'operations opportunities'], ['No fees', 'for recruitment']], cards: [{ icon: 'careers', title: 'Transparent role briefs', copy: 'Openings should state responsibilities, location, working arrangement and compensation expectations.' }, { icon: 'farmers', title: 'Field + digital teams', copy: 'The operating model needs people who understand both marketplace software and real supply chains.' }, { icon: 'privacy', title: 'Safer applications', copy: 'Hariyo Mart never asks applicants to pay recruitment fees or send account passwords.' }], faq: [['How will roles be announced?', 'Published opportunities should appear through official Hariyo channels with clear role details.'], ['Does Hariyo charge application fees?', 'No. Applicants should not pay a recruitment fee.']], cta: ['Contact the team', '/info/contact'], secondary: ['About Hariyo Mart', '/info/about'] },
  press: { icon: 'press', eyebrow: 'Verified public information', title: 'Tell the Hariyo story with current platform facts and approved assets.', copy: 'Media enquiries can reference the public marketplace model, confirmed catalogue and current service experience while user and seller data stays private.', image: '/campaigns/premium-logo.webp', imageAlt: 'Hariyo Mart media brand graphic', metrics: [['Current', 'platform facts'], ['Approved', 'brand assets'], ['Private', 'user and seller data']], cards: [{ icon: 'press', title: 'Platform fact sheet', copy: 'Use current release facts, public catalogue data and published operating descriptions.' }, { icon: 'leaf', title: 'Brand assets', copy: 'Request current logos and screenshots rather than reusing outdated material.' }, { icon: 'privacy', title: 'Privacy boundary', copy: 'Media access does not override buyer, seller or operational data protections.' }], faq: [['Can I download a media kit?', 'The current source provides brand assets; formal press bundles should be requested so operators can supply the latest approved version.'], ['Can journalists access seller/customer data?', 'Not through normal media requests. Personal and non-public seller data remains protected.']], cta: ['Send a media enquiry', '/info/contact'], secondary: ['Read about Hariyo', '/info/about'] },
  loyalty: { icon: 'loyalty', eyebrow: 'Rewards with understandable value', title: 'Recognize useful marketplace activity without hiding the rules.', copy: 'Rewards can support purchases, verified reviews, referrals and regional discovery when earning, expiry and redemption are clearly communicated.', image: '/marketing/hariyo-platform-ad.png', imageAlt: 'Hariyo buyer marketplace', metrics: [['Orders', 'can earn rewards'], ['Reviews', 'can support trust'], ['Clear', 'expiry and limits']], cards: [{ icon: 'loyalty', title: 'Useful actions', copy: 'Reward completed purchases and high-quality verified participation rather than empty engagement.' }, { icon: 'quality', title: 'Visible rules', copy: 'Buyers should understand earning, conversion, caps and expiry before relying on points.' }, { icon: 'farmers', title: 'Regional discovery', copy: 'Rewards can encourage discovery of products and producers across Nepal.' }], faq: [['Do points equal cash?', 'Only if a published conversion rule explicitly says so. Reward value should remain visible in the buyer workspace.'], ['Can reward rules change?', 'Programme terms can evolve, but buyers should see the active rule, limits and expiry before redemption.']], cta: ['Open buyer rewards', '/account/rewards'], secondary: ['Shop products', '/shop'] },
  payments: { icon: 'payments', eyebrow: 'Safe payment rollout', title: 'Enable payment methods only when merchant, callback, reconciliation and refund flows are ready.', copy: 'Cash on delivery can operate at launch where supported. Wallet and card adapters should remain disabled until the complete provider workflow is certified.', image: '/campaigns/trusted-marketplace.webp', imageAlt: 'Secure marketplace payments', metrics: [['COD', 'launch-ready where supported'], ['Signed', 'callbacks before wallets go live'], ['Never', 'share OTPs or PINs']], cards: [{ icon: 'payments', title: 'Cash on delivery', copy: 'Available when the seller and route support it.' }, { icon: 'privacy', title: 'Credential safety', copy: 'Support should never request wallet PINs, OTPs or full card details.' }, { icon: 'quality', title: 'Reconciliation first', copy: 'Online payment activation should include signed callbacks, settlement reconciliation and refund handling.' }], faq: [['Which online wallets are live?', 'Adapters may be integration-ready, but providers should not be presented as active until merchant verification and payment callbacks are certified.'], ['Will support ask for my OTP?', 'No. Never share OTPs, wallet PINs or full card details with support.']], cta: ['Start checkout', '/checkout'], secondary: ['Payment support', '/info/contact'] },
  accessibility: { icon: 'accessibility', eyebrow: 'Inclusive marketplace design', title: 'Make key marketplace journeys usable with keyboard, touch, readable contrast and clear language.', copy: 'Accessibility is an ongoing operating standard across product discovery, forms, authentication and support—not a one-time checklist.', image: '/marketing/hariyo-platform-ad.png', imageAlt: 'Hariyo Mart interface accessibility', metrics: [['Keyboard', 'focusable journeys'], ['Touch', 'friendly controls'], ['Feedback', 'for reported barriers']], cards: [{ icon: 'accessibility', title: 'Interaction access', copy: 'Visible focus, labels, keyboard navigation and appropriately sized controls support more users.' }, { icon: 'quality', title: 'Readable presentation', copy: 'Contrast, spacing and content hierarchy should remain usable in Light, Dark and Auto themes.' }, { icon: 'contact', title: 'Report a barrier', copy: 'Share the page, device and task you were trying to complete so the issue can be reproduced.' }], faq: [['How do I report an accessibility problem?', 'Use Contact & Support and describe the page, device, assistive technology if relevant and the task that was blocked.'], ['Does Auto theme follow my device?', 'Yes. Auto mode follows system light/dark preference while preserving Hariyo brand contrast tokens.']], cta: ['Report a barrier', '/info/contact'], secondary: ['Open marketplace', '/shop'] },
  'mobile-app': { icon: 'mobile', eyebrow: 'Hariyo on every screen', title: 'One marketplace model across mobile web, Android and iOS source.', copy: 'The native app and responsive web experience share marketplace data and authenticated APIs while keeping mobile discovery, basket and seller workflows touch-first.', image: '/campaigns/sell-from-home.webp', imageAlt: 'Hariyo Mart mobile selling visual', metrics: [['Android', 'source included'], ['iOS', 'source included'], ['Shared', 'marketplace API']], cards: [{ icon: 'mobile', title: 'Buyer mobility', copy: 'Search, nearby discovery, basket, order status and account journeys carry across mobile surfaces.' }, { icon: 'farmers', title: 'Farmer mobility', copy: 'Seller onboarding, products, inventory and marketplace activity are available through mobile-oriented journeys.' }, { icon: 'privacy', title: 'Protected administration', copy: 'Sensitive actions remain server-role protected even when the interface is mobile.' }], faq: [['Are App Store and Play Store downloads live?', 'Not unless official store listings have been published. Until then, use responsive web or internal signed test builds.'], ['Does mobile use the same data?', 'Yes. The intended production setup connects mobile and web to the same authenticated marketplace API and Cloudflare data platform.']], cta: ['Use mobile web now', '/shop'], secondary: ['How Hariyo works', '/how-it-works'] },
};

function DefaultExperience({ slug }: { slug: string }): Experience {
  return {
    icon: 'leaf',
    eyebrow: 'Hariyo Mart guide',
    title: 'Clear information for a more confident marketplace decision.',
    copy: 'Hariyo Mart keeps product, seller, fulfilment and support context connected so buyers and operators can understand what happens next.',
    image: '/marketing/hariyo-platform-ad.png',
    imageAlt: `${slug} information`,
    metrics: [['Clear', 'next steps'], ['Connected', 'support and account journeys'], ['Responsive', 'web and mobile presentation']],
    cards: [{ icon: 'leaf', title: 'Understand the workflow', copy: 'See the important rules and context before you act.' }, { icon: 'contact', title: 'Get support', copy: 'Use a trackable support ticket when your question depends on an order or account.' }, { icon: 'privacy', title: 'Keep sensitive data safe', copy: 'Never share passwords, PINs, OTPs or private platform credentials.' }],
    faq: sharedBuyerFaq,
    cta: ['Open marketplace', '/shop'],
    secondary: ['Contact support', '/info/contact'],
  };
}

export function InfoPageExperience({ slug }: { slug: string }) {
  const item = experiences[slug] || DefaultExperience({ slug });
  const Icon = icons[item.icon];
  return (
    <>
      <section className="info-story-shell" aria-labelledby={`${slug}-story-title`}>
        <div className="info-story-copy">
          <span className="eyebrow"><Icon size={16} /> {item.eyebrow}</span>
          <h2 id={`${slug}-story-title`}>{item.title}</h2>
          <p>{item.copy}</p>
          <div className="info-story-actions">
            <Link className="btn btn-primary" href={item.cta[1]}>{item.cta[0]} <ArrowRight size={16} /></Link>
            {item.secondary ? <Link className="btn btn-soft" href={item.secondary[1]}>{item.secondary[0]}</Link> : null}
          </div>
        </div>
        <div className="info-story-visual">
          <Image src={item.image} alt={item.imageAlt} width={880} height={660} sizes="(max-width: 900px) 100vw, 46vw" />
          <div className="info-visual-orbit" aria-hidden="true">
            <span><Store size={17} /> Farm</span>
            <span><LocateFixed size={17} /> Match</span>
            <span><ShoppingBasket size={17} /> Basket</span>
            <span><PackageCheck size={17} /> Fulfil</span>
          </div>
        </div>
      </section>

      <section className="info-metric-strip" aria-label={`${slug} key facts`}>
        {item.metrics.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </section>

      <section className="info-decision-grid">
        {item.cards.map((card) => {
          const CardIcon = icons[card.icon];
          return <article key={card.title}><span><CardIcon size={20} /></span><h3>{card.title}</h3><p>{card.copy}</p></article>;
        })}
      </section>

      {slug === 'about' ? <AboutSystemGraphic /> : null}
      {slug === 'contact' ? <ContactRoutingGraphic /> : null}

      <section className="info-faq-panel">
        <div className="info-faq-intro">
          <span className="eyebrow"><CircleHelp size={16} /> Useful before you continue</span>
          <h2>Common questions, answered in context.</h2>
          <p>Policies and availability can depend on seller, route, account role or live inventory. These answers explain the default operating model.</p>
        </div>
        <div className="info-faq-items">
          {item.faq.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}
        </div>
      </section>
    </>
  );
}

function AboutSystemGraphic() {
  return (
    <section className="about-network-graphic" aria-labelledby="about-network-title">
      <div>
        <span className="eyebrow"><Globe2 size={16} /> Connected marketplace</span>
        <h2 id="about-network-title">One Nepal-origin network, multiple routes to market.</h2>
        <p>Hariyo connects product origin, supplier, stock, city fulfilment, wholesale demand, lot specification, documents and export RFQs in one operating model. The catalogue creates discovery; the supplier and lot records determine what can actually be quoted and shipped.</p>
      </div>
      <div className="network-diagram" aria-label="Hariyo marketplace system diagram">
        <span className="network-core"><Leaf /><b>Hariyo</b><small>marketplace</small></span>
        <span className="network-node n1"><Store /><b>Seller</b></span>
        <span className="network-node n2"><MapPinned /><b>Location</b></span>
        <span className="network-node n3"><Boxes /><b>Stock</b></span>
        <span className="network-node n4"><Route /><b>City / Trade</b></span>
        <span className="network-node n5"><ReceiptText /><b>Order</b></span>
        <span className="network-node n6"><Globe2 /><b>Export RFQ</b></span>
      </div>
    </section>
  );
}

function ContactRoutingGraphic() {
  return (
    <section className="contact-routing-graphic" aria-labelledby="contact-routing-title">
      <div>
        <span className="eyebrow"><Headphones size={16} /> Faster routing</span>
        <h2 id="contact-routing-title">Choose the issue, keep the context, create a trace.</h2>
        <p>Support works best when the request starts in the right lane and keeps the order, seller or onboarding context attached.</p>
      </div>
      <div className="support-route-flow" aria-label="Support routing flow">
        <span><ShoppingBasket /><b>Buyer</b><small>orders · returns</small></span><i>→</i>
        <span><Store /><b>Seller</b><small>onboarding · listings</small></span><i>→</i>
        <span><Truck /><b>Delivery</b><small>route · fulfilment</small></span><i>→</i>
        <span><Headphones /><b>Ticket</b><small>tracked resolution</small></span>
      </div>
      <div className="support-safety-note"><ShieldCheck size={20} /><span><b>Keep secrets out of support.</b> Passwords, OTPs, wallet PINs and private infrastructure keys should never be included in a ticket.</span></div>
    </section>
  );
}
