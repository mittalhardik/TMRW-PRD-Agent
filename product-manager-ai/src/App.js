import React, { useState, useEffect } from 'react';
import { BrainCircuit, FileText, Search, Loader, Clipboard, Check, Book } from 'lucide-react';

// --- Helper Components ---
const IconWrapper = ({ children }) => <div className="bg-slate-800 p-2 rounded-md">{children}</div>;

const AgentCard = ({ title, icon, description, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
      isActive
        ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500'
        : 'bg-slate-900 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
    }`}
  >
    <div className="flex items-center space-x-4">
      <IconWrapper>{icon}</IconWrapper>
      <div>
        <h3 className="font-bold text-lg text-white">{title}</h3>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>
    </div>
  </button>
);

const TextArea = ({ title, value, onChange, placeholder, height = 'h-40' }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">{title}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full ${height} p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-200 placeholder-slate-500`}
    />
  </div>
);

// REMOVE: ToggleSwitch component definition

const CopyButton = ({ text }) => {
    const [isCopied, setIsCopied] = useState(false);
    const rawText = text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');

    const copyToClipboard = (e) => {
        e.stopPropagation();
        const textArea = document.createElement("textarea");
        textArea.value = rawText;
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
        document.body.removeChild(textArea);
    };

    return (
        <button onClick={copyToClipboard} className="absolute top-3 right-3 p-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors text-slate-300" aria-label="Copy to clipboard">
            {isCopied ? <Check size={16} className="text-green-400" /> : <Clipboard size={16} />}
        </button>
    );
};

const OutputDisplay = ({ title, content }) => (
  <div className="mt-6">
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 relative prose prose-invert max-w-none text-slate-300">
        <CopyButton text={content} />
        <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  </div>
);

const LoadingSpinner = ({text}) => (
    <div className="flex items-center justify-center space-x-2 p-4">
        <Loader className="animate-spin text-indigo-400" />
        <span className="text-slate-400">{text || "The AI Agent is thinking..."}</span>
    </div>
);

// --- RAG Pipeline Utilities ---
// REMOVE: chunkText, embed, cosineSim, retrieveChunks, ragChunks, getRagContext, and related useEffect

// --- Main Agent Components ---

const IdeationAgent = ({ generateTextResponse }) => {
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setOutput('');
    const fullPrompt = `You are the "Ideation Agent," a strategic brainstorming partner for a Product Manager. Your goal is to generate creative and data-driven product/feature ideas. User's Request: "${prompt}". Your Task: 1. **Synthesize Findings:** Briefly summarize key findings from market trends, competitor analysis, and user needs. 2. **Generate Ideas:** Based on your synthesis, generate a list of 5-7 innovative feature ideas. For each idea, provide a brief justification linking it back to the insights you identified. 3. **Format:** Present your response in well-structured Markdown format.`;
    const result = await generateTextResponse(fullPrompt);
    setOutput(result);
    setIsLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Ideation Agent</h2>
      <p className="text-slate-400 mb-6">Your strategic partner for brainstorming. Provide a topic, and the agent will synthesize market trends and user needs to generate innovative ideas.</p>
      <TextArea title="Brainstorming Prompt" value={prompt} onChange={setPrompt} placeholder="e.g., How can our project management tool better support remote-first teams?" height="h-28" />
      <button onClick={handleGenerate} disabled={isLoading || !prompt} className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center">
        {isLoading ? <Loader className="animate-spin mr-2" /> : <BrainCircuit className="mr-2" />}
        Generate Ideas
      </button>
      {isLoading && <LoadingSpinner />}
      {output && <OutputDisplay title="Ideation Report" content={output} />}
    </div>
  );
};

const AuthoringAgent = ({ generateTextResponse }) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [userStories, setUserStories] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMeetingNotes(`Q2 Planning Meeting Notes:\n- John (UX): Users are confused by the current reporting dashboard. It's too cluttered.\n- Sarah (Eng): We need to build a more flexible data filtering system.\n- PM: The goal for Q3 is to increase user engagement with reports by 25%.\n- Key takeaway: Simplify the UI and add powerful filtering.`);
    setUserStories('');
  }, []);

  const handleGenerate = async () => {
    if (!meetingNotes && !userStories && !userPrompt) return;
    setIsLoading(true);
    setOutput('');
    const fullPrompt = `You are the \"PRD Authoring Agent.\" Your job is to create a well-structured first draft of a PRD by synthesizing information from various sources.\n\n**Source 1: User Instructions**\n\n${userPrompt}\n\n**Source 2: Meeting Notes**\n\n${meetingNotes}\n\n**Source 3: User Stories**\n\n${userStories}\n\n**Your Task:**\n1. **Synthesize & Infer:** Infer requirements and problem statements from the notes, user stories, and user instructions. 2. **Final Output:** Generate the complete, filled-out PRD in Markdown format.`;
    const result = await generateTextResponse(fullPrompt);
    setOutput(result);
    setIsLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">PRD Authoring Agent</h2>
      <p className="text-slate-400 mb-6">Automate the creation of your first PRD draft. Provide the source materials and additional instructions, and the agent will compile them into a structured document.</p>
      <div className="space-y-4">
        <TextArea title="User Prompt (Additional Instructions)" value={userPrompt} onChange={setUserPrompt} placeholder="Add any special instructions or context for the PRD here." />
        <TextArea title="Source: Meeting Notes / Transcripts" value={meetingNotes} onChange={setMeetingNotes} placeholder="Paste relevant meeting notes, brainstorming session outputs, etc." />
        <TextArea title="Source: User Stories / Jira Tickets" value={userStories} onChange={setUserStories} placeholder="Paste user stories here." />
      </div>
      <button onClick={handleGenerate} disabled={isLoading || (!meetingNotes && !userStories && !userPrompt)} className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center">
        {isLoading ? <Loader className="animate-spin mr-2" /> : <FileText className="mr-2" />}
        Draft PRD
      </button>
      {isLoading && <LoadingSpinner />}
      {output && <OutputDisplay title="Generated PRD Draft" content={output} />}
    </div>
  );
};

const ReviewAgent = ({ generateTextResponse }) => {
  const [prd, setPrd] = useState('');
  const [reference, setReference] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPrd(`## PRD: User Profile Redesign\n\n**Problem Statement:** Our user profiles look outdated and don't provide enough value to users.\n\n**Success Metrics:**\n- Increase time spent on profile pages by 15%.\n- Increase number of profile fields filled out by 20%.\n\n**Features:**\n- Add a customizable banner image.\n- Allow users to add a project portfolio section.`);
    setReference(`## Q1 User Research Summary\n\n**Key Findings:**\n1. **Discoverability is low:** Users report they have a very hard time finding specific information on other users' profiles. "It's a wall of text," one user said.\n2. **Trust Issues:** Users don't trust profiles that are incomplete. They want to see verification badges.\n3. **Goal-Oriented:** Users visit profiles to accomplish a specific task, not to browse.`);
  }, []);

  const handleGenerate = async () => {
    if (!prd || !reference) return;
    setIsLoading(true);
    setOutput('');
    const fullPrompt = `You are the "PRD Review Agent," an expert product Manager. Your job is to perform a quality check on a PRD draft. \n\n**Context A: The PRD for Review**\n\`\`\`markdown\n${prd}\n\`\`\`\n\n**Context B: The Reference Document (User Research)**\n\`\`\`\n${reference}\n\`\`\`\n\n**Your Task:**\nGenerate a detailed PRD review.`;
    const result = await generateTextResponse(fullPrompt);
    setOutput(result);
    setIsLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">PRD Review Agent</h2>
      <p className="text-slate-400 mb-6">Your quality assurance partner. The agent analyzes a PRD for consistency, completeness, and alignment with strategy and best practices.</p>
      <div className="space-y-4">
        <TextArea title="PRD to Review" value={prd} onChange={setPrd} placeholder="Paste the PRD content you want to have reviewed." />
        <TextArea title="Reference Document (e.g., User Research)" value={reference} onChange={setReference} placeholder="Paste the content of the document you want to compare the PRD against." />
      </div>
      <button onClick={handleGenerate} disabled={isLoading || !prd} className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center">
        {isLoading ? <Loader className="animate-spin mr-2" /> : <Search className="mr-2" />}
        Review PRD
      </button>
      {isLoading && <LoadingSpinner />}
      {output && <OutputDisplay title="PRD Review Analysis" content={output} />}
    </div>
  );
};

const RetrievalAgent = () => {
  const [query, setQuery] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRetrieve = async () => {
    if (!query) return;
    setIsLoading(true);
    setOutput('');
    setError('');
    try {
      const backendUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        const result = await response.json();
        setError(result.error || 'Error retrieving from RAG Engine');
        setIsLoading(false);
        return;
      }
      const result = await response.json();
      setOutput(result.result || 'No relevant sections found.');
    } catch (err) {
      setError('Failed to contact backend: ' + err.message);
    }
    setIsLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Retrieval Agent</h2>
      <p className="text-slate-400 mb-6">Retrieve the most relevant sections from the RAG Engine for your query.</p>
      <TextArea title="Retrieval Query" value={query} onChange={setQuery} placeholder="Enter your question or topic to retrieve relevant sections..." height="h-20" />
      <button onClick={handleRetrieve} disabled={isLoading || !query} className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center">
        {isLoading ? <Loader className="animate-spin mr-2" /> : <Book className="mr-2" />}
        Retrieve
      </button>
      {isLoading && <LoadingSpinner text="Retrieving from RAG Engine..." />}
      {error && <div className="mt-4 text-red-400">{error}</div>}
      {output && <OutputDisplay title="Retrieved Sections" content={output} />}
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [activeAgent, setActiveAgent] = useState('ideation');
  // Remove all RAG state and local context logic

  // Update generateTextResponse to use only Gemini API (or backend if needed)
  const GEMINI_API_KEY = "AIzaSyBN6nV0ste3cCs0ExRpWxGewJevL_dkYRM";
  const GEMINI_MODEL = "gemini-2.5-flash";
  const generateTextResponse = async (prompt) => {
    const apiKey = GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, topK: 1, topP: 1, maxOutputTokens: 32768 },
    };
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) return `Error: The model returned an error. Status: ${response.status}.`;
      const result = await response.json();
      if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0]) {
        return result.candidates[0].content.parts[0].text;
      } else {
        if (result.promptFeedback && result.promptFeedback.blockReason) {
          return `Content was blocked. Reason: ${result.promptFeedback.blockReason}.`;
        }
        return "The model returned an empty response.";
      }
    } catch (error) {
      return `An error occurred while contacting the AI agent: ${error.message}`;
    }
  };

  const renderActiveAgent = () => {
    switch (activeAgent) {
      case 'ideation':
        return <IdeationAgent generateTextResponse={generateTextResponse} />;
      case 'authoring':
        return <AuthoringAgent generateTextResponse={generateTextResponse} />;
      case 'review':
        return <ReviewAgent generateTextResponse={generateTextResponse} />;
      case 'retrieval':
        return <RetrievalAgent />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Product Manager AI Assistant
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-3xl mx-auto">
            An interactive prototype of an Agentic RAG system with an integrated, explicit knowledge base.
          </p>
        </header>
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1 flex flex-col space-y-4">
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Choose Your Agent</h2>
                <div className="space-y-4">
                    <AgentCard title="Ideation Agent" description="Brainstorm new features and ideas." icon={<BrainCircuit size={24} className="text-purple-400" />} onClick={() => setActiveAgent('ideation')} isActive={activeAgent === 'ideation'} />
                    <AgentCard title="PRD Authoring Agent" description="Draft PRDs from source materials." icon={<FileText size={24} className="text-sky-400" />} onClick={() => setActiveAgent('authoring')} isActive={activeAgent === 'authoring'} />
                    <AgentCard title="PRD Review Agent" description="Analyze PRDs for quality and alignment." icon={<Search size={24} className="text-amber-400" />} onClick={() => setActiveAgent('review')} isActive={activeAgent === 'review'} />
                    <AgentCard title="Retrieval Agent" description="Retrieve relevant sections from RAG Engine." icon={<Book size={24} className="text-green-400" />} onClick={() => setActiveAgent('retrieval')} isActive={activeAgent === 'retrieval'} />
                </div>
            </div>
          </aside>
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6 md:p-8">
            {renderActiveAgent()}
          </div>
        </main>
        <footer className="text-center mt-12 text-slate-500 text-sm">
            <p>This is a functional prototype. All agent responses are generated by the Gemini API and may require verification.</p>
        </footer>
      </div>
    </div>
  );
}
