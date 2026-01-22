import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from './LoadingSpinner';
import { api } from '../api/client';

interface CurrencyConversionModalProps {
  open: boolean;
  currencies: string[];
  byCurrency: Record<string, number>;
  onConfirm: (rates: Record<string, number>) => void;
  onCancel: () => void;
}

export function CurrencyConversionModal({
  open,
  currencies,
  byCurrency,
  onConfirm,
  onCancel,
}: CurrencyConversionModalProps) {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out CZK - no conversion needed
  const foreignCurrencies = currencies.filter(c => c !== 'CZK');
  const currenciesKey = currencies.join(',');

  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await api.getExchangeRates(foreignCurrencies, 'CZK');
        setRates(result.rates);
      } catch {
        setError('Failed to fetch exchange rates. Please enter rates manually.');
        // Initialize with empty rates so user can fill in
        const emptyRates: Record<string, number> = {};
        foreignCurrencies.forEach(c => { emptyRates[c] = 0; });
        setRates(emptyRates);
      } finally {
        setLoading(false);
      }
    };

    if (open && foreignCurrencies.length > 0) {
      fetchRates();
    }
  }, [open, currenciesKey, foreignCurrencies]);

  const handleRateChange = (currency: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setRates(prev => ({ ...prev, [currency]: numValue }));
  };

  const handleConfirm = () => {
    // Add CZK with rate 1.0
    const allRates = { ...rates, CZK: 1.0 };
    onConfirm(allRates);
  };

  const isValid = foreignCurrencies.every(c => rates[c] && rates[c] > 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Currency Conversion</DialogTitle>
          <DialogDescription>
            Foreign currency transactions detected. Please verify the exchange rates to CZK.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner size="default" />
              <span className="ml-2 text-sm text-muted-foreground">Fetching exchange rates...</span>
            </div>
          ) : (
            <>
              {error && (
                <div className="text-sm text-amber-600 dark:text-amber-400 mb-4">
                  {error}
                </div>
              )}

              {foreignCurrencies.map(currency => (
                <div key={currency} className="space-y-2">
                  <Label htmlFor={`rate-${currency}`} className="flex items-center justify-between">
                    <span>
                      1 {currency} = ? CZK
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({byCurrency[currency] || 0} transactions)
                    </span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`rate-${currency}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={rates[currency] || ''}
                      onChange={(e) => handleRateChange(currency, e.target.value)}
                      placeholder="Enter rate"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">CZK</span>
                  </div>
                  {rates[currency] && rates[currency] > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Example: 100 {currency} = {(100 * rates[currency]).toFixed(2)} CZK
                    </p>
                  )}
                </div>
              ))}

              {currencies.includes('CZK') && byCurrency['CZK'] > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    {byCurrency['CZK']} CZK transactions will be imported without conversion.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !isValid}>
            Import with Conversion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
