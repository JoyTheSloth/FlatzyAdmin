/**
 * Flatzy Kolkata Admin Portal - Date & Time Utilities
 * Accurately formats inquiry and listing timestamps into clean, human-readable labels.
 */

export const formatEnquiryTimestamp = (dateInput) => {
  if (!dateInput) return 'Recently';

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return dateInput;
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (isToday) {
    return `Today • ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday • ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });

  if (date.getFullYear() !== now.getFullYear()) {
    return `${dateStr} ${date.getFullYear()} • ${timeStr}`;
  }

  return `${dateStr} • ${timeStr}`;
};

/**
 * Resolves the true timestamp for any lead object by inspecting:
 * 1. lead.createdAt or lead.created_at (Supabase ISO timestamp)
 * 2. lead.id containing embedded epoch millis (e.g. lead_1793051448397_xxx)
 * 3. lead.lastFollowUp if it contains a parseable timestamp
 * 4. Fallback without ever cloning current time across all leads
 */
export const getLeadTimestamp = (lead) => {
  if (!lead) return 'Recently';

  // 1. Explicit ISO timestamp from Supabase
  const rawDate = lead.createdAt || lead.created_at;
  if (rawDate && !isNaN(new Date(rawDate).getTime())) {
    return formatEnquiryTimestamp(rawDate);
  }

  // 2. Extracted timestamp from lead ID (e.g. lead_1793051448397_l8yes)
  if (typeof lead.id === 'string' && lead.id.startsWith('lead_')) {
    const parts = lead.id.split('_');
    const epoch = Number(parts[1]);
    if (!isNaN(epoch) && epoch > 1600000000000) {
      return formatEnquiryTimestamp(new Date(epoch));
    }
  }

  // 3. Check if lastFollowUp is an ISO date string
  if (lead.lastFollowUp && !isNaN(new Date(lead.lastFollowUp).getTime())) {
    return formatEnquiryTimestamp(lead.lastFollowUp);
  }

  // 4. If lastFollowUp is already formatted and not 'Just now'
  if (lead.lastFollowUp && lead.lastFollowUp !== 'Just now') {
    return lead.lastFollowUp;
  }

  return 'Recently';
};

/**
 * Resolves the true timestamp and relative elapsed countdown for any property listing.
 * Parses:
 * 1. prop.createdAt or prop.created_at (ISO timestamp)
 * 2. prop.id epoch extraction (e.g. prop_1793189500000_xxxx)
 * 3. prop.postingDate (e.g. "28 Oct 2026")
 */
export const getPropertyTimestamp = (property) => {
  if (!property) {
    return {
      dateStr: 'Recent',
      timeAgo: 'Recently',
      fullDate: 'Recently',
      badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
    };
  }

  let dateObj = null;

  // 1. Check createdAt / created_at ISO string
  const rawIso = property.createdAt || property.created_at;
  if (rawIso && !isNaN(new Date(rawIso).getTime())) {
    dateObj = new Date(rawIso);
  }

  // 2. Check id containing epoch timestamp (prop_1793189500000_xxxx)
  if (!dateObj && typeof property.id === 'string' && property.id.startsWith('prop_')) {
    const parts = property.id.split('_');
    const epoch = Number(parts[1]);
    if (!isNaN(epoch) && epoch > 1600000000000) {
      dateObj = new Date(epoch);
    }
  }

  // 3. Fallback to postingDate if valid
  if (!dateObj && property.postingDate) {
    const parsed = new Date(property.postingDate);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  // If no parseable date, return the stored postingDate
  if (!dateObj || isNaN(dateObj.getTime())) {
    return {
      dateStr: property.postingDate || 'Recent',
      timeAgo: 'Recently',
      fullDate: property.postingDate || 'Recent',
      badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Human date label
  const dateFormatted = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Relative Countdown Badge text and color
  let timeAgo = 'Just now';
  let badgeClass = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

  if (diffDays === 0) {
    if (diffHours >= 1) {
      timeAgo = `${diffHours}h ago`;
    } else if (diffMin >= 1) {
      timeAgo = `${diffMin}m ago`;
    } else {
      timeAgo = 'Just now';
    }
    badgeClass = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  } else if (diffDays === 1) {
    timeAgo = '1 day ago';
    badgeClass = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  } else if (diffDays < 7) {
    timeAgo = `${diffDays} days ago`;
    badgeClass = 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
  } else if (diffDays < 14) {
    timeAgo = `${diffDays} days ago`; // e.g. "7 days ago"
    badgeClass = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
  } else if (diffDays < 30) {
    timeAgo = `${diffDays} days ago`; // e.g. "14 days ago", "21 days ago"
    badgeClass = 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
  } else {
    const diffMonths = Math.floor(diffDays / 30);
    timeAgo = diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
    badgeClass = 'bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30';
  }

  return {
    dateStr: dateFormatted,
    timeStr: timeFormatted,
    fullDate: `${dateFormatted} • ${timeFormatted}`,
    timeAgo,
    diffDays,
    badgeClass
  };
};
