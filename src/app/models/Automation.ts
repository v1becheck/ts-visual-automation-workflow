import mongoose, { Schema, model, models } from "mongoose";

/**
 * Stored workflow: nodes and edges match React Flow types (Node[], Edge[]).
 * Stored as flexible JSON for forward compatibility with React Flow schema changes.
 */
const AutomationSchema = new Schema(
  {
    name: { type: String, default: "Untitled workflow" },
    nodes: { type: [Schema.Types.Mixed], default: [] },
    edges: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

export default models.Automation ?? model("Automation", AutomationSchema);
