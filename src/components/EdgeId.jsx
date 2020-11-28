import React from 'react';
import { unnamespace } from '../collections';

function nodeLabel(node) {
  return unnamespace(node).split('_')[0];
}

function EdgeId({ row }) {
  let subgraph;
  let src;
  let connection;
  let tgt;
  if (row.subgraph) {
    subgraph = <span className="subgraph">{row.subgraph.map((s) => nodeLabel(s)).join(' / ')}</span>;
  }
  if (row.src) {
    src = (
      <span className="source">
        <span className="node-id">{nodeLabel(row.src.node)}</span>
      </span>
    );
  }
  if (row.tgt) {
    tgt = (
      <span className="target">
        <span className="node-id">{nodeLabel(row.tgt.node)}</span>
      </span>
    );
  }
  let routeClass = 'connection';
  if (row.edge && row.edge.metadata && typeof row.edge.metadata.route !== 'undefined') {
    routeClass = `connection route${row.edge.metadata.route}`;
  }
  connection = <span className={routeClass}>➞</span>;
  if (row.src && row.tgt) {
    connection = (
      <span className={routeClass}>
        <span className="port-id">{row.src.port}</span>
        <span class="arrow">➞</span>
        <span className="port-id">{row.tgt.port}</span>
      </span>
    );
  } else if (row.src) {
    connection = (
      <span className={routeClass}>
        <span className="port-id">{row.src.port}</span>
        <span class="arrow">➞</span>
      </span>
    );
  } else if (row.tgt) {
    connection = (
      <span className={routeClass}>
        <span class="arrow">➞</span>
        <span className="port-id">{row.tgt.port}</span>
      </span>
    );
  }
  return (
    <div className="edge">
      {subgraph}
      {src}
      {connection}
      {tgt}
    </div>
  );
}

export default EdgeId;
