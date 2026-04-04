
import React from 'react';
import { ProjectConfig } from '../types';

interface ProjectFormProps {
  projectConfig: ProjectConfig;
  setProjectConfig: React.Dispatch<React.SetStateAction<ProjectConfig>>;
  onGenerate: () => void;
  onReset: () => void;
  isLoading: boolean;
}

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
    {text}
  </span>
);

const FormField: React.FC<{id: string, label: string, tooltip: string, required: boolean, children: React.ReactNode}> = ({id, label, tooltip, required, children}) => (
    <div className="mb-4">
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

const Fieldset: React.FC<{legend: string, children: React.ReactNode}> = ({legend, children}) => (
    <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 pt-2">
        <legend className="text-lg font-semibold px-2 text-gray-800 dark:text-gray-200">{legend}</legend>
        {children}
    </fieldset>
);


const ProjectForm: React.FC<ProjectFormProps> = ({ projectConfig, setProjectConfig, onGenerate, onReset, isLoading }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProjectConfig(prev => ({ ...prev, [name]: value }));
  };

  const isGenerateDisabled = !projectConfig.title || !projectConfig.goal || isLoading;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onGenerate(); }} className="space-y-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-200">Architect a New Project</h2>
        
        <Fieldset legend="Core Concepts">
            <FormField id="title" label="Name / Title" tooltip="A clear, concise name for your project." required>
                 <input
                    type="text"
                    id="title"
                    name="title"
                    value={projectConfig.title}
                    onChange={handleChange}
                    placeholder="e.g., Automated Content Generation Pipeline"
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20"
                />
            </FormField>
             <FormField id="goal" label="Project Goal" tooltip="The primary, measurable objective of this project." required>
                 <input
                    type="text"
                    id="goal"
                    name="goal"
                    value={projectConfig.goal}
                    onChange={handleChange}
                    placeholder="e.g., To increase blog post output by 300% within Q3"
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20"
                />
            </FormField>
            <FormField id="idea" label="Project Idea" tooltip="A high-level summary of the project concept.">
                <textarea rows={2} id="idea" name="idea" value={projectConfig.idea} onChange={handleChange} placeholder="Describe the core idea in a sentence or two." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
            <FormField id="vision" label="Project Vision" tooltip="The long-term aspiration or impact of the project.">
                <textarea rows={2} id="vision" name="vision" value={projectConfig.vision} onChange={handleChange} placeholder="What is the ultimate future state this project enables?" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
        </Fieldset>

        <Fieldset legend="Operational Rules">
            <FormField id="rules" label="Project Rules" tooltip="Core principles or commandments that must be followed.">
                <textarea rows={3} id="rules" name="rules" value={projectConfig.rules} onChange={handleChange} placeholder="e.g., 1. All code must be reviewed. 2. User privacy is paramount." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
            <FormField id="constraints" label="Project Constraints" tooltip="Specific limitations (e.g., budget, technology, timeline).">
                <textarea rows={3} id="constraints" name="constraints" value={projectConfig.constraints} onChange={handleChange} placeholder="e.g., Must use the existing Python backend. Cannot access external APIs without approval." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
            <FormField id="guidelines" label="Guidelines & Guardrails" tooltip="Best practices and safety measures to keep the project on track.">
                <textarea rows={3} id="guidelines" name="guidelines" value={projectConfig.guidelines} onChange={handleChange} placeholder="e.g., AI-generated content should be clearly marked. Avoid generating content on sensitive topics." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
        </Fieldset>

        <Fieldset legend="Team & Standards">
             <FormField id="roles" label="Project Developer Roles" tooltip="Define the key roles and their primary responsibilities.">
                <textarea rows={3} id="roles" name="roles" value={projectConfig.roles} onChange={handleChange} placeholder="e.g., Lead AI Engineer: Manages model integration. Frontend Dev: Builds UI components." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
             <FormField id="standards" label="Project Standards" tooltip="Technical standards for code, documentation, and testing.">
                <textarea rows={3} id="standards" name="standards" value={projectConfig.standards} onChange={handleChange} placeholder="e.g., All functions must have docstrings. Unit test coverage must be > 80%." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
             <FormField id="consistency" label="Project Consistency" tooltip="Rules for maintaining consistency in UI, API design, etc.">
                <textarea rows={3} id="consistency" name="consistency" value={projectConfig.consistency} onChange={handleChange} placeholder="e.g., All API endpoints must be versioned. UI components must adhere to the design system." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
        </Fieldset>
      
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
                {isLoading ? 'Generating...' : 'Generate Blueprint'}
            </button>
        </div>
    </form>
  );
};

export default ProjectForm;
