# Hariyo Mart v9.0.0 UI/UX System

## Brand modes
- Auto Day: lime/emerald accents, warm clean surfaces, strong dark-green text.
- Auto Night: mint/forest accents, elevated dark surfaces, high-contrast interactive states.
- Manual Light/Dark remain stable and independent from system preference.

## Web navigation
- Predictive global search.
- Nearby, Marketplace, How It Works, Farmers, Track, Stories.
- Seller CTA, theme, Saved, Compare, Account, Basket.
- Demo Lab appears only when demo mode is enabled.

## Mobile web
- Touch-first search sheet and commerce navigation.
- Safe-area aware bottom dock and product purchase bar.
- Demo Lab uses one-column role cards on small screens.
- Basket, saved baskets, compare and checkout use full-width primary actions.

## Native mobile
- Five primary tabs: Home, Nearby, Shop, Cart, Account.
- Demo role launch is discovered from the live web API rather than a hardcoded local flag.
- Order history supports one-tap reorder.
- Cart quantity logic respects minimum order.

## Commerce interaction rules
- Preserve seller, stock, MOQ and location information through discovery → cart → checkout.
- Primary CTA is visually unique per surface.
- Destructive controls are icon-labeled and separated from primary purchase actions.
- Auth and demo flows always expose actionable server errors.
