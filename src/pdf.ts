// PDF из куска страницы: снимок элемента (html2canvas) → страницы jsPDF. Длинный документ режется на несколько страниц.
// Библиотеки грузим только по требованию. Текст в таком PDF — картинка; боевые документы лучше делать на сервере.
export async function saveElementAsPdf(el: HTMLElement, fileName: string, format: 'a4' | 'a5' = 'a4') {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')])
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format })
  const margin = 10
  const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2
  const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2
  const pxPerMm = canvas.width / pageWidth
  const sliceHeightPx = Math.floor(pageHeight * pxPerMm)

  for (let y = 0, page = 0; y < canvas.height; y += sliceHeightPx, page++) {
    const h = Math.min(sliceHeightPx, canvas.height - y)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = h
    slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
    if (page > 0) pdf.addPage()
    // JPEG вместо PNG: файл в десятки раз меньше
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, pageWidth, h / pxPerMm)
  }
  pdf.save(fileName)
}
