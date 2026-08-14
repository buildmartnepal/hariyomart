export const infoPages = [
  {
    slug: 'about',
    title: 'About Hariyo Mart',
    summary:
      'A digital farm-to-home marketplace created for Nepal\u2019s diverse agricultural economy.',
  },
  {
    slug: 'farmers',
    title: 'Our Farmer Network',
    summary:
      'Profiles, verification workflows and transparent sourcing for growers and cooperatives.',
  },
  {
    slug: 'contact',
    title: 'Contact and Support',
    summary: 'Customer care, business enquiries, farmer onboarding and delivery support.',
  },
  {
    slug: 'subscriptions',
    title: 'Fresh Box Subscriptions',
    summary:
      'Weekly and monthly boxes personalized by province, household size and dietary preference.',
  },
  {
    slug: 'bulk-orders',
    title: 'Bulk and Institutional Orders',
    summary: 'Procurement tools for restaurants, hotels, schools, offices and retailers.',
  },
  {
    slug: 'recipes',
    title: 'Nepali Recipes',
    summary: 'Practical seasonal recipes using traceable local ingredients.',
  },
  {
    slug: 'sustainability',
    title: 'Sustainability',
    summary: 'Lower food miles, reusable packaging pilots and responsible sourcing standards.',
  },
  {
    slug: 'faq',
    title: 'Frequently Asked Questions',
    summary: 'Answers about ordering, delivery, payments, quality and returns.',
  },
  {
    slug: 'returns',
    title: 'Returns and Refunds',
    summary: 'A fair policy for damaged, incorrect or quality-sensitive products.',
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary:
      'How the platform handles personal data, account information and location preferences.',
  },
  {
    slug: 'terms',
    title: 'Terms and Conditions',
    summary: 'Marketplace terms for customers, vendors, farmers and delivery partners.',
  },
  {
    slug: 'delivery',
    title: 'Delivery Information',
    summary: 'Service zones, cold-chain handling, delivery windows and proof of delivery.',
  },
  {
    slug: 'quality',
    title: 'Quality Standards',
    summary: 'Product grading, hygiene, storage, traceability and complaint resolution.',
  },
  {
    slug: 'careers',
    title: 'Careers',
    summary: 'Opportunities in technology, operations, agriculture, quality and logistics.',
  },
  {
    slug: 'press',
    title: 'Press and Media',
    summary: 'Brand facts, media contacts and downloadable company information.',
  },
  {
    slug: 'loyalty',
    title: 'Hariyo Rewards',
    summary: 'Points, tier benefits, referral credit and province discovery rewards.',
  },
  {
    slug: 'payments',
    title: 'Payment Methods',
    summary: 'Cash on delivery and integration-ready eSewa, Khalti, FonePay and cards.',
  },
  {
    slug: 'accessibility',
    title: 'Accessibility',
    summary: 'Commitment to inclusive content, keyboard use, contrast and readable interfaces.',
  },
  {
    slug: 'mobile-app',
    title: 'Hariyo Mart Mobile Apps',
    summary:
      'A shared marketplace experience for Android, iOS and mobile web with nearby discovery, ordering and seller tools.',
  },
] as const;

export type InfoSection = { heading: string; paragraphs: string[] };

const details: Record<string, { sections: InfoSection[]; highlights: string[] }> = {
  about: {
    sections: [
      {
        heading: 'A marketplace built around origin',
        paragraphs: [
          'Hariyo Mart is designed so farm identity, location, available stock and realistic delivery coverage stay visible from discovery through fulfilment.',
          'The platform serves households and professional buyers while giving each farmer or cooperative an isolated digital store.',
        ],
      },
      {
        heading: 'Made for Nepal’s geography',
        paragraphs: [
          'Seven provinces, changing seasons and difficult routes require local service areas rather than one national delivery promise. Sellers control the radius they can actually operate.',
        ],
      },
    ],
    highlights: [
      'Buyer, farmer and admin workspaces',
      'Seven-province catalogue',
      'Cloudflare-first operating model',
    ],
  },
  farmers: {
    sections: [
      {
        heading: 'Verified seller profiles',
        paragraphs: [
          'Farmer identity, farm location, specialties and service radius are reviewed before public activation. Verification is an operational status, not a blanket quality guarantee.',
        ],
      },
      {
        heading: 'Independent stores, unified buying',
        paragraphs: [
          'Each seller manages their own inventory, orders and payouts while customers use one marketplace and one cart.',
        ],
      },
    ],
    highlights: [
      'Farm and cooperative onboarding',
      'Tenant-isolated records',
      'Product moderation',
    ],
  },
  contact: {
    sections: [
      {
        heading: 'Reach the right team',
        paragraphs: [
          'Use the support form for order, delivery, farmer onboarding or business procurement questions. A ticket number is created so the request can be tracked.',
        ],
      },
      {
        heading: 'Share only what is needed',
        paragraphs: [
          'Never send passwords, payment PINs or private Cloudflare credentials through a support request.',
        ],
      },
    ],
    highlights: ['Buyer and seller support', 'Order-linked tickets', 'Priority triage'],
  },
  subscriptions: {
    sections: [
      {
        heading: 'Repeat baskets without stale promises',
        paragraphs: [
          'Subscriptions are created from products that a seller has marked as repeat-ready. Quantity, frequency and delivery market remain visible before confirmation.',
        ],
      },
      {
        heading: 'Seasonal substitutions',
        paragraphs: [
          'A seller must request approval before replacing a seasonal item; the buyer can pause or cancel future baskets.',
        ],
      },
    ],
    highlights: ['Weekly or monthly schedules', 'Pause and resume', 'Season-aware substitutions'],
  },
  'bulk-orders': {
    sections: [
      {
        heading: 'Procurement for professional kitchens',
        paragraphs: [
          'Restaurants, hotels, schools, retailers and offices can request wholesale quantities, recurring lists and scheduled fulfilment.',
        ],
      },
      {
        heading: 'Compare the complete cost',
        paragraphs: [
          'Review unit, grade, minimum quantity, delivery fee and service window—not only the headline price.',
        ],
      },
    ],
    highlights: ['Wholesale quantities', 'Repeat produce lists', 'Multi-seller fulfilment'],
  },
  recipes: {
    sections: [
      {
        heading: 'Cook with what is actually in season',
        paragraphs: [
          'Recipes link back to currently available categories so a meal plan can start with local harvest rather than imported assumptions.',
        ],
      },
      {
        heading: 'Respect regional variation',
        paragraphs: [
          'Names, spice levels and preparation methods vary across Nepal; stories should credit the source and avoid presenting one household method as the only correct version.',
        ],
      },
    ],
    highlights: ['Seasonal ingredients', 'Regional food knowledge', 'Shop-the-recipe links'],
  },
  sustainability: {
    sections: [
      {
        heading: 'Measure practical improvements',
        paragraphs: [
          'The platform prioritizes closer serviceable stock, realistic routes, reusable packaging pilots and transparent waste records.',
        ],
      },
      {
        heading: 'Avoid unsupported claims',
        paragraphs: [
          'No product or delivery is described as sustainable without a defined practice and evidence that operators can review.',
        ],
      },
    ],
    highlights: ['Distance-aware discovery', 'Packaging pilots', 'Spoilage records'],
  },
  faq: {
    sections: [
      {
        heading: 'Ordering and delivery',
        paragraphs: [
          'Product availability is live. One cart can create several seller fulfilments, each with its own delivery status.',
        ],
      },
      {
        heading: 'Accounts and payments',
        paragraphs: [
          'Buyer accounts work on web and mobile. Cash on delivery is the default launch method; online providers remain off until merchant verification is complete.',
        ],
      },
    ],
    highlights: ['Multi-seller orders', 'Location-based availability', 'Role-protected accounts'],
  },
  returns: {
    sections: [
      {
        heading: 'Report quality-sensitive issues quickly',
        paragraphs: [
          'Photograph damaged, spoiled or incorrect products and reference the order number as soon as practical after delivery.',
        ],
      },
      {
        heading: 'Fair review',
        paragraphs: [
          'Natural variation is not automatically a defect. The team compares the delivered product with its listing, grade, pack and fulfilment record.',
        ],
      },
    ],
    highlights: ['Order-linked evidence', 'Refund review trail', 'Seller response workflow'],
  },
  privacy: {
    sections: [
      {
        heading: 'Data used to operate the marketplace',
        paragraphs: [
          'Account, address, approximate location, order and support information is used to match serviceable products and fulfil purchases.',
        ],
      },
      {
        heading: 'Location control',
        paragraphs: [
          'Browser and mobile location require permission. Buyers can instead choose a city and radius, and can remove saved addresses from their account.',
        ],
      },
    ],
    highlights: ['Data minimization', 'Location permission controls', 'Role-based access'],
  },
  terms: {
    sections: [
      {
        heading: 'Marketplace responsibilities',
        paragraphs: [
          'Sellers are responsible for accurate product, stock, grade, price and delivery information. Buyers must provide reachable delivery details and use accounts lawfully.',
        ],
      },
      {
        heading: 'Operational records',
        paragraphs: [
          'Orders, fulfilments, support actions and security-sensitive administration are recorded for traceability.',
        ],
      },
    ],
    highlights: ['Buyer and seller responsibilities', 'Acceptable use', 'Order records'],
  },
  delivery: {
    sections: [
      {
        heading: 'Coverage is seller-specific',
        paragraphs: [
          'A product is serviceable only when the chosen location fits the seller or platform delivery zone. Radius, fee, minimum order and cutoff can differ.',
        ],
      },
      {
        heading: 'Several farms, several fulfilments',
        paragraphs: [
          'A mixed cart can arrive in separate packages because freshness, route and pickup points differ by seller.',
        ],
      },
    ],
    highlights: ['Delivery zones', 'Pickup options', 'Trackable fulfilments'],
  },
  quality: {
    sections: [
      {
        heading: 'Listings should set expectations',
        paragraphs: [
          'Unit, grade, harvest note, origin, pack and natural variation must be described before a product becomes public.',
        ],
      },
      {
        heading: 'Quality continues after listing',
        paragraphs: [
          'Inventory events, reviews, support tickets and seller performance help operators identify recurring problems.',
        ],
      },
    ],
    highlights: ['Product review', 'Batch and harvest notes', 'Complaint feedback loop'],
  },
  careers: {
    sections: [
      {
        heading: 'Work across technology and agriculture',
        paragraphs: [
          'Future roles may include marketplace operations, quality, seller success, delivery coordination, engineering and editorial work.',
        ],
      },
      {
        heading: 'Fair applications',
        paragraphs: [
          'Open roles should state location, responsibilities, working arrangement and compensation range. Hariyo Mart never asks applicants to pay a recruitment fee.',
        ],
      },
    ],
    highlights: ['Transparent role briefs', 'No recruitment fees', 'Nepal-wide operations'],
  },
  press: {
    sections: [
      {
        heading: 'Use verified platform facts',
        paragraphs: [
          'Media requests can reference the marketplace model, current public catalogue and confirmed service areas. User and seller data remains private.',
        ],
      },
      {
        heading: 'Brand assets',
        paragraphs: [
          'Logos and screenshots should be requested through the support team so the correct, current version is supplied.',
        ],
      },
    ],
    highlights: ['Platform fact sheet', 'Media enquiries', 'Approved brand assets'],
  },
  loyalty: {
    sections: [
      {
        heading: 'Reward useful marketplace activity',
        paragraphs: [
          'Points can recognize completed purchases, verified reviews, referrals and discovery of regional products.',
        ],
      },
      {
        heading: 'Clear value and expiry',
        paragraphs: [
          'Reward rules, conversion value, limits and expiry must be visible before a buyer relies on them.',
        ],
      },
    ],
    highlights: ['Order rewards', 'Verified review points', 'Transparent expiry'],
  },
  payments: {
    sections: [
      {
        heading: 'Launch with safe payment methods',
        paragraphs: [
          'Cash on delivery is available where sellers support it. Online providers stay disabled until merchant onboarding, signed callbacks, reconciliation and refund handling are tested.',
        ],
      },
      {
        heading: 'Never share a wallet PIN',
        paragraphs: [
          'Hariyo Mart support will not ask for OTPs, wallet PINs or full card details.',
        ],
      },
    ],
    highlights: ['Cash on delivery', 'Integration-ready wallets', 'Reconciliation controls'],
  },
  'mobile-app': {
    sections: [
      {
        heading: 'Shop and sell from one mobile experience',
        paragraphs: [
          'The Hariyo Mart Expo application shares the same marketplace catalogue and authenticated API as the website. Buyers can search products, browse nearby harvests, maintain a basket, place orders and review order status.',
          'Farmer journeys provide mobile access to seller onboarding, inventory and marketplace activity while sensitive administration remains protected by server-side roles.',
        ],
      },
      {
        heading: 'Install it on your own infrastructure',
        paragraphs: [
          'The source package includes Android, iOS and web export configuration. Connect the production API and web URLs through the documented Expo environment variables before creating signed store builds.',
          'Until official store listings are published, use the responsive website or create internal test builds. Hariyo Mart does not present inactive app-store badges as live downloads.',
        ],
      },
    ],
    highlights: [
      'Android and iOS source',
      'Shared live marketplace API',
      'Dark mode and mobile navigation',
    ],
  },
  accessibility: {
    sections: [
      {
        heading: 'Design for different ways of using the service',
        paragraphs: [
          'Interfaces target keyboard access, visible focus, readable contrast, descriptive labels and touch-friendly controls.',
        ],
      },
      {
        heading: 'Keep improving with feedback',
        paragraphs: [
          'Report a barrier through support with the page, device and task you were trying to complete.',
        ],
      },
    ],
    highlights: ['Keyboard navigation', 'Readable contrast', 'Accessible support'],
  },
};

export function infoPageDetails(slug: string) {
  return details[slug] || { sections: [], highlights: [] };
}
