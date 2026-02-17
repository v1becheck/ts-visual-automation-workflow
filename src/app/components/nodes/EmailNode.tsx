import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

type EmailNode = Node<{ label: string }, "string">;

const EmailNode = ({ data, selected }: NodeProps<EmailNode>) => {
  return (
    <div className={`email-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>{data.label}</strong>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(EmailNode);
