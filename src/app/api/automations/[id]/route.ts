import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/app/lib/db";
import Automation from "@/app/models/Automation";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/automations/:id – retrieve one workflow.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const id = await context.params.then((p) => p.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid workflow id" }, { status: 400 });
    }
    if (!(await dbConnect())) {
      return Response.json(
        { error: "Database not configured. Set MONGODB_URI in .env." },
        { status: 503 }
      );
    }
    const doc = await Automation.findById(id).lean();
    if (!doc) {
      return Response.json({ error: "Workflow not found" }, { status: 404 });
    }
    return Response.json({
      id: doc._id.toString(),
      name: doc.name,
      nodes: doc.nodes,
      edges: doc.edges,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error("GET /api/automations/[id]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to get workflow" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/automations/:id – update workflow (nodes, edges, optional name).
 * Body: { name?, nodes?, edges? }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const id = await context.params.then((p) => p.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid workflow id" }, { status: 400 });
    }
    if (!(await dbConnect())) {
      return Response.json(
        { error: "Database not configured. Set MONGODB_URI in .env." },
        { status: 503 }
      );
    }
    const body = await request.json().catch(() => ({}));
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
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error("PUT /api/automations/[id]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to update workflow" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/automations/:id – delete a workflow.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const id = await context.params.then((p) => p.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid workflow id" }, { status: 400 });
    }
    if (!(await dbConnect())) {
      return Response.json(
        { error: "Database not configured. Set MONGODB_URI in .env." },
        { status: 503 }
      );
    }
    const doc = await Automation.findByIdAndDelete(id);
    if (!doc) {
      return Response.json({ error: "Workflow not found" }, { status: 404 });
    }
    return Response.json({ deleted: true, id });
  } catch (err) {
    console.error("DELETE /api/automations/[id]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
