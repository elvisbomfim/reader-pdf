'use client';

import { useState, useRef, useEffect } from 'react';
import { Document, Page as ReactPDFPage } from 'react-pdf';
import { X, Pen, Highlighter, Type, Crop, Eraser, Undo, Redo, ChevronLeft, ChevronRight, Download, Cloud } from 'lucide-react';
import type { Annotation, PenAnnotation, HighlightAnnotation, TextAnnotation, CropAnnotation } from '@/lib/pdf-annotations';

interface PDFEditorProps {
    pdfBlob: Blob;
    pdfName: string;
    onSave: (annotations: Annotation[]) => void;
    onCancel: () => void;
}

type Tool = 'pen' | 'highlighter' | 'text' | 'crop' | 'eraser' | null;

export default function PDFEditor({ pdfBlob, pdfName, onSave, onCancel }: PDFEditorProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [tool, setTool] = useState<Tool>(null);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [history, setHistory] = useState<Annotation[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
    const [color, setColor] = useState('#000000');
    const [penWidth, setPenWidth] = useState(2);
    const [fontSize, setFontSize] = useState(16);
    const [textInput, setTextInput] = useState('');
    const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
    const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
    const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pdfUrl = URL.createObjectURL(pdfBlob);

    useEffect(() => {
        return () => URL.revokeObjectURL(pdfUrl);
    }, [pdfUrl]);

    useEffect(() => {
        redrawCanvas();
    }, [annotations, pageNumber]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const addToHistory = (newAnnotations: Annotation[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newAnnotations);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setAnnotations(newAnnotations);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setAnnotations(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setAnnotations(history[historyIndex + 1]);
        }
    };

    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw annotations for current page
        const pageAnnotations = annotations.filter(a => a.pageNumber === pageNumber - 1);

        pageAnnotations.forEach(annotation => {
            if (annotation.type === 'pen') {
                drawPenOnCanvas(ctx, annotation);
            } else if (annotation.type === 'highlight') {
                drawHighlightOnCanvas(ctx, annotation);
            } else if (annotation.type === 'text') {
                drawTextOnCanvas(ctx, annotation);
            } else if (annotation.type === 'crop') {
                drawCropOnCanvas(ctx, annotation);
            }
        });

        // Draw current path while drawing
        if (isDrawing && currentPath.length > 0 && tool === 'pen') {
            ctx.strokeStyle = color;
            ctx.lineWidth = penWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.stroke();
        }

        // Draw crop preview
        if (cropStart && cropEnd && tool === 'crop') {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                cropStart.x,
                cropStart.y,
                cropEnd.x - cropStart.x,
                cropEnd.y - cropStart.y
            );
            ctx.setLineDash([]);
        }
    };

    const drawPenOnCanvas = (ctx: CanvasRenderingContext2D, annotation: PenAnnotation) => {
        if (annotation.points.length < 2) return;

        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
        annotation.points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();
    };

    const drawHighlightOnCanvas = (ctx: CanvasRenderingContext2D, annotation: HighlightAnnotation) => {
        ctx.fillStyle = annotation.color + '4D'; // 30% opacity
        ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
    };

    const drawTextOnCanvas = (ctx: CanvasRenderingContext2D, annotation: TextAnnotation) => {
        ctx.fillStyle = annotation.color;
        ctx.font = `${annotation.fontSize}px Arial`;
        ctx.fillText(annotation.text, annotation.x, annotation.y);
    };

    const drawCropOnCanvas = (ctx: CanvasRenderingContext2D, annotation: CropAnnotation) => {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
    };

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getCanvasCoordinates(e);

        if (tool === 'pen') {
            setIsDrawing(true);
            setCurrentPath([coords]);
        } else if (tool === 'highlighter') {
            setIsDrawing(true);
            setCropStart(coords);
        } else if (tool === 'text') {
            setTextPosition(coords);
        } else if (tool === 'crop') {
            setCropStart(coords);
        } else if (tool === 'eraser') {
            // Remove annotation at this point
            const newAnnotations = annotations.filter(a => {
                if (a.pageNumber !== pageNumber - 1) return true;
                // Simple hit detection - can be improved
                return true; // For now, keep all
            });
            addToHistory(newAnnotations);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const coords = getCanvasCoordinates(e);

        if (tool === 'pen') {
            setCurrentPath([...currentPath, coords]);
            redrawCanvas();
        } else if (tool === 'highlighter' || tool === 'crop') {
            setCropEnd(coords);
            redrawCanvas();
        }
    };

    const handleMouseUp = () => {
        if (!isDrawing && tool !== 'crop') return;

        if (tool === 'pen' && currentPath.length > 1) {
            const newAnnotation: PenAnnotation = {
                type: 'pen',
                pageNumber: pageNumber - 1,
                points: currentPath,
                color,
                width: penWidth,
            };
            addToHistory([...annotations, newAnnotation]);
        } else if (tool === 'highlighter' && cropStart && cropEnd) {
            const newAnnotation: HighlightAnnotation = {
                type: 'highlight',
                pageNumber: pageNumber - 1,
                x: Math.min(cropStart.x, cropEnd.x),
                y: Math.min(cropStart.y, cropEnd.y),
                width: Math.abs(cropEnd.x - cropStart.x),
                height: Math.abs(cropEnd.y - cropStart.y),
                color: '#FFFF00', // Yellow highlight
            };
            addToHistory([...annotations, newAnnotation]);
            setCropStart(null);
            setCropEnd(null);
        } else if (tool === 'crop' && cropStart && cropEnd) {
            const newAnnotation: CropAnnotation = {
                type: 'crop',
                pageNumber: pageNumber - 1,
                x: Math.min(cropStart.x, cropEnd.x),
                y: Math.min(cropStart.y, cropEnd.y),
                width: Math.abs(cropEnd.x - cropStart.x),
                height: Math.abs(cropEnd.y - cropStart.y),
            };
            addToHistory([...annotations, newAnnotation]);
            setCropStart(null);
            setCropEnd(null);
        }

        setIsDrawing(false);
        setCurrentPath([]);
    };

    const handleTextSubmit = () => {
        if (!textPosition || !textInput.trim()) return;

        const newAnnotation: TextAnnotation = {
            type: 'text',
            pageNumber: pageNumber - 1,
            x: textPosition.x,
            y: textPosition.y,
            text: textInput,
            fontSize,
            color,
        };

        addToHistory([...annotations, newAnnotation]);
        setTextPosition(null);
        setTextInput('');
        setTool(null);
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Edit PDF - {pdfName}</h2>
                    <button onClick={onCancel} className="btn btn-ghost text-white p-2">
                        <X className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-slate-800 border-b border-slate-700 p-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTool('pen')}
                            className={`btn btn-sm ${tool === 'pen' ? 'btn-primary' : 'btn-ghost'}`}
                            title="Pen">
                            <Pen className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setTool('highlighter')}
                            className={`btn btn-sm ${tool === 'highlighter' ? 'btn-primary' : 'btn-ghost'}`}
                            title="Highlighter">
                            <Highlighter className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setTool('text')}
                            className={`btn btn-sm ${tool === 'text' ? 'btn-primary' : 'btn-ghost'}`}
                            title="Text">
                            <Type className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setTool('crop')}
                            className={`btn btn-sm ${tool === 'crop' ? 'btn-primary' : 'btn-ghost'}`}
                            title="Crop">
                            <Crop className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setTool('eraser')}
                            className={`btn btn-sm ${tool === 'eraser' ? 'btn-primary' : 'btn-ghost'}`}
                            title="Eraser">
                            <Eraser className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-600" />

                    <div className="flex gap-2">
                        <button
                            onClick={undo}
                            disabled={historyIndex === 0}
                            className="btn btn-sm btn-ghost"
                            title="Undo">
                            <Undo className="h-4 w-4" />
                        </button>
                        <button
                            onClick={redo}
                            disabled={historyIndex === history.length - 1}
                            className="btn btn-sm btn-ghost"
                            title="Redo">
                            <Redo className="h-4 w-4" />
                        </button>
                    </div>

                    {(tool === 'pen' || tool === 'text') && (
                        <>
                            <div className="h-6 w-px bg-slate-600" />
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-slate-300">Color:</label>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-10 h-8 rounded cursor-pointer"
                                />
                            </div>
                        </>
                    )}

                    {tool === 'pen' && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-300">Width:</label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={penWidth}
                                onChange={(e) => setPenWidth(Number(e.target.value))}
                                className="w-24"
                            />
                            <span className="text-sm text-slate-400">{penWidth}px</span>
                        </div>
                    )}

                    {tool === 'text' && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-300">Size:</label>
                            <input
                                type="range"
                                min="8"
                                max="48"
                                value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                                className="w-24"
                            />
                            <span className="text-sm text-slate-400">{fontSize}px</span>
                        </div>
                    )}
                </div>
            </div>

            {/* PDF Viewer with Canvas Overlay */}
            <div className="flex-1 overflow-auto bg-slate-900 p-8">
                <div className="max-w-4xl mx-auto relative">
                    <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
                        <div className="relative inline-block">
                            <ReactPDFPage
                                pageNumber={pageNumber}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                onLoadSuccess={(page) => {
                                    const canvas = canvasRef.current;
                                    if (canvas) {
                                        canvas.width = page.width;
                                        canvas.height = page.height;
                                        redrawCanvas();
                                    }
                                }}
                            />
                            <canvas
                                ref={canvasRef}
                                className="absolute top-0 left-0 cursor-crosshair"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            />
                        </div>
                    </Document>
                </div>
            </div>

            {/* Page Navigation */}
            <div className="bg-slate-800 border-t border-slate-700 p-4">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <button
                        onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                        disabled={pageNumber === 1}
                        className="btn btn-ghost">
                        <ChevronLeft className="h-5 w-5" />
                        Previous
                    </button>

                    <span className="text-white">
                        Page {pageNumber} of {numPages}
                    </span>

                    <button
                        onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                        disabled={pageNumber === numPages}
                        className="btn btn-ghost">
                        Next
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-900 border-t border-slate-700 p-4">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <button onClick={onCancel} className="btn btn-ghost">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(annotations)}
                        className="btn btn-primary">
                        Save & Continue
                    </button>
                </div>
            </div>

            {/* Text Input Modal */}
            {textPosition && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full">
                        <h3 className="text-lg font-bold text-white mb-4">Add Text</h3>
                        <input
                            type="text"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Enter text..."
                            className="input w-full mb-4"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setTextPosition(null);
                                    setTextInput('');
                                }}
                                className="btn btn-ghost flex-1">
                                Cancel
                            </button>
                            <button onClick={handleTextSubmit} className="btn btn-primary flex-1">
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
