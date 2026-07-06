import { useEffect, useMemo } from 'react';
import { useMedicationEntryStore } from '../../stores/medicationEntryStore';
import { getProductsForMethod } from '../../utils/medicationHelpers';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface StepProductProps {
  onBack: () => void;
  onCustom: () => void;
}

export function StepProduct({ onBack, onCustom }: StepProductProps) {
  const { selectedHormone, selectedMethod, selectedProduct, setProduct, goToStep } =
    useMedicationEntryStore();

  const products = useMemo(() => {
    if (!selectedHormone || !selectedMethod) return [];
    return getProductsForMethod(selectedHormone, selectedMethod);
  }, [selectedHormone, selectedMethod]);

  useEffect(() => {
    if (selectedHormone && selectedMethod && products.length === 1) {
      setProduct(products[0]);
      const timer = setTimeout(() => goToStep(4), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedHormone, selectedMethod, products, setProduct, goToStep]);

  if (!selectedHormone || !selectedMethod) return null;

  const handleSelect = (key: string) => {
    const product = products.find((p) => p.key === key);
    if (product) {
      setProduct(product);
      setTimeout(() => goToStep(4), 300);
    }
  };

  if (products.length === 1) {
    return (
      <div className="py-8 text-center text-sage-500">
        Selected {products[0].name}. Continuing...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">Which product?</h2>
        <p className="mt-2 text-sage-500">Select the specific medication you take.</p>
      </div>

      <div className="space-y-2">
        {products.map((product) => {
          const isSelected = selectedProduct?.key === product.key;
          return (
            <button
              key={product.key}
              type="button"
              onClick={() => handleSelect(product.key)}
              className={[
                'w-full rounded-xl border p-4 text-left transition-colors duration-150',
                isSelected
                  ? 'border-sage-500 bg-sage-50'
                  : 'border-sand-200 bg-white hover:border-sage-300',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sage-800">{product.name}</span>
                {product.isBioidentical && <Badge variant="success">Bioidentical</Badge>}
                {product.isCompounded && <Badge variant="info">Compounded</Badge>}
              </div>
              <p className="mt-1 text-sm text-sage-500">{product.genericName}</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onCustom}
        className="text-sm font-medium text-sage-600 underline hover:text-sage-800"
      >
        My medication isn&apos;t listed
      </button>

      <Button variant="secondary" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
