import { StateGraph } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { TavilySearch } from '@langchain/tavily'
import { z } from 'zod'

// Configuration constants
const MAX_SEARCH_RESULTS = 20
const TOP_K_MATCHES = 5

// Define the state interface
interface AgentState {
  content: string
  summary: string
  jobPostings: string
  topMatches: string
  isValid?: boolean
  validationError?: string
}

// Define the validator node
const validatorNode = async (state: AgentState) => {
  const { content } = state
  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-5',
    temperature: 0,
  })

  const ValidatorSchema = z.object({
    isValid: z
      .boolean()
      .describe('True if the content is a valid resume, false otherwise.'),
    validationError: z
      .string()
      .describe(
        'Explanation of why the content is not a valid resume, or empty string if valid.'
      ),
  })

  const structuredModel = model.withStructuredOutput(ValidatorSchema)

  const messages = [
    new SystemMessage(
      `You are an expert file validator. Your task is to determine if the provided text content is a valid resume or CV.
      
      A valid resume MUST contain:
      1. Candidate's Name (or plausible placeholder)
      2. Contact Information (email, phone, or address)
      3. At least one section regarding Experience, Skills, or Education.
      
      If the text appears to be some other document (like a recipe, a blog post, code snippet, or gibberish), mark it as invalid.
      If the text is too short or lacks sufficient information to be a resume, mark it as invalid.
      
      Return a structured output with 'isValid' boolean and a 'validationError' message if invalid.`
    ),
    new HumanMessage(`Content to validate:\n${content}`),
  ]

  const response = await structuredModel.invoke(messages)

  return {
    isValid: response.isValid,
    validationError: response.validationError,
  }
}

// Define the summarization node
const summarizeNode = async (state: AgentState) => {
  const { content } = state
  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-5',
    temperature: 0,
  })

  // Get current date for accurate experience calculation
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const messages = [
    new SystemMessage(
      `You are an expert resume summarizer. Your task is to extract and condense the most critical information
      from the provided resume/CV. Produce a dense, high-signal summary that maximizes information density.
      Do not include personal information (name, phone, email, address).
      
      CRITICAL INSTRUCTION FOR EXPERIENCE CALCULATION:
      - The current date is ${currentDate}. Use this to calculate durations for 'Present' or 'Current' roles.
      - You MUST calculate the total years of experience by analyzing the date ranges of every professional role listed.
      - If the resume does not explicitly state "X years of experience", you must sum the duration of each relevant role.
      - Overlapping dates should not be double-counted.
      - Round the total years to the nearest whole number.
      
      Structure the summary in clean MARKDOWN format:
      
      ### [Role/Title] | [Estimated Total Experience] | [Key Domain Areas]
      
      **Top Skills:** 
      [Comma-separated list of most relevant technical and soft skills]
      
      **Experience:**
      * [Concise bullet points of key roles, companies, and quantifiable achievements]
      
      **Education & Certifications:**
      * [Highest degree and most relevant certifications]`
    ),
    new HumanMessage(`Resume Content:\n${content}`),
  ]

  const response = await model.invoke(messages)

  // Return the update to the state
  return {
    summary: response.content as string,
  }
}

// Define the retriever node
const retrieverNode = async (state: AgentState) => {
  const { summary } = state
  const tool = new TavilySearch({
    maxResults: MAX_SEARCH_RESULTS,
  })

  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-5',
    temperature: 0,
  }).bindTools([tool])

  const messages = [
    new SystemMessage(
      `You are a specialized job search agent. Your goal is to find the most relevant and currently active
      LinkedIn job postings based on the resume summary. Generate specific search queries to find listings that
      match the candidate skills and experience level. You must retrieve ${MAX_SEARCH_RESULTS} postings.

      CRITICAL INSTRUCTIONS:
      - You must ONLY search for jobs on LinkedIn (site:linkedin.com/jobs/view).
      - Construct queries to find SPECIFIC LinkedIn job pages.
      - Avoid generic queries like "jobs for java developer" which often return pages showing multiple
        job listings instead of specific postings.
      - Each result MUST be a direct link to a single LinkedIn job posting page.
      - Each posting MUST clearly indicate the job title and description, company name, and location.
      - VERIFY that the job is currently ACTIVE. Exclude postings that state "no longer accepting applications", "closed", or "expired".
      - Do NOT return blog posts, articles, "top 10" lists, or general career advice pages.
      - Do NOT return pages that list multiple jobs.
      - Focus on finding links to direct applications or specific job descriptions.`
    ),
    new HumanMessage(`Resume Summary: ${summary}`),
  ]

  const response = await model.invoke(messages)
  const toolCalls = response.tool_calls

  if (toolCalls && toolCalls.length > 0) {
    // Execute the tool call
    // The model might generate multiple calls, but we'll take the first one or execute all if needed
    // Tavily typically handles one query at a time
    const searchResult = await tool.invoke(toolCalls[0])

    // The searchResult is a ToolMessage, we need to parse its content to get the actual results
    if (searchResult.content && typeof searchResult.content === 'string') {
      try {
        const parsedContent = JSON.parse(searchResult.content)
        if (parsedContent.results) {
          return {
            jobPostings: JSON.stringify(parsedContent.results),
          }
        }
      } catch (e) {
        console.error('Failed to parse Tavily content:', e)
      }
    }

    return {
      jobPostings:
        typeof searchResult.content === 'string'
          ? searchResult.content
          : JSON.stringify(searchResult),
    }
  }

  // Fallback if no tool call was made
  return {
    jobPostings: 'No job postings found.',
  }
}

// Define the evaluator node
const evaluatorNode = async (state: AgentState) => {
  const { summary, jobPostings } = state

  // If no jobs found, return empty
  if (!jobPostings || jobPostings === 'No job postings found.') {
    return {
      topMatches: JSON.stringify([]),
    }
  }

  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-5',
    temperature: 0,
  })

  const EvaluatedJobSchema = z.object({
    title: z.string(),
    url: z.string(),
    content: z.string(),
    isSingleJobPosting: z
      .boolean()
      .describe(
        'True if the page is a single job posting with a specific description. False if it is a list of jobs, search results, career board home page, or blog post.'
      ),
    scores: z.object({
      skillsFit: z
        .number()
        .min(1)
        .max(5)
        .describe('Role, Skills & Qualification Fit'),
      seniorityFit: z
        .number()
        .min(1)
        .max(5)
        .describe('Experience & Seniority Alignment'),
      industryFit: z
        .number()
        .min(1)
        .max(5)
        .describe('Domain & Industry Relevance'),
    }),
    finalScore: z.number().describe('Average of the 3 scores'),
    reasoning: z.string().describe('Brief explanation of the scores'),
  })

  const EvaluationSchema = z.object({
    evaluations: z.array(EvaluatedJobSchema),
  })

  const structuredModel = model.withStructuredOutput(EvaluationSchema)

  const messages = [
    new SystemMessage(
      `You are an expert recruitment AI responsible for evaluating job postings against a candidate's
      resume summary.
      
      SCORING GUIDES:
      
      1. Role, Skills & Qualification Fit:
      - 5: Perfect match. Candidate has all required skills and qualifications plus preferred ones.
      - 4: Strong match. Candidate has all core skills and qualifications.
      - 3: Good match. Candidate has most core skills; some gaps.
      - 2: Weak match. Significant skill gaps.
      - 1: No match.
      
      2. Experience & Seniority Alignment:
      - 5: Exact alignment with years of experience and seniority level.
      - 4: Very close alignment. Slightly over or under qualified.
      - 3: Acceptable alignment. Within a reasonable range.
      - 2: Mismatch. Too junior or too senior.
      - 1: Complete mismatch.
      
      3. Domain & Industry Relevance:
      - 5: Exact domain/industry match (e.g., Fintech to Fintech).
      - 4: Highly relevant adjacent industry.
      - 3: Somewhat relevant industry.
      - 2: Minimal relevance.
      - 1: Irrelevant industry.

      CRITICAL FILTERING INSTRUCTION:
      - You must carefully analyze the content to determine if it is a SINGLE job posting or a LIST of jobs/search results.
      - Set "isSingleJobPosting" to FALSE if the content shows multiple job titles, a list of search results, or is a generic careers page.
      - Set "isSingleJobPosting" to TRUE only if the content describes a SPECIFIC role.
      
      Task:
      Evaluate EACH job posting provided in the JSON input.
      Return the evaluation for every job.
      
      IMPORTANT SCORING INSTRUCTION:
      - Be CRITICAL and SKEPTICAL. Do not be overly generous.
      - Use the FULL range of scores (1-5). If a job is only a partial match, give it a 2 or 3.
      - If the provided content snippet is too short to determine a specific fit, penalize the score slightly rather than assuming a perfect match.
      - DIVERSIFY your scores. It is highly unlikely that a job is a 4/5 across all three categories. Realistically, a job might be a 5 for skills but a 3 for seniority. SCORE EACH AXIS INDEPENDENTLY.
      - Provide a SEPARATE and ACCURATE score for EACH of the 3 categories based on the scoring guides alone.
      - Do NOT simply assign the same score to all categories unless they truly warrant identical scores.
      - Calculate the final score as the mathematical average of these 3 distinct scores.
      - If "isSingleJobPosting" is false, the final score must be 0.`
    ),
    new HumanMessage(
      `Candidate Summary: ${summary}\n\nJob Postings (JSON): ${jobPostings}`
    ),
  ]

  const response = await structuredModel.invoke(messages)

  // Sort by final score descending and take top K, filtering out non-single postings
  const topMatches = response.evaluations
    .filter((e) => e.isSingleJobPosting)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, TOP_K_MATCHES)

  return {
    topMatches: JSON.stringify(topMatches),
  }
}

// Create the graph
const workflow = new StateGraph<AgentState>({
  channels: {
    content: {
      reducer: (x: string, y: string) => y ?? x,
      default: () => '',
    },
    summary: {
      reducer: (x: string, y: string) => y ?? x,
      default: () => '',
    },
    jobPostings: {
      reducer: (x: string, y: string) => y ?? x,
      default: () => '',
    },
    topMatches: {
      reducer: (x: string, y: string) => y ?? x,
      default: () => '',
    },
    isValid: {
      reducer: (x: boolean | undefined, y: boolean | undefined) => y ?? x,
      default: () => undefined,
    },
    validationError: {
      reducer: (x: string | undefined, y: string | undefined) => y ?? x,
      default: () => undefined,
    },
  },
})
  .addNode('validator', validatorNode)
  .addNode('summarize', summarizeNode)
  .addNode('retriever', retrieverNode)
  .addNode('evaluator', evaluatorNode)
  .addEdge('__start__', 'validator')
  .addConditionalEdges(
    'validator',
    (state) => (state.isValid ? 'summarize' : '__end__'),
    {
      summarize: 'summarize',
      __end__: '__end__',
    }
  )
  .addEdge('summarize', 'retriever')
  .addEdge('retriever', 'evaluator')
  .addEdge('evaluator', '__end__')

// Compile the graph
export const resumeGraph = workflow.compile()
