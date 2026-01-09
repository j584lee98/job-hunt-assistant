import mammoth from 'mammoth'

import { PDFParse } from 'pdf-parse'

export async function parseFileContent(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileType = file.type

  try {
    if (fileType === 'application/pdf') {
      const parser = new PDFParse({ data: buffer })
      const data = await parser.getText()
      return data.text
    } else if (
      fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    } else if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
      return buffer.toString('utf-8')
    } else {
      throw new Error(`Unsupported file type: ${fileType}`)
    }
  } catch (error) {
    console.error('Error parsing file:', error)
    throw new Error('Failed to parse file content')
  }
}
