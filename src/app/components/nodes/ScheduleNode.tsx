import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

type ScheduleNodeType = Node<{ label: string }, "schedule">;

const ScheduleNode = ({ data, selected }: NodeProps<ScheduleNodeType>) => {
  return (
    <div className={`schedule-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>{data.label}</strong>
      </div>
      <div className="node-subtitle">Schedule</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(ScheduleNode);
