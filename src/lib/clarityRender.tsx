import React from 'react';
import { ClarityEntry } from './clarity';

export const CLASS_COLOURS: Record<string, string> = {
  arc:     '#7dd3fc',
  void:    '#c4b5fd',
  stasis:  '#67e8f9',
  solar:   '#fdba74',
  strand:  '#6ee7b7',
  kinetic: '#cbd5e1',
  pvp:     '#f472b6',
  pve:     '#4ade80',
  primary: '#cbd5e1',
  special: '#86efac',
  heavy:   '#c4b5fd',
};

export function renderClarityDesc(entry: ClarityEntry): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const groups = entry.descriptions?.en ?? [];

  groups.forEach((group, gi) => {
    if (!group.linesContent?.length) {
      if (group.classNames?.includes('spacer')) {
        nodes.push(<br key={`spacer-${gi}`} />);
      }
      return;
    }

    if (gi > 0) nodes.push(<br key={`br-${gi}`} />);

    let pendingColour: string | null = null;

    group.linesContent.forEach((seg, si) => {
      const key = `${gi}-${si}`;

      if (seg.text && seg.classNames?.length) {
        const cls = seg.classNames[0];
        if (cls === 'link') {
          nodes.push(
            <span key={key} className="underline decoration-slate-500 text-slate-200">
              {seg.text}
            </span>
          );
        } else {
          const colour = CLASS_COLOURS[cls];
          nodes.push(colour
            ? <span key={key} style={{ color: colour }} className="font-semibold">{seg.text}</span>
            : <React.Fragment key={key}>{seg.text}</React.Fragment>
          );
        }
        pendingColour = null;

      } else if (seg.classNames?.length) {
        const cls = seg.classNames[0];
        pendingColour = CLASS_COLOURS[cls] ?? null;

      } else if (seg.text) {
        if (pendingColour) {
          nodes.push(
            <span key={key} style={{ color: pendingColour }} className="font-semibold">
              {seg.text}
            </span>
          );
          pendingColour = null;
        } else {
          nodes.push(<React.Fragment key={key}>{seg.text}</React.Fragment>);
        }
      }
    });
  });

  return nodes;
}
