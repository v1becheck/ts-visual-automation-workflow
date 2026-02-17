import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

type CodeNodeType = Node<{ label: string }, "code">;

const CodeNode = ({ data, selected }: NodeProps<CodeNodeType>) => {
  return (
    <div className={`code-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>{data.label}</strong>
      </div>
      <div className="node-subtitle">Code</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(CodeNode);
