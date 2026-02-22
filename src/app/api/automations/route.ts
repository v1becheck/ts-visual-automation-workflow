import { NextRequest } from "next/server";
import { dbConnect } from "@/app/lib/db";
import Automation from "@/app/models/Automation";
import { initialNodes, initialEdges } from "@/app/Constants";

/**
 * GET /api/automations – list all workflows (id, name, createdAt, updatedAt).
 */
export async function GET() {
  try {
    if (!(await dbConnect())) {
      return Response.json([]);
    }
    const docs = await Automation.find({})
      .sort({ createdAt: -1 })
      .select("_id name createdAt updatedAt")
      .lean();
    return Response.json(
      docs.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
    );
  } catch (err) {
    console.error("GET /api/automations", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to list workflows" },
      { status: 500 }
    );
  }
}

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
