'use client';

import { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Loader2 } from 'lucide-react';
import { getPDFPageCountFromBlob, type PageSelection } from '@/lib/pdf-utils';
import type { PDF } from '@/lib/types';

interface PageSelectorProps {
    pdfs: PDF[];
    pdfBlobs: Blob[];
    onConfirm: (selections: PageSelection[]) => void;
    onCancel: () => void;
}

export default function PageSelector({
    pdfs,
    pdfBlobs,
    onConfirm,
    onCancel,
}: PageSelectorProps) {
    const [pageCounts, setPageCounts] = useState<number[]>([]);
    const [selections, setSelections] = useState<Map<number, Set<number>>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPageCounts();
    }, [pdfBlobs]);

    const loadPageCounts = async () => {
        setLoading(true);
        try {
            const counts = await Promise.all(
                pdfBlobs.map(blob => getPDFPageCountFromBlob(blob))
            );
            setPageCounts(counts);

            // Initialize selections with all pages selected
            const initialSelections = new Map<number, Set<number>>();
            counts.forEach((count, pdfIndex) => {
                const pages = new Set<number>();
                for (let i = 0; i < count; i++) {
                    pages.add(i);
                }
                initialSelections.set(pdfIndex, pages);
            });
            setSelections(initialSelections);
        } catch (error) {
            console.error('Error loading page counts:', error);
            alert('Failed to load PDF pages');
        } finally {
            setLoading(false);
        }
    };

    const togglePage = (pdfIndex: number, pageNumber: number) => {
        const newSelections = new Map(selections);
        const pdfPages = newSelections.get(pdfIndex) || new Set();

        if (pdfPages.has(pageNumber)) {
            pdfPages.delete(pageNumber);
        } else {
            pdfPages.add(pageNumber);
        }

        newSelections.set(pdfIndex, pdfPages);
        setSelections(newSelections);
    };

    const selectAll = (pdfIndex: number) => {
        const newSelections = new Map(selections);
        const pages = new Set<number>();
        for (let i = 0; i < pageCounts[pdfIndex]; i++) {
            pages.add(i);
        }
        newSelections.set(pdfIndex, pages);
        setSelections(newSelections);
    };

    const selectNone = (pdfIndex: number) => {
        const newSelections = new Map(selections);
        newSelections.set(pdfIndex, new Set());
        setSelections(newSelections);
    };

    const selectFirst = (pdfIndex: number) => {
        const newSelections = new Map(selections);
        newSelections.set(pdfIndex, new Set([0]));
        setSelections(newSelections);
    };

    const selectOdd = (pdfIndex: number) => {
        const newSelections = new Map(selections);
        const pages = new Set<number>();
        for (let i = 0; i < pageCounts[pdfIndex]; i += 2) {
            pages.add(i);
        }
        newSelections.set(pdfIndex, pages);
        setSelections(newSelections);
    };

    const selectEven = (pdfIndex: number) => {
        const newSelections = new Map(selections);
        const pages = new Set<number>();
        for (let i = 1; i < pageCounts[pdfIndex]; i += 2) {
            pages.add(i);
        }
        newSelections.set(pdfIndex, pages);
        setSelections(newSelections);
    };

    const getTotalSelectedPages = () => {
        let total = 0;
        selections.forEach(pages => {
            total += pages.size;
        });
        return total;
    };

    const handleConfirm = () => {
        const pageSelections: PageSelection[] = [];

        selections.forEach((pages, pdfIndex) => {
            if (pages.size > 0) {
                pageSelections.push({
                    pdfIndex,
                    pageNumbers: Array.from(pages),
                });
            }
        });

        if (pageSelections.length === 0) {
            alert('Please select at least one page');
            return;
        }

        onConfirm(pageSelections);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="card max-w-md w-full text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-400 mx-auto mb-4" />
                    <p className="text-slate-300">Loading PDF pages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="card max-w-4xl w-full my-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Select Pages to Merge</h2>
                    <button
                        onClick={onCancel}
                        className="btn btn-ghost text-white p-2">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-6 mb-6 max-h-[60vh] overflow-y-auto">
                    {pdfs.map((pdf, pdfIndex) => {
                        const selectedPages = selections.get(pdfIndex) || new Set();
                        const pageCount = pageCounts[pdfIndex] || 0;

                        return (
                            <div key={pdf.id} className="border border-slate-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-white">
                                        📄 {pdf.name}
                                        <span className="text-sm text-slate-400 ml-2">
                                            ({pageCount} pages)
                                        </span>
                                    </h3>
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            onClick={() => selectAll(pdfIndex)}
                                            className="btn btn-ghost btn-sm text-xs">
                                            All
                                        </button>
                                        <button
                                            onClick={() => selectNone(pdfIndex)}
                                            className="btn btn-ghost btn-sm text-xs">
                                            None
                                        </button>
                                        <button
                                            onClick={() => selectFirst(pdfIndex)}
                                            className="btn btn-ghost btn-sm text-xs">
                                            First
                                        </button>
                                        <button
                                            onClick={() => selectOdd(pdfIndex)}
                                            className="btn btn-ghost btn-sm text-xs">
                                            Odd
                                        </button>
                                        <button
                                            onClick={() => selectEven(pdfIndex)}
                                            className="btn btn-ghost btn-sm text-xs">
                                            Even
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                                    {Array.from({ length: pageCount }, (_, pageIndex) => {
                                        const isSelected = selectedPages.has(pageIndex);
                                        return (
                                            <button
                                                key={pageIndex}
                                                onClick={() => togglePage(pdfIndex, pageIndex)}
                                                className={`
                                                    flex items-center justify-center gap-1 p-2 rounded border transition-all
                                                    ${isSelected
                                                        ? 'bg-primary-500 border-primary-400 text-white'
                                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-primary-500'
                                                    }
                                                `}>
                                                {isSelected ? (
                                                    <CheckSquare className="h-3 w-3" />
                                                ) : (
                                                    <Square className="h-3 w-3" />
                                                )}
                                                <span className="text-xs font-medium">
                                                    {pageIndex + 1}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <p className="text-sm text-slate-400 mt-2">
                                    {selectedPages.size} of {pageCount} pages selected
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className="border-t border-slate-700 pt-4">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-lg font-semibold text-white">
                            Total: {getTotalSelectedPages()} pages selected
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="btn btn-ghost flex-1">
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="btn btn-primary flex-1">
                            Continue to Merge
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
