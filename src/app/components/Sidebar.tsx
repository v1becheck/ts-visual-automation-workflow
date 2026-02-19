import { useEffect, useRef, useState } from "react";
import { useDnD } from "../contexts/DnDContext";
import { WORKFLOW_TEMPLATES } from "../lib/workflowTemplates";
import type { WorkflowTemplate } from "../lib/workflowTemplates";
import "./styles.css";

export type WorkflowListItem = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

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
  workflows?: WorkflowListItem[];
  currentWorkflowId?: string | null;
  onNewWorkflow?: () => void;
  onSelectWorkflow?: (id: string) => void;
  onRenameWorkflow?: (id: string, name: string) => void;
  onDeleteWorkflow?: (id: string) => void;
};

const Sidebar = ({
  onLoadTemplate,
  workflows = [],
  currentWorkflowId,
  onNewWorkflow,
  onSelectWorkflow,
  onRenameWorkflow,
  onDeleteWorkflow,
}: SidebarProps) => {
  const { setType } = useDnD();
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [workflowsOpen, setWorkflowsOpen] = useState(true);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingWorkflowId) editInputRef.current?.focus();
  }, [editingWorkflowId]);

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
        {(onNewWorkflow ?? onSelectWorkflow) && (
          <section className="sidebar-section sidebar-section--workflows">
            <button
              type="button"
              className="sidebar-section-title sidebar-section-title--clickable"
              onClick={() => setWorkflowsOpen((open) => !open)}
              aria-expanded={workflowsOpen}
              aria-controls="sidebar-workflows-list"
            >
              <span>Workflows</span>
              <span className="sidebar-section-title__chevron" aria-hidden>
                {workflowsOpen ? "▼" : "▶"}
              </span>
            </button>
            <div id="sidebar-workflows-list" hidden={!workflowsOpen}>
              {onNewWorkflow && (
                <button
                  type="button"
                  className="sidebar-workflow-btn sidebar-workflow-btn--new"
                  onClick={onNewWorkflow}
                >
                  + New workflow
                </button>
              )}
              <ul className="sidebar-workflow-list" role="list">
                {workflows.length === 0 && (
                  <li className="sidebar-workflow-list__empty">No workflows yet</li>
                )}
                {workflows.map((w) => (
                  <li key={w.id} className="sidebar-workflow-item">
                    {editingWorkflowId === w.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        className="sidebar-workflow-edit-input"
                        defaultValue={w.name}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const value = (e.target as HTMLInputElement).value.trim();
                            if (value) onRenameWorkflow?.(w.id, value);
                            setEditingWorkflowId(null);
                          }
                          if (e.key === "Escape") setEditingWorkflowId(null);
                        }}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value) onRenameWorkflow?.(w.id, value);
                          setEditingWorkflowId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Workflow name"
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`sidebar-workflow-btn ${currentWorkflowId === w.id ? "sidebar-workflow-btn--active" : ""}`}
                          onClick={() => onSelectWorkflow?.(w.id)}
                          title={w.name}
                        >
                          <span className="sidebar-workflow-btn__name">{w.name}</span>
                        </button>
                        {onRenameWorkflow && (
                          <button
                            type="button"
                            className="sidebar-workflow-rename"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingWorkflowId(w.id);
                            }}
                            title="Rename workflow"
                            aria-label={`Rename ${w.name}`}
                          >
                            ✎
                          </button>
                        )}
                        {onDeleteWorkflow && (
                          <button
                            type="button"
                            className="sidebar-workflow-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteWorkflow(w.id);
                            }}
                            title="Delete workflow"
                            aria-label={`Delete ${w.name}`}
                          >
                            ×
                          </button>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
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
