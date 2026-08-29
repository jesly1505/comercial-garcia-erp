import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dt from './DataTable.module.css';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  sortAccessor?: keyof T | ((row: T) => string | number);
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  fileName?: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  exportable?: boolean;
  searchable?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = 'Buscar...',
  fileName = 'Reporte',
  onRowClick,
  actions,
  exportable = true,
  searchable = true
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: number; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filtrado Global
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lowercasedSearch = searchTerm.toLowerCase();
    return data.filter(row => {
      return columns.some(col => {
        let value: any;
        if (typeof col.accessor === 'function') {
          if (col.sortAccessor) {
            value = typeof col.sortAccessor === 'function' ? col.sortAccessor(row) : row[col.sortAccessor as keyof T];
          } else {
            return false;
          }
        } else {
          value = row[col.accessor];
        }
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowercasedSearch);
      });
    });
  }, [data, searchTerm, columns]);

  // Ordenamiento
  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      const col = columns[sortConfig.key];
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        if (col.sortAccessor) {
          aValue = typeof col.sortAccessor === 'function' ? col.sortAccessor(a) : a[col.sortAccessor as keyof T];
          bValue = typeof col.sortAccessor === 'function' ? col.sortAccessor(b) : b[col.sortAccessor as keyof T];
        } else if (typeof col.accessor !== 'function') {
          aValue = a[col.accessor];
          bValue = b[col.accessor];
        } else {
          return 0;
        }
        if (aValue === null) aValue = '';
        if (bValue === null) bValue = '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig, columns]);

  // Paginación
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const requestSort = (index: number) => {
    if (!columns[index].sortable) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === index && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: index, direction });
  };

  // Exportar Excel
  const exportToExcel = () => {
    const wsData = sortedData.map(row => {
      const obj: any = {};
      columns.forEach(col => {
        const val = col.sortAccessor
          ? (typeof col.sortAccessor === 'function' ? col.sortAccessor(row) : row[col.sortAccessor as keyof T])
          : (typeof col.accessor === 'function' ? '' : row[col.accessor]);
        obj[col.header] = val;
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Exportar PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    const tableColumn = columns.map(col => col.header);
    const tableRows = sortedData.map(row =>
      columns.map(col =>
        col.sortAccessor
          ? (typeof col.sortAccessor === 'function' ? col.sortAccessor(row) : row[col.sortAccessor as keyof T])
          : (typeof col.accessor === 'function' ? '' : row[col.accessor])
      )
    );
    doc.setFontSize(14);
    doc.text(fileName, 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 22);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className={dt.wrapper}>
      {/* ── Top Controls ── */}
      <div className={dt.topBar}>
        {searchable && (
          <div className={dt.searchWrap}>
            <Search size={16} className={dt.searchIcon} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className={dt.searchInput}
            />
          </div>
        )}
        {exportable && (
          <div className={dt.exportBtns}>
            <button onClick={exportToExcel} className={`${dt.exportBtn} ${dt.exportExcel}`}>
              <Download size={15} /> Excel
            </button>
            <button onClick={exportToPDF} className={`${dt.exportBtn} ${dt.exportPdf}`}>
              <FileText size={15} /> PDF
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className={dt.tableCard}>
        <table className={dt.table}>
          <thead className={dt.thead}>
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  className={`${dt.th} ${col.sortable ? dt.thSortable : ''}`}
                  onClick={() => requestSort(index)}
                >
                  <div className={dt.thContent}>
                    {col.header}
                    {col.sortable && sortConfig?.key === index && (
                      sortConfig.direction === 'asc'
                        ? <ChevronUp size={14} />
                        : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className={`${dt.th} ${dt.thRight}`}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`${dt.tr} ${onRowClick ? dt.trClickable : ''}`}
                >
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className={dt.td}>
                      {typeof col.accessor === 'function' ? col.accessor(row) : String(row[col.accessor] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td className={`${dt.td} ${dt.tdRight}`}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className={dt.empty}>
                  No se encontraron resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {sortedData.length > 0 && (
        <div className={dt.pagination}>
          <div className={dt.pageInfo}>
            <span>
              Mostrando <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> a{' '}
              <strong>{Math.min(currentPage * rowsPerPage, sortedData.length)}</strong> de{' '}
              <strong>{sortedData.length}</strong> resultados
            </span>
            <select
              value={rowsPerPage}
              onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className={dt.pageSelect}
            >
              <option value={5}>5 por página</option>
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>
          </div>

          <nav className={dt.pageNav}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`${dt.pageBtn} ${dt.pageBtnRound}`}
            >
              <ChevronLeft size={16} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`${dt.pageBtn} ${currentPage === i + 1 ? dt.pageBtnActive : ''}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`${dt.pageBtn} ${dt.pageBtnRound}`}
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
