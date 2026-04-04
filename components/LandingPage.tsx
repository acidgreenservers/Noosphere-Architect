
import React from 'react';
import { View } from '../App';

interface LandingPageProps {
  onSelectView: (view: View) => void;
}

const InfoCard: React.FC<{icon: string, title: string, children: React.ReactNode}> = ({icon, title, children}) => (
    <div className="bg-white dark:bg-gray-800/50 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
            <span className="material-icons text-3xl text-blue-500 dark:text-blue-400 mr-4">{icon}</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400">{children}</p>
    </div>
);

const ToolCard: React.FC<{icon: string, title: string, description: string, onClick: () => void}> = ({icon, title, description, onClick}) => (
    <button 
        onClick={onClick} 
        className="group bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1.5 border border-gray-200 dark:border-gray-700/50 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 text-left w-full flex flex-col focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
        aria-label={`Select ${title} tool`}
    >
        <div className="flex-grow">
            <div className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 rounded-full w-16 h-16 mb-6">
                <span className="material-icons text-3xl text-blue-600 dark:text-blue-400">{icon}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{description}</p>
        </div>
        <div className="mt-8 text-blue-600 dark:text-blue-400 font-semibold flex items-center">
            Launch Tool
            <span className="material-icons ml-2 transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </div>
    </button>
);

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
    return (
        <div className="max-w-5xl mx-auto">
            <section className="text-center py-20">
                <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight sm:text-5xl md:text-6xl">
                    Architecting Intelligence
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-400">
                    Your central hub for transforming raw ideas into powerful, structured prompts and AI agent blueprints.
                </p>
            </section>

            <section className="my-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <InfoCard icon="memory" title="What is Noosphere-Architect?">
                        It's a suite of tools designed to streamline the creation of high-quality instructions for AI. Build, refine, and save your prompting frameworks for any task or model.
                    </InfoCard>
                    <InfoCard icon="checklist" title="Why Structured Prompts?">
                        Well-structured prompts lead to more accurate, consistent, and predictable results from AI models, saving you time and improving the quality of your outputs.
                    </InfoCard>
                    <InfoCard icon="biotech" title="How To Use">
                        Select a tool below, input your core ideas, and let our AI assistant generate a structured blueprint. Save your work directly in the browser for future use.
                    </InfoCard>
                </div>
            </section>
            
            <section className="my-24">
                <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">Our Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                     <ToolCard 
                        icon="architecture"
                        title="Project Architect" 
                        description="Establish a high-level vision, standards, and rules to ensure all project components are consistent and aligned."
                        onClick={() => onSelectView('projectArchitect')}
                    />
                    <ToolCard 
                        icon="group_work" 
                        title="AI Agent Architect" 
                        description="Define an AI agent's role, scope, and goals to generate foundational project documents and guardrails."
                        onClick={() => onSelectView('agentArchitect')}
                    />
                    <ToolCard 
                        icon="psychology" 
                        title="Prompt Architect" 
                        description="Transform your raw ideas into powerful, well-structured prompts that you can use with any AI model."
                        onClick={() => onSelectView('promptArchitect')}
                    />
                    <ToolCard 
                        icon="settings_input_component" 
                        title="Agent API Settings" 
                        description="Configure your OpenRouter API key to unlock advanced AI features across all architect tools."
                        onClick={() => onSelectView('agentApiSettings')}
                    />
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
