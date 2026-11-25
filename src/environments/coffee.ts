/**
 * Where supporters are sent, by app language:
 *  - Ukrainian (ua): a Monobank jar link, e.g. 'https://send.monobank.ua/jar/XXXXXXXX'
 *  - everyone else: a PayPal.me link, e.g. 'https://paypal.me/yourname'
 *    (the chosen amount is appended, e.g. https://paypal.me/yourname/3EUR)
 * You can start with only the Monobank jar: it is then used for every language.
 * Leave both empty and the button stays disabled until a link is configured.
 */
export const SUPPORT_LINKS = {
  monobankJarUrl: 'https://send.monobank.ua/jar/3wUFzn8484',
  paypalMeUrl: '',
};

export const COFFEE_TIERS = [
  { id: 'espresso', labelKey: 'coffee.tier1', descKey: 'coffee.tier1Desc', amount: 1 },
  { id: 'cappuccino', labelKey: 'coffee.tier2', descKey: 'coffee.tier2Desc', amount: 3 },
  { id: 'cheesecake', labelKey: 'coffee.tier3', descKey: 'coffee.tier3Desc', amount: 5 },
] as const;
