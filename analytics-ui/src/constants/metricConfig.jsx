/**
 * Per-metric UI configuration: colors, icons, stat card definitions, and
 * which DrilldownOrder fields to display as table columns.
 *
 * Mirrors METRIC_CONFIG from ui_template.html but decoupled from DOM.
 * Stat builders receive a DrilldownStats object and return [{value, label}].
 */

const iconCreated = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 5v6M5 8h6" strokeLinecap="round" />
  </svg>
)

const iconDelivered = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M2.5 8.5l3.5 3.5 7-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const iconFailed = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 5v4" strokeLinecap="round" />
    <circle cx="8" cy="11" r=".6" fill="currentColor" stroke="none" />
  </svg>
)

const iconIncomplete = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 5v3.5l2 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const iconDeleted = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5L11 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const METRIC_CONFIG = {
  created: {
    label:   'Created Orders',
    color:   '#2563EB',
    paleBg:  '#EFF4FF',
    icon:    iconCreated,
    stats: (s) => [
      { value: s.total_count,      label: 'Total orders' },
      { value: s.total_delivered,  label: 'Delivered' },
      { value: s.total_failed,     label: 'Failed' },
      { value: s.total_incomplete, label: 'Incomplete' },
    ],
    columns: [
      { key: 'order_number',              header: 'Order #',      type: 'text' },
      { key: 'customer_name',             header: 'Customer',     type: 'text' },
      { key: 'customer_formatted_address',header: 'Zone',         type: 'text' },
      { key: 'placement_time',            header: 'Placed at',    type: 'datetime' },
      { key: 'promised_delivery_time',    header: 'Promised by',  type: 'datetime' },
      { key: 'driver_name',               header: 'Assigned to',  type: 'text' },
      { key: 'order_status',              header: 'Status',       type: 'badge' },
    ],
  },

  delivered: {
    label:   'Delivered Orders',
    color:   '#1B9970',
    paleBg:  '#EAF7F2',
    icon:    iconDelivered,
    stats: (s) => [
      { value: s.total_count,           label: 'Total delivered' },
      { value: s.delivered_by_driver,   label: 'Via driver' },
      { value: s.delivered_by_dispatcher, label: 'By dispatcher' },
      { value: `${s.ontime_percentage}%`, label: '% on-time' },
    ],
    columns: [
      { key: 'order_number',           header: 'Order #',      type: 'text' },
      { key: 'customer_name',          header: 'Customer',     type: 'text' },
      { key: 'placement_time',         header: 'Placed at',    type: 'datetime' },
      { key: 'delivery_time',          header: 'Delivered at', type: 'datetime' },
      { key: 'driver_name',            header: 'Driver',       type: 'text' },
      { key: 'completed_by',           header: 'Completed by', type: 'badge' },
      { key: 'delivery_delta_minutes', header: 'On-time',      type: 'ontime' },
    ],
  },

  failed: {
    label:   'Failed Orders',
    color:   '#D94040',
    paleBg:  '#FEF0F0',
    icon:    iconFailed,
    stats: (s) => [
      { value: s.total_count,          label: 'Total failed' },
      { value: `${s.fail_rate}%`,      label: 'Fail rate' },
    ],
    columns: [
      { key: 'order_number',      header: 'Order #',      type: 'text' },
      { key: 'customer_name',     header: 'Customer',     type: 'text' },
      { key: 'placement_time',    header: 'Placed at',    type: 'datetime' },
      { key: 'assigned_time',     header: 'Assigned at',  type: 'datetime' },
      { key: 'driver_name',       header: 'Driver',       type: 'text' },
      { key: 'order_status',      header: 'Stage',        type: 'badge' },
      { key: 'failed_delivery_time', header: 'Failed at', type: 'datetime' },
    ],
  },

  incomplete: {
    label:   'Incomplete Orders',
    color:   '#E07020',
    paleBg:  '#FEF3EB',
    icon:    iconIncomplete,
    stats: (s) => [
      { value: s.total_count,          label: 'Unassigned' },
      { value: `${s.avg_waiting_minutes} min`, label: 'Avg. wait' },
      { value: s.critical_count,       label: 'Critical (>3h)' },
    ],
    columns: [
      { key: 'order_number',      header: 'Order #',      type: 'text' },
      { key: 'customer_name',     header: 'Customer',     type: 'text' },
      { key: 'customer_formatted_address', header: 'Zone', type: 'text' },
      { key: 'placement_time',    header: 'Placed at',    type: 'datetime' },
      { key: 'promised_delivery_time', header: 'Promised by', type: 'datetime' },
      { key: 'waiting_minutes',   header: 'Waiting',      type: 'waiting' },
      { key: 'order_status',      header: 'Status',       type: 'badge' },
    ],
  },

  deleted: {
    label:   'Deleted Orders',
    color:   '#6B7A8D',
    paleBg:  '#F0F2F5',
    icon:    iconDeleted,
    stats: (s) => [
      { value: s.total_count,          label: 'Deleted' },
      { value: `${s.deletion_rate}%`,  label: 'Deletion rate' },
    ],
    columns: [
      { key: 'order_number',      header: 'Order #',      type: 'text' },
      { key: 'customer_name',     header: 'Customer',     type: 'text' },
      { key: 'placement_time',    header: 'Placed at',    type: 'datetime' },
      { key: 'deleted_at',        header: 'Deleted at',   type: 'datetime' },
      { key: 'deleted_by',        header: 'Deleted by',   type: 'text' },
      { key: 'deleted_by_role',   header: 'Role',         type: 'badge' },
      { key: 'order_status',      header: 'Status',       type: 'badge' },
    ],
  },
}
