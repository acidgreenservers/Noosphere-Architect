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
            {label} {required ? <span className="text-red-500 ml-1">*</span> : ''}
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
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Define Project Blueprint</h3>
        
        <Fieldset legend="Core Identity">
            <FormField id="title" label="Project Name / Title" tooltip="A clear, concise name for your project. This becomes the title of PROJECT.md." required={true}>
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
             <FormField id="goal" label="Project Goal" tooltip="The primary, measurable objective of this project." required={true}>
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
            <FormField id="idea" label="Project Idea" tooltip="A high-level summary of the project concept." required={false}>
                <textarea rows={2} id="idea" name="idea" value={projectConfig.idea} onChange={handleChange} placeholder="Describe the core idea in a sentence or two." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
            <FormField id="vision" label="Project Vision" tooltip="The long-term aspiration or impact of the project." required={false}>
                <textarea rows={2} id="vision" name="vision" value={projectConfig.vision} onChange={handleChange} placeholder="What is the ultimate future state this project enables?" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
            <FormField id="targetAudience" label="Target Audience" tooltip="Who the project serves — primary users, stakeholders, or consumers." required={false}>
                <textarea rows={2} id="targetAudience" name="targetAudience" value={projectConfig.targetAudience} onChange={handleChange} placeholder="e.g., Frontend developers building data-intensive dashboards" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
        </Fieldset>

        <Fieldset legend="Technical Foundation">
            <FormField id="techStack" label="Tech Stack & Framework" tooltip="Languages, frameworks, infrastructure choices, and key libraries." required={false}>
                <textarea rows={3} id="techStack" name="techStack" value={projectConfig.techStack} onChange={handleChange} placeholder="e.g., Python 3.12, FastAPI, PostgreSQL 16, React 19, Docker, GitHub Actions" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
            <FormField id="architecture" label="Architecture" tooltip="High-level structural approach — patterns, deployment model, system organization." required={false}>
                <textarea rows={3} id="architecture" name="architecture" value={projectConfig.architecture} onChange={handleChange} placeholder="e.g., Microservices with event-driven communication. Deployed via Kubernetes. API-first design." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
            <FormField id="guidingPrinciples" label="Guiding Principles" tooltip="Values and philosophy that shape decision-making across the project." required={false}>
                <textarea rows={3} id="guidingPrinciples" name="guidingPrinciples" value={projectConfig.guidingPrinciples} onChange={handleChange} placeholder="e.g., Simplicity over complexity. Data at rest must be encrypted. Prefer boring technology." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
        </Fieldset>

        <Fieldset legend="Security & Accessibility">
            <FormField id="securityPosition" label="Security Position" tooltip="Security principles, threat model scope, compliance requirements, and data handling stance." required={false}>
                <textarea rows={3} id="securityPosition" name="securityPosition" value={projectConfig.securityPosition} onChange={handleChange} placeholder="e.g., SOC 2 compliance required. All secrets managed via vault. Input sanitization mandatory." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
            <FormField id="accessibilityPosition" label="Accessibility Position" tooltip="Inclusive design stance and accessibility targets." required={false}>
                <textarea rows={3} id="accessibilityPosition" name="accessibilityPosition" value={projectConfig.accessibilityPosition} onChange={handleChange} placeholder="e.g., WCAG 2.2 AA compliance. Screen reader support. Color contrast ratios must meet standards." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
        </Fieldset>

        <Fieldset legend="Constraints & Success">
            <FormField id="keyConstraints" label="Key Constraints" tooltip="Boundaries, limitations, and non-negotiables the project must respect." required={false}>
                <textarea rows={3} id="keyConstraints" name="keyConstraints" value={projectConfig.keyConstraints} onChange={handleChange} placeholder="e.g., Must run on existing infrastructure. Cannot exceed $500/mo in operational costs." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
            </FormField>
            <FormField id="successCriteria" label="Success Criteria" tooltip="How you know the project is working — measurable outcomes." required={false}>
                <textarea rows={3} id="successCriteria" name="successCriteria" value={projectConfig.successCriteria} onChange={handleChange} placeholder="e.g., 99.9% uptime in first quarter. All critical paths covered by tests. < 200ms P95 response time." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:ring-2 hover:ring-blue-500/20" />
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