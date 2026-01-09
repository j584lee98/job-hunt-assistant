import { NextRequest, NextResponse } from 'next/server'
import { parseFileContent } from '@/lib/file-processing'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const content = await parseFileContent(file)

    return NextResponse.json({
      message: 'File processed successfully',
      filename: file.name,
      content: content,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
