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

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                type: 'metadata',
                filename,
                content,
              }) + '\n'
            )
          )

          // Stream graph updates
          for await (const chunk of await resumeGraph.stream({ content })) {
            for (const [nodeName, updates] of Object.entries(chunk)) {
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({
                    type: 'update',
                    node: nodeName,
                    data: updates,
                  }) + '\n'
                )
              )
            }
          }
          controller.close()
        } catch (e) {
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                type: 'error',
                error: (e as Error).message,
              }) + '\n'
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson', // Newline delimited JSON
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
