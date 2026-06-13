import { describe, test, expect, beforeEach } from 'vitest';
import { useAppStore } from '../shared/store/useAppStore';

describe('App Store (Zustand)', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test if needed, or set default states
    useAppStore.setState({
      theme: 'dark',
      previewScale: 0.35,
      showGrid: false,
      previewName: 'Your Name Here',
    });
  });

  test('initializes with default values', () => {
    const state = useAppStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.previewScale).toBe(0.35);
    expect(state.showGrid).toBe(false);
    expect(state.previewName).toBe('Your Name Here');
  });

  test('updates theme state via setTheme', () => {
    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
  });

  test('updates previewScale state via setPreviewScale', () => {
    useAppStore.getState().setPreviewScale(0.75);
    expect(useAppStore.getState().previewScale).toBe(0.75);
  });

  test('updates previewName state via setPreviewName', () => {
    useAppStore.getState().setPreviewName('Sami Tasve');
    expect(useAppStore.getState().previewName).toBe('Sami Tasve');
  });

  test('updates previewName state via setPreviewName with a function updater', () => {
    useAppStore.getState().setPreviewName((prev) => prev + ' Updated');
    expect(useAppStore.getState().previewName).toBe('Your Name Here Updated');
  });
});
