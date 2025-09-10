// api/vlieland-haven.js  (CommonJS handler)
module.exports = async (req, res) => {
  const RWS_URL = "https://waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES_DBO/OphalenLaatsteWaarnemingen";
  const RWS_LOCATIE_CODE = "VLIELHVN"; // Vlieland-haven

  const body = {
    LocatieLijst: [{ Code: RWS_LOCATIE_CODE }],
    AquoPlusWaarnemingMetadataLijst: [
      { AquoMetadata: { Compartiment: { Code: "OW" }, Grootheid: { Code: "WATHTE" } } }
    ]
  };

  try {
    const r = await fetch(RWS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "demo-key" // mag weg; kan helpen bij sommige omgevingen
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) return res.status(r.status).json({ error: "RWS HTTP " + r.status });
    const json = await r.json();

    // Zoek robuust de meest recente meting
    let latestVal = null, latestTs = null;
    const lijsten = json?.WaarnemingenLijst || json?.Waarnemingenlijsten || [];
    for (const wl of lijsten) {
      const metingen = wl?.MetingenLijst || wl?.Metingen || [];
      for (const m of metingen) {
        const t = m.Tijdstip || m.Datumtijd || m.DatumTijd;
        const v = (m.Waarde_Numeriek ?? m.Waarde);
        if (typeof v === "number" && t) {
          if (!latestTs || new Date(t) > new Date(latestTs)) {
            latestTs = t; latestVal = v;
          }
        }
      }
    }

    if (latestVal == null || !latestTs) return res.status(502).json({ error: "Geen waarde gevonden" });

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.json({ waterstand_cm: latestVal, timestamp: latestTs, bron: "RWS" });

  } catch (e) {
    return res.status(500).json({ error: e?.message || "Proxy error" });
  }
};
