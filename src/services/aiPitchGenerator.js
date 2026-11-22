// Groq AI Service for High-Converting Property Pitches & Marketing Copy
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

export async function generateAIPitches(prop) {
  if (!GROQ_API_KEY) {
    throw new Error("Missing VITE_GROQ_API_KEY");
  }

  const isRent = prop.listingType === 'rent';
  const priceFormatted = isRent
    ? `₹${prop.price?.toLocaleString('en-IN')}/month`
    : `₹${prop.price >= 10000000 ? (prop.price / 10000000).toFixed(2) + ' Cr' : (prop.price / 100000).toFixed(1) + ' Lakhs'}`;

  const propSummary = `
Property: ${prop.title}
Type: For ${prop.listingType?.toUpperCase()}
Configuration: ${prop.bhk} (${prop.sqft ? `${prop.sqft} sq.ft` : 'Spacious'})
Price: ${priceFormatted}
Location: ${prop.location} ${prop.subLocation ? `(${prop.subLocation})` : ''}
Furnishing: ${prop.furnishing || 'Semi Furnished'}
Amenities: ${(prop.amenities || []).join(', ') || 'Lift, 24/7 Security, Power Backup'}
Partner Broker: ${prop.brokerName || 'Flatzy Verified'} (${prop.brokerPhone || '+91 89103 76054'})
Description: ${prop.description || ''}
`;

  const systemPrompt = `You are Kolkata's top luxury real estate copywriter for "Flatzy Kolkata".
Write 3 distinct high-converting promotional pitches for this property in clean WhatsApp format with emojis, bullet points, and strong calls-to-action.

Return ONLY a JSON object with this exact structure:
{
  "whatsapp": "High-energy WhatsApp broadcast pitch for brokers & buyer groups with emojis, bold headings, and key highlights.",
  "investor": "ROI and high-rental-yield pitch tailored for IT professionals & NRI investors highlighting prime Kolkata location & connectivity.",
  "family": "Warm, reassuring pitch emphasizing society security, family living, proximity to schools, hospitals & grocery markets."
}
Return PURE JSON only. No markdown ticks, no commentary.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: propSummary }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) {
      throw new Error(`Groq API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices[0]?.message?.content;
    return JSON.parse(content);
  } catch (err) {
    console.error("AI Pitch Generation Error:", err);
    throw err;
  }
}
