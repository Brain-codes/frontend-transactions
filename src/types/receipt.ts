// Add to your existing types/sales.ts or create types/receipt.ts

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
}

export interface ReceiptProps {
  sale: Sale;
  companyInfo?: CompanyInfo;
}

export interface DownloadReceiptOptions {
  filename?: string;
  quality?: number;
  scale?: number;
}

// If you don't have these in your existing types
declare module "html2canvas" {
  interface Html2CanvasOptions {
    scale?: number;
    useCORS?: boolean;
    allowTaint?: boolean;
    backgroundColor?: string;
    logging?: boolean;
    height?: number;
    width?: number;
  }

  function html2canvas(
    element: HTMLElement,
    options?: Html2CanvasOptions
  ): Promise<HTMLCanvasElement>;
  export = html2canvas;
}

declare module "jspdf" {
  export interface jsPDFOptions {
    orientation?: "p" | "portrait" | "l" | "landscape";
    unit?: "pt" | "mm" | "cm" | "in" | "px" | "pc" | "em" | "ex";
    format?: string | [number, number];
  }

  export default class jsPDF {
    constructor(
      orientation?: string,
      unit?: string,
      format?: string | [number, number]
    );
    addImage(
      imageData: string,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number,
      alias?: string,
      compression?: string
    ): jsPDF;
    addPage(): jsPDF;
    save(filename: string): void;
  }
}
