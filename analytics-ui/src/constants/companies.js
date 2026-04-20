/**
 * All Café Zupas company IDs — mirrors COMPANY_IDS in fetch_to_csv.py.
 * Used as the default set when no location filter is applied.
 */
export const ALL_COMPANY_IDS = [
  131592, 138871, 138872, 141044, 141285, 141287, 141288, 141291,
  141292, 141453, 141452, 146629, 146632, 146634, 146637, 146640,
  146643, 146645, 146648, 146651, 146654, 146656, 146657, 146659,
  146662, 146663, 146666, 146667, 146670, 146673, 146674, 146676,
  146678, 146680, 146681, 146683, 146684, 146687, 146690, 146692,
  146691, 146689, 146638, 146646, 146649, 146655, 146682, 146686,
  146688, 146685, 146679, 146671, 146677, 146675, 146695, 146672,
  146669, 146668, 146665, 146660, 146664, 146661, 146658, 146653,
  146652, 146650, 146644, 146641, 146647, 146642, 146636, 146628,
  146639, 146633, 146635, 146630, 146620, 146622, 146626, 146627,
  146631, 146625, 146624, 146623, 146621, 146619, 146617,
]

/** UI label → API value mapping for timeframe selector */
export const TIMEFRAME_OPTIONS = [
  { label: 'Today',      value: 'today'      },
  { label: 'Yesterday',  value: 'yesterday'  },
  { label: 'This Week',  value: 'this_week'  },
  { label: 'Last Week',  value: 'last_week'  },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
]

/** Display titles for each ontime chart_type from the backend */
export const CHART_TITLES = {
  pickup:   'Placement to Pick Up Time (excl. scheduled)',
  delivery: 'Placement to Delivery Time (excl. scheduled)',
  drive:    'Drive Time (pickup → delivery)',
  ontime:   'On-time Deliveries',
}

/** Canonical chart order from backend */
export const CHART_ORDER = ['pickup', 'delivery', 'drive', 'ontime']
