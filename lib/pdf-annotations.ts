// PDF annotation utilities

import { PDFDocument, PDFPage, rgb } from 'pdf-lib';

export interface PenAnnotation {
    type: 'pen';
    pageNumber: number;
    points: { x: number; y: number }[];
    color: string;
    width: number;
}

export interface HighlightAnnotation {
    type: 'highlight';
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

export interface TextAnnotation {
    type: 'text';
    pageNumber: number;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    color: string;
}

export interface CropAnnotation {
    type: 'crop';
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export type Annotation = PenAnnotation | HighlightAnnotation | TextAnnotation | CropAnnotation;

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
        }
        : { r: 0, g: 0, b: 0 };
};

export const applyAnnotationsToPDF = async (
    pdfBlob: Blob,
    annotations: Annotation[]
): Promise<Blob> => {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Group annotations by page
    const annotationsByPage = new Map<number, Annotation[]>();
    annotations.forEach(annotation => {
        const pageAnnotations = annotationsByPage.get(annotation.pageNumber) || [];
        pageAnnotations.push(annotation);
        annotationsByPage.set(annotation.pageNumber, pageAnnotations);
    });

    // Apply annotations to each page
    for (const [pageNumber, pageAnnotations] of annotationsByPage) {
        const page = pdfDoc.getPage(pageNumber);
        const { width, height } = page.getSize();

        for (const annotation of pageAnnotations) {
            if (annotation.type === 'pen') {
                drawPenAnnotation(page, annotation, height);
            } else if (annotation.type === 'highlight') {
                drawHighlightAnnotation(page, annotation, height);
            } else if (annotation.type === 'text') {
                await drawTextAnnotation(page, annotation, height, pdfDoc);
            } else if (annotation.type === 'crop') {
                applyCropAnnotation(page, annotation, height);
            }
        }
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
};

const drawPenAnnotation = (page: PDFPage, annotation: PenAnnotation, pageHeight: number) => {
    if (annotation.points.length < 2) return;

    const color = hexToRgb(annotation.color);

    // Draw lines between points
    for (let i = 0; i < annotation.points.length - 1; i++) {
        const start = annotation.points[i];
        const end = annotation.points[i + 1];

        // Convert canvas coordinates to PDF coordinates (flip Y axis)
        const startY = pageHeight - start.y;
        const endY = pageHeight - end.y;

        page.drawLine({
            start: { x: start.x, y: startY },
            end: { x: end.x, y: endY },
            thickness: annotation.width,
            color: rgb(color.r, color.g, color.b),
        });
    }
};

const drawHighlightAnnotation = (
    page: PDFPage,
    annotation: HighlightAnnotation,
    pageHeight: number
) => {
    const color = hexToRgb(annotation.color);

    // Convert canvas coordinates to PDF coordinates
    const pdfY = pageHeight - annotation.y - annotation.height;

    page.drawRectangle({
        x: annotation.x,
        y: pdfY,
        width: annotation.width,
        height: annotation.height,
        color: rgb(color.r, color.g, color.b),
        opacity: 0.3,
    });
};

const drawTextAnnotation = async (
    page: PDFPage,
    annotation: TextAnnotation,
    pageHeight: number,
    pdfDoc: PDFDocument
) => {
    const color = hexToRgb(annotation.color);

    // Convert canvas coordinates to PDF coordinates
    const pdfY = pageHeight - annotation.y - annotation.fontSize;

    page.drawText(annotation.text, {
        x: annotation.x,
        y: pdfY,
        size: annotation.fontSize,
        color: rgb(color.r, color.g, color.b),
    });
};

const applyCropAnnotation = (
    page: PDFPage,
    annotation: CropAnnotation,
    pageHeight: number
) => {
    // Convert canvas coordinates to PDF coordinates
    const pdfY = pageHeight - annotation.y - annotation.height;

    // Set crop box
    page.setCropBox(
        annotation.x,
        pdfY,
        annotation.width,
        annotation.height
    );
};
