import { NextRequest } from "next/server";
import { dbConnect } from "@/app/lib/db";
import Automation from "@/app/models/Automation";
import { initialNodes, initialEdges } from "@/app/Constants";

/**
 * POST /api/automations – create a new workflow.
 * Body (optional): { name?, nodes?, edges? }
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await dbConnect())) {
      return Response.json(
        { error: "Database not configured. Set MONGODB_URI in .env." },
        { status: 503 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name : "Untitled workflow";
    const nodes = Array.isArray(body.nodes) ? body.nodes : initialNodes;
    const edges = Array.isArray(body.edges) ? body.edges : initialEdges;

    const doc = await Automation.create({ name, nodes, edges });
    return Response.json({
      id: doc._id.toString(),
      name: doc.name,
      nodes: doc.nodes,
      edges: doc.edges,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error("POST /api/automations", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to create workflow" },
      { status: 500 }
    );
  }
}
