import { useCallback } from 'react';

export const useExportCSV = () => {
  const exportToCSV = useCallback((data, statusOptions, sector, selectedStatus = null) => {
    // Filter status options if a specific status is selected
    const statusesToExport = selectedStatus
      ? statusOptions.filter(s => s.label === selectedStatus)
      : statusOptions;

    // Group data by status
    const groupedByStatus = statusesToExport.reduce((acc, status) => {
      acc[status.label] = data.filter(item => item.status === status.label && !item.hidden);
      return acc;
    }, {});

    // CSV headers based on sector
    const headers = sector === 'winery'
      ? ['Name', 'Email', 'Location', 'Country', 'Harvest Start', 'Notes']
      : sector === 'kyc'
        ? ['Name', 'Email', 'Apply URL', 'Location', 'Country', 'Segment', 'Notes']
        : ['Name', 'Email', 'Location', 'Country', 'Season', 'Notes'];

    // Helper to escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV content
    let csvContent = '';

    statusesToExport.forEach((status) => {
      const items = groupedByStatus[status.label] || [];

      // Add status section header
      csvContent += `\n${status.label.toUpperCase()} (${items.length})\n`;
      csvContent += headers.join(',') + '\n';

      // Add rows for this status
      items.forEach((item) => {
        const row = sector === 'winery'
          ? [
              escapeCSV(item.name),
              escapeCSV(item.email),
              escapeCSV(item.location),
              escapeCSV(item.country),
              escapeCSV(item.harvestStart),
              escapeCSV(item.notes)
            ]
          : sector === 'kyc'
            ? [
                escapeCSV(item.name),
                escapeCSV(item.email),
                escapeCSV(item.applyUrl),
                escapeCSV(item.location),
                escapeCSV(item.country),
                escapeCSV(item.segment),
                escapeCSV(item.notes)
              ]
            : [
              escapeCSV(item.name),
              escapeCSV(item.email),
              escapeCSV(item.location),
              escapeCSV(item.country),
              escapeCSV(item.season),
              escapeCSV(item.notes)
            ];
        csvContent += row.join(',') + '\n';
      });
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    const statusSuffix = selectedStatus ? `-${selectedStatus.toLowerCase()}` : '';

    link.href = url;
    link.download = `${sector}-tracker${statusSuffix}-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return { exportToCSV };
};
