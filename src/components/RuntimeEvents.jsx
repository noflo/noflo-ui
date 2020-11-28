import React, { useState } from 'react';
import { Table } from 'react-fluid-table';
import EdgeId from './EdgeId';

function PacketData({ row, multiLine = false }) {
  switch (typeof row.data) {
    case 'number':
    case 'string': {
      return row.data;
    }
    default: {
      if (multiLine) {
        return JSON.stringify(row.data, null, 2);
      }
      return JSON.stringify(row.data);
    }
  }
}

function PacketDetails({ row, index, isExpanded, clearSizeCache }) {
  return (
    <div className="packet-details">
      <dl>
        <dt>Payload</dt>
        <dd className="packet-data">
          <PacketData row={row} multiLine={true} />
        </dd>
      </dl>
    </div>
  );
}

function RuntimeEvents({ packets, width }) {
  const idWidth = Math.min(width / 4, 238);
  const dataWidth = width - idWidth - 36;
  const columns = [
    {
      key: 'id',
      header: 'Edge',
      width: idWidth,
      content: EdgeId,
    },
    {
      key: 'data',
      header: 'Data',
      width: dataWidth,
      content: PacketData,
    },
    {
      key: '',
      width: 36,
      expander: true,
    },
  ];
  return (
    <Table
      data={packets}
      columns={columns}
      subComponent={PacketDetails}
      tableHeight={288}
    />
  );
}

export default RuntimeEvents;
