import React, { useState, useEffect } from 'react';
import { BrainCircuit, FileText, Search, Loader, Clipboard, Check, Book, Upload, File } from 'lucide-react';
import MarkdownRenderer from './components/MarkdownRenderer';

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

const OutputDisplay = ({ title, content }) => {
  const [renderMode, setRenderMode] = useState('auto'); // 'auto', 'markdown', 'html'
  
  // Function to detect if content contains markdown
  const isMarkdown = (text) => {
    const markdownPatterns = [
      /^#+\s/m, // Headers
      /\*\*.*?\*\*/, // Bold text
      /\*.*?\*/, // Italic text
      /\[.*?\]\(.*?\)/, // Links
      /```[\s\S]*?```/, // Code blocks
      /`.*?`/, // Inline code
      /^\s*[-*+]\s/m, // Unordered lists
      /^\s*\d+\.\s/m, // Ordered lists
      /^\s*>\s/m, // Blockquotes
      /\|.*\|.*\|/m, // Tables
      /^\s*---/m, // Horizontal rules
    ];
    
    return markdownPatterns.some(pattern => pattern.test(text));
  };

  const shouldRenderAsMarkdown = renderMode === 'markdown' || (renderMode === 'auto' && isMarkdown(content));

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {isMarkdown(content) && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Render as:</span>
            <select
              value={renderMode}
              onChange={(e) => setRenderMode(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
            >
              <option value="auto">Auto</option>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
            </select>
          </div>
        )}
      </div>
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 relative">
        <CopyButton text={content} />
        {shouldRenderAsMarkdown ? (
          <MarkdownRenderer content={content} />
        ) : (
          <div className="prose prose-invert max-w-none text-slate-300">
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingSpinner = ({text}) => (
    <div className="flex items-center justify-center space-x-2 p-4">
        <Loader className="animate-spin text-indigo-400" />
        <span className="text-slate-400">{text || "The AI Agent is thinking..."}</span>
    </div>
);

// --- RAG Engine Integration ---
const useRAGEngine = () => {
  const backendUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080';
  
  // Accepts: { prompt, files } or just prompt
  const queryRAG = async (query, files = []) => {
    try {
      let response;
      if (files && files.length > 0) {
        const formData = new FormData();
        formData.append('prompt', query); // Always use 'prompt'
        files.forEach((file) => formData.append('files', file));
        response = await fetch(`${backendUrl}/rag/query`, {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch(`${backendUrl}/rag/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: query }), // Always use 'prompt'
        });
      }
      let result;
      try {
        if (!response.ok) {
          // Try to parse error as JSON, else fallback
          try {
            const errJson = await response.json();
            throw new Error(errJson.error || 'Error querying RAG Engine');
          } catch (jsonErr) {
            const text = await response.text();
            throw new Error(`RAG Engine error: ${text.substring(0, 200)}`);
          }
        }
        result = await response.json();
      } catch (parseErr) {
        throw new Error('RAG Engine error: Invalid response from backend.');
      }
      return result.result || 'No relevant information found.';
    } catch (error) {
      throw new Error(`RAG Engine error: ${error.message}`);
    }
  };

  const uploadDocument = async (file) => {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await fetch(`${backendUrl}/rag/ingest`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Error uploading document');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Upload error: ${error.message}`);
    }
  };

  return { queryRAG, uploadDocument };
};

// --- Document Upload Component ---
const DocumentUploadAgent = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const { uploadDocument } = useRAGEngine();

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setUploadStatus('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setError('');
    setUploadStatus('');
    
    try {
      await uploadDocument(selectedFile);
      setUploadStatus(`Successfully uploaded ${selectedFile.name} to RAG Engine!`);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Document Upload Agent</h2>
      <p className="text-slate-400 mb-6">Upload documents to the RAG Engine to enhance the knowledge base for all agents.</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Select Document</label>
          <div className="flex items-center space-x-4">
            <input
              id="file-input"
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.txt,.md"
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer cursor-pointer"
            />
          </div>
          {selectedFile && (
            <div className="mt-2 flex items-center space-x-2 text-slate-300">
              <File size={16} />
              <span>{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
          )}
        </div>
        
        <button 
          onClick={handleUpload} 
          disabled={isUploading || !selectedFile} 
          className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isUploading ? <Loader className="animate-spin mr-2" /> : <Upload className="mr-2" />}
          {isUploading ? 'Uploading...' : 'Upload to RAG Engine'}
        </button>
        
        {isUploading && <LoadingSpinner text="Uploading document to RAG Engine..." />}
        {error && <div className="mt-4 text-red-400">{error}</div>}
        {uploadStatus && <div className="mt-4 text-green-400">{uploadStatus}</div>}
      </div>
      
      <div className="mt-6 p-4 bg-slate-800 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-2">Supported File Types</h3>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>• PDF documents (.pdf)</li>
          <li>• Word documents (.doc, .docx)</li>
          <li>• Text files (.txt)</li>
          <li>• Markdown files (.md)</li>
        </ul>
      </div>
    </div>
  );
};

// --- Main Agent Components ---

const IdeationAgent = () => {
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const { queryRAG } = useRAGEngine();

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setOutput('');
    setError('');
    try {
      const ragQuery = `You are the "Ideation Agent," a strategic brainstorming partner for a Product Manager. Your goal is to generate creative and data-driven product/feature ideas. \n\nUser's Request: "${prompt}"\n\nYour Task: \n1. **Synthesize Findings:** Briefly summarize key findings from market trends, competitor analysis, and user needs.\n2. **Generate Ideas:** Based on your synthesis, generate a list of 5-7 innovative feature ideas. For each idea, provide a brief justification linking it back to the insights you identified.\n3. **Format:** Present your response in well-structured Markdown format.\n\nPlease provide a comprehensive analysis and ideation based on the available knowledge base.`;
      const result = await queryRAG(ragQuery, files);
      setOutput(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Ideation Agent</h2>
      <p className="text-slate-400 mb-6">Your strategic partner for brainstorming. Provide a topic, and the agent will synthesize market trends and user needs to generate innovative ideas using the RAG Engine.</p>
      <TextArea title="Brainstorming Prompt" value={prompt} onChange={setPrompt} placeholder="e.g., How can our project management tool better support remote-first teams?" height="h-28" />
      <div className="my-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">Attach Documents or Images (optional)</label>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer cursor-pointer"
        />
        {files.length > 0 && (
          <div className="mt-2 text-slate-300 text-xs">
            {files.map((file, idx) => (
              <div key={idx}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</div>
            ))}
          </div>
        )}
      </div>
      <button onClick={handleGenerate} disabled={isLoading || !prompt} className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center">
        {isLoading ? <Loader className="animate-spin mr-2" /> : <BrainCircuit className="mr-2" />}
        Generate Ideas
      </button>
      {isLoading && <LoadingSpinner text="Analyzing with RAG Engine..." />}
      {error && <div className="mt-4 text-red-400">{error}</div>}
      {output && <OutputDisplay title="Ideation Report" content={output} />}
    </div>
  );
};

const AuthoringAgent = () => {
  const [userPrompt, setUserPrompt] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [userStories, setUserStories] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const { queryRAG } = useRAGEngine();

  useEffect(() => {
    setMeetingNotes(`Q2 Planning Meeting Notes:\n- John (UX): Users are confused by the current reporting dashboard. It's too cluttered.\n- Sarah (Eng): We need to build a more flexible data filtering system.\n- PM: The goal for Q3 is to increase user engagement with reports by 25%.\n- Key takeaway: Simplify the UI and add powerful filtering.`);
    setUserStories('');
  }, []);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleGenerate = async () => {
    if (!meetingNotes && !userStories && !userPrompt) return;
    setIsLoading(true);
    setOutput('');
    setError('');
    try {
      const ragQuery = `You are the "PRD Authoring Agent." Your job is to create a well-structured first draft of a PRD by synthesizing information from various sources and leveraging the knowledge base.\n\n**Source 1: User Instructions**\n${userPrompt}\n\n**Source 2: Meeting Notes**\n${meetingNotes}\n\n**Source 3: User Stories**\n${userStories}\n\n**Your Task:**\n1. **Synthesize & Infer:** Infer requirements and problem statements from the notes, user stories, and user instructions.\n2. **Leverage Knowledge Base:** Use the available knowledge base to enhance the PRD with best practices, industry standards, and relevant examples.\n3. **Final Output:** Generate the complete, filled-out PRD in Markdown format.\n\nPlease create a comprehensive PRD that incorporates insights from the knowledge base.`;
      const result = await queryRAG(ragQuery, files);
      setOutput(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">PRD Authoring Agent</h2>
      <p className="text-slate-400 mb-6">Automate the creation of your first PRD draft. Provide the source materials and additional instructions, and the agent will compile them into a structured document using the RAG Engine.</p>
      <div className="space-y-4">
        <TextArea title="User Prompt (Additional Instructions)" value={userPrompt} onChange={setUserPrompt} placeholder="Add any special instructions or context for the PRD here." />
        <TextArea title="Source: Meeting Notes / Transcripts" value={meetingNotes} onChange={setMeetingNotes} placeholder="Paste relevant meeting notes, brainstorming session outputs, etc." />
        <TextArea title="Source: User Stories / Jira Tickets" value={userStories} onChange={setUserStories} placeholder="Paste user stories here." />
      </div>
      <div className="my-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">Attach Documents or Images (optional)</label>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer cursor-pointer"
        />
        {files.length > 0 && (
          <div className="mt-2 text-slate-300 text-xs">
            {files.map((file, idx) => (
              <div key={idx}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</div>
            ))}
          </div>
        )}
      </div>
      <button onClick={handleGenerate} disabled={isLoading || (!meetingNotes && !userStories && !userPrompt)} className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center">
        {isLoading ? <Loader className="animate-spin mr-2" /> : <FileText className="mr-2" />}
        Draft PRD
      </button>
      {isLoading && <LoadingSpinner text="Creating PRD with RAG Engine..." />}
      {error && <div className="mt-4 text-red-400">{error}</div>}
      {output && <OutputDisplay title="Generated PRD Draft" content={output} />}
    </div>
  );
};

const ReviewAgent = () => {
  const [prd, setPrd] = useState('');
  const [reference, setReference] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { queryRAG } = useRAGEngine();

  useEffect(() => {
    setPrd(`## PRD: User Profile Redesign

**Problem Statement:** Our user profiles look outdated and don't provide enough value to users.

**Success Metrics:**
- Increase time spent on profile pages by 15%.
- Increase number of profile fields filled out by 20%.

**Features:**
- Add a customizable banner image.
- Allow users to add a project portfolio section.`);
    setReference(`## Q1 User Research Summary

**Key Findings:**
1. **Discoverability is low:** Users report they have a very hard time finding specific information on other users' profiles. "It's a wall of text," one user said.
2. **Trust Issues:** Users don't trust profiles that are incomplete. They want to see verification badges.
3. **Goal-Oriented:** Users visit profiles to accomplish a specific task, not to browse.`);
  }, []);

  const handleGenerate = async () => {
    if (!prd || !reference) return;
    setIsLoading(true);
    setOutput('');
    setError('');
    
    try {
      const ragQuery = `You are the "PRD Review Agent," an expert Product Manager. Your job is to perform a quality check on a PRD draft using the knowledge base for best practices and industry standards.

**Context A: The PRD for Review**
\`\`\`markdown
${prd}
\`\`\`

**Context B: The Reference Document (User Research)**
\`\`\`
${reference}
\`\`\`

**Your Task:**
Generate a detailed PRD review that includes:
1. **Quality Assessment:** Evaluate the PRD against industry best practices
2. **Alignment Check:** Verify consistency with user research and reference materials
3. **Completeness Review:** Identify missing elements or gaps
4. **Recommendations:** Provide specific improvements based on the knowledge base

Please provide a comprehensive review leveraging the available knowledge base.`;
      
      const result = await queryRAG(ragQuery);
      setOutput(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">PRD Review Agent</h2>
      <p className="text-slate-400 mb-6">Your quality assurance partner. The agent analyzes a PRD for consistency, completeness, and alignment with strategy and best practices using the RAG Engine.</p>
      <div className="space-y-4">
        <TextArea title="PRD to Review" value={prd} onChange={setPrd} placeholder="Paste the PRD content you want to have reviewed." />
        <TextArea title="Reference Document (e.g., User Research)" value={reference} onChange={setReference} placeholder="Paste the content of the document you want to compare the PRD against." />
      </div>
      <button onClick={handleGenerate} disabled={isLoading || !prd} className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center">
        {isLoading ? <Loader className="animate-spin mr-2" /> : <Search className="mr-2" />}
        Review PRD
      </button>
      {isLoading && <LoadingSpinner text="Reviewing with RAG Engine..." />}
      {error && <div className="mt-4 text-red-400">{error}</div>}
      {output && <OutputDisplay title="PRD Review Analysis" content={output} />}
    </div>
  );
};

const RetrievalAgent = () => {
  const [query, setQuery] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { queryRAG } = useRAGEngine();

  const handleRetrieve = async () => {
    if (!query) return;
    setIsLoading(true);
    setOutput('');
    setError('');
    
    try {
      const result = await queryRAG(query);
      setOutput(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
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

  const renderActiveAgent = () => {
    switch (activeAgent) {
      case 'ideation':
        return <IdeationAgent />;
      case 'authoring':
        return <AuthoringAgent />;
      case 'review':
        return <ReviewAgent />;
      case 'retrieval':
        return <RetrievalAgent />;
      case 'upload':
        return <DocumentUploadAgent />;
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
                    <AgentCard title="Ideation Agent" description="Brainstorm new features and ideas using RAG Engine." icon={<BrainCircuit size={24} className="text-purple-400" />} onClick={() => setActiveAgent('ideation')} isActive={activeAgent === 'ideation'} />
                    <AgentCard title="PRD Authoring Agent" description="Draft PRDs from source materials using RAG Engine." icon={<FileText size={24} className="text-sky-400" />} onClick={() => setActiveAgent('authoring')} isActive={activeAgent === 'authoring'} />
                    <AgentCard title="PRD Review Agent" description="Analyze PRDs for quality and alignment using RAG Engine." icon={<Search size={24} className="text-amber-400" />} onClick={() => setActiveAgent('review')} isActive={activeAgent === 'review'} />
                    <AgentCard title="Retrieval Agent" description="Retrieve relevant sections from RAG Engine." icon={<Book size={24} className="text-green-400" />} onClick={() => setActiveAgent('retrieval')} isActive={activeAgent === 'retrieval'} />
                    <AgentCard title="Document Upload" description="Upload documents to enhance the RAG Engine knowledge base." icon={<Upload size={24} className="text-orange-400" />} onClick={() => setActiveAgent('upload')} isActive={activeAgent === 'upload'} />
                </div>
            </div>
          </aside>
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6 md:p-8">
            {renderActiveAgent()}
          </div>
        </main>
        <footer className="text-center mt-12 text-slate-500 text-sm">
            <p>This is a functional prototype. All agent responses are generated by the RAG Engine and may require verification.</p>
        </footer>
      </div>
    </div>
  );
}
