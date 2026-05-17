
import React from 'react';
import { AgentConfig } from '../types';

interface AgentFormProps {
  agentConfig: AgentConfig;
  setAgentConfig: React.Dispatch<React.SetStateAction<AgentConfig>>;
  onGenerate: () => void;
  onReset: () => void;
  onLoadTemplate: () => void;
  isLoading: boolean;
}

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
    {text}
  </span>
);

const FormField: React.FC<{id: string, label: string, tooltip: string, required: boolean, children: React.ReactNode}> = ({id, label, tooltip, required, children}) => (
    <div>
        <label htmlFor={id} className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label} {required ? <span className="text-red-500 ml-1">*</span> : '(Optional)'}
            <div className="group relative flex items-center ml-2">
                <span className="material-icons text-gray-400 dark:text-gray-500 text-base cursor-help">info_outline</span>
                <Tooltip text={tooltip} />
            </div>
        </label>
        {children}
    </div>
);


const AgentForm: React.FC<AgentFormProps> = ({ agentConfig, setAgentConfig, onGenerate, onReset, onLoadTemplate, isLoading }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAgentConfig(prev => ({ ...prev, [name]: value }));
  };

  const isGenerateDisabled = !agentConfig.role || !agentConfig.scope || isLoading;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onGenerate(); }} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-semibold text-center text-gray-800 dark:text-gray-200">Define Your Agent</h2>
            <button type="button" onClick={onLoadTemplate} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400 rounded-md text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/40 transition">
                <span className="material-icons mr-2 text-base">model_training</span>
                Load Template
            </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField id="role" label="Role" tooltip="A concise title for your agent, like 'Expert Financial Advisor' or 'Creative Storyteller'." required>
                 <input
                    type="text"
                    id="role"
                    name="role"
                    value={agentConfig.role}
                    onChange={handleChange}
                    placeholder="e.g., Expert Financial Advisor"
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20"
                />
            </FormField>
             <FormField id="scope" label="Scope" tooltip="The project or context where the agent operates, e.g., 'Personal investment tracking app'." required>
                 <input
                    type="text"
                    id="scope"
                    name="scope"
                    value={agentConfig.scope}
                    onChange={handleChange}
                    placeholder="e.g., Personal investment tracking app"
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20"
                />
            </FormField>
        </div>

        <FormField id="goals" label="Goals" tooltip="Key objectives for the agent, like 'Help users maximize returns, educate on market trends'." required={false}>
            <textarea
                id="goals"
                name="goals"
                rows={5}
                value={agentConfig.goals}
                onChange={handleChange}
                placeholder={"e.g.,\n- Analyze user spending patterns to find savings.\n- Provide weekly financial summaries.\n- Educate users on budgeting best practices."}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20"
            />
        </FormField>
        
        <FormField id="constraints" label="Constraints" tooltip="Specific limitations or rules, e.g., 'Do not give direct buy/sell advice, avoid speculative assets'." required={false}>
            <textarea
                id="constraints"
                name="constraints"
                rows={5}
                value={agentConfig.constraints}
                onChange={handleChange}
                placeholder={"e.g.,\n- Do not store any personally identifiable information.\n- Must provide disclaimers for financial advice.\n- The tone should always be encouraging and never judgmental."}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20"
            />
        </FormField>
      
        <div className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
            <button
              type="button"
              onClick={onReset}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition"
            >
              Reset
            </button>
            <button
                type="submit"
                disabled={isGenerateDisabled}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition"
            >
                {isLoading ? 'Architecting...' : 'Generate Prompt'}
            </button>
        </div>
    </form>
  );
};

export default AgentForm;
