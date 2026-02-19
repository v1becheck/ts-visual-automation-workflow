import type { Node, Edge } from "@xyflow/react";

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
};

/**
 * Templates use placeholder node ids (n1, n2, ...). They are replaced with
 * unique ids when loading so multiple loads don't collide.
 */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "empty",
    name: "Empty",
    description: "Start from scratch with an empty canvas",
    nodes: [],
    edges: [],
  },
  {
    id: "webhook-to-slack",
    name: "Webhook → Slack",
    description: "Trigger from a webhook and post to Slack",
    nodes: [
      { id: "n1", type: "webhook", position: { x: 100, y: 120 }, data: { label: "Incoming webhook" } },
      { id: "n2", type: "slack", position: { x: 380, y: 120 }, data: { label: "Post to Slack" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "schedule-email",
    name: "Schedule → Email",
    description: "Run on a schedule and send an email",
    nodes: [
      { id: "n1", type: "schedule", position: { x: 100, y: 100 }, data: { label: "Every day at 9am" } },
      { id: "n2", type: "email", position: { x: 380, y: 100 }, data: { label: "Send digest" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "conditional",
    name: "Trigger → Condition → Action",
    description: "Trigger, condition check, then send email",
    nodes: [
      { id: "n1", type: "input", position: { x: 100, y: 120 }, data: { label: "Trigger" } },
      { id: "n2", type: "condition", position: { x: 320, y: 120 }, data: { label: "Check condition" } },
      { id: "n3", type: "email", position: { x: 540, y: 120 }, data: { label: "Send email" } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
    ],
  },
  {
    id: "http-delay-retry",
    name: "HTTP → Delay → HTTP",
    description: "Call API, wait, then call again (e.g. retry flow)",
    nodes: [
      { id: "n1", type: "http", position: { x: 80, y: 120 }, data: { label: "Fetch data" } },
      { id: "n2", type: "delay", position: { x: 300, y: 120 }, data: { label: "Wait 5 min" } },
      { id: "n3", type: "http", position: { x: 520, y: 120 }, data: { label: "Retry request" } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
    ],
  },
  {
    id: "dual-trigger-pipeline",
    name: "Dual-trigger pipeline",
    description: "Schedule + Webhook → Merge → Condition → Email → Output",
    nodes: [
      { id: "n1", type: "schedule", position: { x: 80, y: 80 }, data: { label: "Daily 9am" } },
      { id: "n2", type: "webhook", position: { x: 80, y: 220 }, data: { label: "Incoming webhook" } },
      { id: "n3", type: "http", position: { x: 280, y: 80 }, data: { label: "Fetch from API" } },
      { id: "n4", type: "set", position: { x: 280, y: 220 }, data: { label: "Map payload" } },
      { id: "n5", type: "merge", position: { x: 480, y: 150 }, data: { label: "Combine inputs" } },
      { id: "n6", type: "condition", position: { x: 680, y: 150 }, data: { label: "Should notify?" } },
      { id: "n7", type: "email", position: { x: 880, y: 150 }, data: { label: "Send email" } },
      { id: "n8", type: "slack", position: { x: 1080, y: 150 }, data: { label: "Post to Slack" } },
      { id: "n9", type: "output", position: { x: 1280, y: 150 }, data: { label: "Done" } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n3" },
      { id: "e2", source: "n2", target: "n4" },
      { id: "e3", source: "n3", target: "n5" },
      { id: "e4", source: "n4", target: "n5" },
      { id: "e5", source: "n5", target: "n6" },
      { id: "e6", source: "n6", target: "n7" },
      { id: "e7", source: "n7", target: "n8" },
      { id: "e8", source: "n8", target: "n9" },
    ],
  },
];

let templateLoadCounter = 0;

/**
 * Return a copy of the template's nodes and edges with new unique ids
 * so loading a template doesn't collide with existing or repeated loads.
 */
export function instantiateTemplate(template: WorkflowTemplate): {
  nodes: Node[];
  edges: Edge[];
} {
  const prefix = `tpl_${++templateLoadCounter}_`;
  const idMap = new Map<string, string>();

  const nodes: Node[] = template.nodes.map((n) => {
    const newId = `${prefix}${n.id}`;
    idMap.set(n.id, newId);
    return {
      ...n,
      id: newId,
      data: { ...n.data },
    };
  });

  const edges: Edge[] = template.edges.map((e, i) => ({
    ...e,
    id: `${prefix}e${i}`,
    source: idMap.get(e.source) ?? e.source,
    target: idMap.get(e.target) ?? e.target,
  }));

  return { nodes, edges };
}
