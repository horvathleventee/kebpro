import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Product {
  id: string;
  name: string;
}
interface PickerProps {
  products: Product[];
  favoriteProductIds: string[];
  onFavorite(id: string, active: boolean): Promise<unknown>;
  onSelect(product: Product): void;
  onClose(): void;
  onError(error: unknown): void;
}
export function ProductPicker({
  products,
  favoriteProductIds,
  onFavorite,
  onSelect,
  onClose,
  onError,
}: PickerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState(favoriteProductIds);
  const [saving, setSaving] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const results = useMemo(
    () =>
      [...products]
        .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)))
        .filter((product) =>
          product.name.toLocaleLowerCase('hu').includes(search.trim().toLocaleLowerCase('hu')),
        ),
    [products, favorites, search],
  );
  async function toggle(productId: string) {
    if (saving) return;
    const active = !favorites.includes(productId);
    setSaving(productId);
    try {
      await onFavorite(productId, active);
      setFavorites((current) =>
        active
          ? [...current.filter((id) => id !== productId), productId]
          : current.filter((id) => id !== productId),
      );
    } catch (error) {
      onError(error);
    } finally {
      setSaving('');
    }
  }
  return (
    <dialog
      ref={dialog}
      className="product-picker"
      aria-labelledby="picker-title"
      onClose={onClose}
    >
      <div className="card-header">
        <h2 id="picker-title">Válassz terméket</h2>
        <button
          className="button secondary"
          type="button"
          id="close-picker"
          aria-label="Termékválasztó bezárása"
          onClick={() => dialog.current?.close()}
        >
          Bezárás
        </button>
      </div>
      <label htmlFor="product-search">Keresés a termékek között</label>
      <input
        id="product-search"
        type="search"
        placeholder="Például: csirke"
        autoComplete="off"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <p id="product-count" className="muted small" role="status">
        {results.length} termék
      </p>
      <div className="product-options">
        {results.length ? (
          results.map((product) => (
            <div className="product-choice" key={product.id}>
              <button
                type="button"
                data-product={product.id}
                onClick={() => {
                  onSelect(product);
                  dialog.current?.close();
                }}
              >
                {product.name}
                <span aria-hidden="true">＋</span>
              </button>
              <button
                type="button"
                data-favorite={product.id}
                aria-label={product.name + ' kedvenc'}
                aria-pressed={favorites.includes(product.id)}
                disabled={!!saving}
                onClick={() => toggle(product.id)}
              >
                {favorites.includes(product.id) ? '★' : '☆'}
              </button>
            </div>
          ))
        ) : (
          <p>Nincs ilyen termék. Próbálj másik keresést.</p>
        )}
      </div>
    </dialog>
  );
}
