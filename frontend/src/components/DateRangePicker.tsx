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

  // Convert ISO strings to Date objects for DayPicker
  const selectedRange: DayPickerDateRange | undefined = {
    from: parseISODate(value.startDate) ?? undefined,
    to: parseISODate(value.endDate) ?? undefined,
  };

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
    onChange({
      startDate: range?.from ? formatDateToISO(range.from) : '',
      endDate: range?.to ? formatDateToISO(range.to) : '',
    });
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium text-gray-700"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Select date range"
      >
        {/* Calendar Icon */}
        <svg
          className="h-5 w-5 text-gray-400"
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
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl">
          <div className={`flex ${isMobile ? 'flex-col' : ''}`}>
            {/* Presets Sidebar */}
            <div
              className={`border-gray-200 p-3 space-y-1 ${isMobile ? 'border-b flex flex-wrap gap-2' : 'border-r'}`}
            >
              {!isMobile && (
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
                  Quick Select
                </div>
              )}
              {PRESETS.map(({ preset, label }) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    isMobile ? '' : 'w-full'
                  } ${
                    activePreset === preset
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
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
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg">
            <button
              type="button"
              onClick={() => handlePresetClick('allTime')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear dates
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
