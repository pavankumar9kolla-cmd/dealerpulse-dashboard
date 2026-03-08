'use client';

import React from 'react';
import { Button, SpaceBetween } from '@cloudscape-design/components';
import { buildExportFilename, exportRowsToCsv } from '../lib/exportUtils';

export interface ExportAction {
  label: string;
  scope: string;
  rows: Array<Record<string, unknown>>;
}

interface ExportControlsProps {
  actions: ExportAction[];
}

export default function ExportControls({ actions }: ExportControlsProps) {
  return (
    <SpaceBetween direction="horizontal" size="xs">
      {actions.map((action) => (
        <Button
          key={action.label}
          disabled={action.rows.length === 0}
          onClick={() =>
            exportRowsToCsv({
              filename: buildExportFilename(action.scope),
              rows: action.rows
            })
          }
        >
          {action.label}
        </Button>
      ))}
    </SpaceBetween>
  );
}
