import React from 'react';
import { ProjectConfig } from '../types';

interface ProjectFormProps {
  projectConfig: ProjectConfig;
  setProjectConfig: React.Dispatch<React.SetStateAction<ProjectConfig>>;
  onGenerate: () => void;
  onReset: () => void;
  isLoading: boolean;
  // File upload props
  fileContext?: { name: string; content: string };
  isDragging?: boolean;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs p-3 bg-slate-900 text-white text-[11px] font-semibold rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none leading-relaxed">
    {text}
  </span>
);

const FormField: React.FC<{id: string, label: string, tooltip: string, required: boolean, children: React.ReactNode}> = ({id, label, tooltip, required, children}) => (
    <div className="mb-4">
        <label htmlFor={id} className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            {label} {required ? <span className="text-red-500 ml-1">*</span> : ''}
            <div className="group relative flex items-center ml-2">
                <span className="material-icons text-slate-400 dark:text-slate-500 text-sm cursor-help">info_outline</span>
                <Tooltip text={tooltip} />
            </div>
        </label>
        {children}
    </div>
);

const Fieldset: React.FC<{legend: string, children: React.ReactNode}> = ({legend, children}) => (
    <fieldset className="border border-slate-200/60 dark:border-slate-800/50 rounded-2xl p-6 pt-4 mb-6">
        <legend className="text-sm font-bold uppercase tracking-widest px-3 text-slate-400 dark:text-slate-500">{legend}</legend>
        {children}
    </fieldset>
);


const ProjectForm: React.FC<ProjectFormProps> = ({ projectConfig, setProjectConfig, onGenerate, onReset, isLoading, fileContext, isDragging, onFileChange, onRemoveFile, onDragOver, onDragLeave, onDrop }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProjectConfig(prev => ({ ...prev, [name]: value }));
  };

  const isGenerateDisabled = !projectConfig.title || !projectConfig.goal || isLoading;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onGenerate(); }} className="space-y-8 animate-fade-in">
        <div className="border-b border-slate-200/60 dark:border-slate-800/50 pb-4 mb-6">
          <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Define Project Blueprint</h3>
        </div>
        
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
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition"
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
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition"
                />
            </FormField>
            <FormField id="idea" label="Project Idea" tooltip="A high-level summary of the project concept." required={false}>
                <textarea rows={2} id="idea" name="idea" value={projectConfig.idea} onChange={handleChange} placeholder="Describe the core idea in a sentence or two." className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar" />
            </FormField>
            <FormField id="vision" label="Project Vision" tooltip="The long-term aspiration or impact of the project." required={false}>
                <textarea rows={2} id="vision" name="vision" value={projectConfig.vision} onChange={handleChange} placeholder="What is the ultimate future state this project enables?" className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar" />
            </FormField>
            <FormField id="targetAudience" label="Target Audience" tooltip="Who the project serves — primary users, stakeholders, or consumers." required={false}>
                <textarea rows={2} id="targetAudience" name="targetAudience" value={projectConfig.targetAudience} onChange={handleChange} placeholder="e.g., Frontend developers building data-intensive dashboards" className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar" />
            </FormField>
        </Fieldset>

        <Fieldset legend="Technical Foundation">
            <FormField id="techStack" label="Tech Stack & Framework" tooltip="Languages, frameworks, infrastructure choices, and key libraries." required={false}>
                <textarea rows={3} id="techStack" name="techStack" value={projectConfig.techStack} onChange={handleChange} placeholder="e.g., Python 3.12, FastAPI, PostgreSQL 16, React 19, Docker, GitHub Actions" className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar" />
            </FormField>
            <FormField id="architecture" label="Architecture" tooltip="High-level structural approach — patterns, deployment model, system organization." required={false}>
                <textarea rows={3} id="architecture" name="architecture" value={projectConfig.architecture} onChange={handleChange} placeholder="e.g., Microservices with event-driven communication. Deployed via Kubernetes. API-first design." className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar" />
            </FormField>
            <FormField id="guidingPrinciples" label="Guiding Principles" tooltip="Values and philosophy that shape decision-making across the project." required={false}>
                <textarea rows={3} id="guidingPrinciples" name="guidingPrinciples" value={projectConfig.guidingPrinciples} onChange={handleChange} placeholder="e.g., Simplicity over complexity. Data at rest must be encrypted. Prefer boring technology." className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar" />
            </FormField>
        </Fieldset>

        <Fieldset legend="Security & Accessibility">
            <FormField id="securityPosition" label="Security Position" tooltip="Security principles, threat model scope, compliance requirements, and data handling stance." required={false}>
                <textarea rows={3} id="securityPosition" name="securityPosition" value={projectConfig.securityPosition} onChange={handleChange} placeholder="e.g., SOC 2 compliance required. All secrets managed via vault. Input sanitization mandatory." className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar" />
            </FormField>
            <FormField id="accessibilityPosition" label="Accessibility Position" tooltip="Inclusive design stance and accessibility targets." required={false}>
                <textarea rows={3} id="accessibilityPosition" name="accessibilityPosition" value={projectConfig.accessibilityPosition} onChange={handleChange} placeholder="e.g., WCAG 2.2 AA compliance. Screen reader support. Color contrast ratios must meet standards." className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar" />
            </FormField>
        </Fieldset>

        <Fieldset legend="Constraints & Success">
            <FormField id="keyConstraints" label="Key Constraints" tooltip="Boundaries, limitations, and non-negotiables the project must respect." required={false}>
                <textarea rows={3} id="keyConstraints" name="keyConstraints" value={projectConfig.keyConstraints} onChange={handleChange} placeholder="e.g., Must run on existing infrastructure. Cannot exceed $500/mo in operational costs." className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar" />
            </FormField>
            <FormField id="successCriteria" label="Success Criteria" tooltip="How you know the project is working — measurable outcomes." required={false}>
                <textarea rows={3} id="successCriteria" name="successCriteria" value={projectConfig.successCriteria} onChange={handleChange} placeholder="e.g., 99.9% uptime in first quarter. All critical paths covered by tests. < 200ms P95 response time." className="w-full px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none transition custom-scrollbar" />
            </FormField>
        </Fieldset>
      
        <Fieldset legend="Anchor File Context">
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-1">
              Optionally upload a file for the AI to read and synthesize information from alongside your form inputs.
            </p>
            {!fileContext ? (
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/5 scale-[0.98]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
                onClick={() => document.getElementById('projectFileInput')?.click()}
              >
                <input
                  type="file"
                  id="projectFileInput"
                  className="hidden"
                  onChange={onFileChange}
                  accept=".txt,.md,.json,.js,.ts,.tsx,.html,.css"
                />
                <span className={`material-icons text-4xl mb-2 transition-colors ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}>upload_file</span>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Drop a reference specification context file here
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Or click to browse files
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 leading-relaxed">
                  Supports specification spec files (.txt, .md, and code formats).
                </p>
              </div>
            ) : (
              <div className="flex flex-col bg-blue-500/5 border border-blue-500/10 rounded-2xl overflow-hidden">
                <div className="p-3.5 border-b border-blue-500/10 flex items-center justify-between">
                  <div className="flex items-center overflow-hidden mr-2">
                    <span className="material-icons text-blue-500 text-sm mr-2.5">description</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate">
                      {fileContext.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onRemoveFile}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition cursor-pointer"
                    title="Remove file"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </div>
                <div className="p-5 max-h-32 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
                  <div className="text-[10px] font-mono text-slate-500/80 whitespace-pre-wrap leading-relaxed">
                    {fileContext.content}
                  </div>
                </div>
                <div className="p-3 bg-blue-500/5 text-center border-t border-blue-500/5">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Attached as Grounding spec Context
                  </span>
                </div>
              </div>
            )}
          </div>
        </Fieldset>
      
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/50">
            <button
              type="button"
              onClick={onReset}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer"
            >
              Reset
            </button>
            <button
                type="submit"
                disabled={isGenerateDisabled}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
                {isLoading ? 'Generating...' : 'Generate Blueprint'}
            </button>
        </div>
    </form>
  );
};

export default ProjectForm;