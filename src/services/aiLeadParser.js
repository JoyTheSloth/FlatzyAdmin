// AI Service for Flatzy Lead Parsing
// Primary: Groq (openai/gpt-oss-120b & openai/gpt-oss-20b)
// Secondary: Mistral AI (mistral-small-latest)
// Safety Fallback: Fast Rule-Based Regex Extraction (guarantees it ALWAYS works even if network/keys fail)

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY || "";


const SYSTEM_PROMPT = `You are an expert real estate lead parsing assistant for "Flatzy" in Kolkata.
Analyze the user's messy text, WhatsApp message, call notes, or transcribed audio and extract lead requirements into clean JSON.

IMPORTANT BUDGET PARSING RULES:
- If a shorthand number with 'k' is given, convert it to full rupees:
  * "9k" -> "₹9,000"
  * "9.5k" -> "₹9,500"
  * "12k" -> "₹12,000"
- If a small number (under 100) is given in the context of budget or rent (e.g. "budget 9.5", "rent 10", "budget 8.5"), interpret it as thousands in Indian Rupees:
  * "budget 9.5" -> "₹9,500"
  * "rent 12" -> "₹12,000"
  * "budget 8.5" -> "₹8,500"
- If a range is given (e.g. "10 to 15", "10-15k", "10k to 15k", "around 10 to 15"), format it cleanly as a range:
  * "10 to 15" or "10-15" or "10k-15k" -> "₹10,000 – ₹15,000"
  * "9.5 to 12k" -> "₹9,500 – ₹12,000"
- Never confuse parts of phone numbers (e.g., 94343..., 98300...) with the budget!

Return ONLY a valid JSON object matching this exact schema:
{
  "name": "string (lead name, or 'Inquirer' if not mentioned)",
  "phone": "string (e.g. +91 98300 12345, or empty string if not found)",
  "bhk": "string (one of: '1 BHK', '2 BHK', '3 BHK', or empty string if unknown)",
  "location": "string (e.g. 'New Town', 'Shapoorji', 'Salt Lake', 'Rajarhat', 'Garia', or empty string)",
  "furnishing": "string (one of: 'Semi-Furnished', 'Fully-Furnished', 'Unfurnished', or empty string)",
  "budget": "string (e.g. '₹15,000 – ₹20,000' or budget amount, or empty string)",
  "shiftingDate": "string (e.g. 'Now', 'Within 7 Days', 'Nov', 'Dec', or exact date/month)",
  "tenantType": "string ('Family' or 'Bachelor', or empty string)",
  "isHot": boolean (true if urgent, ready to pay token, moving immediately, or high intent)
}

Do not include backticks, markdown, or commentary. Output pure JSON only.`;

// Clean JSON response from potential markdown wrapping
function cleanAndParseJSON(content) {
  if (!content) throw new Error("Empty response");
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned);
}

// Resilient Regex Fallback for 100% Reliability
function parseWithRegexFallback(rawText) {
  const text = rawText || "";
  
  // Phone: 10-digit Indian phone with optional +91
  const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{9}/);
  const phone = phoneMatch ? phoneMatch[0] : "";

  // BHK: 1bhk, 2 bhk, 3-bhk, etc.
  const bhkMatch = text.match(/\b([1-4])\s*[-]?\s*bhk\b/i);
  const bhk = bhkMatch ? `${bhkMatch[1]} BHK` : "";

  // Tenant Type
  let tenantType = "";
  if (/bachelor|single|boy|boys|girl|girls|student|working professional/i.test(text)) {
    tenantType = "Bachelor";
  } else if (/family|couple|parents|kids|children|husband|wife/i.test(text)) {
    tenantType = "Family";
  }

  // Locality
  let location = "";
  if (/shapoorji/i.test(text)) location = "Shapoorji";
  else if (/new\s*town|newtown|action\s*area/i.test(text)) location = "New Town";
  else if (/salt\s*lake|sector\s*[1-5]/i.test(text)) location = "Salt Lake";
  else if (/rajarhat|chinar\s*park/i.test(text)) location = "Rajarhat";
  else if (/garia|patuli/i.test(text)) location = "Garia";
  else if (/dum\s*dum|nagerbazar/i.test(text)) location = "Dum Dum";
  else if (/behala/i.test(text)) location = "Behala";
  else if (/tollygunge/i.test(text)) location = "Tollygunge";

  // Furnishing
  let furnishing = "";
  if (/fully\s*[-]?\s*furnished/i.test(text)) furnishing = "Fully-Furnished";
  else if (/semi\s*[-]?\s*furnished/i.test(text)) furnishing = "Semi-Furnished";
  else if (/unfurnished|bare/i.test(text)) furnishing = "Unfurnished";

  // --- Smart Budget Extraction ---
  // Step 1: Strip phone numbers and BHK from text copy so digits don't collide
  let budgetSearchText = text.replace(/(?:\+91[\s-]?)?[6-9]\d{9}/g, ' ');
  budgetSearchText = budgetSearchText.replace(/\b[1-5]\s*[-]?\s*bhk\b/gi, ' ');

  // Helper to format numeric string to ₹X,XXX
  const formatAmount = (valStr) => {
    let num = parseFloat(valStr);
    if (isNaN(num)) return null;
    // Numbers < 100 in budget context (e.g. 9.5, 9, 10, 15) mean thousands (9,500, 9,000, etc.)
    if (num < 100) {
      num = Math.round(num * 1000);
    }
    return '₹' + num.toLocaleString('en-IN');
  };

  let budget = "";

  // Check 1: Budget Range (e.g. "budget is around 10 to 15", "10-15k", "9.5 to 12k", "15000 - 20000")
  const rangeRegex = /(?:(?:budget|rent|approx|around|within|between|rs\.?|inr|₹)\s*(?:is|of)?\s*)?(\d+(?:\.\d+)?)\s*k?\s*(?:-|to|–|and)\s*(\d+(?:\.\d+)?)\s*k?/i;
  const rangeMatch = budgetSearchText.match(rangeRegex);
  
  if (rangeMatch && (rangeMatch[0].match(/budget|rent|approx|around|within|between|rs|inr|₹|k/i) || text.includes('to') || text.includes('-'))) {
    const minVal = formatAmount(rangeMatch[1]);
    const maxVal = formatAmount(rangeMatch[2]);
    if (minVal && maxVal) {
      budget = `${minVal} – ${maxVal}`;
    }
  }

  // Check 2: Single budget with keyword (e.g. "budget 9.5", "rent is 15k", "budget: 12000")
  if (!budget) {
    const singleKeywordRegex = /(?:budget|rent|approx|around|within|rs\.?|inr|₹)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)\s*k?\b/i;
    const singleMatch = budgetSearchText.match(singleKeywordRegex);
    if (singleMatch) {
      budget = formatAmount(singleMatch[1]) || "";
    }
  }

  // Check 3: Explicit 'k' shorthand anywhere (e.g. "9.5k", "9k", "12k")
  if (!budget) {
    const explicitKMatch = budgetSearchText.match(/\b(\d+(?:\.\d+)?)\s*k\b/i);
    if (explicitKMatch) {
      budget = formatAmount(explicitKMatch[1]) || "";
    }
  }

  // Check 4: Standard 4 to 6 digit amount (e.g. "12000", "25000")
  if (!budget) {
    const stdMatch = budgetSearchText.match(/(?:budget|rent|rs\.?|inr|₹|\b)\s*(\d{4,6})\b/i);
    if (stdMatch && parseInt(stdMatch[1]) >= 3000) {
      budget = formatAmount(stdMatch[1]) || "";
    }
  }

  // Shifting Date
  let shiftingDate = "Immediate";
  if (/within\s*7\s*days|this\s*week|1\s*week/i.test(text)) shiftingDate = "Within 7 Days";
  else if (/this\s*month/i.test(text)) shiftingDate = "This Month";
  else if (/next\s*month|dec/i.test(text)) shiftingDate = "Next Month";
  else if (/nov/i.test(text)) shiftingDate = "Nov";

  // Name heuristic: look for "I am [Name]" or "Name: [Name]" or first capitalized word
  let name = "Caller Inquiry";
  const nameMatch = text.match(/(?:i am|this is|name\s*[:=-]|caller\s*[:=-])\s*([A-Za-z]{2,20})/i);
  if (nameMatch) {
    name = nameMatch[1];
  } else {
    const firstWord = text.trim().split(/\s+/)[0];
    if (firstWord && /^[A-Z][a-z]{2,15}$/.test(firstWord)) {
      name = firstWord;
    }
  }

  const isHot = /urgent|immediately|ready to pay|today|asap|now|token/i.test(text);

  return {
    name,
    phone,
    bhk,
    location,
    furnishing,
    budget,
    shiftingDate,
    tenantType,
    isHot
  };
}

export async function parseLeadWithAI(rawText) {
  if (!rawText || !rawText.trim()) {
    throw new Error("Please enter some text or WhatsApp message to parse.");
  }

  // Attempt 1: Try Groq with active model (openai/gpt-oss-120b)
  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Extract lead details from this message:\n"${rawText}"` }
        ]
      })
    });

    if (groqRes.ok) {
      const data = await groqRes.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return {
          source: "AI Auto-Parser",
          lead: cleanAndParseJSON(content)
        };
      }
    } else {
      console.warn("Groq API returned status:", groqRes.status);
    }
  } catch (err) {
    console.warn("Groq attempt error:", err);
  }

  // Attempt 2: Try Groq alternative fast model (openai/gpt-oss-20b)
  try {
    const groqRes2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Extract lead details from this message:\n"${rawText}"` }
        ]
      })
    });

    if (groqRes2.ok) {
      const data = await groqRes2.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return {
          source: "AI Auto-Parser",
          lead: cleanAndParseJSON(content)
        };
      }
    }
  } catch (err2) {
    console.warn("Groq secondary attempt error:", err2);
  }

  // Attempt 3: Try Mistral AI
  try {
    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Extract lead details from this message:\n"${rawText}"` }
        ]
      })
    });

    if (mistralRes.ok) {
      const data = await mistralRes.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return {
          source: "AI Auto-Parser",
          lead: cleanAndParseJSON(content)
        };
      }
    }
  } catch (mistralErr) {
    console.warn("Mistral attempt failed:", mistralErr);
  }

  // Final Guarantee: Rule-Based Fallback
  // Guarantees that parsing NEVER crashes or leaves the user stranded
  console.log("Using smart local parser fallback");
  return {
    source: "Smart Auto-Parser",
    lead: parseWithRegexFallback(rawText)
  };
}
