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
