'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function Home() {
  const [apiResponse, setApiResponse] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const callApi = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/hello')
      const data = await res.json()
      setApiResponse(data.message)
    } catch (error) {
      console.error(error)
      setApiResponse('Error fetching data')
    } finally {
      setLoading(false)
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
            Click the button below to call the backend API layer.
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={callApi}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Call API'}
          </button>

          {apiResponse && (
            <div className="mt-4 p-4 border rounded bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100">
              <p>
                <strong>API Response:</strong> {apiResponse}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
