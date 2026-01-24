'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface JobPosting {
  title?: string
  url?: string
  content?: string
}

interface RankedJob extends JobPosting {
  finalScore?: number
  reasoning?: string
  scores?: {
    skillsFit?: number
    seniorityFit?: number
    industryFit?: number
  }
}

const CollapsibleSection = ({
  title,
  icon,
  children,
  headerColorClass,
}: {
  title: string
  icon: string
  children: React.ReactNode
  headerColorClass: string
}) => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="flex flex-col border rounded-xl dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-6 w-full text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors z-10 relative bg-white dark:bg-zinc-900 cursor-pointer"
      >
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <span className={headerColorClass}>{icon}</span>
          {title}
        </h2>
        <span className="text-2xl font-light text-zinc-400 leading-none">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-0">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  // Upload state
  const [inputType, setInputType] = useState<'file' | 'text'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState('')
  const [uploading, setUploading] = useState(false)

  // Execution state
  const [currentNode, setCurrentNode] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [jobPostings, setJobPostings] = useState<JobPosting[] | null>(null)
  const [topMatches, setTopMatches] = useState<RankedJob[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      resetState()
    }
  }

  const resetState = () => {
    setSummary(null)
    setJobPostings(null)
    setTopMatches(null)
    setError(null)
    setCurrentNode(null)
  }

  const handleUpload = async () => {
    if (inputType === 'file' && !file) return
    if (inputType === 'text' && !textInput.trim()) return

    setUploading(true)
    resetState()
    setCurrentNode('uploading')

    const formData = new FormData()
    if (inputType === 'file' && file) {
      formData.append('file', file)
    } else if (inputType === 'text') {
      formData.append('text', textInput)
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok || !res.body) {
        throw new Error(`Upload failed with status ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')

        // Process clear lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim()
          if (!line) continue

          try {
            const data = JSON.parse(line)

            if (data.type === 'metadata') {
              // Initial metadata received
              // console.log('Metadata:', data)
              setCurrentNode('summarize') // graph starts immediately
            } else if (data.type === 'update') {
              const { node, data: nodeData } = data
              setCurrentNode(node)

              if (node === 'summarize' && nodeData.summary) {
                setSummary(nodeData.summary)
                setCurrentNode('retriever') // Next logical step
              } else if (node === 'retriever' && nodeData.jobPostings) {
                try {
                  const postings = JSON.parse(nodeData.jobPostings)
                  setJobPostings(postings)
                } catch {
                  // Fallback for simple string
                }
                setCurrentNode('evaluator') // Next logical step
              } else if (node === 'evaluator' && nodeData.topMatches) {
                try {
                  const matches = JSON.parse(nodeData.topMatches)
                  setTopMatches(matches)
                } catch {
                  // Fallback
                }
                setCurrentNode(null) // Done
              }
            } else if (data.type === 'error') {
              setError(data.error)
              setCurrentNode(null)
            }
          } catch (e) {
            console.error('Error parsing stream chunk', e)
          }
        }

        // Keep the last partial line in the buffer
        buffer = lines[lines.length - 1]
      }
    } catch (error) {
      console.error(error)
      setError((error as Error).message || 'Error executing request')
    } finally {
      setUploading(false)
      setCurrentNode(null)
    }
  }

  // --- Helper Components ---

  const StatusIndicator = ({
    active,
    completed,
    label,
  }: {
    active: boolean
    completed: boolean
    label: string
  }) => (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        active
          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
          : completed
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 opacity-50'
      }`}
    >
      <div className="flex items-center justify-center w-6 h-6">
        {active ? (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin dark:border-blue-400" />
        ) : completed ? (
          <span className="text-green-600 dark:text-green-400 font-bold">
            ✓
          </span>
        ) : (
          <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        )}
      </div>
      <span
        className={`font-medium ${
          active
            ? 'text-blue-700 dark:text-blue-300'
            : completed
              ? 'text-green-700 dark:text-green-300'
              : 'text-zinc-500'
        }`}
      >
        {label}
      </span>
    </div>
  )

  const renderStars = (score: number) => (
    <div className="flex gap-1" title={`Score: ${score}/5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm leading-none ${
            star <= Math.round(score)
              ? 'text-yellow-400'
              : 'text-zinc-300 dark:text-zinc-600'
          }`}
        >
          ★
        </span>
      ))}
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 font-sans dark:bg-slate-950">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center py-20 px-8 bg-white dark:bg-slate-950 sm:items-start">
        <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left mb-12 w-full">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
            Job Hunt Assistant
          </h1>
          <p className="text-lg leading-7 text-zinc-600 dark:text-zinc-400 w-full">
            Streamline your job search process. Upload your resume to find
            active LinkedIn job postings, get AI-powered insights, and see your
            match scores.
          </p>
        </div>

        <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto">
          {/* 1. Resume Input Section */}
          <div className="flex flex-col gap-6 p-6 border rounded-xl dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm h-fit">
            <h2 className="text-xl font-semibold">Input Data</h2>

            {/* Toggle Tabs */}
            <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-700 pb-4">
              <button
                onClick={() => setInputType('file')}
                disabled={uploading}
                className={`pb-1 px-1 text-sm font-medium transition-colors relative ${
                  inputType === 'file'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                File Upload
                {inputType === 'file' && (
                  <span className="absolute bottom-[-17px] left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
              <button
                onClick={() => setInputType('text')}
                disabled={uploading}
                className={`pb-1 px-1 text-sm font-medium transition-colors relative ${
                  inputType === 'text'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                Paste Text
                {inputType === 'text' && (
                  <span className="absolute bottom-[-17px] left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {inputType === 'file' ? (
                <>
                  <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
                    Select a document (.pdf, .docx, .txt)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:text-zinc-400"
                  />
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
                    Paste resume text or job description
                  </label>
                  <textarea
                    rows={10}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    disabled={uploading}
                    placeholder="Paste your content here..."
                    className="block w-full rounded-md border-0 py-2.5 px-4 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700 sm:text-sm sm:leading-6"
                  />
                </>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={
                uploading || (inputType === 'file' ? !file : !textInput.trim())
              }
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              {uploading ? 'Processing Agent Pipeline...' : 'Start Analysis'}
            </button>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}
          </div>

          {/* Workflow Status */}
          {(uploading || summary) && (
            <div className="flex flex-col gap-3">
              <StatusIndicator
                active={currentNode === 'summarize'}
                completed={!!summary}
                label="Summarizer Agent: Extracting key information..."
              />
              <StatusIndicator
                active={currentNode === 'retriever'}
                completed={!!jobPostings}
                label="Retriever Agent: Searching for relevant roles..."
              />
              <StatusIndicator
                active={currentNode === 'evaluator'}
                completed={!!topMatches}
                label="Evaluator Agent: Scoring and matching jobs..."
              />
            </div>
          )}

          {/* 2. Summarizer Agent Section */}
          {summary && (
            <CollapsibleSection
              title="Resume Summary"
              icon="📝"
              headerColorClass="text-blue-600"
            >
              <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            </CollapsibleSection>
          )}

          {/* 3. Retriever Agent Section */}
          {jobPostings && (
            <CollapsibleSection
              title={`Found Jobs (${jobPostings.length})`}
              icon="🔍"
              headerColorClass="text-purple-600"
            >
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto hover-scroll pr-2">
                {jobPostings.map((job, i) => (
                  <div
                    key={i}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 transition-colors shrink-0"
                  >
                    <a
                      href={job.url}
                      target="_blank"
                      className="font-medium text-blue-600 hover:underline truncate block"
                    >
                      {job.title || 'Unknown Role'}
                    </a>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                      {job.content}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* 4. Evaluator Agent Section */}
          {topMatches && (
            <CollapsibleSection
              title="Top Matched Roles"
              icon="🏆"
              headerColorClass="text-green-600"
            >
              <div className="flex flex-col gap-4">
                {topMatches.map((job, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg text-blue-600">
                        <a
                          href={job.url}
                          target="_blank"
                          className="hover:underline"
                        >
                          {job.title}
                        </a>
                      </h4>
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                        {job.finalScore?.toFixed(1)}/5
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-zinc-500">
                      <div>
                        Skills: {renderStars(job.scores?.skillsFit || 0)}
                      </div>
                      <div>
                        Exp: {renderStars(job.scores?.seniorityFit || 0)}
                      </div>
                      <div>
                        Industry: {renderStars(job.scores?.industryFit || 0)}
                      </div>
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-snug">
                      {job.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      </main>
    </div>
  )
}
