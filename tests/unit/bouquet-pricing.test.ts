import { describe, it, expect } from 'vitest';
import { priceBouquetAgainst, type PricingCatalog } from '@/features/bouquet/pricing';
import type { FlowerDTO, WrapDTO, BouquetSettingsDTO } from '@/features/bouquet/types';

// All money is integer piasters.

function flower(overrides: Partial<FlowerDTO> = {}): FlowerDTO {
  return {
    id: 'rose',
    name: 'Rose',
    slug: 'rose',
    pricePerStemMinor: 5_000, // EGP 50 / stem
    colors: [
      { key: 'red', label: 'Red', swatchHex: '#ff0000', available: true, sortOrder: 0 },
      { key: 'white', label: 'White', swatchHex: '#ffffff', available: false, sortOrder: 1 },
    ],
    seasons: [],
    available: true,
    media: [],
    sortOrder: 0,
    status: 'active',
    inSeason: true,
    selectable: true,
    ...overrides,
  };
}

function wrap(overrides: Partial<WrapDTO> = {}): WrapDTO {
  return {
    id: 'silk',
    name: 'Blush silk',
    material: 'silk',
    priceMinor: 7_500,
    available: true,
    sortOrder: 0,
    status: 'active',
    ...overrides,
  };
}

const settings: BouquetSettingsDTO = {
  enabled: true,
  minStems: 5,
  maxStems: 50,
  basePriceMinor: 2_500,
  card: { enabled: true, priceMinor: 1_000, maxLength: 200 },
};

function catalog(overrides: Partial<PricingCatalog> = {}): PricingCatalog {
  return { flowers: [flower()], wraps: [wrap()], settings, ...overrides };
}

describe('priceBouquetAgainst', () => {
  it('prices stems, wrap and arrangement fee from the catalogue', () => {
    const result = priceBouquetAgainst(
      { flowers: [{ flowerId: 'rose', colorKey: 'red', qty: 6 }], wrapId: 'silk' },
      catalog(),
    );

    // 6 × 5000 + 7500 wrap + 2500 base
    expect(result.totalMinor).toBe(40_000);
    expect(result.stemCount).toBe(6);
    expect(result.flowers[0].lineMinor).toBe(30_000);
  });

  it('adds the card price only when a message is present', () => {
    const withCard = priceBouquetAgainst(
      {
        flowers: [{ flowerId: 'rose', colorKey: 'red', qty: 6 }],
        wrapId: 'silk',
        cardMessage: 'Happy birthday',
      },
      catalog(),
    );

    expect(withCard.cardPriceMinor).toBe(1_000);
    expect(withCard.totalMinor).toBe(41_000);
    expect(withCard.cardMessage).toBe('Happy birthday');
  });

  it('treats a whitespace-only card message as no card', () => {
    const result = priceBouquetAgainst(
      {
        flowers: [{ flowerId: 'rose', colorKey: 'red', qty: 6 }],
        wrapId: 'silk',
        cardMessage: '   ',
      },
      catalog(),
    );

    expect(result.cardPriceMinor).toBe(0);
    expect(result.cardMessage).toBeUndefined();
  });

  it('ignores any price the client might have sent', () => {
    // The config type carries no prices at all; this asserts the total is
    // derived purely from the catalogue.
    const tampered = {
      flowers: [
        { flowerId: 'rose', colorKey: 'red', qty: 6, perStemMinor: 1 },
      ],
      wrapId: 'silk',
    } as unknown as Parameters<typeof priceBouquetAgainst>[0];

    const result = priceBouquetAgainst(tampered, catalog());
    expect(result.totalMinor).toBe(40_000);
    expect(result.flowers[0].perStemMinor).toBe(5_000);
  });

  it('rejects a bouquet below the stem minimum', () => {
    expect(() =>
      priceBouquetAgainst(
        { flowers: [{ flowerId: 'rose', colorKey: 'red', qty: 4 }], wrapId: 'silk' },
        catalog(),
      ),
    ).toThrow(/at least 5 stems/);
  });

  it('rejects a bouquet above the stem maximum', () => {
    expect(() =>
      priceBouquetAgainst(
        { flowers: [{ flowerId: 'rose', colorKey: 'red', qty: 51 }], wrapId: 'silk' },
        catalog(),
      ),
    ).toThrow(/at most 50 stems/);
  });

  it('rejects an out-of-season flower', () => {
    const winterOnly = flower({ inSeason: false, selectable: false });
    expect(() =>
      priceBouquetAgainst(
        { flowers: [{ flowerId: 'rose', colorKey: 'red', qty: 6 }], wrapId: 'silk' },
        catalog({ flowers: [winterOnly] }),
      ),
    ).toThrow(/not available right now/);
  });

  it('rejects an unavailable colour', () => {
    expect(() =>
      priceBouquetAgainst(
        { flowers: [{ flowerId: 'rose', colorKey: 'white', qty: 6 }], wrapId: 'silk' },
        catalog(),
      ),
    ).toThrow(/out of stock/);
  });

  it('rejects an unknown colour', () => {
    expect(() =>
      priceBouquetAgainst(
        { flowers: [{ flowerId: 'rose', colorKey: 'chartreuse', qty: 6 }], wrapId: 'silk' },
        catalog(),
      ),
    ).toThrow(/Choose a colour/);
  });

  it('rejects an unknown flower', () => {
    expect(() =>
      priceBouquetAgainst(
        { flowers: [{ flowerId: 'ghost-orchid', colorKey: '', qty: 6 }], wrapId: 'silk' },
        catalog(),
      ),
    ).toThrow(/no longer available/);
  });

  it('rejects an unavailable wrapping', () => {
    expect(() =>
      priceBouquetAgainst(
        { flowers: [{ flowerId: 'rose', colorKey: 'red', qty: 6 }], wrapId: 'silk' },
        catalog({ wraps: [wrap({ available: false })] }),
      ),
    ).toThrow(/wrapping is no longer available/);
  });

  it('rejects a card message over the configured length', () => {
    expect(() =>
      priceBouquetAgainst(
        {
          flowers: [{ flowerId: 'rose', colorKey: 'red', qty: 6 }],
          wrapId: 'silk',
          cardMessage: 'x'.repeat(201),
        },
        catalog(),
      ),
    ).toThrow(/200 characters or fewer/);
  });

  it('refuses to price anything while the builder is disabled', () => {
    expect(() =>
      priceBouquetAgainst(
        { flowers: [{ flowerId: 'rose', colorKey: 'red', qty: 6 }], wrapId: 'silk' },
        catalog({ settings: { ...settings, enabled: false } }),
      ),
    ).toThrow(/not currently available/);
  });

  it('allows a flower that defines no colours', () => {
    const plain = flower({ id: 'gyp', name: 'Gypsophila', colors: [] });
    const result = priceBouquetAgainst(
      { flowers: [{ flowerId: 'gyp', colorKey: '', qty: 5 }], wrapId: 'silk' },
      catalog({ flowers: [plain] }),
    );

    expect(result.flowers[0].colorLabel).toBe('');
    expect(result.stemCount).toBe(5);
  });

  it('emits summary lines for the order snapshot, admin table and emails', () => {
    const result = priceBouquetAgainst(
      {
        flowers: [{ flowerId: 'rose', colorKey: 'red', qty: 6 }],
        wrapId: 'silk',
        cardMessage: 'With love',
      },
      catalog(),
    );

    expect(result.summaryLines).toEqual([
      { label: 'Rose — Red', value: '×6' },
      { label: 'Wrap', value: 'Blush silk (silk)' },
      { label: 'Card', value: 'With love' },
    ]);
  });

  it('counts stems across several flower types', () => {
    const peony = flower({ id: 'peony', name: 'Peony', pricePerStemMinor: 9_000, colors: [] });
    const result = priceBouquetAgainst(
      {
        flowers: [
          { flowerId: 'rose', colorKey: 'red', qty: 3 },
          { flowerId: 'peony', colorKey: '', qty: 2 },
        ],
        wrapId: 'silk',
      },
      catalog({ flowers: [flower(), peony] }),
    );

    expect(result.stemCount).toBe(5);
    // 3×5000 + 2×9000 + 7500 + 2500
    expect(result.totalMinor).toBe(43_000);
  });
});
