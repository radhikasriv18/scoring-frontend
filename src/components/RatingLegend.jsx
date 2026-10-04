import { getScaleValues } from '../utils';

export default function RatingLegend({ rubric }) {
  return (
    <div style={{ fontSize: 'calc(13px * var(--font-scale, 1))', color: '#444', marginBottom: 12 }}>
      {getScaleValues(rubric)
        .map((v) => `${v} = ${rubric.scaleLabels[v] || v}`)
        .join('   |   ')}
    </div>
  );
}