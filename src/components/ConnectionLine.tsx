import { getSmoothStepPath } from '@xyflow/react';
import type { ConnectionLineComponent } from '@xyflow/react';

const ConnectionLine: ConnectionLineComponent = ({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}) => {
  const [edgePath] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  return (
    <g>
      <path
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="5,5"
        d={edgePath}
        className="animate-pulse"
      />
      <circle
        cx={toX}
        cy={toY}
        fill="#3b82f6"
        r={3}
        stroke="#ffffff"
        strokeWidth={2}
      />
    </g>
  );
};

export default ConnectionLine;