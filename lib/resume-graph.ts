import { StateGraph } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'

// Define the state interface
interface AgentState {
  content: string
  summary: string
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
      'You are an expert resume summarizer. Your task is to summarize the provided resume/CV content into a few sentences that highlight the key skills, experience, and content. Avoid adding any external information.'
    ),
    new HumanMessage(`Resume Content:\n${content}`),
  ]

  const response = await model.invoke(messages)

  // Return the update to the state
  return {
    summary: response.content as string,
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
  },
})
  .addNode('summarize', summarizeNode)
  .addEdge('__start__', 'summarize')
  .addEdge('summarize', '__end__')

// Compile the graph
export const resumeGraph = workflow.compile()
