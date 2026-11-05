import { isSpit, spitSizes, spitPriceKey } from './order-assessment';
import type { PriceUnit } from './types';

const catalogUnits: Record<string, PriceUnit> = {
  'Csirke kebab': 'db',
  'Csirke kebab félbőrös': 'db',
  'Marha kebab EU': 'db',
  'Csirke saslik combfiléből': 'karton',
  'Csirke saslik combfiléből szalonnával': 'karton',
  'Csirke saslik combfiléből trikolor': 'karton',
  'Csirke saslik mellfiléből szalonnával': 'karton',
  'E.h. sült csirke comb kebab': 'karton',
  'Gy.f. sült csirke comb kebab': 'karton',
  'Gy.f. sült marhahúsos kebab': 'karton',
  'Gy.f. pulled pork - tépett sertéshús': 'karton',
  'Kakas taraj': 'karton',
  'Kakas here': 'karton',
  'Haydi török joghurt': 'db',
  'Paltsidis görög joghurt': 'db',
  'Laban joghurt': 'db',
  'Haydi ayran ivójoghurt': 'karton',
  'Pita 70': 'karton',
  'Pita 80': 'karton',
  'Pita 90': 'karton',
  'Pita 100': 'karton',
  'Pita 80 teljes kiőrlésű': 'zacskó',
  'Görög pita': 'karton',
  'Görög pita teljes kiőrlésű': 'karton',
  'Dürüm tortilla 25 cm': 'csomag',
  'Dürüm tortilla 30 cm': 'csomag',
  'Dürüm tortilla 30 cm tk': 'csomag',
  'Mexifoods tortilla - gm, 15 cm': 'csomag',
  'Marlenka (csokis, diós)': 'db',
  'Marlenka (gluténmentes)': 'db',
  'Baklava (csokis, diós, vegyes)': 'karton',
  Falafel: 'kg',
  'Hutesa olajbogyó fekete szeletelt': 'db',
  'Hutesa olajbogyó zöld szeletelt': 'db',
  'Pita tasak papír': 'csomag',
  'Pita tasak nylon': 'csomag',
};

export function availableUnits(product: {
  id: string;
  name: string;
  orderUnit?: PriceUnit | null;
  availablePriceUnits?: PriceUnit[];
}): PriceUnit[] {
  if (Array.isArray(product.availablePriceUnits) && product.availablePriceUnits.length)
    return product.availablePriceUnits;
  if (isSpit(product.id)) return spitSizes.map(spitPriceKey);
  const unit = product.orderUnit || catalogUnits[product.name];
  return unit ? [unit] : [];
}
