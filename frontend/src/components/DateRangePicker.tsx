import { useState, useRef, useEffect } from 'react';
import { DayPicker, DateRange as DayPickerDateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import {
  DateRange,
  DatePreset,
  getDateRangeFromPreset,
  getDateRangeLabel,
  parseISODate,
  formatDateToISO,
  getPresetFromDateRange,
} from '../utils/dateUtils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  /** Current date range */
  value: DateRange;
  /** Callback when date range changes */
  onChange: (range: DateRange) => void;
  /** Optional className for the container */
  className?: string;
}

interface PresetButton {
  preset: DatePreset;
  label: string;
}

const PRESETS: PresetButton[] = [
  { preset: 'thisMonth', label: 'This month' },
  { preset: 'lastMonth', label: 'Last month' },
  { preset: 'last3months', label: 'Last 3 months' },
  { preset: 'last6months', label: 'Last 6 months' },
  { preset: 'thisYear', label: 'This year' },
  { preset: 'allTime', label: 'All time' },
];

export function DateRangePicker({
  value,
  onChange,
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Local state for pending range selection (only used while picker is open)
  const [pendingRange, setPendingRange] = useState<DayPickerDateRange | undefined>(undefined);

  // Convert ISO strings to Date objects for DayPicker
  const committedRange: DayPickerDateRange | undefined = {
    from: parseISODate(value.startDate) ?? undefined,
    to: parseISODate(value.endDate) ?? undefined,
  };

  // Use pending range while selecting, otherwise use committed range
  const selectedRange = pendingRange ?? committedRange;

  // Reset pending range when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setPendingRange(undefined);
    }
  }, [isOpen]);

  // Determine active preset
  const activePreset = getPresetFromDateRange(value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle responsive
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle preset selection
  const handlePresetClick = (preset: DatePreset) => {
    const newRange = getDateRangeFromPreset(preset);
    onChange(newRange);
    setIsOpen(false);
  };

  // Handle calendar range selection
  const handleRangeSelect = (range: DayPickerDateRange | undefined) => {
    setPendingRange(range);

    // Auto-apply when both dates are selected
    if (range?.from && range?.to) {
      onChange({
        startDate: formatDateToISO(range.from),
        endDate: formatDateToISO(range.to),
      });
      setIsOpen(false);
    }
  };

  // Handle Apply button click
  const handleApply = () => {
    if (pendingRange?.from) {
      onChange({
        startDate: formatDateToISO(pendingRange.from),
        endDate: pendingRange.to ? formatDateToISO(pendingRange.to) : '',
      });
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Select date range"
      >
        {/* Calendar Icon */}
        <svg
          className="h-5 w-5 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>

        {/* Current Range Label */}
        <span>{getDateRangeLabel(value)}</span>

        {/* Chevron */}
        <svg
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 z-[100] mt-2 bg-card text-card-foreground border border-border rounded-xl shadow-lg">
          <div className={cn('flex', isMobile && 'flex-col')}>
            {/* Presets Sidebar */}
            <div
              className={cn(
                'border-border p-3 space-y-1',
                isMobile ? 'border-b flex flex-wrap gap-2' : 'border-r'
              )}
            >
              {!isMobile && (
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
                  Quick Select
                </div>
              )}
              {PRESETS.map(({ preset, label }) => (
                <Button
                  key={preset}
                  type="button"
                  variant={activePreset === preset ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    'justify-start',
                    !isMobile && 'w-full',
                    activePreset === preset && 'font-medium'
                  )}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-3">
              <DayPicker
                mode="range"
                selected={selectedRange}
                onSelect={handleRangeSelect}
                numberOfMonths={isMobile ? 1 : 2}
                showOutsideDays
                fixedWeeks
              />
            </div>
          </div>

          {/* Footer with Apply/Clear */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/50 rounded-b-xl">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handlePresetClick('allTime')}
            >
              Clear dates
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
