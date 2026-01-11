import { NextRequest, NextResponse } from 'next/server'
import { parseFileContent } from '@/lib/file-processing'
import { resumeGraph } from '@/lib/resume-graph'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null

    if (!file && !text) {
      return NextResponse.json(
        { error: 'No file or text provided' },
        { status: 400 }
      )
    }

    let content = ''
    let filename = 'text-input'

    if (file) {
      content = await parseFileContent(file)
      filename = file.name
    } else if (text) {
      content = text
    }

    const result = await resumeGraph.invoke({ content })

    return NextResponse.json({
      message: 'Processing successful',
      filename: filename,
      content: content,
      summary: result.summary,
      jobPostings: result.jobPostings,
      topMatches: result.topMatches,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
