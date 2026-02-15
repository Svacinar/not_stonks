import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

interface CategoryDatum {
  name: string;
  amount: number;
}

export function useCategorySelection(categoryData: CategoryDatum[]) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Reset selection when underlying data changes (e.g. date range switch)
  const prevDataRef = useRef(categoryData);
  useEffect(() => {
    if (prevDataRef.current !== categoryData) {
      prevDataRef.current = categoryData;
      setSelectedCategories(new Set());
    }
  }, [categoryData]);

  const toggleCategory = useCallback((name: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCategories(new Set());
  }, []);

  const allSelected = selectedCategories.size >= categoryData.length && categoryData.length > 0;
  const hasSelection = selectedCategories.size > 0 && !allSelected;

  const selectedSum = useMemo(() => {
    if (!hasSelection) {
      return categoryData.reduce((sum, c) => sum + c.amount, 0);
    }
    return categoryData
      .filter(c => selectedCategories.has(c.name))
      .reduce((sum, c) => sum + c.amount, 0);
  }, [categoryData, selectedCategories, hasSelection]);

  const selectionLabel = useMemo(() => {
    if (!hasSelection) return 'All spending';
    const count = selectedCategories.size;
    return count === 1 ? '1 category' : `${count} categories`;
  }, [selectedCategories, hasSelection]);

  const isSelected = useCallback(
    (name: string) => selectedCategories.has(name),
    [selectedCategories]
  );

  return {
    selectedCategories,
    toggleCategory,
    clearSelection,
    hasSelection,
    selectedSum,
    selectionLabel,
    isSelected,
  };
}
