import { StateGraph } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { TavilySearch } from '@langchain/tavily'

// Define the state interface
interface AgentState {
  content: string
  summary: string
  jobPostings: string
}

// Define the summarization node
const summarizeNode = async (state: AgentState) => {
  const { content } = state
  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-5',
    temperature: 0,
  })

  const messages = [
    new SystemMessage(
      `You are an expert resume summarizer.
Your task is to summarize the provided resume/CV content into a few sentences that highlight the key skills, experience, and content.
Avoid adding any external information.`
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
    maxResults: 10,
  })

  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-5',
    temperature: 0,
  }).bindTools([tool])

  const messages = [
    new SystemMessage(
      `You are a specialized job search agent.
Your goal is to find the most relevant and current job postings based on the candidate summary.
Generate specific search queries to find listings that match the candidate skills and experience level.
You must retrieve 10 postings.

CRITICAL INSTRUCTIONS:
- Each result MUST be a direct link to a single job posting page.
- Do NOT return blog posts, articles, "top 10" lists, or general career advice pages.
- Do NOT return pages that list multiple jobs.
- Focus on finding direct applications or specific job descriptions.`
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
  },
})
  .addNode('summarize', summarizeNode)
  .addNode('retriever', retrieverNode)
  .addEdge('__start__', 'summarize')
  .addEdge('summarize', 'retriever')
  .addEdge('retriever', '__end__')

// Compile the graph
export const resumeGraph = workflow.compile()
