import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCategorySelection } from '../../src/hooks/useCategorySelection';

const categoryData = [
  { name: 'Food', amount: 5000 },
  { name: 'Utilities', amount: 3000 },
  { name: 'Shopping', amount: 4000 },
  { name: 'Transport', amount: 1500 },
];

describe('useCategorySelection', () => {
  it('starts with no categories selected', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    expect(result.current.selectedCategories.size).toBe(0);
  });

  it('toggles a category on', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    act(() => {
      result.current.toggleCategory('Food');
    });

    expect(result.current.selectedCategories.has('Food')).toBe(true);
    expect(result.current.selectedCategories.size).toBe(1);
  });

  it('toggles a category off when clicked again', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    act(() => {
      result.current.toggleCategory('Food');
    });
    act(() => {
      result.current.toggleCategory('Food');
    });

    expect(result.current.selectedCategories.has('Food')).toBe(false);
    expect(result.current.selectedCategories.size).toBe(0);
  });

  it('selects multiple categories', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    act(() => {
      result.current.toggleCategory('Food');
    });
    act(() => {
      result.current.toggleCategory('Utilities');
    });
    act(() => {
      result.current.toggleCategory('Shopping');
    });

    expect(result.current.selectedCategories.size).toBe(3);
    expect(result.current.selectedCategories.has('Food')).toBe(true);
    expect(result.current.selectedCategories.has('Utilities')).toBe(true);
    expect(result.current.selectedCategories.has('Shopping')).toBe(true);
  });

  it('computes sum of selected categories', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    act(() => {
      result.current.toggleCategory('Food');
    });
    act(() => {
      result.current.toggleCategory('Utilities');
    });

    expect(result.current.selectedSum).toBe(8000);
  });

  it('returns total sum when nothing is selected', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    expect(result.current.selectedSum).toBe(13500);
  });

  it('returns label "All spending" when nothing selected', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    expect(result.current.selectionLabel).toBe('All spending');
  });

  it('returns label "1 category" when one selected', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    act(() => {
      result.current.toggleCategory('Food');
    });

    expect(result.current.selectionLabel).toBe('1 category');
  });

  it('returns label "3 categories" when three selected', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    act(() => {
      result.current.toggleCategory('Food');
    });
    act(() => {
      result.current.toggleCategory('Utilities');
    });
    act(() => {
      result.current.toggleCategory('Shopping');
    });

    expect(result.current.selectionLabel).toBe('3 categories');
  });

  it('clears all selections', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    act(() => {
      result.current.toggleCategory('Food');
    });
    act(() => {
      result.current.toggleCategory('Utilities');
    });
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedCategories.size).toBe(0);
    expect(result.current.selectionLabel).toBe('All spending');
  });

  it('isSelected returns true for selected categories', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    act(() => {
      result.current.toggleCategory('Food');
    });

    expect(result.current.isSelected('Food')).toBe(true);
    expect(result.current.isSelected('Utilities')).toBe(false);
  });

  it('hasSelection is false when nothing selected', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    expect(result.current.hasSelection).toBe(false);
  });

  it('hasSelection is true when something selected', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    act(() => {
      result.current.toggleCategory('Food');
    });

    expect(result.current.hasSelection).toBe(true);
  });

  it('returns label "All spending" when all categories are selected', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    // Select every single category
    act(() => { result.current.toggleCategory('Food'); });
    act(() => { result.current.toggleCategory('Utilities'); });
    act(() => { result.current.toggleCategory('Shopping'); });
    act(() => { result.current.toggleCategory('Transport'); });

    expect(result.current.selectionLabel).toBe('All spending');
    expect(result.current.selectedSum).toBe(13500);
  });

  it('hasSelection is false when all categories are selected', () => {
    const { result } = renderHook(() => useCategorySelection(categoryData));

    act(() => { result.current.toggleCategory('Food'); });
    act(() => { result.current.toggleCategory('Utilities'); });
    act(() => { result.current.toggleCategory('Shopping'); });
    act(() => { result.current.toggleCategory('Transport'); });

    expect(result.current.hasSelection).toBe(false);
  });

  it('resets selection when categoryData changes', () => {
    const { result, rerender } = renderHook(
      ({ data }) => useCategorySelection(data),
      { initialProps: { data: categoryData } }
    );

    act(() => {
      result.current.toggleCategory('Food');
    });
    expect(result.current.hasSelection).toBe(true);

    // Simulate date range change - new data arrives
    const newData = [
      { name: 'Food', amount: 2000 },
      { name: 'Utilities', amount: 1000 },
    ];
    rerender({ data: newData });

    expect(result.current.hasSelection).toBe(false);
    expect(result.current.selectedSum).toBe(3000);
  });
});
