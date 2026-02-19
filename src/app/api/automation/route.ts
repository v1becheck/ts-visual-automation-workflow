import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect, isDbConfigured } from "@/app/lib/db";
import Automation from "@/app/models/Automation";
import { initialNodes, initialEdges } from "@/app/Constants";

/**
 * GET /api/automation – return the first workflow or create one (for backward compat / default view).
 * Query: ?id=... to load a specific workflow by id.
 * When MONGODB_URI is not set, returns default in-memory workflow (no persistence).
 */
export async function GET(request: NextRequest) {
  try {
    if (!isDbConfigured()) {
      return Response.json({
        id: null,
        name: "Untitled workflow",
        nodes: initialNodes,
        edges: initialEdges,
      });
    }
    const conn = await dbConnect();
    if (!conn) {
      return Response.json({
        id: null,
        name: "Untitled workflow",
        nodes: initialNodes,
        edges: initialEdges,
      });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id && mongoose.Types.ObjectId.isValid(id)) {
      const doc = await Automation.findById(id).lean();
      if (!doc) {
        return Response.json({ error: "Workflow not found" }, { status: 404 });
      }
      return Response.json({
        id: doc._id.toString(),
        name: doc.name,
        nodes: doc.nodes,
        edges: doc.edges,
      });
    }

    const first = await Automation.findOne().sort({ createdAt: 1 }).lean();
    if (first) {
      return Response.json({
        id: first._id.toString(),
        name: first.name,
        nodes: first.nodes,
        edges: first.edges,
      });
    }

    const created = await Automation.create({ nodes: initialNodes, edges: initialEdges });
    return Response.json({
      id: created._id.toString(),
      name: created.name,
      nodes: created.nodes,
      edges: created.edges,
    });
  } catch (err) {
    console.error("GET /api/automation", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load workflow" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/automation – update the current workflow (body must include id).
 * Body: { id: string, nodes?, edges?, name? }
 */
export async function PUT(request: NextRequest) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { error: "Database not configured. Set MONGODB_URI in .env for persistence." },
        { status: 503 }
      );
    }
    const conn = await dbConnect();
    if (!conn) {
      return Response.json(
        { error: "Database connection failed." },
        { status: 503 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const id = body.id;
    if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Missing or invalid workflow id" }, { status: 400 });
    }
    const update: { name?: string; nodes?: unknown[]; edges?: unknown[] } = {};
    if (typeof body.name === "string") update.name = body.name;
    if (Array.isArray(body.nodes)) update.nodes = body.nodes;
    if (Array.isArray(body.edges)) update.edges = body.edges;

    const doc = await Automation.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) {
      return Response.json({ error: "Workflow not found" }, { status: 404 });
    }
    return Response.json({
      id: doc._id.toString(),
      name: doc.name,
      nodes: doc.nodes,
      edges: doc.edges,
    });
  } catch (err) {
    console.error("PUT /api/automation", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to update workflow" },
      { status: 500 }
    );
  }
}
