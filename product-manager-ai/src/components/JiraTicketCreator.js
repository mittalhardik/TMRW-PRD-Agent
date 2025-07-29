import React, { useState, useEffect, useRef } from 'react';
import { Ticket, X, Edit3, Check, AlertCircle, Settings, ExternalLink } from 'lucide-react';

// Jira Configuration Modal
const JiraConfigModal = ({ isOpen, onClose, config, onSave }) => {
  const [formData, setFormData] = useState({
    domain: config?.domain || '',
    email: config?.email || '',
    apiToken: config?.apiToken || '',
    projectKey: config?.projectKey || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Settings className="mr-2" size={20} />
            Jira Configuration
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Jira Domain
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData({...formData, domain: e.target.value})}
              placeholder="your-domain"
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Your Jira domain (e.g., "company" for company.atlassian.net)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="your-email@company.com"
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Token
            </label>
            <input
              type="password"
              value={formData.apiToken}
              onChange={(e) => setFormData({...formData, apiToken: e.target.value})}
              placeholder="Your Atlassian API token"
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              <a 
                href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                Generate API token
              </a>
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Project Key
            </label>
            <input
              type="text"
              value={formData.projectKey}
              onChange={(e) => setFormData({...formData, projectKey: e.target.value})}
              placeholder="PROJ"
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Your Jira project key (e.g., "PROJ" for project PROJ)
            </p>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Ticket Review Modal
const TicketReviewModal = ({ isOpen, onClose, ticketDetails, onConfirm, isCreating }) => {
  const [editedTicket, setEditedTicket] = useState({
    summary: '',
    description: '',
    priority: 'Medium',
    assignee: '',
    labels: [],
    acceptanceCriteria: []
  });

  useEffect(() => {
    if (ticketDetails) {
      setEditedTicket({
        summary: ticketDetails.summary || '',
        description: ticketDetails.description || '',
        priority: ticketDetails.priority || 'Medium',
        assignee: ticketDetails.assignee || '',
        labels: ticketDetails.labels || [],
        acceptanceCriteria: ticketDetails.acceptanceCriteria || []
      });
    }
  }, [ticketDetails]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Ticket className="mr-2" size={20} />
            Review Jira Ticket
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Summary *
            </label>
            <input
              type="text"
              value={editedTicket.summary}
              onChange={(e) => setEditedTicket({...editedTicket, summary: e.target.value})}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
              maxLength={255}
            />
            <p className="text-xs text-slate-400 mt-1">
              {editedTicket.summary.length}/255 characters
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description *
            </label>
            <textarea
              value={editedTicket.description}
              onChange={(e) => setEditedTicket({...editedTicket, description: e.target.value})}
              rows={8}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Priority
              </label>
              <select
                value={editedTicket.priority}
                onChange={(e) => setEditedTicket({...editedTicket, priority: e.target.value})}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Assignee
              </label>
              <input
                type="text"
                value={editedTicket.assignee}
                onChange={(e) => setEditedTicket({...editedTicket, assignee: e.target.value})}
                placeholder="email@company.com"
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Labels (comma-separated)
            </label>
            <input
              type="text"
              value={editedTicket.labels.join(', ')}
              onChange={(e) => setEditedTicket({...editedTicket, labels: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
              placeholder="frontend, bug, high-priority"
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Acceptance Criteria
            </label>
            <textarea
              value={editedTicket.acceptanceCriteria.join('\n')}
              onChange={(e) => setEditedTicket({...editedTicket, acceptanceCriteria: e.target.value.split('\n').filter(s => s.trim())})}
              rows={4}
              placeholder="• User can successfully log in&#10;• Error messages are displayed clearly&#10;• Session persists for 24 hours"
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
            />
          </div>
        </div>
        
        <div className="flex space-x-3 pt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (editedTicket && editedTicket.summary && editedTicket.description) {
                onConfirm(editedTicket);
              } else {
                // This shouldn't happen due to the disabled state, but just in case
                console.error('Invalid ticket data:', editedTicket);
              }
            }}
            disabled={isCreating || !editedTicket.summary || !editedTicket.description}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Check className="mr-2" size={16} />
                Create Ticket
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Floating Jira Button
const FloatingJiraButton = ({ onSelect, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg cursor-pointer transition-all duration-200 transform hover:scale-105">
        <Ticket size={24} />
      </div>
      <div className="absolute bottom-full right-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
        <div className="text-sm text-slate-300 mb-2">Create Jira Ticket</div>
        <div className="space-y-1">
          {['Story', 'Epic', 'Task', 'Bug'].map((type) => (
            <button
              key={type}
              onClick={() => onSelect(type.toLowerCase())}
              className="block w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded transition-colors"
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main Jira Ticket Creator Component
const JiraTicketCreator = ({ content, documentId, documentTitle }) => {
  const [selectedText, setSelectedText] = useState('');
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [selectedTicketType, setSelectedTicketType] = useState('');
  const [ticketDetails, setTicketDetails] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [jiraConfig, setJiraConfig] = useState(() => {
    const saved = localStorage.getItem('jiraConfig');
    return saved ? JSON.parse(saved) : null;
  });

  const backendUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080';

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text.length > 0) {
        setSelectedText(text);
        setShowFloatingButton(true);
      } else {
        setShowFloatingButton(false);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, []);

  // Handle ticket type selection
  const handleTicketTypeSelect = async (ticketType) => {
    setSelectedTicketType(ticketType);
    setShowFloatingButton(false);
    setError('');
    
    if (!jiraConfig) {
      setShowConfigModal(true);
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await fetch(`${backendUrl}/api/jira/generate-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          highlightedText: selectedText,
          ticketType,
          documentId,
          documentTitle,
          userInstruction: ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate ticket details');
      }

      const result = await response.json();
      setTicketDetails(result.ticketDetails);
      setShowReviewModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle ticket creation
  const handleCreateTicket = async (editedTicket) => {
    console.log('handleCreateTicket called with:', editedTicket);
    
    // Validate that editedTicket exists and has required properties
    if (!editedTicket) {
      console.error('editedTicket is null or undefined');
      setError('No ticket data provided');
      return;
    }

    // Ensure all required fields have default values
    const ticketData = {
      summary: editedTicket.summary || '',
      description: editedTicket.description || '',
      priority: editedTicket.priority || 'Medium',
      assignee: editedTicket.assignee || '',
      labels: Array.isArray(editedTicket.labels) ? editedTicket.labels : [],
      acceptanceCriteria: Array.isArray(editedTicket.acceptanceCriteria) ? editedTicket.acceptanceCriteria : []
    };

    console.log('Processed ticketData:', ticketData);

    // Validate required fields
    if (!ticketData.summary.trim()) {
      setError('Summary is required');
      return;
    }

    if (!ticketData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (!jiraConfig) {
      setError('Jira configuration is required');
      return;
    }

    setIsCreating(true);
    setError('');
    
    try {
      const requestBody = {
        ...ticketData,
        ticketType: selectedTicketType,
        projectKey: jiraConfig.projectKey,
        jiraConfig
      };
      
      console.log('Sending request to create ticket:', requestBody);

      const response = await fetch(`${backendUrl}/api/jira/create-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`✅ Jira ticket created successfully! 
            Ticket: ${result.jiraTicket} 
            URL: ${result.jiraUrl}
            ${result.note ? `Note: ${result.note}` : ''}`);
        setShowReviewModal(false);
        setTicketDetails(null);
      } else {
        const errorData = await response.json();
        setError(`❌ Failed to create Jira ticket: ${errorData.error || 'Unknown error'}`);
      }
      
      // Clear selection
      window.getSelection().removeAllRanges();
      setSelectedText('');
      
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Jira config save
  const handleConfigSave = (config) => {
    setJiraConfig(config);
    localStorage.setItem('jiraConfig', JSON.stringify(config));
    setShowConfigModal(false);
    
    // Retry ticket generation
    if (selectedTicketType) {
      handleTicketTypeSelect(selectedTicketType);
    }
  };

  return (
    <>
      <FloatingJiraButton 
        onSelect={handleTicketTypeSelect}
        isVisible={showFloatingButton}
      />
      
      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400"></div>
              <span className="text-slate-300">Generating Jira ticket...</span>
            </div>
          </div>
        </div>
      )}
      
      <TicketReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        ticketDetails={ticketDetails}
        onConfirm={handleCreateTicket}
        isCreating={isCreating}
      />
      
      <JiraConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        config={jiraConfig}
        onSave={handleConfigSave}
      />
      
      {error && (
        <div className="fixed bottom-6 left-6 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-center space-x-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {success && (
        <div className="fixed bottom-6 left-6 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-center space-x-2">
            <Check size={20} />
            <span>{success}</span>
            <button
              onClick={() => setSuccess('')}
              className="ml-2 text-white hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default JiraTicketCreator; 