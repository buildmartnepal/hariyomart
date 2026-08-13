export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: 'Buying guide' | 'Farm story' | 'Food knowledge' | 'Seller academy';
  author: string;
  publishedAt: string;
  readTime: string;
  emoji: string;
  relatedCategory: string;
  featured?: boolean;
  sections: { heading: string; paragraphs: string[] }[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'seasonal-produce-nepal-seven-provinces',
    title: 'What Is in Season Across Nepal’s Seven Provinces?',
    excerpt:
      'A practical way to shop with Nepal’s changing altitudes, harvest windows and regional strengths in mind.',
    category: 'Buying guide',
    author: 'Hariyo Mart Editorial',
    publishedAt: '2026-07-18',
    readTime: '7 min read',
    emoji: '🗺️',
    relatedCategory: 'vegetables',
    featured: true,
    sections: [
      {
        heading: 'Season is local, not just monthly',
        paragraphs: [
          'Nepal can have cool highland orchards and warm Terai fields producing at the same time. A useful seasonal guide therefore starts with origin, altitude and travel time—not only a month on the calendar.',
          'Hariyo Mart listings show province, district and seller location so buyers can compare where a harvest came from and whether it can reach their delivery market while still fresh.',
        ],
      },
      {
        heading: 'Shop by regional strength',
        paragraphs: [
          'Koshi is well known for tea, cardamom and eastern hill crops; Madhesh for mango, grains, lentils and vegetables; Bagmati for valley greens, mushrooms and dairy; and Gandaki for apples, beans, honey and mountain produce.',
          'Lumbini’s grains and mustard products, Karnali’s heritage crops, and Sudurpashchim’s millet, citrus and honey add more choice when local supply is limited. Use the marketplace radius control to balance proximity with regional variety.',
        ],
      },
      {
        heading: 'Read a live listing carefully',
        paragraphs: [
          'Check the unit, available stock, harvest note, delivery radius and seller verification before ordering. Natural variation is normal; transparent grading and pack information make comparison fairer for both farmer and buyer.',
        ],
      },
    ],
  },
  {
    slug: 'mustang-apple-orchard-to-kitchen',
    title: 'From a Mustang Orchard to a Kathmandu Kitchen',
    excerpt:
      'How collection, grading and careful transport help a high-altitude apple keep its identity on the journey south.',
    category: 'Farm story',
    author: 'Nima Gurung',
    publishedAt: '2026-06-29',
    readTime: '6 min read',
    emoji: '🍎',
    relatedCategory: 'fresh-fruits',
    sections: [
      {
        heading: 'The value begins at origin',
        paragraphs: [
          'A Mustang apple is more than a product name. Orchard location, harvest timing, variety and grading all shape what reaches the customer. Preserving those details prevents regional produce from becoming anonymous in a long supply chain.',
        ],
      },
      {
        heading: 'Aggregation without losing traceability',
        paragraphs: [
          'Small orchards often need a shared collection point. Each batch can still retain its grower group, village, packing date and grade. A marketplace order then becomes a traceable record rather than a loose phone agreement.',
          'For buyers, this means a clearer expectation of size and condition. For growers, it creates evidence about which grades and pack sizes earn repeat orders.',
        ],
      },
      {
        heading: 'Plan for the road',
        paragraphs: [
          'High-altitude produce may need scheduled fulfilment rather than same-day delivery. Good packaging, limited handling and realistic delivery promises are more valuable than an impossible speed claim.',
        ],
      },
    ],
  },
  {
    slug: 'how-to-choose-ilam-tea',
    title: 'How to Choose an Ilam Tea You Will Actually Enjoy',
    excerpt:
      'Origin, leaf style, aroma and brewing guidance matter more than a premium-looking packet.',
    category: 'Buying guide',
    author: 'Maya Rai',
    publishedAt: '2026-06-10',
    readTime: '5 min read',
    emoji: '🍵',
    relatedCategory: 'tea-coffee',
    sections: [
      {
        heading: 'Start with how you drink tea',
        paragraphs: [
          'A light whole-leaf tea suits a gentler infusion, while a stronger broken-leaf style may stand up better to milk. The useful question is not simply which tea costs more, but which processing style matches your cup.',
        ],
      },
      {
        heading: 'Look beyond the front label',
        paragraphs: [
          'Check the producing district, pack date, leaf description, net weight and storage instructions. A verified seller profile should make it easy to understand who packed the tea and where questions can be directed.',
          'Fresh tea should be protected from moisture, heat, light and strong surrounding aromas. Reseal the pack after use rather than transferring it to an unlabelled container.',
        ],
      },
      {
        heading: 'Brew consistently before comparing',
        paragraphs: [
          'Use the same water, leaf amount and steep time when comparing two teas. Small changes in brewing can create a bigger difference than the label, so record the method that produces the cup you prefer.',
        ],
      },
    ],
  },
  {
    slug: 'karnali-marshi-rice-traceability',
    title: 'Why Traceability Matters for Karnali Marshi Rice',
    excerpt:
      'Transparent origin and batch information can protect heritage value while giving buyers a clearer product.',
    category: 'Food knowledge',
    author: 'Hariyo Mart Editorial',
    publishedAt: '2026-05-22',
    readTime: '6 min read',
    emoji: '🌾',
    relatedCategory: 'grains',
    sections: [
      {
        heading: 'Heritage needs a record',
        paragraphs: [
          'When a crop’s name carries regional meaning, origin should not disappear between farm and packet. District, producer group, batch and packing information give buyers a practical trail to follow.',
        ],
      },
      {
        heading: 'Better information supports better pricing',
        paragraphs: [
          'A clear listing can separate variety, grade, pack size and delivery cost. That makes the final price easier to explain and reduces pressure to compare a traceable heritage product with an unverified generic substitute.',
        ],
      },
      {
        heading: 'Storage is part of quality',
        paragraphs: [
          'Dry, sealed storage and sensible batch rotation help protect grain after purchase. Buyers ordering in bulk should confirm the pack format and a realistic consumption period before choosing the largest size.',
        ],
      },
    ],
  },
  {
    slug: 'fresh-vegetable-storage-at-home',
    title: 'A Simple Home System for Fresher Vegetables',
    excerpt:
      'Buy the right quantity, separate sensitive produce and turn older vegetables into planned meals first.',
    category: 'Food knowledge',
    author: 'Sushma Karki',
    publishedAt: '2026-05-04',
    readTime: '5 min read',
    emoji: '🥬',
    relatedCategory: 'leafy-greens',
    sections: [
      {
        heading: 'Plan before adding to cart',
        paragraphs: [
          'Begin with the meals you expect to cook and the storage space you actually have. A low unit price does not save money if half the pack is discarded.',
        ],
      },
      {
        heading: 'Give different produce different conditions',
        paragraphs: [
          'Leafy greens benefit from gentle handling and controlled moisture. Potatoes and onions need dry, ventilated storage and should not be crowded together. Tomatoes may be better kept away from the cold until ripe.',
          'Keep a visible “use first” area for produce nearing the end of its best quality. This small habit is easier than remembering the age of every item.',
        ],
      },
      {
        heading: 'Make freshness measurable',
        paragraphs: [
          'Note which pack sizes your household finishes and use subscriptions only for predictable staples. Hariyo Mart’s order history can help a buyer repeat the right quantity rather than the biggest one.',
        ],
      },
    ],
  },
  {
    slug: 'regional-honey-buying-guide-nepal',
    title: 'A Buyer’s Guide to Nepal’s Regional Honey',
    excerpt:
      'Floral source, season, location and handling explain natural differences in colour, aroma and texture.',
    category: 'Buying guide',
    author: 'Asha Bista',
    publishedAt: '2026-04-17',
    readTime: '5 min read',
    emoji: '🍯',
    relatedCategory: 'honey',
    sections: [
      {
        heading: 'Variation is not automatically a defect',
        paragraphs: [
          'Honey can differ by floral source, landscape and harvest period. Colour and texture alone do not prove quality, so a useful listing explains source region, net weight, batch and seller.',
        ],
      },
      {
        heading: 'Ask practical questions',
        paragraphs: [
          'Look for clear packaging, producer identity and handling information. If a claim is important to your purchase, the seller should be able to explain what it means and what record supports it.',
        ],
      },
      {
        heading: 'Store it simply',
        paragraphs: [
          'Keep the lid closed, avoid introducing water and store away from strong heat. Crystallisation can occur naturally; follow seller guidance instead of treating every change in texture as spoilage.',
        ],
      },
    ],
  },
  {
    slug: 'digital-storefront-for-nepal-farmers',
    title: 'Building a Farm Storefront That Earns Repeat Orders',
    excerpt:
      'Accurate stock, useful photos, realistic delivery zones and fast order updates build more trust than slogans.',
    category: 'Seller academy',
    author: 'Hariyo Mart Seller Team',
    publishedAt: '2026-03-26',
    readTime: '8 min read',
    emoji: '🧺',
    relatedCategory: 'vegetables',
    sections: [
      {
        heading: 'Publish what is genuinely available',
        paragraphs: [
          'Start with a manageable catalogue and update stock whenever harvest, packing or confirmed orders change it. A small accurate store is more useful than a large stale one.',
        ],
      },
      {
        heading: 'Make every listing answer five questions',
        paragraphs: [
          'The buyer needs to know what the product is, where it came from, how much the pack contains, when it can be fulfilled and how much it costs. Add grade or natural variation notes when they affect expectations.',
          'Use your own clear product photograph when possible. Avoid text-heavy posters that hide the food, and keep the pack shown in the photo consistent with the unit in the listing.',
        ],
      },
      {
        heading: 'Promise a service area you can operate',
        paragraphs: [
          'Draw delivery zones around actual routes and collection points. Review rejected or delayed orders each week, then adjust the radius, cutoff time or minimum order instead of repeating the same failure.',
        ],
      },
    ],
  },
  {
    slug: 'reduce-food-waste-with-local-shopping',
    title: 'Seven Marketplace Habits That Reduce Food Waste',
    excerpt:
      'Better quantities, flexible grades, planned deliveries and clear stock records can prevent avoidable waste.',
    category: 'Food knowledge',
    author: 'Hariyo Mart Editorial',
    publishedAt: '2026-03-08',
    readTime: '6 min read',
    emoji: '♻️',
    relatedCategory: 'fresh-fruits',
    sections: [
      {
        heading: 'Match the order to the week',
        paragraphs: [
          'Choose quantities based on meals, household size and storage—not only discount thresholds. Schedule recurring orders for stable needs and keep seasonal extras as one-time purchases.',
        ],
      },
      {
        heading: 'Give imperfect produce a clear place',
        paragraphs: [
          'Sellers can describe cosmetic variation honestly and offer suitable grades for cooking, juicing or hospitality buyers. Buyers gain value while edible produce gains another route to market.',
        ],
      },
      {
        heading: 'Use data as a feedback loop',
        paragraphs: [
          'Order history, cancellation reasons and stock adjustments reveal where forecasting is weak. Even a simple weekly review helps a farmer list more accurately and helps a buyer choose better quantities next time.',
        ],
      },
    ],
  },
];
