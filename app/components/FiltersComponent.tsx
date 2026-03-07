'use client';

import React from "react";
import {
  DateRangePicker,
  Multiselect,
  SpaceBetween,
  Box,
  Button
} from "@cloudscape-design/components";
import { FilterOptions } from "../data/clientDataService";

interface FiltersComponentProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  branches: { label: string; value: string }[];
}

export default function FiltersComponent({
  filters,
  onFiltersChange,
  branches
}: FiltersComponentProps) {
  const handleDateRangeChange = (value: any) => {
    if (value.type === 'absolute') {
      // Parse ISO date strings to Date objects
      const startDate = value.startDate ? new Date(value.startDate) : undefined;
      const endDate = value.endDate ? new Date(value.endDate) : undefined;
      
      onFiltersChange({
        ...filters,
        startDate,
        endDate
      });
    } else if (value.type === 'relative') {
      // Handle relative dates
      const now = new Date();
      let startDate: Date;

      switch (value.unit) {
        case 'day':
          startDate = new Date(now.getTime() - value.amount * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - value.amount, now.getDate());
          break;
        case 'year':
          startDate = new Date(now.getFullYear() - value.amount, now.getMonth(), now.getDate());
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // default 30 days
      }

      onFiltersChange({
        ...filters,
        startDate: startDate,
        endDate: now
      });
    }
  };

  const handleBranchChange = (selectedOptions: any) => {
    const branchIds = selectedOptions.map((opt: any) => opt.value).filter((v: string) => v !== '');
    onFiltersChange({
      ...filters,
      branchIds: branchIds.length > 0 ? branchIds : undefined,
      branchId: undefined // Clear single branch ID when using multi-select
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <SpaceBetween direction="vertical" size="m">
      <SpaceBetween direction="horizontal" size="m">
        <DateRangePicker
        onChange={({ detail }) => handleDateRangeChange(detail.value)}
        value={filters.startDate && filters.endDate ? {
          type: 'absolute',
          startDate: filters.startDate.toISOString().split('T')[0],
          endDate: filters.endDate.toISOString().split('T')[0]
        } : null}
        relativeOptions={[
          {
            key: "previous-7-days",
            amount: 7,
            unit: "day",
            type: "relative"
          },
          {
            key: "previous-30-days",
            amount: 30,
            unit: "day",
            type: "relative"
          },
          {
            key: "previous-3-months",
            amount: 3,
            unit: "month",
            type: "relative"
          },
          {
            key: "previous-6-months",
            amount: 6,
            unit: "month",
            type: "relative"
          },
          {
            key: "previous-1-year",
            amount: 1,
            unit: "year",
            type: "relative"
          },
          {
            key: "previous-2-years",
            amount: 2,
            unit: "year",
            type: "relative"
          }
        ]}
        placeholder="Select date range"
        dateOnly
        isValidRange={(range) => {
          if (range && range.type === 'absolute') {
            return { valid: true };
          }
          return { valid: true };
        }}
        i18nStrings={{
          todayAriaLabel: "Today",
          nextMonthAriaLabel: "Next month",
          previousMonthAriaLabel: "Previous month",
          customRelativeRangeDurationLabel: "Duration",
          customRelativeRangeDurationPlaceholder: "Enter duration",
          customRelativeRangeOptionLabel: "Custom range",
          customRelativeRangeOptionDescription: "Set a custom range in the past",
          customRelativeRangeUnitLabel: "Unit of time",
          formatRelativeRange: (value) => {
            let unit = 'day';
            if (value.unit === 'month') unit = 'month';
            if (value.unit === 'year') unit = 'year';
            return `Last ${value.amount} ${unit}${value.amount > 1 ? 's' : ''}`;
          },
          formatUnit: (unit, value) => {
            if (unit === 'day') return value === 1 ? 'day' : 'days';
            if (unit === 'month') return value === 1 ? 'month' : 'months';
            if (unit === 'year') return value === 1 ? 'year' : 'years';
            return unit;
          },
          dateTimeConstraintText: "Range must be between 6 and 30 days.",
          relativeModeTitle: "Relative range",
          absoluteModeTitle: "Absolute range",
          relativeRangeSelectionHeading: "Choose a range",
          startDateLabel: "Start date",
          endDateLabel: "End date",
          startTimeLabel: "Start time",
          endTimeLabel: "End time",
          clearButtonLabel: "Clear and dismiss",
          cancelButtonLabel: "Cancel",
          applyButtonLabel: "Apply"
        }}
      />

        <Multiselect
            selectedOptions={filters.branchIds ?
              branches.filter(b => filters.branchIds?.includes(b.value)) :
              []
            }
            onChange={({ detail }) => handleBranchChange(detail.selectedOptions)}
            options={branches}
            placeholder="Select branches"
            tokenLimit={3}
          />

        <Button onClick={clearFilters}>
          Clear Filters
        </Button>
      </SpaceBetween>
    </SpaceBetween>
  );
}