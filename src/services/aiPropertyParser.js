// AI Service for Flatzy Property & Flat Listing Parsing
// Powered by Groq AI with Regex Safety Fallback

const GROQ_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) || "";

const SYSTEM_PROMPT = `You are an expert real estate property listing parser for "Flatzy" in Kolkata.
Analyze the user's messy text, WhatsApp property forward, broker notes, or landlord message and extract structured property specifications into clean JSON.

PARSING RULES:
1. Title: Create a clean, attractive title (e.g., "Spacious 2BHK in Sukhobristhi, Shapoorji" or "Luxury 3BHK Gated Apartment in New Town").
2. Listing Type: Determine if it is for "rent" or "sale" (default to "rent" if not specified).
3. BHK: Choose one of: '1 RK', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'.
4. Price: Extract numeric price in Indian Rupees:
   - "16k" or "16000" or "16k/mo" -> 16000
   - "36L" or "36 Lakhs" or "36 lac" -> 3600000
   - "1.2 Cr" or "1.2 crore" -> 12000000
5. Security Deposit:
   - If explicit number (e.g. "32k deposit" or "32000") -> 32000
   - If "2 months deposit" and rent is 16000 -> 32000
   - For sale, default to 0.
6. Square Feet (sqft):
   - Extract numeric sqft (e.g., "980 sqft", "1150 sft", "1200 sq ft") -> 980. Default to 1000 if not stated.
7. Location: Match the best primary Kolkata area:
   - 'New Town', 'Shapoorji', 'Salt Lake', 'Rajarhat', 'Chinar Park', 'Baguiati', 'Dum Dum', 'Kestopur', 'Garia', 'South Kolkata', 'Howrah', or 'Others'.
8. Sub-Location: Complex or street name (e.g., 'Sukhobristhi Complex', 'Action Area 2 near Ecospace', 'Sector 5').
9. Furnishing: 'Fully Furnished', 'Semi Furnished', or 'Unfurnished'.
10. Amenities: Array of extracted amenities from:
    ['Lift', 'Car Parking', '24/7 Security', 'Power Backup', 'Gated Community', 'Gym', 'Swimming Pool', 'Balcony', 'Water Supply', 'Gas Pipeline', 'Intercom', 'CCTV'].
11. Broker/Contact: Extract contact person's name and 10-digit Indian phone number if present.

Return ONLY a valid JSON object matching this exact schema:
{
  "title": "string",
  "listingType": "rent" | "sale",
  "bhk": "string",
  "sqft": number,
  "price": number,
  "securityDeposit": number,
  "location": "string",
  "subLocation": "string",
  "furnishing": "string",
  "amenities": ["string"],
  "brokerName": "string",
  "brokerPhone": "string",
  "description": "string"
}

Do not include backticks or commentary. Output pure JSON only.`;

function cleanAndParseJSON(content) {
  if (!content) throw new Error("Empty response");
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned);
}

// Resilient Regex Fallback for 100% Reliability
function parsePropertyWithRegex(rawText) {
  const text = rawText || "";
  const lower = text.toLowerCase();

  // 1. Listing Type
  const isSale = lower.includes("sale") || lower.includes("buy") || lower.includes("purchase") || lower.includes("crore") || lower.includes("lakh") || lower.includes(" cr");
  const listingType = isSale ? "sale" : "rent";

  // 2. BHK
  let bhk = "2 BHK";
  if (lower.includes("1 rk") || lower.includes("studio") || lower.includes("1rk")) bhk = "1 RK";
  else if (lower.includes("1 bhk") || lower.includes("1bhk") || lower.includes("one bhk")) bhk = "1 BHK";
  else if (lower.includes("3 bhk") || lower.includes("3bhk") || lower.includes("three bhk")) bhk = "3 BHK";
  else if (lower.includes("4 bhk") || lower.includes("4bhk") || lower.includes("four bhk") || lower.includes("4+ bhk")) bhk = "4+ BHK";
  else if (lower.includes("2 bhk") || lower.includes("2bhk") || lower.includes("two bhk")) bhk = "2 BHK";

  // 3. Location
  let location = "New Town";
  let subLocation = "";
  if (lower.includes("shapoorji") || lower.includes("sukhobristhi") || lower.includes("action area 3") || lower.includes("aa3") || lower.includes("aa iii")) {
    location = "Shapoorji";
    subLocation = "Sukhobristhi Complex";
  } else if (lower.includes("salt lake") || lower.includes("sector 5") || lower.includes("sec 5") || lower.includes("sector v")) {
    location = "Salt Lake";
    subLocation = "Sector V";
  } else if (lower.includes("rajarhat") || lower.includes("chinar park") || lower.includes("city centre 2")) {
    location = "Rajarhat";
  } else if (lower.includes("new town") || lower.includes("newtown") || lower.includes("action area 1") || lower.includes("action area 2") || lower.includes("ecospace")) {
    location = "New Town";
    subLocation = lower.includes("ecospace") ? "near Ecospace" : "Action Area";
  }

  // 4. Phone
  const phoneRegex = /(?:\+91[\s-]?)?[6-9](?:[\s-]?\d){9}/;
  const phoneMatch = text.match(phoneRegex);
  const brokerPhone = phoneMatch ? phoneMatch[0].trim().replace(/\D/g, "") : "";

  // 5. Price
  let price = listingType === "rent" ? 18000 : 3500000;
  // Lakhs / Crores
  const crMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore)/i);
  const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:l|lac|lakh)/i);
  const kMatch = text.match(/(?:rent|price|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*k/i);
  const numMatch = text.match(/(?:rent|price|rs\.?|₹)\s*:?\s*(\d{4,8})/i);

  if (crMatch) {
    price = Math.round(parseFloat(crMatch[1]) * 10000000);
  } else if (lakhMatch) {
    price = Math.round(parseFloat(lakhMatch[1]) * 100000);
  } else if (kMatch && parseFloat(kMatch[1]) < 100) {
    price = Math.round(parseFloat(kMatch[1]) * 1000);
  } else if (numMatch) {
    price = parseInt(numMatch[1], 10);
  }

  // 6. Security Deposit
  let securityDeposit = listingType === "rent" ? price * 2 : 0;
  const depKMatch = text.match(/(?:deposit|sec|advance)\s*:?\s*(\d+(?:\.\d+)?)\s*k/i);
  const depNumMatch = text.match(/(?:deposit|sec|advance)\s*:?\s*(\d{4,8})/i);
  if (depKMatch) {
    securityDeposit = Math.round(parseFloat(depKMatch[1]) * 1000);
  } else if (depNumMatch) {
    securityDeposit = parseInt(depNumMatch[1], 10);
  }

  // 7. Sqft
  let sqft = bhk === "1 BHK" ? 600 : bhk === "2 BHK" ? 1000 : bhk === "3 BHK" ? 1400 : 1800;
  const sqftMatch = text.match(/(\d{3,5})\s*(?:sq\.?ft|sqft|sft|square feet)/i);
  if (sqftMatch) {
    sqft = parseInt(sqftMatch[1], 10);
  }

  // 8. Furnishing
  let furnishing = "Semi Furnished";
  if (lower.includes("fully") || lower.includes("full furnished")) furnishing = "Fully Furnished";
  else if (lower.includes("unfurnished") || lower.includes("bare")) furnishing = "Unfurnished";

  // 9. Amenities
  const amenities = [];
  if (lower.includes("lift")) amenities.push("Lift");
  if (lower.includes("parking") || lower.includes("car")) amenities.push("Car Parking");
  if (lower.includes("security") || lower.includes("guard")) amenities.push("24/7 Security");
  if (lower.includes("power") || lower.includes("generator") || lower.includes("backup")) amenities.push("Power Backup");
  if (lower.includes("gated") || lower.includes("society") || lower.includes("complex")) amenities.push("Gated Community");
  if (lower.includes("gym")) amenities.push("Gym");
  if (lower.includes("pool") || lower.includes("swimming")) amenities.push("Swimming Pool");
  if (lower.includes("balcony")) amenities.push("Balcony");
  if (lower.includes("gas") || lower.includes("pipeline")) amenities.push("Gas Pipeline");

  // Default amenities if none detected
  if (amenities.length === 0) {
    amenities.push("Lift", "24/7 Security", "Car Parking");
  }

  // 10. Title
  const title = `${furnishing} ${bhk} in ${location}${subLocation ? ` (${subLocation})` : ""}`;

  return {
    title,
    listingType,
    bhk,
    sqft,
    price,
    securityDeposit,
    location,
    subLocation: subLocation || location,
    furnishing,
    amenities,
    brokerName: "Flatzy Partner",
    brokerPhone: brokerPhone || "918910376054",
    description: `Spacious ${bhk} (${sqft} sq.ft) in ${location}. ${furnishing} with ${amenities.slice(0, 3).join(", ")}. Available for ${listingType}.`
  };
}

/**
 * Main AI Parsing Function
 * Tries Groq LLM first, gracefully falls back to Regex
 */
export async function parsePropertyWithAI(rawText) {
  if (!rawText || !rawText.trim()) {
    throw new Error("Please enter or paste property details first.");
  }

  const cleanText = rawText.trim();

  // If Groq API Key is present, call Groq LLM
  if (GROQ_API_KEY) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: cleanText }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const parsed = cleanAndParseJSON(content);

        // Sanitize and return parsed property
        return {
          title: parsed.title || `${parsed.bhk || "2 BHK"} in ${parsed.location || "New Town"}`,
          listingType: parsed.listingType === "sale" ? "sale" : "rent",
          bhk: parsed.bhk || "2 BHK",
          sqft: Number(parsed.sqft) || 1000,
          price: Number(parsed.price) || (parsed.listingType === "sale" ? 3500000 : 18000),
          securityDeposit: Number(parsed.securityDeposit) || 0,
          location: parsed.location || "New Town",
          subLocation: parsed.subLocation || "",
          furnishing: parsed.furnishing || "Semi Furnished",
          amenities: Array.isArray(parsed.amenities) && parsed.amenities.length > 0 ? parsed.amenities : ["Lift", "Car Parking", "24/7 Security"],
          brokerName: parsed.brokerName || "Flatzy Partner",
          brokerPhone: parsed.brokerPhone ? String(parsed.brokerPhone).replace(/\D/g, "") : "",
          description: parsed.description || cleanText.slice(0, 200)
        };
      }
    } catch (err) {
      console.warn("[AIPropertyParser] Groq call failed, using fallback:", err);
    }
  }

  // Instant Regex Fallback
  return parsePropertyWithRegex(cleanText);
}
