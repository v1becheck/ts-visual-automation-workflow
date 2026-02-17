import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

type WebhookNodeType = Node<{ label: string }, "webhook">;

const WebhookNode = ({ data, selected }: NodeProps<WebhookNodeType>) => {
  return (
    <div className={`webhook-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>{data.label}</strong>
      </div>
      <div className="node-subtitle">Webhook</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(WebhookNode);
