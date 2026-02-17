import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

type MergeNodeType = Node<{ label: string }, "merge">;

const MergeNode = ({ data, selected }: NodeProps<MergeNodeType>) => {
  return (
    <div className={`merge-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>{data.label}</strong>
      </div>
      <div className="node-subtitle">Merge</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(MergeNode);
