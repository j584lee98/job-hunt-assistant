'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function Home() {
  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResponse, setUploadResponse] = useState<{
    message?: string
    filename?: string
    content?: string
    error?: string
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setUploadResponse(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      let data
      try {
        data = await res.json()
      } catch (e) {
        console.error('Failed to parse response JSON', e)
        const text = await res.text()
        console.error('Response text:', text)
        throw new Error('Server returned non-JSON response')
      }

      setUploadResponse(data)
    } catch (error) {
      console.error(error)
      setUploadResponse({ error: 'Error uploading file' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Job Hunt Assistant
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Upload your resume or job description to extract its text.
          </p>
        </div>

        <div className="flex flex-col gap-8 w-full mt-8">
          {/* Upload API Section */}
          <div className="flex flex-col gap-4 p-6 border rounded-xl dark:border-zinc-800">
            <h2 className="text-xl font-semibold">Document Upload</h2>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="file-upload"
                className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100"
              >
                Select a document (.pdf, .docx, .txt)
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-zinc-900 border border-zinc-300 rounded-lg cursor-pointer bg-zinc-50 dark:text-zinc-400 focus:outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {uploading ? 'Processing...' : 'Upload & Extract Text'}
            </button>

            {uploadResponse && (
              <div className="p-4 border rounded bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 overflow-auto">
                <p className="font-semibold mb-2">Result:</p>
                {uploadResponse.error ? (
                  <div className="text-red-500">{uploadResponse.error}</div>
                ) : (
                  <div>
                    <div className="text-sm font-semibold text-green-600 mb-2">
                      {uploadResponse.message} ({uploadResponse.filename})
                    </div>
                    <div className="bg-zinc-100 dark:bg-black p-3 rounded border dark:border-zinc-700 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm font-mono">
                      {uploadResponse.content}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
