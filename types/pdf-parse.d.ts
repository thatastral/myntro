declare module 'pdf-parse' {
  function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: { max?: number },
  ): Promise<{ text: string; numpages: number }>
  export = pdfParse
}
