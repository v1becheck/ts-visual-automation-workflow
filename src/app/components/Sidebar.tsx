import { useState } from "react";
import { useDnD } from "../contexts/DnDContext";
import { WORKFLOW_TEMPLATES } from "../lib/workflowTemplates";
import type { WorkflowTemplate } from "../lib/workflowTemplates";
import "./styles.css";

type NodeType =
  | "input"
  | "schedule"
  | "output"
  | "webhook"
  | "email"
  | "http"
  | "slack"
  | "delay"
  | "condition"
  | "set"
  | "merge"
  | "code"
  | "default";

const SIDEBAR_SECTIONS: { label: string; nodes: { type: NodeType; label: string }[] }[] = [
  {
    label: "Triggers",
    nodes: [
      { type: "input", label: "Input" },
      { type: "schedule", label: "Schedule" },
      { type: "webhook", label: "Webhook" },
    ],
  },
  {
    label: "Actions",
    nodes: [
      { type: "output", label: "Output" },
      { type: "email", label: "Email" },
      { type: "http", label: "HTTP Request" },
      { type: "slack", label: "Slack" },
    ],
  },
  {
    label: "Logic & data",
    nodes: [
      { type: "delay", label: "Delay" },
      { type: "condition", label: "Condition" },
      { type: "set", label: "Set" },
      { type: "merge", label: "Merge" },
    ],
  },
  {
    label: "Other",
    nodes: [
      { type: "code", label: "Code" },
      { type: "default", label: "Default" },
    ],
  },
];

type SidebarProps = {
  onLoadTemplate?: (template: WorkflowTemplate) => void;
};

const Sidebar = ({ onLoadTemplate }: SidebarProps) => {
  const { setType } = useDnD();
  const [templatesOpen, setTemplatesOpen] = useState(true);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h2 className="sidebar-title">Nodes</h2>
        <p className="sidebar-subtitle">Drag onto canvas</p>
      </header>
      <div className="sidebar-content">
        {onLoadTemplate && (
          <section
            className={`sidebar-section sidebar-section--templates ${templatesOpen ? "sidebar-section--templates-open" : "sidebar-section--templates-closed"}`}
          >
            <button
              type="button"
              className="sidebar-section-title sidebar-section-title--clickable"
              onClick={() => setTemplatesOpen((open) => !open)}
              aria-expanded={templatesOpen}
              aria-controls="sidebar-templates-list"
            >
              <span>Templates</span>
              <span className="sidebar-section-title__chevron" aria-hidden>
                {templatesOpen ? "▼" : "▶"}
              </span>
            </button>
            <ul
              id="sidebar-templates-list"
              className="sidebar-template-list"
              role="list"
              hidden={!templatesOpen}
            >
              {WORKFLOW_TEMPLATES.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    className="sidebar-template-btn"
                    onClick={() => onLoadTemplate(template)}
                    title={template.description}
                  >
                    <span className="sidebar-template-btn__name">{template.name}</span>
                    <span className="sidebar-template-btn__desc">{template.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {SIDEBAR_SECTIONS.map((section) => (
          <section key={section.label} className="sidebar-section">
            <h3 className="sidebar-section-title">{section.label}</h3>
            <ul className="sidebar-node-list" role="list">
              {section.nodes.map(({ type, label }) => (
                <li key={type}>
                  <div
                    className={`dndnode ${type}`}
                    onDragStart={(e) => onDragStart(e, type)}
                    draggable
                  >
                    {label}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
