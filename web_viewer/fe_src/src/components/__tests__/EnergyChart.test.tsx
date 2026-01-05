import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EnergyChart from '../EnergyChart';

// Mock the lazy loaded components
vi.mock('../BarCharts/DailyChart', () => ({
  default: ({ ref, month }: any) => {
    if (ref.current) {
      ref.current.fetchChart = vi.fn();
    }
    return <div data-testid="daily-chart" data-month={month} ref={ref}>DailyChart</div>;
  },
}));
vi.mock('../BarCharts/MonthlyChart', () => ({
  default: ({ ref }: any) => {
    if (ref.current) {
      ref.current.fetchChart = vi.fn();
    }
    return <div data-testid="monthly-chart" ref={ref}>MonthlyChart</div>;
  },
}));
vi.mock('../BarCharts/YearlyChart', () => ({
  default: ({ ref }: any) => {
    if (ref.current) {
      ref.current.fetchChart = vi.fn();
    }
    return <div data-testid="yearly-chart" ref={ref}>YearlyChart</div>;
  },
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Loading
vi.mock('../Loading', () => ({
  default: () => <div data-testid="loading">Loading</div>,
}));

describe('EnergyChart', () => {
  beforeEach(() => {
    // Reset document visibility
    Object.defineProperty(document, 'hidden', { value: false, writable: true });
  });

  it('renders with default Daily chart type', async () => {
    render(<EnergyChart className="test" />);
    expect(screen.getByText('energyChart.daily')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('daily-chart')).toBeInTheDocument());
  });

  it('switches chart type to Monthly', async () => {
    render(<EnergyChart className="test" />);
    const monthlyButton = screen.getByText('energyChart.monthly');
    fireEvent.click(monthlyButton);
    await waitFor(() => expect(screen.getByTestId('monthly-chart')).toBeInTheDocument());
  });

  it('switches chart type to Yearly', async () => {
    render(<EnergyChart className="test" />);
    const yearlyButton = screen.getByText('energyChart.yearly');
    fireEvent.click(yearlyButton);
    await waitFor(() => expect(screen.getByTestId('yearly-chart')).toBeInTheDocument());
  });

  it('updates selectedYear and selectedMonth when page becomes visible and current has changed', async () => {
    // Mock Date constructor
    const originalDate = globalThis.Date;
    const mockDate = vi.fn((...args: any[]) => {
      if (args.length === 0) {
        return new originalDate('2023-12-01');
      }
      return new (originalDate as any)(...args);
    });
    mockDate.now = originalDate.now;
    vi.stubGlobal('Date', mockDate);

    render(<EnergyChart className="test" />);

    // Initially selected should be current (2023-12)
    const yearSelect = screen.getByDisplayValue('2023');
    const monthSelect = screen.getByDisplayValue('12');

    expect(yearSelect).toBeInTheDocument();
    expect(monthSelect).toBeInTheDocument();

    // Change mock to next month
    mockDate.mockImplementation((...args: any[]) => {
      if (args.length === 0) {
        return new originalDate('2024-01-01');
      }
      return new (originalDate as any)(...args);
    });

    // Simulate page becoming hidden then visible
    await act(async () => {
      Object.defineProperty(document, 'hidden', { value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => {
      Object.defineProperty(document, 'hidden', { value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait for state updates
    await waitFor(() => {
      expect(screen.getByDisplayValue('2024')).toBeInTheDocument();
      expect(screen.getByDisplayValue('01')).toBeInTheDocument();
    });

    vi.restoreAllMocks();
  });

  it('does not update selectedYear and selectedMonth if user selected different values', async () => {
    // Mock Date constructor
    const originalDate = globalThis.Date;
    const mockDate = vi.fn((...args: any[]) => {
      if (args.length === 0) {
        return new originalDate('2023-12-01');
      }
      return new (originalDate as any)(...args);
    });
    mockDate.now = originalDate.now;
    vi.stubGlobal('Date', mockDate);

    render(<EnergyChart className="test" />);

    // Change to previous year
    const yearSelect = screen.getByDisplayValue('2023');
    fireEvent.change(yearSelect, { target: { value: '2022' } });

    // Change mock to next month
    mockDate.mockImplementation((...args: any[]) => {
      if (args.length === 0) {
        return new originalDate('2024-01-01');
      }
      return new (originalDate as any)(...args);
    });

    // Page visibility change
    await act(async () => {
      Object.defineProperty(document, 'hidden', { value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => {
      Object.defineProperty(document, 'hidden', { value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should still be 2022, not updated
    await waitFor(() => {
      expect(screen.getByDisplayValue('2022')).toBeInTheDocument();
    });

    vi.restoreAllMocks();
  });
});
